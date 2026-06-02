# Tally Sync — Implementation Plan

## Context

Bale needs to push accounting records (invoices, payments, adjustment notes) and the masters they reference (partner ledgers, stock items) from the Supabase-backed web app into customers' on-premise TallyPrime installations. Tally exposes only a local HTTP server on `localhost:9000` — no cloud API. Browser-based sync is blocked by mixed-content and CORS, so the only viable architecture is a desktop bridge that runs next to Tally on the customer's PC.

This plan covers v1 of that bridge: a Windows-first Electron app that authenticates the user via Google OAuth (same as the web app), fetches unsynced records from Supabase for a user-selected date range, and pushes them as XML to the local Tally HTTP server. The web app gets a "Connected Devices" management screen and per-record sync status. Stock-item-bearing vouchers (sales/purchase) are pushed with inventory; receipts/payments/CN/DN reference pre-existing system ledgers in Tally by name.

## Scope (v1)

**In scope**

- Vouchers: Sales invoice, Purchase invoice, Receipt, Payment, Credit Note, Debit Note
- Masters synced from Bale: **Partner ledgers** (`ledgers.ledger_type = 'party'`), **Stock items** (all products), **Stock units** (the 4 enum values mapped to Tally units)
- Wire format: **XML only** (TallyPrime ≥ 4.0)
- Trigger: **manual** date-range "Sync Now"
- Auth: **Google OAuth via Supabase Auth** (custom protocol `bale://auth-callback`)
- Voucher identity: Bale's `invoice_number` / `adjustment_number` / `payment_number` → Tally `<VOUCHERNUMBER>`. Tally voucher types set to "Manual + Prevent Duplicates" for idempotency.

**Out of scope (assumed pre-existing in Tally, verified via pre-flight)**

- System ledgers: Sales Account, Purchase Account, CGST, SGST, IGST (names configurable in app settings; defaults match Tally standard)
- Bank/Cash ledgers referenced by receipts/payments — matched by `ledgers.name`
- Counter ledgers on invoices/adjustments (sales/purchase return accounts)
- Stock groups — all items default to `Primary`

**Explicitly deferred**

- JSON wire format (TallyPrime 7.0+)
- Scheduled/real-time sync
- Master mapping wizard
- Re-sync of edited records (the `prevent_invoice_edit` rule on Tally-export is being removed per user direction; force re-sync handled via UI checkbox)
- Multi-company-per-user UI (assume single company in JWT)
- **Cancelled records (`is_cancelled = TRUE`)**: skipped entirely from sync. Customer cancels manually in Tally if needed.

## Architecture

```
┌─────────────────────┐         ┌──────────────────────┐
│  Bale Web (Next.js) │         │  Electron Desktop    │
│                     │         │  (Windows-first)     │
│  - Settings UI:     │         │                      │
│    Connected        │         │  - OAuth sign-in     │
│    Devices          │         │  - Tally settings    │
│  - Sync history     │         │  - Sync Now (date    │
│    view (read-only) │         │    range + record    │
└──────────┬──────────┘         │    selection)        │
           │                    │  - History           │
           │                    └──────┬───────────────┘
           │                           │
           │  Supabase Auth (OAuth)    │  Supabase JS SDK
           ▼                           ▼  (Bearer JWT)
        ┌─────────────────────────────────┐
        │           Supabase              │
        │  - RLS-scoped tables            │
        │  - RPCs (sync payload, results) │
        │  - tally_sync_devices           │
        │  - tally_sync_jobs / items      │
        └─────────────────────────────────┘
                          │
                          │  (Electron only)
                          │  XML over HTTP
                          ▼
                  ┌─────────────────┐
                  │ TallyPrime      │
                  │ localhost:9000  │
                  └─────────────────┘
```

## Data model changes (Supabase migrations)

**Pre-production: edit existing migration files directly. No `ALTER TABLE` / additive migrations.**

### Standardize sync state across syncable tables

Edit these existing migration files in place:

- `supabase/migrations/0014_products.sql`
- `supabase/migrations/0056_ledgers.sql`
- `supabase/migrations/0058_invoices.sql`
- `supabase/migrations/0063_adjustment_notes.sql`
- `supabase/migrations/0066_payments.sql`

In each `CREATE TABLE`:

1. **Remove** any of: `tally_guid`, `tally_export_status`, `tally_export_error`, `exported_to_tally_at`.
2. **Add** the standardized columns:

