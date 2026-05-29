# One-Way Data Sync from a Next.js + Supabase App into TallyPrime: A Practical Architecture Guide

## TL;DR
- **The only reliable path is XML or JSON over HTTP to TallyPrime's built-in HTTP server on port 9000, running on the client's local machine.** Tally Solutions does not host a cloud REST API; the "TallyPrime API Explorer" is a sandbox for crafting payloads that you POST to a local Tally instance.
- **For a cloud-hosted Next.js/Supabase app, the proven production pattern is a small Windows "desktop bridge" agent** that sits next to Tally on the customer's PC, polls Supabase (or your queue) for pending vouchers, and pushes them via XML/JSON to `http://localhost:9000`. Suvit/Vyapar TaxOne, Zoho Inventory's Octfis connector, and EasyReports all use exactly this pattern.
- **Skip ODBC and TDL for sync.** TallyPrime 4.0 deprecated ODBC in favour of the HTTP interface, and TDL (Tally Definition Language) is a customisation language inside Tally — not an import API. Stick to XML import (mature, well-documented) and adopt JSON only when all your clients are on TallyPrime Release 7.0+ (released December 19, 2025, per help.tallysolutions.com).

## Key Findings

1. **TallyPrime's integration surface is a local HTTP server on port 9000 that accepts an `<ENVELOPE>`-based XML or (from Release 7.0) JSON payload.** Tally's own developer reference states: *"Tally can act as an HTTP Server capable of receiving an XML Request and responding with an XML Response ... if the XML request is sent to TallyPrime on the port 9000 on the local system, the URL `http://localhost:9000` is specified."*
2. **The XML grammar is small and stable.** For imports it is `<ENVELOPE> → <HEADER> (TALLYREQUEST=Import, TYPE=Data, ID=Vouchers|All Masters) → <BODY> → <DESC> → <DATA> → <TALLYMESSAGE> → <VOUCHER|LEDGER|STOCKITEM|GROUP|UNIT…>`. Dates must be `YYYYMMDD`; `&`, `<`, `>`, `"` in narrations must be XML-escaped or imports fail silently. Behaviour on duplicates is controlled by `DupModify | DupIgnoreCombine | DupCombine`.
3. **There is no official, Tally-hosted cloud REST API.** Tally's integration page lists four methods — "JSON (REST API-style integrations)", "XML", "ODBC", and "File-based" — but all four terminate at a *local* Tally process. The TallyPrime API Explorer is an interactive sandbox to construct and validate those requests, not a hosted endpoint.
4. **An official "Tally Connector" exists, but it is a desktop developer/diagnostic tool**, not a server SDK. From TallyHelp: *"Tally Connector allows to send the XML request to Tally.ERP 9 or any application, and display the response received in the Response window."* The name is also used generically for third-party bridge agents.
5. **The most production-ready open-source SDK is C#: `Accounting-Companion/TallyConnector` on NuGet** (51 GitHub stars, last pushed within the last month as of May 2026). It abstracts XML construction/parsing behind C# objects: *"primeService.Setup(\"http://localhost\", 9000); var ledgers = await primeService.GetLedgersAsync();"* There is no equivalent maintained Node/TypeScript SDK on npm — the npm package literally named `tally` is an unrelated JS template engine.
6. **For Node/TypeScript you build XML/JSON over HTTP by hand**, using `fetch`/axios + a builder like `fast-xml-parser`. The closest Node project, `dhananjay1405/tally-database-loader`, is *Tally → DB only*; its sibling `dhananjay1405/tally-mcp-server` (TallyPrime 7.1-compatible, confirmed by the download link "tally-mcp-server-v7.1.zip" in the GitHub repo) wraps the same XML port for LLM/MCP use.
7. **TallyPrime 4.0 onward, ODBC has been deprecated in favour of the HTTP interface** (Terra Insight: *"It is deprecated from TallyPrime 4.0 in favour of the HTTP interface"*), and CData/ODBC routes are read-only and unsuitable for writing vouchers. Direct DB writes are not supported — Tally's data files are a proprietary on-disk format and writing to them externally will corrupt the company.
8. **TDL is a customisation DSL, not an import API.** It can define custom Import Object/Import File definitions for SDF (fixed-width) imports and can wrap custom validation around XML imports, but you do not need TDL for the basic ENVELOPE-based XML import flow — it is built into TallyPrime.
9. **The "desktop bridge agent" is the dominant production architecture used by every major Indian SaaS that writes to Tally.** Suvit/Vyapar TaxOne ships *"The Vyapar TaxOne Connector [that] acts as a bridge between your Tally software and Vyapar TaxOne, ensuring seamless data processing"*; Zoho Inventory's Octfis Techno LLP connector ships a Windows app that *"[brings] customer and vendor details, sales and purchase transactions, item lists, and charts of accounts to Tally in a few easy clicks"*; EasyReports' agent *"syncs all data from Tally. Thereafter only incremental data is fetched."*
10. **TallyPrime Release 7.0 (released December 19, 2025) added native JSON import/export** alongside XML, per Tally's release notes: *"You can now export and import data in JSON format in TallyPrime, in addition to other formats such as Excel and XML."* It also adds JSONEx (*"an enhanced and structured format designed to augment and refine the standard JSON"*) and JSON over the Tally Connector. Use XML for backward compatibility with installed base; offer JSON as a fast path for upgraded clients.
11. **The market opportunity is real**: Anjina Murthy, Director–Technology, Tally Solutions, stated in Analytics India Magazine: *"Tally Solutions accounts for nearly 75% market share in the business software market for small and medium enterprises (SMEs)."* Tally Solutions' own GITEX 2024 press materials and MD Tejas Goenka's April 2025 PTI interview cite *"over 2.5 million businesses worldwide… more than 7 million users… in over 100 countries"*.
12. **Network access is the hardest engineering problem, not XML.** Tally runs on the customer's LAN, not on a public endpoint. A cloud Next.js app cannot reach `localhost:9000` on a customer's PC without (a) a desktop helper, (b) a reverse tunnel (ngrok / Cloudflare Tunnel), or (c) hosting Tally itself on a Windows VPS with the customer's licence.

