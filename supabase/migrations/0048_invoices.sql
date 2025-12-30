-- Bale Backend - Accounting: Invoices
-- Sales and purchase invoice management with GST compliance

-- =====================================================
-- INVOICE TYPE ENUM
-- =====================================================

CREATE TYPE invoice_type_enum AS ENUM ('sales', 'purchase');

-- =====================================================
-- DIRECT TAX TYPE ENUM
-- =====================================================

CREATE TYPE direct_tax_type_enum AS ENUM ('none', 'tds', 'tcs');

-- =====================================================
-- INVOICES TABLE
-- =====================================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),

    -- Invoice identification
    invoice_type invoice_type_enum NOT NULL,
    sequence_number INTEGER NOT NULL,
    invoice_number VARCHAR(50) NOT NULL, -- Generated: INV/2024-25/0001
    slug VARCHAR(50) NOT NULL, -- URL-safe: sinv-1, pinv-42

    -- Party information
    party_ledger_id UUID NOT NULL REFERENCES ledgers(id),
    party_ledger_name VARCHAR(200), -- Snapshot from ledgers.name

    -- Counter ledger (Sales/Purchase account for double-entry)
    counter_ledger_id UUID NOT NULL REFERENCES ledgers(id),
    counter_ledger_name VARCHAR(200), -- Snapshot from ledgers.name

    -- Invoice details
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_terms VARCHAR(100),
    due_date DATE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),

    -- Order source tracking
    source VARCHAR(50) DEFAULT 'manual' NOT NULL,
    source_sales_order_id UUID REFERENCES sales_orders(id),
    source_purchase_order_id UUID REFERENCES purchase_orders(id),

    -- Financial amounts
    subtotal_amount DECIMAL(15,2) DEFAULT 0,
    discount_type discount_type_enum DEFAULT 'none' NOT NULL,
    discount_value DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0, -- Calculated
    taxable_amount DECIMAL(15,2) DEFAULT 0, -- subtotal - discount

    -- Tax information
    tax_type tax_type_enum, -- gst = same state (CGST+SGST), igst = different state

    -- GST breakdown (aggregated from items)
    total_cgst_amount DECIMAL(15,2) DEFAULT 0,
    total_sgst_amount DECIMAL(15,2) DEFAULT 0,
    total_igst_amount DECIMAL(15,2) DEFAULT 0,
    total_tax_amount DECIMAL(15,2) DEFAULT 0, -- Sum of all GST

    -- Direct tax (TDS/TCS)
    direct_tax_type direct_tax_type_enum DEFAULT 'none' NOT NULL,
    direct_tax_rate DECIMAL(5,2),
    direct_tax_amount DECIMAL(15,2) DEFAULT 0,

    -- Round-off and total
    round_off_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0, -- taxable + tax + round_off

    -- Payment tracking
    outstanding_amount DECIMAL(15,2) DEFAULT 0,
    has_payment BOOLEAN DEFAULT false,
    has_adjustment BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'partially_paid', 'settled', 'cancelled')),

    -- Purchase invoice specific
    supplier_invoice_number VARCHAR(50), -- Supplier's bill number
    supplier_invoice_date DATE, -- Supplier's bill date

    -- Tally export tracking
    tally_guid VARCHAR(100),
    tally_export_status VARCHAR(20),
    tally_export_error TEXT,
    exported_to_tally_at TIMESTAMPTZ,

    -- Warehouse snapshot (taken at invoice creation time)
    warehouse_name VARCHAR(200),
    warehouse_address_line1 VARCHAR(200),
    warehouse_address_line2 VARCHAR(200),
    warehouse_city VARCHAR(100),
    warehouse_state VARCHAR(50),
    warehouse_country VARCHAR(100),
    warehouse_pincode VARCHAR(10),

    -- Party snapshot (taken at invoice creation time)
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

    -- Company snapshot (taken at invoice creation time)
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

    -- Notes and attachments
    notes TEXT,
    attachments TEXT[],

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

    -- Full-text search
    search_vector tsvector,

    UNIQUE(company_id, invoice_type, sequence_number),
    UNIQUE(company_id, invoice_number),
    UNIQUE(company_id, slug), -- Unique within company for URL routing

    -- Business rule: Outstanding must ALWAYS be non-negative (financial data integrity)
    CONSTRAINT check_outstanding_non_negative CHECK (outstanding_amount >= 0)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_invoices_company_id ON invoices(company_id);
