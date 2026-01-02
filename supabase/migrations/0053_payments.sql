-- Bale Backend - Accounting: Payments
-- Payment and receipt vouchers with bill-wise allocation

-- =====================================================
-- VOUCHER TYPE ENUM
-- =====================================================

CREATE TYPE voucher_type_enum AS ENUM ('payment', 'receipt');

-- =====================================================
-- PAYMENT MODE ENUM
-- =====================================================

CREATE TYPE payment_mode_enum AS ENUM ('cash', 'cheque', 'neft', 'rtgs', 'upi', 'card', 'other');

-- =====================================================
-- PAYMENTS TABLE
-- =====================================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),

    -- Payment identification
    voucher_type voucher_type_enum NOT NULL,
    sequence_number INTEGER NOT NULL,
    payment_number VARCHAR(50) NOT NULL, -- Generated: PMT/2024-25/0001 or RCT/2024-25/0001
    slug VARCHAR(50) NOT NULL, -- URL-safe: pmt-1, rcpt-42

    -- Party and counter ledgers
    party_ledger_id UUID NOT NULL REFERENCES ledgers(id),
    counter_ledger_id UUID NOT NULL REFERENCES ledgers(id), -- Bank or Cash ledger

    -- Payment details
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_mode payment_mode_enum NOT NULL DEFAULT 'cash',
    reference_number VARCHAR(50), -- UTR, Transaction ID, Cheque number, etc.
    reference_date DATE, -- Instrument date (e.g., cheque date)

    -- Amounts
    total_amount DECIMAL(15,2) NOT NULL,

    -- TDS handling (on payments, not invoices)
    tds_applicable BOOLEAN DEFAULT false,
    tds_rate DECIMAL(5,2),
    tds_amount DECIMAL(15,2) DEFAULT 0,
    tds_ledger_id UUID REFERENCES ledgers(id),
    net_amount DECIMAL(15,2), -- total_amount - tds_amount

    -- Party snapshot (taken at payment creation time)
    party_name VARCHAR(200),
    party_display_name VARCHAR(200),
    party_gst_number VARCHAR(15),
    party_pan_number VARCHAR(10),

    -- Counter ledger snapshot (taken at payment creation time)
    counter_ledger_name VARCHAR(200),

    -- Tally export tracking
    tally_guid VARCHAR(100),
    exported_to_tally_at TIMESTAMPTZ,

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

    UNIQUE(company_id, voucher_type, sequence_number),
    UNIQUE(company_id, payment_number),
    UNIQUE(company_id, slug) -- Unique within company for URL routing
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_payments_company_id ON payments(company_id);
CREATE INDEX idx_payments_voucher_type ON payments(company_id, voucher_type);
CREATE INDEX idx_payments_party_ledger ON payments(party_ledger_id);
CREATE INDEX idx_payments_counter_ledger ON payments(counter_ledger_id);
CREATE INDEX idx_payments_date ON payments(company_id, payment_date);
CREATE INDEX idx_payments_sequence_number ON payments(company_id, sequence_number);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_payments_modified_by
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION set_modified_by();

-- Auto-generate payment numbers with FY-aware sequence
CREATE OR REPLACE FUNCTION auto_generate_payment_number()
RETURNS TRIGGER AS $$
DECLARE
    v_fy_start INTEGER;
    v_fy_end INTEGER;
    v_prefix VARCHAR(10);
BEGIN
    -- Determine financial year (April 1 - March 31)
    IF EXTRACT(MONTH FROM NEW.payment_date) >= 4 THEN
        v_fy_start := EXTRACT(YEAR FROM NEW.payment_date)::INTEGER;
        v_fy_end := v_fy_start + 1;
    ELSE
        v_fy_end := EXTRACT(YEAR FROM NEW.payment_date)::INTEGER;
        v_fy_start := v_fy_end - 1;
    END IF;

    -- Set prefix based on voucher type
    IF NEW.voucher_type = 'payment' THEN
        v_prefix := 'PMT';
    ELSE
        v_prefix := 'RCT';
    END IF;

    -- Generate sequence number if not provided
    IF NEW.sequence_number IS NULL THEN
        NEW.sequence_number := get_next_sequence('payments_' || NEW.voucher_type, NEW.company_id);
    END IF;

    -- Generate payment number: PMT/2024-25/0001
    NEW.payment_number := v_prefix || '/' ||
                         v_fy_start || '-' ||
                         SUBSTRING(v_fy_end::TEXT, 3, 2) || '/' ||
                         LPAD(NEW.sequence_number::TEXT, 4, '0');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_payment_number
    BEFORE INSERT ON payments
    FOR EACH ROW EXECUTE FUNCTION auto_generate_payment_number();