## Details

### 1. The XML import contract

A minimal sales-voucher import (this is the canonical shape from Tally Help):

```xml
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Vouchers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>Acme Pvt Ltd</SVCURRENTCOMPANY>
      </STATICVARIABLES>
    </DESC>
    <DATA>
      <TALLYMESSAGE xmlns:UDF="TallyUDF">
        <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">
          <DATE>20260520</DATE>
          <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
          <VOUCHERNUMBER>INV-1042</VOUCHERNUMBER>
          <PARTYLEDGERNAME>ABC Company Limited</PARTYLEDGERNAME>
          <PERSISTEDVIEW>Invoice Voucher View</PERSISTEDVIEW>
          <ISINVOICE>Yes</ISINVOICE>
          <LEDGERENTRIES.LIST> ... party debit/credit, CGST, SGST, IGST ledgers ... </LEDGERENTRIES.LIST>
          <ALLINVENTORYENTRIES.LIST> ... stock item, qty, rate, HSN ... </ALLINVENTORYENTRIES.LIST>
        </VOUCHER>
      </TALLYMESSAGE>
    </DATA>
  </BODY>
</ENVELOPE>
```

POST it as `text/xml` (UTF‑8) or UTF‑16 (for ₹/€ symbols) to `http://<tally-host>:9000`. Tally returns an XML response logging created/altered/ignored counts and `<LINEERROR>` entries; a full log is also written to `Tally.imp` in the Tally installation folder. Common `LINEERROR` text you will see in real life:

- *"Voucher totals do not match! Dr: 20,394.00 Dr Cr: 20,395.00 Cr Diff: 1.00 Cr"* — rounding mismatch after CGST/SGST/IGST calculation.
- *"No entries in Voucher!"* — usually a missing `<PERSISTEDVIEW>` tag, or zero-valued transaction with the feature disabled.
- *"Following masters do not exist"* — you imported a voucher that references a ledger/stock item Tally doesn't have yet. **Always create masters before vouchers** in the same import or in a prior pass.

Other request types:
- `TALLYREQUEST=Import, ID=All Masters` for ledgers/groups/stock items/units.
- `TALLYREQUEST=Export, ID=List of Accounts | Day Book | Trial Balance | …` to read back — useful for confirming a write, fetching the next voucher number, or pulling master GUIDs for idempotent updates.
- `TALLYREQUEST=Execute, TYPE=TDLAction, ID=Sync` for sync actions.

