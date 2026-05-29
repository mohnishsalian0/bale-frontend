-- Bale Backend - Tally Sync
-- Desktop bridge integration: connected devices, sync jobs, per-record audit, and RPCs

-- =====================================================
-- CONNECTED DESKTOP INSTALLATIONS
-- =====================================================

CREATE TABLE tally_sync_devices (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    user_id UUID NOT NULL DEFAULT get_jwt_user_id(),

    device_name VARCHAR(100),
    device_fingerprint VARCHAR(64),

    paired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,

    UNIQUE (user_id, device_fingerprint)
);

CREATE INDEX idx_tally_sync_devices_company ON tally_sync_devices(company_id);
CREATE INDEX idx_tally_sync_devices_user ON tally_sync_devices(user_id);
CREATE INDEX idx_tally_sync_devices_active
    ON tally_sync_devices(company_id, user_id)
    WHERE revoked_at IS NULL;

-- =====================================================
-- SYNC JOB (ONE PER "SYNC NOW" CLICK)
-- =====================================================

CREATE TYPE tally_sync_job_status_enum AS ENUM ('running', 'completed', 'failed', 'cancelled');

CREATE TABLE tally_sync_jobs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    device_id UUID NOT NULL REFERENCES tally_sync_devices(id),

    date_from DATE NOT NULL,
    date_to DATE NOT NULL,

    status tally_sync_job_status_enum NOT NULL DEFAULT 'running',
    totals JSONB,                       -- {masters: {...}, vouchers: {...}}

    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    created_by UUID DEFAULT get_jwt_user_id()
);

CREATE INDEX idx_tally_sync_jobs_company ON tally_sync_jobs(company_id, started_at DESC);
CREATE INDEX idx_tally_sync_jobs_device ON tally_sync_jobs(device_id);

-- =====================================================
-- PER-RECORD AUDIT TRAIL (APPEND-ONLY)
-- =====================================================

CREATE TYPE tally_sync_record_type_enum AS ENUM (
    'invoice', 'payment', 'adjustment', 'ledger', 'product'
);

CREATE TYPE tally_sync_item_status_enum AS ENUM ('succeeded', 'failed', 'skipped');