CREATE INDEX idx_invoices_invoice_type ON invoices(company_id, invoice_type);
CREATE INDEX idx_invoices_party_ledger ON invoices(party_ledger_id);
CREATE INDEX idx_invoices_counter_ledger ON invoices(counter_ledger_id);
CREATE INDEX idx_invoices_warehouse ON invoices(warehouse_id);
CREATE INDEX idx_invoices_status ON invoices(company_id, status);
CREATE INDEX idx_invoices_date ON invoices(company_id, invoice_date);
CREATE INDEX idx_invoices_sequence_number ON invoices(company_id, sequence_number);
CREATE INDEX idx_invoices_outstanding ON invoices(company_id, outstanding_amount) WHERE outstanding_amount > 0;
CREATE INDEX idx_invoices_has_payment ON invoices(company_id, has_payment) WHERE has_payment = false;
CREATE INDEX idx_invoices_has_adjustment ON invoices(company_id, has_adjustment) WHERE has_adjustment = false;
CREATE INDEX idx_invoices_source_sales_order ON invoices(source_sales_order_id);
CREATE INDEX idx_invoices_source_purchase_order ON invoices(source_purchase_order_id);

-- Full-text search index
CREATE INDEX idx_invoices_search ON invoices USING GIN(search_vector);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_invoices_modified_by
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION set_modified_by();

-- Auto-generate invoice numbers with FY-aware sequence
CREATE OR REPLACE FUNCTION auto_generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
    v_fy_start INTEGER;
    v_fy_end INTEGER;
    v_prefix VARCHAR(10);
BEGIN
    -- Determine financial year (April 1 - March 31)
    IF EXTRACT(MONTH FROM NEW.invoice_date) >= 4 THEN
        v_fy_start := EXTRACT(YEAR FROM NEW.invoice_date)::INTEGER;
        v_fy_end := v_fy_start + 1;
    ELSE
        v_fy_end := EXTRACT(YEAR FROM NEW.invoice_date)::INTEGER;
        v_fy_start := v_fy_end - 1;
    END IF;

    -- Set prefix based on invoice type
    IF NEW.invoice_type = 'sales' THEN
        v_prefix := 'INV';
    ELSE
        v_prefix := 'PINV';
    END IF;

    -- Generate sequence number if not provided
    IF NEW.sequence_number IS NULL THEN
        NEW.sequence_number := get_next_sequence('invoices_' || NEW.invoice_type, NEW.company_id);
    END IF;

    -- Generate invoice number: INV/2024-25/0001
    NEW.invoice_number := v_prefix || '/' ||
                         v_fy_start || '-' ||
                         SUBSTRING(v_fy_end::TEXT, 3, 2) || '/' ||
                         LPAD(NEW.sequence_number::TEXT, 4, '0');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_invoice_number
    BEFORE INSERT ON invoices
    FOR EACH ROW EXECUTE FUNCTION auto_generate_invoice_number();

-- Reconcile invoice outstanding amount, payment/adjustment flags, and status
-- Invariant: always calculate from total_amount - payments - adjustments
-- This function doesn't care if it's INSERT or UPDATE - just calculates correct state
CREATE OR REPLACE FUNCTION reconcile_invoice_outstanding()
RETURNS TRIGGER AS $$
DECLARE
    v_total_payments DECIMAL(15,2);
    v_payment_count INTEGER;
    v_total_adjustments DECIMAL(15,2);
    v_adjustment_count INTEGER;
    v_new_outstanding DECIMAL(15,2);
