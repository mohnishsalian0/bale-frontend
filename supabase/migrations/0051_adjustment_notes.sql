-- Bale Backend - Accounting: Adjustment Notes
-- Credit and debit notes for invoice adjustments

-- =====================================================
-- ADJUSTMENT TYPE ENUM
-- =====================================================

CREATE TYPE adjustment_type_enum AS ENUM ('credit', 'debit');

-- =====================================================
-- ADJUSTMENT NOTES TABLE
-- =====================================================

CREATE TABLE adjustment_notes (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),

    -- Adjustment identification
    adjustment_type adjustment_type_enum NOT NULL,
    sequence_number INTEGER NOT NULL,
    adjustment_number VARCHAR(50) NOT NULL, -- Generated: CN/2024-25/0001 or DN/2024-25/0001
    slug VARCHAR(50) NOT NULL, -- URL-safe: cn-1, dn-42

    -- Linked invoice and party
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    party_ledger_id UUID NOT NULL REFERENCES ledgers(id), -- Direct link for faster queries
    party_ledger_name VARCHAR(200), -- Snapshot from ledgers.name

    -- Counter ledger (Sales Return/Purchase Return account for double-entry)
    counter_ledger_id UUID NOT NULL REFERENCES ledgers(id),
    counter_ledger_name VARCHAR(200), -- Snapshot from ledgers.name

    -- Adjustment details
    adjustment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    reason TEXT NOT NULL,

    -- Tax information
    tax_type tax_type_enum, -- gst = same state (CGST+SGST), igst = different state

    -- Financial amounts
    subtotal_amount DECIMAL(15,2) DEFAULT 0,

    -- GST breakdown (aggregated from items)
    total_cgst_amount DECIMAL(15,2) DEFAULT 0,
    total_sgst_amount DECIMAL(15,2) DEFAULT 0,
    total_igst_amount DECIMAL(15,2) DEFAULT 0,
    total_tax_amount DECIMAL(15,2) DEFAULT 0,

    -- Round-off and total
    round_off_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,

    -- Tally export tracking
    tally_guid VARCHAR(100),
    exported_to_tally_at TIMESTAMPTZ,

    -- Warehouse snapshot (taken at adjustment note creation time)
    warehouse_name VARCHAR(200),
    warehouse_address_line1 VARCHAR(200),
    warehouse_address_line2 VARCHAR(200),
    warehouse_city VARCHAR(100),
    warehouse_state VARCHAR(50),
    warehouse_country VARCHAR(100),
    warehouse_pincode VARCHAR(10),

    -- Party snapshot (taken at adjustment note creation time)
    party_name VARCHAR(200),
    party_display_name VARCHAR(200),
    party_email VARCHAR(100),
    party_phone VARCHAR(20),
    party_address_line1 VARCHAR(200),
    party_address_line2 VARCHAR(200),
    party_city VARCHAR(100),
    party_state VARCHAR(50),
    party_country VARCHAR(100),
    party_pincode VARCHAR(10),
    party_gst_number VARCHAR(15),
    party_pan_number VARCHAR(10),

    -- Company snapshot (taken at adjustment note creation time)
    company_name VARCHAR(200),
    company_address_line1 VARCHAR(200),
    company_address_line2 VARCHAR(200),
    company_city VARCHAR(100),
    company_state VARCHAR(50),
    company_country VARCHAR(100),
    company_pincode VARCHAR(10),
    company_gst_number VARCHAR(15),
    company_pan_number VARCHAR(10),
    company_email VARCHAR(100),
    company_phone VARCHAR(20),

    -- Notes
    notes TEXT,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID DEFAULT get_jwt_user_id(),
    modified_by UUID,
    deleted_at TIMESTAMPTZ,

    -- Cancellation tracking
    is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID,
    cancellation_reason TEXT,

    UNIQUE(company_id, adjustment_type, sequence_number),
    UNIQUE(company_id, adjustment_number),
    UNIQUE(company_id, slug) -- Unique within company for URL routing
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_adjustment_notes_company_id ON adjustment_notes(company_id);
CREATE INDEX idx_adjustment_notes_adjustment_type ON adjustment_notes(company_id, adjustment_type);
CREATE INDEX idx_adjustment_notes_invoice ON adjustment_notes(invoice_id);
CREATE INDEX idx_adjustment_notes_party_ledger ON adjustment_notes(party_ledger_id);
CREATE INDEX idx_adjustment_notes_counter_ledger ON adjustment_notes(counter_ledger_id);
CREATE INDEX idx_adjustment_notes_warehouse ON adjustment_notes(warehouse_id);
CREATE INDEX idx_adjustment_notes_date ON adjustment_notes(company_id, adjustment_date);
CREATE INDEX idx_adjustment_notes_sequence_number ON adjustment_notes(company_id, sequence_number);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