Pre-requisites checklist on the client's TallyPrime (from Tally Help and corroborated by community guides):
1. F1 → Settings → Connectivity → enable Client/Server configuration as **Server** on port 9000.
2. A company must be loaded; `<SVCURRENTCOMPANY>` in the request must match exactly (case-sensitive) — or the company must be the only loaded one.
3. The feature toggles enabled in the source company (e.g., "Maintain Batch-wise details", "Multi-currency", GST) must also be enabled in the target company, otherwise some tags are ignored.

### 2. Authentication and security reality

The `localhost:9000` HTTP server has **no built-in authentication header** — it relies on network reachability (it's `127.0.0.1` by default; binding it to a LAN address is the user's choice). Tally's company-level password protection (Users & Passwords, Tally.NET ID) protects the UI and remote-access feature, **not** the XML port. Implications:
- Never expose port 9000 to the public internet.
- If you tunnel to it, layer your own auth (mTLS, signed JWTs verified by the desktop agent, an ngrok edge with Basic Auth or OAuth) above the port.
- The customer's IT must allow Windows Firewall inbound for Tally on 9000 (or whatever port you choose).

### 3. The five viable architectures (ranked)

**A. Desktop bridge agent (RECOMMENDED for SaaS)** — A small Windows tray app (Electron/.NET/Go) on the customer's PC. It:
1. Authenticates the customer to your Supabase backend (Supabase Auth + RLS-scoped service token).
2. Long-polls or subscribes (Supabase Realtime) to a `pending_voucher_jobs` table filtered to that customer.
3. For each job, fetches data, builds the XML/JSON envelope, POSTs to `http://localhost:9000`.
4. Parses Tally's response, writes status back to Supabase (`pushed | failed | retry`), keeps the raw `Tally.imp` snippet for diagnostics.

This is what Suvit/Vyapar TaxOne, Zoho Inventory (via Octfis), EasyReports, and most CA-tool vendors do. It works behind NAT, requires no inbound firewall rules, and lets the customer pause sync trivially.

**B. Self-hosted middleman service on a Windows VM next to Tally on the customer's LAN.** Same as (A), but a headless Windows service instead of a tray app — better for office-server Tally installs, worse for single-user PCs.

**C. Reverse tunnel (ngrok / Cloudflare Tunnel / Tailscale Funnel) exposing port 9000 to your cloud.** Your Next.js API routes POST directly. Simplest to build, but: (i) every customer needs an ngrok/tunnel install with a stable URL or your DB has to track ephemeral URLs; (ii) you must layer auth (Tally itself has none on 9000); (iii) Tally must be running. Acceptable for a single-client custom build, painful at SaaS scale.

**D. File-drop (XML/JSON) into a shared folder + manual `Alt+O` import.** Lowest fidelity: Tally does not natively watch a folder. From Tally Help: *"Press Alt+O (Import) > select Masters or Transactions ... File Format: XML (Data Interchange) ... By default, the export location is the TallyPrime installation folder, which is also the default import location."* You can semi-automate via a TDL action or a Windows scheduled task that scripts keystrokes, but neither is reliable for high-volume sync.

**E. Host TallyPrime itself on a Windows cloud VM (Tally on Cloud).** Customer's Tally now has a routable address; your Next.js POSTs XML directly. This shifts the licensing/RDP burden onto the customer. Tally Solutions' own cloud offering, hosted on Oracle Cloud Infrastructure (OCI), confirms verbatim: *"Subscription plans start as low as INR 600 per month, making it accessible to businesses of all sizes."* Good for customers who already use Tally on Cloud; not something you should require.

### 4. Where TDL fits (and where it doesn't)

TDL is a non-procedural DSL used to extend Tally's UI, reports, and import behaviour. For one-way sync **you generally do not need TDL**, because XML/JSON import is built in. You *may* want a small custom TDL when:
- You need to validate inbound vouchers against a business rule before Tally accepts them.
- You need to receive SDF (fixed-width) text imports via `Import Object` + `Import File` definitions instead of XML.
- You want to expose a custom report so your Next.js app can read back something Tally doesn't return by default (e.g., outstanding by cost-centre).