BEGIN
    -- Skip if invoice is cancelled
    IF NEW.is_cancelled = TRUE THEN
        RETURN NEW;
    END IF;

    -- Calculate total active payment allocations and count
    SELECT
        COALESCE(SUM(amount_applied), 0),
        COUNT(*)
    INTO v_total_payments, v_payment_count
    FROM payment_allocations
    WHERE invoice_id = NEW.id
      AND allocation_type = 'against_ref'
      AND is_cancelled = FALSE;

    -- Calculate total active adjustment notes and count
    -- Credit adjustments reduce outstanding, debit adjustments increase it
    SELECT
        COALESCE(SUM(CASE
            WHEN adjustment_type = 'credit' THEN total_amount
            WHEN adjustment_type = 'debit' THEN -total_amount
            ELSE 0
        END), 0),
        COUNT(*)
    INTO v_total_adjustments, v_adjustment_count
    FROM adjustment_notes
    WHERE invoice_id = NEW.id
      AND is_cancelled = FALSE;

    -- Calculate outstanding: total - payments - adjustments
    v_new_outstanding := NEW.total_amount - v_total_payments - v_total_adjustments;

    -- Prevent negative outstanding (financial data integrity)
    IF v_new_outstanding < 0 THEN
        RAISE EXCEPTION 'Outstanding amount cannot be negative. Invoice: %, Total: %, Payments: %, Adjustments: %',
            NEW.invoice_number, NEW.total_amount, v_total_payments, v_total_adjustments;
    END IF;

    -- Set calculated values
    NEW.outstanding_amount := v_new_outstanding;
    NEW.has_payment := (v_payment_count > 0);
    NEW.has_adjustment := (v_adjustment_count > 0);

    -- Set status based on outstanding
    IF v_new_outstanding = NEW.total_amount THEN
        NEW.status := 'open';
    ELSIF v_new_outstanding > 0 AND v_new_outstanding < NEW.total_amount THEN
        NEW.status := 'partially_paid';
    ELSIF v_new_outstanding = 0 THEN
        NEW.status := 'settled';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on INSERT to initialize outstanding_amount
CREATE TRIGGER trigger_reconcile_invoice_on_insert
    BEFORE INSERT ON invoices
    FOR EACH ROW EXECUTE FUNCTION reconcile_invoice_outstanding();

-- Trigger on UPDATE of total_amount to recalculate outstanding
-- Note: No WHEN clause - we want this to run even when total_amount doesn't change
-- (e.g., when payment allocations trigger a dummy UPDATE to force reconciliation)
CREATE TRIGGER trigger_reconcile_invoice_on_total_change
    BEFORE UPDATE OF total_amount ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION reconcile_invoice_outstanding();

-- Note: update_invoice_status() function removed - reconcile_invoice_outstanding() now handles status

-- Prevent invoice edit if payment exists, adjustment exists, cancelled, or exported to Tally
CREATE OR REPLACE FUNCTION prevent_invoice_edit()
RETURNS TRIGGER AS $$
BEGIN
    -- Rule 1: Cannot edit a cancelled invoice
    IF OLD.is_cancelled = TRUE THEN
        RAISE EXCEPTION 'Cannot edit invoice % - invoice is cancelled', OLD.invoice_number;
    END IF;

    -- Rule 2: Validate cancellation preconditions
    IF NEW.is_cancelled = TRUE AND OLD.is_cancelled = FALSE THEN
        -- Must provide cancellation reason
        IF NEW.cancellation_reason IS NULL OR TRIM(NEW.cancellation_reason) = '' THEN
            RAISE EXCEPTION 'Cancellation reason is required';
        END IF;

        -- Cannot cancel if has payments
        IF OLD.has_payment = TRUE THEN
            RAISE EXCEPTION 'Cannot cancel invoice % - payment allocations exist. Remove payments first',
                OLD.invoice_number;
        END IF;

        -- Cannot cancel if has adjustment notes
        IF OLD.has_adjustment = TRUE THEN
            RAISE EXCEPTION 'Cannot cancel invoice % - adjustment notes exist. Remove adjustment notes first',
                OLD.invoice_number;
        END IF;

        -- Set status to 'cancelled'
        NEW.status := 'cancelled';
    END IF;

    -- Rule 3: Prevent editing critical fields if locked by payment/adjustment/export
    IF (
        NEW.total_amount IS DISTINCT FROM OLD.total_amount OR
        NEW.taxable_amount IS DISTINCT FROM OLD.taxable_amount OR
        NEW.party_ledger_id IS DISTINCT FROM OLD.party_ledger_id OR
        NEW.invoice_date IS DISTINCT FROM OLD.invoice_date OR
        NEW.invoice_type IS DISTINCT FROM OLD.invoice_type OR
        NEW.tax_type IS DISTINCT FROM OLD.tax_type
    ) THEN
        IF OLD.has_payment = TRUE THEN
            RAISE EXCEPTION 'Cannot edit invoice % - payment has been allocated. Create adjustment note instead',
                OLD.invoice_number;
        END IF;

        IF OLD.has_adjustment = TRUE THEN
            RAISE EXCEPTION 'Cannot edit invoice % - adjustment notes exist. Delete adjustment notes or create new adjustment note',
                OLD.invoice_number;
        END IF;

        IF OLD.exported_to_tally_at IS NOT NULL THEN
            RAISE EXCEPTION 'Cannot edit invoice % - already exported to Tally on %. Create adjustment note instead',
                OLD.invoice_number, OLD.exported_to_tally_at::DATE;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_invoice_edit
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION prevent_invoice_edit();