```sql
tally_sync_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (tally_sync_status IN ('pending', 'synced', 'failed')),
tally_sync_error TEXT,
tally_synced_at TIMESTAMPTZ,
tally_last_attempt_at TIMESTAMPTZ,
```

3. Add a partial index near the other indexes in the same file:

```sql
CREATE INDEX idx_<table>_tally_pending
  ON <table>(company_id, <date_col>)
  WHERE tally_sync_status IN ('pending', 'failed') AND deleted_at IS NULL;
```

4. In `0058_invoices.sql`: **remove** the `OLD.exported_to_tally_at IS NOT NULL` block from `prevent_invoice_edit()`. Apply the same removal to equivalent triggers on `adjustment_notes` / `payments` if present. Edits no longer locked by sync status.

### New tables

New migration file: `supabase/migrations/<next>_tally_sync.sql` containing the three tables below + RLS + the RPCs in the next section. (Single new migration file for everything Tally-sync-specific that doesn't belong in an existing table file.)

```sql
-- Connected desktop installations
CREATE TABLE tally_sync_devices (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL DEFAULT get_jwt_company_id(),
    user_id UUID NOT NULL DEFAULT get_jwt_user_id(),
    device_name VARCHAR(100),           -- os.hostname()
    device_fingerprint VARCHAR(64),     -- hash for dedup
    paired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    UNIQUE (user_id, device_fingerprint)
);

-- One row per "Sync Now" click
CREATE TABLE tally_sync_jobs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL DEFAULT get_jwt_company_id(),
    device_id UUID NOT NULL REFERENCES tally_sync_devices(id),
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
    totals JSONB,   -- {masters: {...}, vouchers: {...}}
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    created_by UUID DEFAULT get_jwt_user_id()
);

-- Per-record audit trail (append-only)
CREATE TABLE tally_sync_job_items (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES tally_sync_jobs(id) ON DELETE CASCADE,
    company_id UUID NOT NULL DEFAULT get_jwt_company_id(),
    record_type VARCHAR(30) NOT NULL,   -- 'invoice' | 'payment' | 'adjustment' | 'ledger' | 'product' | 'unit'
    record_id UUID NOT NULL,
    record_identifier VARCHAR(100),     -- voucher number / ledger name
    status VARCHAR(20) NOT NULL,        -- succeeded | failed | skipped
    error_text TEXT,
    tally_response_excerpt TEXT,        -- relevant Tally.imp lines
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_job_items_job ON tally_sync_job_items(job_id);
CREATE INDEX idx_sync_job_items_record ON tally_sync_job_items(record_type, record_id);
```

RLS for all three: `company_id = get_jwt_company_id()`. Devices additionally scoped to `user_id = get_jwt_user_id()`. Pattern matches existing migrations.

### Supabase RPCs (Postgres functions, `SECURITY INVOKER`)

1. **`get_tally_sync_payload(p_date_from, p_date_to, p_force_resync)`** → JSONB
   - Returns: `{ invoices, payments, adjustments, partner_ledgers, products, units }`
   - Filter: company-scoped, date range, `tally_sync_status IN ('pending','failed')` unless `force_resync`
   - Computes master closure: collects distinct `party_ledger_id` / product IDs / units referenced by selected vouchers, fetches them with their current sync state

2. **`create_tally_sync_job(p_device_id, p_date_from, p_date_to)`** → UUID
   - Inserts row in `tally_sync_jobs`, returns `id`
   - Validates device is not revoked

3. **`mark_tally_sync_results(p_job_id, p_results JSONB)`** → VOID
   - `p_results`: `[{record_type, record_id, record_identifier, status, error_text, tally_excerpt}, ...]`
   - Single transaction:
     - Updates `tally_sync_status` / `tally_sync_error` / `tally_synced_at` / `tally_last_attempt_at` on each record's source table (dispatch by `record_type`)
     - Bulk-inserts into `tally_sync_job_items`

4. **`finalize_tally_sync_job(p_job_id, p_status, p_totals)`** → VOID
   - Sets `finished_at`, `status`, `totals`
   - Updates `tally_sync_devices.last_seen_at`

5. **`get_tally_system_ledger_names()`** → JSONB
   - Returns the configured system ledger names from `companies.tally_settings` so Electron knows what to look up in Tally for the pre-flight check.

### Companies table: settings storage

Edit the existing `companies` table migration file in place to add:

```sql
tally_settings JSONB NOT NULL DEFAULT '{
    "sales_ledger_name": "Sales",
    "purchase_ledger_name": "Purchases",
    "cgst_ledger_name": "CGST",
    "sgst_ledger_name": "SGST",
    "igst_ledger_name": "IGST"
}'::jsonb,
```

These are editable from a settings page in the Bale web app (one source of truth — the Electron app reads them per sync). Per-device Tally connection settings (host, port, company name) stay in Electron's local storage.

## Electron app structure

New directory: `bale-tally-desktop/` (separate repo or `/desktop` workspace — recommend separate repo to keep build pipelines clean; `bale-frontend` stays web-only).

```
bale-tally-desktop/
├── src/
│   ├── main/                         # Electron main process (Node)
│   │   ├── index.ts                  # App lifecycle, window mgmt
│   │   ├── auth/
│   │   │   ├── oauth.ts              # bale:// protocol handler, Supabase OAuth flow
│   │   │   └── session.ts            # Token storage via safeStorage
│   │   ├── tally/
│   │   │   ├── client.ts             # POST to http://host:port, parse response
│   │   │   ├── builders/             # XML builders (one per entity)
│   │   │   │   ├── envelope.ts       # ENVELOPE/HEADER/BODY wrapper
│   │   │   │   ├── ledger.ts         # Party ledger
│   │   │   │   ├── unit.ts           # Unit master
│   │   │   │   ├── stock-item.ts     # Stock item
│   │   │   │   ├── sales-voucher.ts
│   │   │   │   ├── purchase-voucher.ts
│   │   │   │   ├── receipt-voucher.ts
│   │   │   │   ├── payment-voucher.ts
│   │   │   │   └── adjustment-voucher.ts  # CN/DN
│   │   │   ├── parser.ts             # Response + Tally.imp → per-record results
│   │   │   └── preflight.ts          # Connection + company + ledger + GST checks
│   │   ├── supabase/
│   │   │   ├── client.ts             # Authenticated Supabase client
│   │   │   └── rpcs.ts               # Wrappers for the 5 RPCs above
│   │   ├── jobs/
│   │   │   ├── runner.ts             # Orchestrates masters → vouchers, batching, cancel
│   │   │   └── mapper.ts             # Bale record → builder input shape
│   │   └── ipc.ts                    # Renderer ↔ main bridge
│   ├── renderer/                     # React UI (reuses Bale's shadcn components)
│   │   ├── pages/
│   │   │   ├── SignIn.tsx
│   │   │   ├── Settings.tsx          # Host, port, company, Test Connection
│   │   │   ├── Sync.tsx              # Date range, record list, Sync Now, live progress
│   │   │   └── History.tsx           # Past jobs, drill-in
│   │   └── App.tsx
│   └── shared/                       # Types shared main ↔ renderer
└── package.json
```

### Auth flow (Google OAuth via custom protocol)

1. First launch: renderer shows "Sign in with Google". Click triggers IPC to main.
2. Main registers `bale://` as a custom protocol (`app.setAsDefaultProtocolClient('bale')`), then opens the system browser to:
   `https://<supabase>/auth/v1/authorize?provider=google&redirect_to=bale://auth-callback`
3. User signs in with Google in the browser. Supabase redirects to `bale://auth-callback#access_token=...&refresh_token=...`.
4. OS hands the URL to Electron (`app.on('open-url')` on macOS, `second-instance` arg parsing on Windows). Main parses tokens.
5. Main creates Supabase client with tokens, INSERTs a row into `tally_sync_devices` (`device_name = os.hostname()`, `device_fingerprint = sha256(hostname + machine-id)`). `UNIQUE (user_id, device_fingerprint)` makes this idempotent.
6. Tokens encrypted via `safeStorage.encryptString()`, saved to `app.getPath('userData')/session.enc`.
7. Supabase JS SDK handles refresh automatically.
8. Add to Supabase Auth → URL Configuration → Additional Redirect URLs: `bale://auth-callback`.

### Revocation

Web app's "Connected Devices" page sets `tally_sync_devices.revoked_at`. RPCs (`get_tally_sync_payload`, `create_tally_sync_job`) check:

```sql
IF NOT EXISTS (
    SELECT 1 FROM tally_sync_devices
    WHERE user_id = get_jwt_user_id()
      AND company_id = get_jwt_company_id()
      AND revoked_at IS NULL
) THEN
    RAISE EXCEPTION 'No active paired device';
END IF;
```

Electron catches the error → wipes local session → returns to sign-in.

## Sync job lifecycle

```
User clicks "Sync Now" with date range [from, to]
  │
  ├─ 1. Pre-flight (connection only):
  │     - GET http://host:port/?XML=<envelope: Export List of Companies>
  │       → confirm port reachable, configured company is loaded
  │     - Export company info → verify GST is enabled
  │     - On failure: stop, show clear error
  │     (Ledger existence is NOT pre-flighted — Tally's LINEERROR identifies
  │      missing ledgers by name per voucher, and the result UI dedupes
  │      identical errors. Removes redundant pre-flight + race conditions.)
  │
  ├─ 2. get_tally_sync_payload(from, to, force_resync) → full payload
  │     - Renderer shows record list grouped by type, user deselects any
  │     - User clicks "Sync" to confirm selection
  │
  ├─ 3. create_tally_sync_job() → job_id
  │
  ├─ 4. Push masters in dependency order, batched:
  │     a. Units (4 fixed, batched in one envelope)
  │     b. Stock items (referenced by voucher items)
  │     c. Partner ledgers
  │     (One <ENVELOPE> per type, 50-100 <TALLYMESSAGE> per envelope)
  │     - Parse response → per-record results
  │     - mark_tally_sync_results(job_id, results)
  │
  ├─ 5. Push vouchers, batched by type:
  │     - Sales → Purchase → Receipt → Payment → CN → DN
  │     - Within each type: 25-50 per envelope (vouchers are heavier)
  │     - Read Tally.imp after each batch (file read from configured Tally folder)
  │     - Map <LINEERROR> to record by VOUCHERNUMBER
  │       (e.g. "Following masters do not exist: HDFC Bank A/c" identifies the
  │        missing ledger; surface verbatim into per-record error text)
  │     - mark_tally_sync_results after each batch
  │
  ├─ 6. finalize_tally_sync_job(job_id, status, totals)
  │
  └─ 7. Renderer shows summary: succeeded/failed counts + per-record table
        with error text + "Retry" button per row
```

**Cancel button**: sets a flag in the job runner; current batch finishes, subsequent batches skipped, job finalized as `cancelled`.

## XML builder patterns

Each builder is a pure function: `(input) => xmlString`. Use `fast-xml-parser` for build/parse (handles entity escaping). Common envelope shape from research doc — wrap `<TALLYMESSAGE>` array per import type:

- **Masters** import: `<HEADER><ID>All Masters</ID></HEADER>`
- **Vouchers** import: `<HEADER><ID>Vouchers</ID></HEADER>`
- Always include `<SVCURRENTCOMPANY>` in `<STATICVARIABLES>`
- Dates as `YYYYMMDD`
- Sales/Purchase voucher includes `<ALLINVENTORYENTRIES.LIST>` (per "push stock items too" decision); GST split via `<LEDGERENTRIES.LIST>` referencing CGST/SGST or IGST ledgers by configured name
- Receipt/Payment voucher references `payments.counter_ledger_id` → ledger name (must pre-exist)
- CN/DN uses `VCHTYPE="Credit Note"|"Debit Note"`, references original invoice via `<REFERENCE>` field

### Bale → Tally unit mapping (hardcoded)

All four map to Tally's pre-seeded "Simple Units" — push attempts are no-ops thanks to `DupIgnoreCombine`, no extra units created.

| Bale `measuring_unit` | Tally unit | Tally full name |
| --------------------- | ---------- | --------------- |
| `metre`               | `m`        | Metres          |
| `yard`                | `yd`       | Yards           |
| `kilogram`            | `kg`       | Kilograms       |
| `unit`                | `Nos`      | Numbers         |

Still push all 4 on first sync as a safety net (in case a customer deleted one); `DupIgnoreCombine` makes this idempotent.

## Web app changes (bale-frontend)

**v1: settings page only.** History lives in the Electron app; web stays minimal.

1. **Settings page** at `/settings/tally` (admin-only):
   - System ledger name fields (5 inputs, backed by `companies.tally_settings`)
   - "Connected Devices" table: name, paired date, last seen, revoke button
2. **Per-record sync status badge** on invoice/payment/adjustment detail pages (small pill: Pending / Synced / Failed with tooltip showing error)

History viewer in the web app is deferred — `tally_sync_jobs` / `tally_sync_job_items` still get populated (audit trail), they're just not surfaced in the web UI yet. Electron's History page is the v1 home for sync history.

## Critical files to modify / create

**Supabase migrations**

- _Edit existing files in place_ (pre-production):
  - `0014_products.sql`, `0056_ledgers.sql`, `0058_invoices.sql`, `0063_adjustment_notes.sql`, `0066_payments.sql` — add standardized `tally_sync_*` columns + partial index; remove any legacy `tally_*` columns
  - `0058_invoices.sql` — remove `exported_to_tally_at` block from `prevent_invoice_edit()`
  - Existing `companies` migration — add `tally_settings` JSONB column
- _New file:_ `supabase/migrations/<next>_tally_sync.sql` — `tally_sync_devices`, `tally_sync_jobs`, `tally_sync_job_items` tables + RLS + the 5 RPC functions

**Web app (bale-frontend)**

- `src/app/(protected)/settings/tally/page.tsx` — new (settings + connected devices, single page)
- `src/lib/queries/tally-sync.ts` — query builders for devices
- `src/lib/query/hooks/useTallyDevices.ts` — new hook (+ mutation hook for revoke + tally_settings update)
- `src/types/tally-sync.types.ts` — inferred types via `QueryData<>`
- Sync status badge component (reusable): `src/components/tally/SyncStatusBadge.tsx`
- Inject badge into existing invoice/payment/adjustment detail pages

**New repo: `bale-tally-desktop`** — entire Electron app per structure above. Pin to Electron 32+, React 18, same shadcn/tailwind setup as web for visual consistency.

## Verification

**DB migrations**

1. Run `npx supabase db reset` locally; confirm all migrations apply cleanly
2. `npm run db:types`; confirm new tables in generated types
3. Manual SQL: insert sample devices/jobs/items, verify RLS isolates across companies

**Web app**

1. `/settings/tally` renders, system ledger names editable, persists to `companies.tally_settings`
2. Mock-insert a `tally_sync_devices` row → appears in Connected Devices list → Revoke button sets `revoked_at`
3. Invoice / payment / adjustment detail pages show correct sync status badge based on `tally_sync_status`

**Electron app (manual, requires TallyPrime install)**

1. Install TallyPrime, create test company with GST enabled, create required system ledgers (Sales / Purchase / CGST / SGST / IGST), enable HTTP server on port 9000
2. Sign in via Google OAuth → device row appears in web app's Connected Devices
3. Settings: configure host/port/company → Test Connection passes pre-flight
4. Seed Bale with: 2 partners, 3 products, 1 sales invoice, 1 receipt
5. Sync Now (last 30 days) → verify in Tally: units, stock items, partner ledgers, sales voucher, receipt voucher all created with correct amounts and GST split
6. Re-run Sync Now without force → 0 records synced (status filter works)
7. Sync Now with force re-sync → records re-pushed (Tally accepts via DupModify, no duplicates)
8. Introduce a failure (rename a system ledger in Tally) → sync fails with clear error text surfaced per-record + in job summary
9. Revoke device from web app → next sync attempt fails with auth error, Electron returns to sign-in
10. Cancel mid-sync → current batch completes, job ends in `cancelled` state, partial results recorded

**Cross-checks**

- `Tally.imp` log content matches `tally_response_excerpt` stored per item
- Voucher totals in Tally match Bale's `total_amount` (catch rounding issues early)
- GSTR-1 in Tally has no "Uncertain Transactions" for synced vouchers (party state correctly drives intra/inter-state tax split)

## Customer Tally setup (onboarding docs)

The customer must do these one-time setup steps in TallyPrime before the desktop app can sync. The Settings page's "Test Connection" button verifies most of these and surfaces clear errors for any that are missing.

1. **Enable HTTP server on port 9000** — F1 → Settings → Connectivity → Client/Server configuration as **Server**, port 9000.
2. **Set voucher types to "Manual + Prevent Duplicates"** — Gateway of Tally → Alter → Voucher Type → for each of Sales, Purchase, Receipt, Payment, Credit Note, Debit Note: Method of Voucher Numbering = `Manual`, Prevent Duplicates = `Yes`. This is the core of the idempotency story; auto-numbering will cause duplicates on re-sync.
3. **Enable GST** in the target company with company state set correctly (drives intra-state CGST+SGST vs inter-state IGST split).
4. **Pre-create system ledgers** with the exact names configured in Bale's `tally_settings`: Sales, Purchase, CGST, SGST, IGST. Defaults match Tally's own standard naming.
5. **Pre-create bank/cash ledgers** with names matching Bale's bank ledger records (the names a customer types in Bale when creating a bank ledger must be created identically in Tally).
6. **Allow Windows Firewall inbound for Tally on port 9000.**

## Implementation gotchas

- **Encoding**: POST as UTF-16 if any narration/name could contain `₹` or other non-ASCII. UTF-8 fails silently with garbled text in Tally. Cheaper alternative: strip/replace `₹` with `Rs.` before pushing.
- **Date format**: `YYYYMMDD` strictly, no separators. `date.toISOString().slice(0,10).replace(/-/g,'')`.
- **XML entity escaping**: `&`, `<`, `>`, `"`, `'` in partner names / narrations must be escaped or import silently drops the voucher. Always use `fast-xml-parser`'s builder API, never string templating.
- **Skip `Tally.imp` file reading for v1.** The XML response already contains `<LINEERROR>` entries — that's sufficient for per-record errors. Reading the file requires the customer to configure a Tally install folder path and adds a whole code path with negligible upside.
- **Duplicate behavior per import type**:
  - Units, partner ledgers, stock items: `DupIgnoreCombine` (skip if exists). For force-resync: `DupModify` (update if exists).
  - Vouchers: customer-side "Prevent Duplicates" rejects re-push. For force-resync: send `ACTION="Alter"` with same voucher number.
- **CN/DN reference invoice**: a credit/debit note references its parent invoice number; if the invoice isn't already in Tally (synced earlier or in the same job), the CN/DN fails. Sync order Sales → Purchase → Receipt → Payment → CN → DN already handles this; document the dependency.
- **Partner ledger name in Tally**: use `company_name` if non-empty, else `first_name + " " + last_name`. Document this rule; once a partner is synced, renaming in Bale creates an orphan in Tally (accepted drift).
- **GST split**: invoices already carry `tax_type` (`gst` for intra-state, `igst` for inter-state) and pre-computed `total_cgst_amount` / `total_sgst_amount` / `total_igst_amount`. XML must include CGST+SGST entries (never IGST) or IGST entry only (never CGST/SGST), driven by `tax_type`.
- **Bank/cash ledger lookup**: payments reference `counter_ledger_id` → `ledgers.name`. That name string is sent as-is to Tally; if the customer's Tally ledger name doesn't match exactly, the voucher fails with `Following masters do not exist: <name>`.

## Dev environment

- **TallyPrime on Windows.** No Linux/Mac native version. Mac developers need Parallels / UTM / VMware with a Windows 10/11 VM.
- **TallyPrime Educational Mode** runs without a license but blocks new data entry on the 1st, 2nd, and 31st of any month. For dev, set the VM clock to the 10th if you hit a block, or buy a single-user license (~₹18k/year) for the team.
- **Add Supabase Auth → URL Configuration → Additional Redirect URLs → `bale://auth-callback`** _before_ writing OAuth code, or you'll spend an hour debugging silent redirect failures.
- **Local Supabase**: `npx supabase start` runs the full stack. RPCs available at `http://127.0.0.1:54321/rest/v1/rpc/<name>` — test in Postman with the local anon key + a real user JWT.
- **Type regeneration**: run `npm run db:types` after every migration that adds tables, columns, or RPCs so the typed Supabase client picks up the new shapes.

**Phase 1 (weeks 1–2): DB + Web**

- All Supabase migration edits + new sync migration + RPCs
- Web settings page (system ledger names + Connected Devices) + status badges
- No Electron yet — verifiable end-to-end via SQL inserts simulating Electron

**Phase 2 (weeks 3–5): Electron MVP**

- OAuth + device registration
- Settings + Test Connection
- XML builders for: partner ledger, unit, stock item, sales voucher (the smallest end-to-end path)
- Job runner with master → voucher dependency

**Phase 3 (weeks 6–7): Voucher coverage**

- Purchase, Receipt, Payment, CN, DN builders
- Tally.imp parsing and per-record error mapping
- Cancel + retry UX

**Phase 4 (week 8): Hardening**

- EV code signing + auto-update (electron-updater)
- Crash reporting (Sentry)
- Pilot with one design-partner customer