Writing TDL adds friction: the file must be loaded at Tally startup (`F4 → Manage Local TDL`), edited as plain text, and re-loaded on each change. Treat it as an optional layer, not the primary integration.

### 5. Third-party middleware to consider buying instead of building

If your customer footprint is small, you may be better off integrating with an existing connector than running your own desktop agent:
- **Suvit / Vyapar TaxOne** (suvit.io / taxone.vyapar.com) — Indian CA-first automation with a Tally desktop bridge.
- **Octfis Techno LLP Zoho Inventory Tally Connector** — official Zoho-listed connector.
- **EasyReports / TallyBI** (tallybi.in) — strong on Tally→BI reads, also writes.
- **Excel2Tally, ecom2Tally** — Excel/CSV/XML bulk-import wrappers.
- **CData ODBC/JDBC drivers** — robust *reads*, limited *writes*; deprecated against Tally HTTP from Release 4.0.
- **TallyConnector NuGet (C#)** — if your bridge agent is .NET, this is the highest-leverage option; it handles XML construction/parsing for masters, vouchers, custom TDL reports, and custom fields.

### 6. GST-specific gotchas

GST in voucher XML is not a separate tag but a function of three things being correct in Tally first:
1. The party ledger has `GSTIN`, `State`, and `Registration Type` configured.
2. The stock item / sales ledger has HSN/SAC and a GST rate (or "Tax Type" + "Taxability").
3. You include the right combination of `CGST` + `SGST` (intra-state) or `IGST` (inter-state) ledgers in `<LEDGERENTRIES.LIST>` — Tally picks the rate from the master configuration; passing only an `AMOUNT` is enough for the standard case.

If `Place of Supply` is wrong, Tally still imports but flags the voucher under "Uncertain Transactions" in GSTR-1; this is silently invisible to your sync log. Add a post-import check that pulls the Uncertain Transactions report via XML export and surfaces the count to your UI.

E-Invoice and E-Way Bill generation (mandatory for many GSTINs) are not part of XML import — they happen inside Tally via the connected GST portal flow. From Release 3.0 onward, Tally also supports cancelling e-Invoice + e-Way Bill + voucher together; expose a "cancel" action in your UI that posts an XML `ACTION="Delete"` voucher only after the customer has cancelled e-Invoice from Tally.

### 7. Idempotency, ordering, and error handling

- **Voucher Number** is your primary idempotency key. Set the Tally voucher type to "Manual" with "Prevent duplicates = Yes" so re-posting the same `VOUCHERNUMBER` is rejected rather than duplicated. The community-documented failure mode: *"In case your voucher numbering method is automatic then there is a high possibility that your data gets duplicated when the same XML or voucher has been imported in Tally."*
- **Always send masters before transactions**. Build a job DAG: `groups → ledgers + stock items → vouchers`. A failed voucher because of a missing ledger is the #1 support ticket category.
- **Read `Tally.imp`** for the real error after every POST. The XML response sometimes claims success at the envelope level while individual `<LINEERROR>` entries indicate per-voucher failures.
- **Set "Ignore errors during data import = Yes"** so a single bad voucher in a batch doesn't abort the rest. Reconcile via the response.
- **Re-encoding**: bank statement dates often arrive as `DD/MM/YYYY` and must be converted to `YYYYMMDD`. Narrations with `&`, `<`, `>`, `"` must be XML-entity-escaped.

## Recommendations

**Phase 1 — MVP (weeks 1–4): single-tenant tunnel.** Ship a working pilot to one design-partner customer by:
1. Asking them to enable Tally's HTTP server on port 9000 and run Cloudflare Tunnel / ngrok with Basic Auth.
2. Building a Next.js API route `/api/push-to-tally` that constructs XML envelopes server-side and POSTs through the tunnel.
3. Writing a `tally.ts` module that handles only Ledger, Stock Item, and Sales Voucher creation. Use `fast-xml-parser` for build/parse. Persist every request, response, and `Tally.imp` excerpt to Supabase.

Success threshold: import 50 vouchers/day with <1% failure rate and a visible error log in your UI.

**Phase 2 — Scale to SaaS (weeks 5–12): ship a desktop bridge.**
1. Build an Electron or .NET 8 tray app, signed with an EV code-signing cert (Tally's customers are accountants — unsigned binaries will be rejected).
2. The agent authenticates to Supabase with the customer's account (Supabase Auth + an "install token" exchange), subscribes to a `tally_jobs` table via Supabase Realtime, and processes jobs FIFO.
3. Use Supabase RLS so each agent sees only its own customer's jobs.
4. Ship auto-update from day one (Squirrel/Electron-Updater or .NET ClickOnce).
5. Add a "Test connection" button that hits Tally's `Company Info` export to verify port, company name, and feature flags.

Switch criterion from Phase 1 to Phase 2: ≥3 customers requesting installation, or the tunnel solution causing >2 hours/week of support overhead.

**Phase 3 — Hardening (months 4–6):**
- Add JSON support for clients on TallyPrime 7.0+; fall back to XML otherwise. Detect version via `<ENVELOPE><HEADER><ID>Company Info</ID></HEADER>` response.
- Add bulk batching: Tally happily accepts hundreds of `<TALLYMESSAGE>` blocks per request, which is dramatically faster than per-voucher calls.
- Replay queue: keep a 30-day journal of payloads so a customer who took Tally down for repair can drain the queue on reconnect.
- Surface Tally's "Uncertain Transactions" / GSTR-1 mismatch count back into your UI so accountants can fix GST data in your app instead of Tally.

**Do not** invest in:
- A direct DB writer to Tally's company data folder — unsupported and will corrupt data.
- ODBC writes — deprecated since TallyPrime 4.0, read-only in practice.
- A custom TDL plugin as the *primary* mechanism — adds installation friction. Use TDL only for niche read-back reports.

**Reconsider the architecture if** any of these become true:
- Tally Solutions ships a hosted REST API (watch tallysolutions.com/integration release notes). Currently it does not exist; the "TallyPrime API Explorer" is only a sandbox for crafting payloads.
- A first-class npm SDK for the Tally XML/JSON port emerges with >500 GitHub stars and active maintenance. None exists today.
- More than 30% of your customers move to Tally on Cloud / official TallyPrime on OCI, at which point Architecture (E) — direct cloud-to-cloud POSTs — becomes the default and you can retire the agent.

## Caveats

- **Vendor lock-in to a moving target.** Tally Solutions ships breaking changes (e.g., the JSON entity-code requirement introduced in Release 7.0 for AED/SAR currencies; some XML tags renamed between Tally.ERP 9 and TallyPrime). Pin the customer's Tally version in your DB and regression-test the XML against each supported release.
- **"Tally Connector" is an overloaded term.** Tally Solutions' own utility (a developer XML-poster), Suvit's bridge agent, the Accounting-Companion C# library, and generic third-party agents all share the name. Disambiguate in customer-facing docs.
- **Tally's installed-base figures come from Tally Solutions and its partners.** The 75% Indian SMB share is the company's Director–Technology speaking to Analytics India Magazine; the "2.5M businesses / 7M users / 100+ countries" figures come from Tally's own GITEX 2024 press releases and MD Tejas Goenka's April 2025 PTI interview. Older partner sites still cite outdated numbers like "2.2M businesses, 16M users" — prefer the current company-sourced figures and treat them as directionally correct rather than independently audited.
- **Speculative items in some "TallyPrime cloud RESTful APIs" marketing pages** (Suvit, Nakshatra, etc.) describe a future of "modern TallyPrime cloud offerings provide RESTful APIs"; this is forward-looking language. As of May 2026, Tally's own developer reference still terminates all integrations at a local HTTP server.
- **TallyPrime Release 6.0 "Connected Banking" and Release 7.0 "PrimeBanking"** appear in some sources alongside JSON support; these features are about Tally talking to banks, not about exposing a public API to your app. Don't confuse them.
- **Multi-company complexity**: if a customer runs two companies in Tally, the agent must `Select Company` before each push (via XML `<SVCURRENTCOMPANY>` in `<STATICVARIABLES>`) or you risk writing to the wrong books.
- **Edit-Log edition**: customers on the TallyPrime Edit Log SKU have a permanent audit trail of every change. Programmatic alterations of a posted voucher are visible to auditors — be transparent with the customer about what your sync rewrites.