-- Calculate net amount (total - TDS)
CREATE OR REPLACE FUNCTION calculate_payment_net_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.tds_applicable = true AND NEW.tds_rate IS NOT NULL THEN
        NEW.tds_amount := NEW.total_amount * (NEW.tds_rate / 100);
        NEW.net_amount := NEW.total_amount - NEW.tds_amount;
    ELSE
        NEW.tds_amount := 0;
        NEW.net_amount := NEW.total_amount;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_payment_net_amount
    BEFORE INSERT OR UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION calculate_payment_net_amount();

-- Prevent payment edit if cancelled or exported to Tally, validate cancellation
CREATE OR REPLACE FUNCTION prevent_payment_edit()
RETURNS TRIGGER AS $$
BEGIN
    -- Rule 1: Cannot edit a cancelled payment
    IF OLD.is_cancelled = TRUE THEN
        RAISE EXCEPTION 'Cannot edit payment % - payment is cancelled', OLD.payment_number;
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
        RAISE EXCEPTION 'Cannot modify payment % - already exported to Tally on %',
            OLD.payment_number, OLD.exported_to_tally_at::DATE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_payment_edit
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION prevent_payment_edit();

CREATE OR REPLACE FUNCTION prevent_payment_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Rule 1: Cannot delete a cancelled payment
    IF OLD.is_cancelled = TRUE THEN
        RAISE EXCEPTION 'Cannot delete payment % - payment is cancelled. Use soft delete (deleted_at) instead',
            OLD.payment_number;
    END IF;

    -- Rule 2: Cannot delete if exported to Tally
    IF OLD.exported_to_tally_at IS NOT NULL THEN
        RAISE EXCEPTION 'Cannot delete payment % - already exported to Tally on %. Use soft delete instead',
            OLD.payment_number, OLD.exported_to_tally_at::DATE;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_payment_delete
    BEFORE DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION prevent_payment_delete();

-- Triggers to populate cancelled_at and cancelled_by fields
CREATE TRIGGER set_payments_cancelled_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    WHEN (OLD.is_cancelled IS FALSE AND NEW.is_cancelled IS TRUE)
    EXECUTE FUNCTION set_cancelled_at();

CREATE TRIGGER set_payments_cancelled_by
    BEFORE UPDATE ON payments
    FOR EACH ROW
    WHEN (OLD.is_cancelled IS FALSE AND NEW.is_cancelled IS TRUE)
    EXECUTE FUNCTION set_cancelled_by();

-- Auto-cancel all allocations when payment is cancelled
CREATE OR REPLACE FUNCTION auto_cancel_allocations_on_payment_cancel()
RETURNS TRIGGER AS $$
BEGIN
    -- When payment is cancelled, cancel all its allocations
    IF NEW.is_cancelled = TRUE AND OLD.is_cancelled = FALSE THEN
        UPDATE payment_allocations
        SET
            is_cancelled = TRUE,
            cancelled_at = NOW()
        WHERE payment_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_cancel_allocations
    AFTER UPDATE ON payments
    FOR EACH ROW
    WHEN (OLD.is_cancelled IS FALSE AND NEW.is_cancelled IS TRUE)
    EXECUTE FUNCTION auto_cancel_allocations_on_payment_cancel();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Authorized users can view payments
CREATE POLICY "Authorized users can view payments"
ON payments
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    authorize('payments.read')
);

-- Authorized users can create payments
CREATE POLICY "Authorized users can create payments"
ON payments
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    authorize('payments.create')
);

-- Authorized users can update payments
CREATE POLICY "Authorized users can update payments"
ON payments
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    authorize('payments.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    authorize('payments.update')
);

-- Authorized users can delete payments
CREATE POLICY "Authorized users can delete payments"
ON payments
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    authorize('payments.delete')
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON payments TO authenticated;