CREATE TABLE tally_sync_job_items (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES tally_sync_jobs(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),

    record_type tally_sync_record_type_enum NOT NULL,
    record_id UUID NOT NULL,
    record_identifier VARCHAR(100),     -- voucher number / ledger name

    status tally_sync_item_status_enum NOT NULL,
    error_text TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_job_items_job ON tally_sync_job_items(job_id);
CREATE INDEX idx_sync_job_items_record ON tally_sync_job_items(record_type, record_id);

-- =====================================================
-- RLS
-- =====================================================

ALTER TABLE tally_sync_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tally_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tally_sync_job_items ENABLE ROW LEVEL SECURITY;

-- Devices: scoped to company + user (a user only manages their own devices)
CREATE POLICY "Users can view their own devices"
ON tally_sync_devices FOR SELECT TO authenticated
USING (company_id = get_jwt_company_id() AND user_id = get_jwt_user_id());

CREATE POLICY "Users can register their own devices"
ON tally_sync_devices FOR INSERT TO authenticated
WITH CHECK (company_id = get_jwt_company_id() AND user_id = get_jwt_user_id());

CREATE POLICY "Users can update their own devices"
ON tally_sync_devices FOR UPDATE TO authenticated
USING (company_id = get_jwt_company_id() AND user_id = get_jwt_user_id())
WITH CHECK (company_id = get_jwt_company_id() AND user_id = get_jwt_user_id());

CREATE POLICY "Users can delete their own devices"
ON tally_sync_devices FOR DELETE TO authenticated
USING (company_id = get_jwt_company_id() AND user_id = get_jwt_user_id());

-- Jobs: visible to the whole company (admin/audit)
CREATE POLICY "Company members can view sync jobs"
ON tally_sync_jobs FOR SELECT TO authenticated
USING (company_id = get_jwt_company_id());

CREATE POLICY "Company members can create sync jobs"
ON tally_sync_jobs FOR INSERT TO authenticated
WITH CHECK (company_id = get_jwt_company_id());

CREATE POLICY "Company members can update sync jobs"
ON tally_sync_jobs FOR UPDATE TO authenticated
USING (company_id = get_jwt_company_id())
WITH CHECK (company_id = get_jwt_company_id());

-- Job items: visible to the whole company
CREATE POLICY "Company members can view sync job items"
ON tally_sync_job_items FOR SELECT TO authenticated
USING (company_id = get_jwt_company_id());

CREATE POLICY "Company members can insert sync job items"
ON tally_sync_job_items FOR INSERT TO authenticated
WITH CHECK (company_id = get_jwt_company_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON tally_sync_devices TO authenticated;
GRANT SELECT, INSERT, UPDATE ON tally_sync_jobs TO authenticated;
GRANT SELECT, INSERT ON tally_sync_job_items TO authenticated;

-- =====================================================
-- RPC: get_tally_sync_payload
-- Returns invoices/payments/adjustments in the given date range plus their
-- master closure (party ledgers, products).
-- =====================================================

CREATE OR REPLACE FUNCTION get_tally_sync_payload(
    p_date_from DATE,
    p_date_to DATE,
    p_force_resync BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_company_id UUID := get_jwt_company_id();
    v_invoices JSONB;
    v_payments JSONB;
    v_adjustments JSONB;
    v_partner_ledgers JSONB;
    v_products JSONB;
BEGIN
    -- Require at least one active paired device for this user/company
    IF NOT EXISTS (
        SELECT 1 FROM tally_sync_devices
        WHERE user_id = get_jwt_user_id()
          AND company_id = v_company_id
          AND revoked_at IS NULL
    ) THEN
        RAISE EXCEPTION 'No active paired Tally device for this user';
    END IF;

    -- Invoices (with items)
    SELECT COALESCE(jsonb_agg(row), '[]'::jsonb)
    INTO v_invoices
    FROM (
        SELECT
            to_jsonb(i.*) || jsonb_build_object(
                'items', COALESCE((
                    SELECT jsonb_agg(to_jsonb(ii.*))
                    FROM invoice_items ii
                    WHERE ii.invoice_id = i.id
                ), '[]'::jsonb)
            ) AS row
        FROM invoices i
        WHERE i.company_id = v_company_id
          AND i.deleted_at IS NULL
          AND i.is_cancelled = FALSE
          AND i.invoice_date BETWEEN p_date_from AND p_date_to
          AND (p_force_resync OR i.tally_sync_status IN ('pending', 'failed'))
    ) sub;

    -- Payments (with allocations; allocations include referenced invoice_number)
    SELECT COALESCE(jsonb_agg(row), '[]'::jsonb)
    INTO v_payments
    FROM (
        SELECT
            to_jsonb(p.*) || jsonb_build_object(
                'allocations', COALESCE((
                    SELECT jsonb_agg(
                        to_jsonb(pa.*) || jsonb_build_object(
                            'invoice_number', inv.invoice_number
                        )
                    )
                    FROM payment_allocations pa
                    LEFT JOIN invoices inv ON inv.id = pa.invoice_id
                    WHERE pa.payment_id = p.id
                      AND pa.is_cancelled = FALSE
                ), '[]'::jsonb)
            ) AS row
        FROM payments p
        WHERE p.company_id = v_company_id
          AND p.deleted_at IS NULL
          AND p.is_cancelled = FALSE
          AND p.payment_date BETWEEN p_date_from AND p_date_to
          AND (p_force_resync OR p.tally_sync_status IN ('pending', 'failed'))
    ) sub;

    -- Adjustment notes (with items + referenced invoice_number)
    SELECT COALESCE(jsonb_agg(row), '[]'::jsonb)
    INTO v_adjustments
    FROM (
        SELECT
            to_jsonb(a.*) || jsonb_build_object(
                'invoice_number', inv.invoice_number,
                'items', COALESCE((
                    SELECT jsonb_agg(to_jsonb(ai.*))
                    FROM adjustment_note_items ai
                    WHERE ai.adjustment_note_id = a.id
                ), '[]'::jsonb)
            ) AS row
        FROM adjustment_notes a
        LEFT JOIN invoices inv ON inv.id = a.invoice_id
        WHERE a.company_id = v_company_id
          AND a.deleted_at IS NULL
          AND a.is_cancelled = FALSE
          AND a.adjustment_date BETWEEN p_date_from AND p_date_to
          AND (p_force_resync OR a.tally_sync_status IN ('pending', 'failed'))
    ) sub;

    -- Master closure: party ledgers referenced by the selected vouchers
    -- (inline linked partner_type / names so the desktop can label rows)
    SELECT COALESCE(jsonb_agg(row), '[]'::jsonb)
    INTO v_partner_ledgers
    FROM (
        SELECT
            to_jsonb(l.*) || jsonb_build_object(
                'partner_type', pt.partner_type,
                'partner_first_name', pt.first_name,
                'partner_last_name', pt.last_name,
                'partner_company_name', pt.company_name
            ) AS row
        FROM ledgers l
        LEFT JOIN partners pt ON pt.id = l.partner_id
        WHERE l.company_id = v_company_id
          AND l.deleted_at IS NULL
          AND l.ledger_type = 'party'
          AND l.id IN (
          SELECT DISTINCT party_ledger_id FROM invoices
            WHERE company_id = v_company_id
              AND deleted_at IS NULL AND is_cancelled = FALSE
              AND invoice_date BETWEEN p_date_from AND p_date_to
              AND (p_force_resync OR tally_sync_status IN ('pending', 'failed'))
          UNION
          SELECT DISTINCT party_ledger_id FROM payments
            WHERE company_id = v_company_id
              AND deleted_at IS NULL AND is_cancelled = FALSE
              AND payment_date BETWEEN p_date_from AND p_date_to
              AND (p_force_resync OR tally_sync_status IN ('pending', 'failed'))
          UNION
          SELECT DISTINCT party_ledger_id FROM adjustment_notes
            WHERE company_id = v_company_id
              AND deleted_at IS NULL AND is_cancelled = FALSE
              AND adjustment_date BETWEEN p_date_from AND p_date_to
              AND (p_force_resync OR tally_sync_status IN ('pending', 'failed'))
          )
    ) sub;

    -- Master closure: products referenced by selected invoice/adjustment items
    -- (inline product attributes grouped by material/color so the desktop can
    -- render the same info line as the web list view)
    SELECT COALESCE(jsonb_agg(row), '[]'::jsonb)
    INTO v_products
    FROM (
        SELECT
            to_jsonb(p.*) || jsonb_build_object(
                'materials', COALESCE((
                    SELECT jsonb_agg(a.name ORDER BY a.name)
                    FROM product_attribute_assignments paa
                    JOIN attributes a ON a.id = paa.attribute_id
                    WHERE paa.product_id = p.id AND a.group_name = 'material'
                ), '[]'::jsonb),
                'colors', COALESCE((
                    SELECT jsonb_agg(a.name ORDER BY a.name)
                    FROM product_attribute_assignments paa
                    JOIN attributes a ON a.id = paa.attribute_id
                    WHERE paa.product_id = p.id AND a.group_name = 'color'
                ), '[]'::jsonb)
            ) AS row
        FROM products p
        WHERE p.company_id = v_company_id
          AND p.deleted_at IS NULL
          AND p.id IN (
              SELECT DISTINCT ii.product_id
                FROM invoice_items ii
                JOIN invoices i ON i.id = ii.invoice_id
                WHERE i.company_id = v_company_id
                  AND i.deleted_at IS NULL AND i.is_cancelled = FALSE
                  AND i.invoice_date BETWEEN p_date_from AND p_date_to
                  AND (p_force_resync OR i.tally_sync_status IN ('pending', 'failed'))
              UNION
              SELECT DISTINCT ai.product_id
                FROM adjustment_note_items ai
                JOIN adjustment_notes a ON a.id = ai.adjustment_note_id
                WHERE a.company_id = v_company_id
                  AND a.deleted_at IS NULL AND a.is_cancelled = FALSE
                  AND a.adjustment_date BETWEEN p_date_from AND p_date_to
                  AND (p_force_resync OR a.tally_sync_status IN ('pending', 'failed'))
          )
    ) sub;

    RETURN jsonb_build_object(
        'invoices', v_invoices,
        'payments', v_payments,
        'adjustments', v_adjustments,
        'partner_ledgers', v_partner_ledgers,
        'products', v_products
    );
END;
$$;

-- =====================================================
-- RPC: create_tally_sync_job
-- =====================================================

CREATE OR REPLACE FUNCTION create_tally_sync_job(
    p_device_id UUID,
    p_date_from DATE,
    p_date_to DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_job_id UUID;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM tally_sync_devices
        WHERE id = p_device_id
          AND user_id = get_jwt_user_id()
          AND company_id = get_jwt_company_id()
          AND revoked_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Device not found or revoked';
    END IF;

    INSERT INTO tally_sync_jobs (device_id, date_from, date_to)
    VALUES (p_device_id, p_date_from, p_date_to)
    RETURNING id INTO v_job_id;

    RETURN v_job_id;
END;
$$;

-- =====================================================
-- RPC: mark_tally_sync_results
-- p_results: [{ record_type, record_id, record_identifier, status, error_text, tally_excerpt }]
-- Updates per-record sync status on source tables and bulk-inserts job item rows.
-- =====================================================

CREATE OR REPLACE FUNCTION mark_tally_sync_results(
    p_job_id UUID,
    p_results JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_company_id UUID := get_jwt_company_id();
    v_result JSONB;
    v_record_type TEXT;
    v_record_id UUID;
    v_status TEXT;
    v_error TEXT;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM tally_sync_jobs
        WHERE id = p_job_id AND company_id = v_company_id
    ) THEN
        RAISE EXCEPTION 'Sync job not found';
    END IF;

    FOR v_result IN SELECT * FROM jsonb_array_elements(p_results)
    LOOP
        v_record_type := v_result->>'record_type';
        v_record_id := (v_result->>'record_id')::UUID;
        v_status := v_result->>'status';
        v_error := v_result->>'error_text';

        -- Update source table status (only for syncable types with status cols)
        IF v_status = 'succeeded' THEN
            IF v_record_type = 'invoice' THEN
                UPDATE invoices SET
                    tally_sync_status = 'synced',
                    tally_sync_error = NULL,
                    tally_synced_at = v_now,
                    tally_last_attempt_at = v_now
                WHERE id = v_record_id AND company_id = v_company_id;
            ELSIF v_record_type = 'payment' THEN
                UPDATE payments SET
                    tally_sync_status = 'synced',
                    tally_sync_error = NULL,
                    tally_synced_at = v_now,
                    tally_last_attempt_at = v_now
                WHERE id = v_record_id AND company_id = v_company_id;
            ELSIF v_record_type = 'adjustment' THEN
                UPDATE adjustment_notes SET
                    tally_sync_status = 'synced',
                    tally_sync_error = NULL,
                    tally_synced_at = v_now,
                    tally_last_attempt_at = v_now
                WHERE id = v_record_id AND company_id = v_company_id;
            ELSIF v_record_type = 'ledger' THEN
                UPDATE ledgers SET
                    tally_sync_status = 'synced',
                    tally_sync_error = NULL,
                    tally_synced_at = v_now,
                    tally_last_attempt_at = v_now
                WHERE id = v_record_id AND company_id = v_company_id;
            ELSIF v_record_type = 'product' THEN
                UPDATE products SET
                    tally_sync_status = 'synced',
                    tally_sync_error = NULL,
                    tally_synced_at = v_now,
                    tally_last_attempt_at = v_now
                WHERE id = v_record_id AND company_id = v_company_id;
            END IF;
        ELSIF v_status = 'failed' THEN
            IF v_record_type = 'invoice' THEN
                UPDATE invoices SET
                    tally_sync_status = 'failed',
                    tally_sync_error = v_error,
                    tally_last_attempt_at = v_now
                WHERE id = v_record_id AND company_id = v_company_id;
            ELSIF v_record_type = 'payment' THEN
                UPDATE payments SET
                    tally_sync_status = 'failed',
                    tally_sync_error = v_error,
                    tally_last_attempt_at = v_now
                WHERE id = v_record_id AND company_id = v_company_id;
            ELSIF v_record_type = 'adjustment' THEN
                UPDATE adjustment_notes SET
                    tally_sync_status = 'failed',
                    tally_sync_error = v_error,
                    tally_last_attempt_at = v_now
                WHERE id = v_record_id AND company_id = v_company_id;
            ELSIF v_record_type = 'ledger' THEN
                UPDATE ledgers SET
                    tally_sync_status = 'failed',
                    tally_sync_error = v_error,
                    tally_last_attempt_at = v_now
                WHERE id = v_record_id AND company_id = v_company_id;
            ELSIF v_record_type = 'product' THEN
                UPDATE products SET
                    tally_sync_status = 'failed',
                    tally_sync_error = v_error,
                    tally_last_attempt_at = v_now
                WHERE id = v_record_id AND company_id = v_company_id;
            END IF;
        END IF;
        -- 'skipped' and the 'unit' record_type: audit-only, no source-table update
    END LOOP;

    -- Bulk-insert audit rows
    INSERT INTO tally_sync_job_items (
        job_id, company_id, record_type, record_id,
        record_identifier, status, error_text
    )
    SELECT
        p_job_id,
        v_company_id,
        (r->>'record_type')::tally_sync_record_type_enum,
        (r->>'record_id')::UUID,
        r->>'record_identifier',
        (r->>'status')::tally_sync_item_status_enum,
        r->>'error_text'
    FROM jsonb_array_elements(p_results) r;
END;
$$;

-- =====================================================
-- RPC: finalize_tally_sync_job
-- =====================================================

CREATE OR REPLACE FUNCTION finalize_tally_sync_job(
    p_job_id UUID,
    p_status tally_sync_job_status_enum,
    p_totals JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_company_id UUID := get_jwt_company_id();
    v_device_id UUID;
BEGIN
    UPDATE tally_sync_jobs
    SET status = p_status,
        totals = p_totals,
        finished_at = NOW()
    WHERE id = p_job_id AND company_id = v_company_id
    RETURNING device_id INTO v_device_id;

    IF v_device_id IS NULL THEN
        RAISE EXCEPTION 'Sync job not found';
    END IF;

    UPDATE tally_sync_devices
    SET last_seen_at = NOW()
    WHERE id = v_device_id;
END;
$$;

-- =====================================================
-- RPC: get_tally_system_ledger_names
-- Returns a map of { system_name -> name } for every system-seeded ledger
-- (is_default = true) in the caller's company. The Electron app reads this
-- once per sync to learn the customer's chosen names for Sales, CGST, SGST,
-- IGST, etc. — these names are what get embedded in voucher XML.
-- Raises if the company has no system ledgers (likely missing seed data).
-- =====================================================

CREATE OR REPLACE FUNCTION get_tally_system_ledger_names()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_company_id UUID := get_jwt_company_id();
    v_result JSONB;
BEGIN
    SELECT jsonb_object_agg(system_name, name)
    INTO v_result
    FROM ledgers
    WHERE company_id = v_company_id
      AND is_default = true
      AND system_name IS NOT NULL
      AND deleted_at IS NULL;

    IF v_result IS NULL THEN
        RAISE EXCEPTION 'No system ledgers found for company %', v_company_id;
    END IF;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_tally_sync_payload(DATE, DATE, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION create_tally_sync_job(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_tally_sync_results(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION finalize_tally_sync_job(UUID, tally_sync_job_status_enum, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION get_tally_system_ledger_names() TO authenticated;