CREATE TRIGGER update_adjustment_notes_updated_at
    BEFORE UPDATE ON adjustment_notes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_adjustment_notes_modified_by
    BEFORE UPDATE ON adjustment_notes
    FOR EACH ROW EXECUTE FUNCTION set_modified_by();

-- Auto-generate adjustment numbers with FY-aware sequence
CREATE OR REPLACE FUNCTION auto_generate_adjustment_number()
RETURNS TRIGGER AS $$
DECLARE
    v_fy_start INTEGER;
    v_fy_end INTEGER;
    v_prefix VARCHAR(10);
BEGIN
    -- Determine financial year (April 1 - March 31)
    IF EXTRACT(MONTH FROM NEW.adjustment_date) >= 4 THEN
        v_fy_start := EXTRACT(YEAR FROM NEW.adjustment_date)::INTEGER;
        v_fy_end := v_fy_start + 1;
    ELSE
        v_fy_end := EXTRACT(YEAR FROM NEW.adjustment_date)::INTEGER;
        v_fy_start := v_fy_end - 1;
    END IF;

    -- Set prefix based on adjustment type
    IF NEW.adjustment_type = 'credit' THEN
        v_prefix := 'CN';
    ELSE
        v_prefix := 'DN';
    END IF;

    -- Generate sequence number if not provided
    IF NEW.sequence_number IS NULL THEN
        NEW.sequence_number := get_next_sequence('adjustment_notes_' || NEW.adjustment_type, NEW.company_id);
    END IF;

    -- Generate adjustment number: CN/2024-25/0001
    NEW.adjustment_number := v_prefix || '/' ||
                            v_fy_start || '-' ||
                            SUBSTRING(v_fy_end::TEXT, 3, 2) || '/' ||
                            LPAD(NEW.sequence_number::TEXT, 4, '0');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_adjustment_number
    BEFORE INSERT ON adjustment_notes
    FOR EACH ROW EXECUTE FUNCTION auto_generate_adjustment_number();

-- Prevent creating adjustment note on cancelled invoice
CREATE OR REPLACE FUNCTION prevent_adjustment_on_cancelled_invoice()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_cancelled BOOLEAN;
BEGIN
    -- Check if invoice is cancelled
    SELECT is_cancelled INTO v_invoice_cancelled
    FROM invoices
    WHERE id = NEW.invoice_id;

    IF v_invoice_cancelled = TRUE THEN
        RAISE EXCEPTION 'Cannot create adjustment note - invoice is cancelled';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_adjustment_on_cancelled_invoice
    BEFORE INSERT ON adjustment_notes
    FOR EACH ROW EXECUTE FUNCTION prevent_adjustment_on_cancelled_invoice();

-- Trigger invoice reconciliation when adjustment note changes
CREATE OR REPLACE FUNCTION trigger_invoice_reconciliation_on_adjustment()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
BEGIN
    -- Get the affected invoice ID
    IF TG_OP = 'DELETE' THEN
        v_invoice_id := OLD.invoice_id;
    ELSE
        v_invoice_id := NEW.invoice_id;
    END IF;

    -- Touch the invoice to trigger reconcile_invoice_outstanding()
    -- The BEFORE UPDATE trigger will recalculate everything
    UPDATE invoices
    SET total_amount = total_amount  -- Dummy update to trigger reconciliation
    WHERE id = v_invoice_id;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reconcile_invoice_on_adjustment_change
    AFTER INSERT OR UPDATE OR DELETE ON adjustment_notes
    FOR EACH ROW EXECUTE FUNCTION trigger_invoice_reconciliation_on_adjustment();

