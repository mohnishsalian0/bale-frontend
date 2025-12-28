-- Partner Credit Aggregates Table
-- Tracks invoice, payment, and adjustment metrics per partner for credit limit management

CREATE TABLE partner_credit_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Invoice aggregates
    total_invoice_amount NUMERIC(15,2) DEFAULT 0,
    total_outstanding_amount NUMERIC(15,2) DEFAULT 0, -- For credit limit checking
    total_paid_amount NUMERIC(15,2) DEFAULT 0, -- Calculated: total_invoice - outstanding
    invoice_count INTEGER DEFAULT 0,

    -- Payment insights
    last_payment_date TIMESTAMPTZ,

    -- Adjustment note insights
    total_credit_notes NUMERIC(15,2) DEFAULT 0,
    total_debit_notes NUMERIC(15,2) DEFAULT 0,

    -- Date tracking
    first_invoice_date TIMESTAMPTZ,
    last_invoice_date TIMESTAMPTZ,

    -- Metadata
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(partner_id)
);

-- Indexes for efficient querying
CREATE INDEX idx_partner_credit_agg_partner ON partner_credit_aggregates(partner_id);
CREATE INDEX idx_partner_credit_agg_company ON partner_credit_aggregates(company_id);
CREATE INDEX idx_partner_credit_agg_outstanding ON partner_credit_aggregates(company_id, total_outstanding_amount);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE partner_credit_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view partner credit aggregates"
ON partner_credit_aggregates FOR SELECT TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    authorize('partners.read')
);

