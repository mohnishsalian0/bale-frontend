-- Bale Backend - Accounting: Payment Allocations
-- Bill-wise allocation of payments to invoices

-- =====================================================
-- ALLOCATION TYPE ENUM
-- =====================================================

CREATE TYPE allocation_type_enum AS ENUM ('against_ref', 'advance');

-- =====================================================
-- PAYMENT ALLOCATIONS TABLE
-- =====================================================

CREATE TABLE payment_allocations (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),

    -- Allocation details
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id), -- NULL for advance allocations
    allocation_type allocation_type_enum NOT NULL,
    amount_applied DECIMAL(15,2) NOT NULL CHECK (amount_applied > 0),

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Cancellation tracking (auto-cancelled when parent payment is cancelled)
    is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
    cancelled_at TIMESTAMPTZ,

    -- Business rule: advance allocations have no invoice
    CONSTRAINT check_advance_no_invoice CHECK (
        (allocation_type = 'advance' AND invoice_id IS NULL) OR
        (allocation_type = 'against_ref' AND invoice_id IS NOT NULL)
    )
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_payment_allocations_company_id ON payment_allocations(company_id);
CREATE INDEX idx_payment_allocations_payment ON payment_allocations(payment_id);
CREATE INDEX idx_payment_allocations_invoice ON payment_allocations(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX idx_payment_allocations_advance ON payment_allocations(payment_id, allocation_type) WHERE allocation_type = 'advance';

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

CREATE TRIGGER update_payment_allocations_updated_at
    BEFORE UPDATE ON payment_allocations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Validate allocation amount <= invoice outstanding
CREATE OR REPLACE FUNCTION validate_allocation_amount()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_outstanding DECIMAL(10,2);
BEGIN
    -- Only validate for against_ref allocations
    IF NEW.allocation_type = 'against_ref' AND NEW.invoice_id IS NOT NULL THEN
        -- Get invoice outstanding amount
        SELECT outstanding_amount
        INTO v_invoice_outstanding
        FROM invoices
        WHERE id = NEW.invoice_id;

        -- Check if allocation amount exceeds outstanding
        IF NEW.amount_applied > v_invoice_outstanding THEN
            RAISE EXCEPTION 'Allocation amount (%) exceeds invoice outstanding amount (%)',
                NEW.amount_applied, v_invoice_outstanding;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_allocation_amount
    BEFORE INSERT OR UPDATE ON payment_allocations
    FOR EACH ROW EXECUTE FUNCTION validate_allocation_amount();

-- Validate total allocations <= payment total
CREATE OR REPLACE FUNCTION validate_total_allocations()
RETURNS TRIGGER AS $$
DECLARE
    v_payment_total DECIMAL(10,2);
    v_total_allocated DECIMAL(10,2);
BEGIN
    -- Get payment total amount
    SELECT total_amount
    INTO v_payment_total
    FROM payments
    WHERE id = NEW.payment_id;

    -- Calculate total allocated for this payment
    SELECT COALESCE(SUM(amount_applied), 0)
    INTO v_total_allocated
    FROM payment_allocations
    WHERE payment_id = NEW.payment_id;

    -- Check if total allocations exceed payment amount
    IF v_total_allocated > v_payment_total THEN
        RAISE EXCEPTION 'Total allocations (%) exceed payment amount (%)',
            v_total_allocated, v_payment_total;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_total_allocations
    AFTER INSERT OR UPDATE ON payment_allocations
    FOR EACH ROW EXECUTE FUNCTION validate_total_allocations();

-- Trigger invoice reconciliation when payment allocation changes
CREATE OR REPLACE FUNCTION trigger_invoice_reconciliation()
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

    -- Only reconcile for against_ref allocations
    IF v_invoice_id IS NOT NULL AND
       ((TG_OP = 'DELETE' AND OLD.allocation_type = 'against_ref') OR
        (TG_OP != 'DELETE' AND NEW.allocation_type = 'against_ref')) THEN

        -- Touch the invoice to trigger reconcile_invoice_outstanding()
        -- The BEFORE UPDATE trigger will recalculate everything
        UPDATE invoices
        SET total_amount = total_amount  -- Dummy update to trigger reconciliation
        WHERE id = v_invoice_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reconcile_invoice_on_allocation_change
    AFTER INSERT OR UPDATE OR DELETE ON payment_allocations
    FOR EACH ROW EXECUTE FUNCTION trigger_invoice_reconciliation();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;

-- Authorized users can view payment allocations
CREATE POLICY "Authorized users can view payment allocations"
ON payment_allocations
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    authorize('payments.read')
);

-- Authorized users can create payment allocations
CREATE POLICY "Authorized users can create payment allocations"
ON payment_allocations
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    authorize('payments.create')
);

-- Authorized users can update payment allocations
CREATE POLICY "Authorized users can update payment allocations"
ON payment_allocations
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

-- Authorized users can delete payment allocations
CREATE POLICY "Authorized users can delete payment allocations"
ON payment_allocations
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    authorize('payments.delete')
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON payment_allocations TO authenticated;