-- Prevent adjustment note edit if cancelled or exported to Tally, validate cancellation
CREATE OR REPLACE FUNCTION prevent_adjustment_note_edit()
RETURNS TRIGGER AS $$
BEGIN
    -- Rule 1: Cannot edit a cancelled adjustment note
    IF OLD.is_cancelled = TRUE THEN
        RAISE EXCEPTION 'Cannot edit adjustment note % - adjustment note is cancelled', OLD.adjustment_number;
    END IF;

    -- Rule 2: Validate cancellation preconditions
    IF NEW.is_cancelled = TRUE AND OLD.is_cancelled = FALSE THEN
        -- Must provide cancellation reason
        IF NEW.cancellation_reason IS NULL OR TRIM(NEW.cancellation_reason) = '' THEN
            RAISE EXCEPTION 'Cancellation reason is required';
        END IF;
    END IF;

    -- Rule 3: Prevent editing if exported to Tally
    IF OLD.exported_to_tally_at IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot edit adjustment note % - already exported to Tally on %',
            OLD.adjustment_number, OLD.exported_to_tally_at::DATE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_adjustment_note_edit
    BEFORE UPDATE ON adjustment_notes
    FOR EACH ROW EXECUTE FUNCTION prevent_adjustment_note_edit();

-- Prevent adjustment note deletion if cancelled or exported to Tally
CREATE OR REPLACE FUNCTION prevent_adjustment_note_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Rule 1: Cannot delete a cancelled adjustment note
    IF OLD.is_cancelled = TRUE THEN
        RAISE EXCEPTION 'Cannot delete adjustment note % - adjustment note is cancelled. Use soft delete (deleted_at) instead',
            OLD.adjustment_number;
    END IF;

    -- Rule 2: Cannot delete if exported to Tally
    IF OLD.exported_to_tally_at IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot delete adjustment note % - already exported to Tally on %. Use soft delete instead',
            OLD.adjustment_number, OLD.exported_to_tally_at::DATE;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_adjustment_note_delete
    BEFORE DELETE ON adjustment_notes
    FOR EACH ROW EXECUTE FUNCTION prevent_adjustment_note_delete();

-- Note: Old triggers removed - reconcile_invoice_on_adjustment_change now handles all cases

-- Triggers to populate cancelled_at and cancelled_by fields
CREATE TRIGGER set_adjustment_notes_cancelled_at
    BEFORE UPDATE ON adjustment_notes
    FOR EACH ROW
    WHEN (OLD.is_cancelled IS FALSE AND NEW.is_cancelled IS TRUE)
    EXECUTE FUNCTION set_cancelled_at();

CREATE TRIGGER set_adjustment_notes_cancelled_by
    BEFORE UPDATE ON adjustment_notes
    FOR EACH ROW
    WHEN (OLD.is_cancelled IS FALSE AND NEW.is_cancelled IS TRUE)
    EXECUTE FUNCTION set_cancelled_by();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE adjustment_notes ENABLE ROW LEVEL SECURITY;

-- Authorized users can view adjustment notes in their assigned warehouses
CREATE POLICY "Authorized users can view adjustment notes"
ON adjustment_notes
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('adjustment_notes.read') AND
    deleted_at IS NULL
);

-- Authorized users can create adjustment notes
CREATE POLICY "Authorized users can create adjustment notes"
ON adjustment_notes
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('adjustment_notes.create')
);

-- Authorized users can update adjustment notes
CREATE POLICY "Authorized users can update adjustment notes"
ON adjustment_notes
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('adjustment_notes.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('adjustment_notes.update')
);

-- Authorized users can delete adjustment notes
CREATE POLICY "Authorized users can delete adjustment notes"
ON adjustment_notes
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('adjustment_notes.delete')
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON adjustment_notes TO authenticated;