-- Function to recalculate partner credit aggregates
CREATE OR REPLACE FUNCTION recalculate_partner_credit_aggregates(
    p_partner_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_company_id UUID;
    v_partner_type VARCHAR(20);
    v_invoice_type invoice_type_enum;
    v_total_invoice_amount NUMERIC(15,2);
    v_total_outstanding_amount NUMERIC(15,2);
    v_total_paid_amount NUMERIC(15,2);
    v_invoice_count INTEGER;
    v_first_invoice_date TIMESTAMPTZ;
    v_last_invoice_date TIMESTAMPTZ;
    v_last_payment_date TIMESTAMPTZ;
    v_total_credit_notes NUMERIC(15,2);
    v_total_debit_notes NUMERIC(15,2);
BEGIN
    -- Get partner details
    SELECT company_id, partner_type
    INTO v_company_id, v_partner_type
    FROM partners
    WHERE id = p_partner_id;

    IF v_company_id IS NULL THEN
        RETURN; -- Partner doesn't exist or was deleted
    END IF;

    -- Determine invoice type based on partner type
    -- Customers have sales invoices, Suppliers/Vendors have purchase invoices
    -- Agents don't typically have invoices, but we'll handle them as customers
    IF v_partner_type IN ('customer', 'agent') THEN
        v_invoice_type := 'sales';
    ELSE
        v_invoice_type := 'purchase';
    END IF;

    -- Calculate invoice aggregates
    SELECT
        COALESCE(SUM(total_amount), 0),
        COALESCE(SUM(outstanding_amount), 0),
        COALESCE(COUNT(*), 0),
        MIN(invoice_date),
        MAX(invoice_date)
    INTO
        v_total_invoice_amount,
        v_total_outstanding_amount,
        v_invoice_count,
        v_first_invoice_date,
        v_last_invoice_date
    FROM invoices
    WHERE party_ledger_id IN (
        SELECT id FROM ledgers WHERE partner_id = p_partner_id
    )
    AND invoice_type = v_invoice_type
    AND deleted_at IS NULL;

    -- Calculate paid amount
    v_total_paid_amount := v_total_invoice_amount - v_total_outstanding_amount;

    -- Get last payment date
    SELECT MAX(payment_date)
    INTO v_last_payment_date
    FROM payments
    WHERE party_ledger_id IN (
        SELECT id FROM ledgers WHERE partner_id = p_partner_id
    )
    AND deleted_at IS NULL;

    -- Calculate credit notes total
    SELECT COALESCE(SUM(total_amount), 0)
    INTO v_total_credit_notes
    FROM adjustment_notes
    WHERE party_ledger_id IN (
        SELECT id FROM ledgers WHERE partner_id = p_partner_id
    )
    AND adjustment_type = 'credit'
    AND deleted_at IS NULL;

    -- Calculate debit notes total
    SELECT COALESCE(SUM(total_amount), 0)
    INTO v_total_debit_notes
    FROM adjustment_notes
    WHERE party_ledger_id IN (
        SELECT id FROM ledgers WHERE partner_id = p_partner_id
    )
    AND adjustment_type = 'debit'
    AND deleted_at IS NULL;

    -- Upsert into aggregates table
    INSERT INTO partner_credit_aggregates (
        partner_id,
        company_id,
        total_invoice_amount,
        total_outstanding_amount,
        total_paid_amount,
        invoice_count,
        last_payment_date,
        total_credit_notes,
        total_debit_notes,
        first_invoice_date,
        last_invoice_date,
        last_updated_at
    ) VALUES (
        p_partner_id,
        v_company_id,
        v_total_invoice_amount,
        v_total_outstanding_amount,
        v_total_paid_amount,
        v_invoice_count,
        v_last_payment_date,
        v_total_credit_notes,
        v_total_debit_notes,
        v_first_invoice_date,
        v_last_invoice_date,
        NOW()
    )
    ON CONFLICT (partner_id)
    DO UPDATE SET
        total_invoice_amount = EXCLUDED.total_invoice_amount,
        total_outstanding_amount = EXCLUDED.total_outstanding_amount,
        total_paid_amount = EXCLUDED.total_paid_amount,
        invoice_count = EXCLUDED.invoice_count,
        last_payment_date = EXCLUDED.last_payment_date,
        total_credit_notes = EXCLUDED.total_credit_notes,
        total_debit_notes = EXCLUDED.total_debit_notes,
        first_invoice_date = EXCLUDED.first_invoice_date,
        last_invoice_date = EXCLUDED.last_invoice_date,
        last_updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to update aggregates when invoices change
CREATE OR REPLACE FUNCTION trigger_update_partner_credit_on_invoice()
RETURNS TRIGGER AS $$
DECLARE
    v_partner_id UUID;
BEGIN
    -- Get partner_id from the party_ledger
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        SELECT partner_id INTO v_partner_id
        FROM ledgers
        WHERE id = NEW.party_ledger_id;

        IF v_partner_id IS NOT NULL THEN
            PERFORM recalculate_partner_credit_aggregates(v_partner_id);
        END IF;
    END IF;

    -- Handle DELETE (use OLD record)
    IF TG_OP = 'DELETE' THEN
        SELECT partner_id INTO v_partner_id
        FROM ledgers
        WHERE id = OLD.party_ledger_id;

        IF v_partner_id IS NOT NULL THEN
            PERFORM recalculate_partner_credit_aggregates(v_partner_id);
        END IF;
    END IF;

    -- Handle UPDATE where party changed (recalculate both old and new party)
    IF TG_OP = 'UPDATE' AND OLD.party_ledger_id != NEW.party_ledger_id THEN
        SELECT partner_id INTO v_partner_id
        FROM ledgers
        WHERE id = OLD.party_ledger_id;

        IF v_partner_id IS NOT NULL THEN
            PERFORM recalculate_partner_credit_aggregates(v_partner_id);
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on invoices table
CREATE TRIGGER trg_update_partner_credit_on_invoice
AFTER INSERT OR UPDATE OR DELETE ON invoices
FOR EACH ROW
EXECUTE FUNCTION trigger_update_partner_credit_on_invoice();

-- Trigger function to update aggregates when payments change
CREATE OR REPLACE FUNCTION trigger_update_partner_credit_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_partner_id UUID;
BEGIN
    -- Get partner_id from the party_ledger
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        SELECT partner_id INTO v_partner_id
        FROM ledgers
        WHERE id = NEW.party_ledger_id;

        IF v_partner_id IS NOT NULL THEN
            PERFORM recalculate_partner_credit_aggregates(v_partner_id);
        END IF;
    END IF;

    -- Handle DELETE (use OLD record)
    IF TG_OP = 'DELETE' THEN
        SELECT partner_id INTO v_partner_id
        FROM ledgers
        WHERE id = OLD.party_ledger_id;

        IF v_partner_id IS NOT NULL THEN
            PERFORM recalculate_partner_credit_aggregates(v_partner_id);
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on payments table
CREATE TRIGGER trg_update_partner_credit_on_payment
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION trigger_update_partner_credit_on_payment();

-- Trigger function to update aggregates when adjustment notes change
CREATE OR REPLACE FUNCTION trigger_update_partner_credit_on_adjustment()
RETURNS TRIGGER AS $$
DECLARE
    v_partner_id UUID;
BEGIN
    -- Get partner_id from the party_ledger
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        SELECT partner_id INTO v_partner_id
        FROM ledgers
        WHERE id = NEW.party_ledger_id;

        IF v_partner_id IS NOT NULL THEN
            PERFORM recalculate_partner_credit_aggregates(v_partner_id);
        END IF;
    END IF;

    -- Handle DELETE (use OLD record)
    IF TG_OP = 'DELETE' THEN
        SELECT partner_id INTO v_partner_id
        FROM ledgers
        WHERE id = OLD.party_ledger_id;

        IF v_partner_id IS NOT NULL THEN
            PERFORM recalculate_partner_credit_aggregates(v_partner_id);
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on adjustment_notes table
CREATE TRIGGER trg_update_partner_credit_on_adjustment
AFTER INSERT OR UPDATE OR DELETE ON adjustment_notes
FOR EACH ROW
EXECUTE FUNCTION trigger_update_partner_credit_on_adjustment();

-- Trigger function to create initial aggregates when a new partner is created
CREATE OR REPLACE FUNCTION trigger_create_partner_credit_aggregates()
RETURNS TRIGGER AS $$
BEGIN
    -- Create initial aggregate record with zero values
    INSERT INTO partner_credit_aggregates (
        partner_id,
        company_id,
        total_invoice_amount,
        total_outstanding_amount,
        total_paid_amount,
        invoice_count,
        last_payment_date,
        total_credit_notes,
        total_debit_notes,
        first_invoice_date,
        last_invoice_date
    ) VALUES (
        NEW.id,
        NEW.company_id,
        0,
        0,
        0,
        0,
        NULL,
        0,
        0,
        NULL,
        NULL
    )
    ON CONFLICT (partner_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on partners table to initialize aggregates
CREATE TRIGGER trg_create_partner_credit_aggregates
AFTER INSERT ON partners
FOR EACH ROW
EXECUTE FUNCTION trigger_create_partner_credit_aggregates();

-- Add comment
COMMENT ON TABLE partner_credit_aggregates IS 'Aggregated credit and financial metrics per partner for credit limit management. Updated automatically via triggers on invoices, payments, and adjustment notes.';