-- Prevent invoice deletion if payment exists, adjustment exists, cancelled, or exported to Tally
CREATE OR REPLACE FUNCTION prevent_invoice_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Rule 1: Cannot delete a cancelled invoice
    IF OLD.is_cancelled = TRUE THEN
        RAISE EXCEPTION 'Cannot delete invoice % - invoice is cancelled. Use soft delete (deleted_at) instead',
            OLD.invoice_number;
    END IF;

    -- Rule 2: Cannot delete if has payments
    IF OLD.has_payment = TRUE THEN
        RAISE EXCEPTION 'Cannot delete invoice % - payment allocations exist. Remove payments first',
            OLD.invoice_number;
    END IF;

    -- Rule 3: Cannot delete if has adjustment notes
    IF OLD.has_adjustment = TRUE THEN
        RAISE EXCEPTION 'Cannot delete invoice % - adjustment notes exist. Remove adjustment notes first',
            OLD.invoice_number;
    END IF;

    -- Rule 4: Cannot delete if exported to Tally
    IF OLD.exported_to_tally_at IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot delete invoice % - already exported to Tally on %. Use soft delete instead',
            OLD.invoice_number, OLD.exported_to_tally_at::DATE;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_invoice_delete
    BEFORE DELETE ON invoices
    FOR EACH ROW EXECUTE FUNCTION prevent_invoice_delete();

-- Triggers to populate cancelled_at and cancelled_by fields
CREATE TRIGGER set_invoices_cancelled_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    WHEN (OLD.is_cancelled IS FALSE AND NEW.is_cancelled IS TRUE)
    EXECUTE FUNCTION set_cancelled_at();

CREATE TRIGGER set_invoices_cancelled_by
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    WHEN (OLD.is_cancelled IS FALSE AND NEW.is_cancelled IS TRUE)
    EXECUTE FUNCTION set_cancelled_by();

-- Update partner's last_interaction_at timestamp
CREATE TRIGGER trigger_invoices_update_partner_interaction
    AFTER INSERT OR UPDATE ON invoices
    FOR EACH ROW
    WHEN (NEW.deleted_at IS NULL)
    EXECUTE FUNCTION update_partner_last_interaction();

-- Update search vector for full-text search
CREATE OR REPLACE FUNCTION update_invoices_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.invoice_number, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.party_name, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.party_display_name, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.company_name, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.supplier_invoice_number, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoices_search_vector
    BEFORE INSERT OR UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_invoices_search_vector();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Authorized users can view invoices in their assigned warehouses
CREATE POLICY "Authorized users can view invoices"
ON invoices
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('invoices.read') AND
    deleted_at IS NULL
);

-- Authorized users can create invoices
CREATE POLICY "Authorized users can create invoices"
ON invoices
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('invoices.create')
);

-- Authorized users can update invoices
CREATE POLICY "Authorized users can update invoices"
ON invoices
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('invoices.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('invoices.update')
);

-- Authorized users can delete invoices
CREATE POLICY "Authorized users can delete invoices"
ON invoices
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('invoices.delete')
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON invoices TO authenticated;
