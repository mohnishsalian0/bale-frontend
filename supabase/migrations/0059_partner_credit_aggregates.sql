-- Partner Receivables Aggregates Table (Accounts Receivable)
-- Tracks sales invoice, payment, and adjustment metrics for customers/agents
-- Represents money OWED TO US - Current Asset on balance sheet

CREATE TABLE partner_receivables_aggregates (
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
CREATE INDEX idx_partner_receivables_agg_partner ON partner_receivables_aggregates(partner_id);
CREATE INDEX idx_partner_receivables_agg_company ON partner_receivables_aggregates(company_id);
CREATE INDEX idx_partner_receivables_agg_outstanding ON partner_receivables_aggregates(company_id, total_outstanding_amount);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE partner_receivables_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view partner receivables aggregates"
ON partner_receivables_aggregates FOR SELECT TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    authorize('partners.read')
);

-- Function to recalculate partner receivables aggregates (Accounts Receivable)
-- Only processes customers and agents (sales invoices)
CREATE OR REPLACE FUNCTION recalculate_partner_receivables_aggregates(
    p_partner_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_company_id UUID;
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
    -- Get partner company_id
    SELECT company_id
    INTO v_company_id
    FROM partners
    WHERE id = p_partner_id;

    IF v_company_id IS NULL THEN
        RETURN; -- Partner doesn't exist or was deleted
    END IF;

    -- Calculate sales invoice aggregates (receivables)
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
    AND invoice_type = 'sales'
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

    -- Upsert into receivables aggregates table
    INSERT INTO partner_receivables_aggregates (
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

-- Trigger function to update receivables aggregates when sales invoices change
CREATE OR REPLACE FUNCTION trigger_update_partner_receivables_on_invoice()
RETURNS TRIGGER AS $$
DECLARE
    v_partner_id UUID;
    v_invoice_type invoice_type_enum;
BEGIN
    -- Get partner_id and invoice_type from the party_ledger
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        v_invoice_type := NEW.invoice_type;

        -- Only process sales invoices (receivables)
        IF v_invoice_type = 'sales' THEN
            SELECT partner_id INTO v_partner_id
            FROM ledgers
            WHERE id = NEW.party_ledger_id;

            IF v_partner_id IS NOT NULL THEN
                PERFORM recalculate_partner_receivables_aggregates(v_partner_id);
            END IF;
        END IF;
    END IF;

    -- Handle DELETE (use OLD record)
    IF TG_OP = 'DELETE' THEN
        v_invoice_type := OLD.invoice_type;

        IF v_invoice_type = 'sales' THEN
            SELECT partner_id INTO v_partner_id
            FROM ledgers
            WHERE id = OLD.party_ledger_id;

            IF v_partner_id IS NOT NULL THEN
                PERFORM recalculate_partner_receivables_aggregates(v_partner_id);
            END IF;
        END IF;
    END IF;

    -- Handle UPDATE where party changed (recalculate both old and new party)
    IF TG_OP = 'UPDATE' AND OLD.party_ledger_id != NEW.party_ledger_id THEN
        v_invoice_type := OLD.invoice_type;

        IF v_invoice_type = 'sales' THEN
            SELECT partner_id INTO v_partner_id
            FROM ledgers
            WHERE id = OLD.party_ledger_id;

            IF v_partner_id IS NOT NULL THEN
                PERFORM recalculate_partner_receivables_aggregates(v_partner_id);
            END IF;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on invoices table for receivables
CREATE TRIGGER trg_update_partner_receivables_on_invoice
AFTER INSERT OR UPDATE OR DELETE ON invoices
FOR EACH ROW
EXECUTE FUNCTION trigger_update_partner_receivables_on_invoice();

-- Trigger function to update receivables aggregates when payments change
CREATE OR REPLACE FUNCTION trigger_update_partner_receivables_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_partner_id UUID;
    v_ledger_type VARCHAR(20);
BEGIN
    -- Get partner_id and determine if it's a receivables payment
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        SELECT l.partner_id INTO v_partner_id
        FROM ledgers l
        JOIN partners p ON p.id = l.partner_id
        WHERE l.id = NEW.party_ledger_id
        AND p.partner_type IN ('customer', 'agent');

        IF v_partner_id IS NOT NULL THEN
            PERFORM recalculate_partner_receivables_aggregates(v_partner_id);
        END IF;
    END IF;

    -- Handle DELETE (use OLD record)
    IF TG_OP = 'DELETE' THEN
        SELECT l.partner_id INTO v_partner_id
        FROM ledgers l
        JOIN partners p ON p.id = l.partner_id
        WHERE l.id = OLD.party_ledger_id
        AND p.partner_type IN ('customer', 'agent');

        IF v_partner_id IS NOT NULL THEN
            PERFORM recalculate_partner_receivables_aggregates(v_partner_id);
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on payments table for receivables
CREATE TRIGGER trg_update_partner_receivables_on_payment
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION trigger_update_partner_receivables_on_payment();

-- Trigger function to update receivables aggregates when adjustment notes change
CREATE OR REPLACE FUNCTION trigger_update_partner_receivables_on_adjustment()
RETURNS TRIGGER AS $$
DECLARE
    v_partner_id UUID;
BEGIN
    -- Get partner_id and determine if it's a receivables adjustment
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        SELECT l.partner_id INTO v_partner_id
        FROM ledgers l
        JOIN partners p ON p.id = l.partner_id
        WHERE l.id = NEW.party_ledger_id
        AND p.partner_type IN ('customer', 'agent');

        IF v_partner_id IS NOT NULL THEN
            PERFORM recalculate_partner_receivables_aggregates(v_partner_id);
        END IF;
    END IF;

    -- Handle DELETE (use OLD record)
    IF TG_OP = 'DELETE' THEN
        SELECT l.partner_id INTO v_partner_id
        FROM ledgers l
        JOIN partners p ON p.id = l.partner_id
        WHERE l.id = OLD.party_ledger_id
        AND p.partner_type IN ('customer', 'agent');

        IF v_partner_id IS NOT NULL THEN
            PERFORM recalculate_partner_receivables_aggregates(v_partner_id);
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on adjustment_notes table for receivables
CREATE TRIGGER trg_update_partner_receivables_on_adjustment
AFTER INSERT OR UPDATE OR DELETE ON adjustment_notes
FOR EACH ROW
EXECUTE FUNCTION trigger_update_partner_receivables_on_adjustment();

-- Trigger function to create initial receivables aggregates when a new partner is created
CREATE OR REPLACE FUNCTION trigger_create_partner_receivables_aggregates()
RETURNS TRIGGER AS $$
BEGIN
    -- Create initial receivables aggregate record with zero values for ALL partners
    INSERT INTO partner_receivables_aggregates (
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

-- Create trigger on partners table to initialize receivables aggregates
CREATE TRIGGER trg_create_partner_receivables_aggregates
AFTER INSERT ON partners
FOR EACH ROW
EXECUTE FUNCTION trigger_create_partner_receivables_aggregates();

-- Add comment
COMMENT ON TABLE partner_receivables_aggregates IS 'Aggregated accounts receivable metrics per partner (customers/agents). Tracks sales invoices, payments, and adjustments. Updated automatically via triggers.';

-- =====================================================
-- PARTNER PAYABLES AGGREGATES TABLE
-- =====================================================

-- Partner Payables Aggregates Table (Accounts Payable)
-- Tracks purchase invoice, payment, and adjustment metrics for suppliers/vendors
-- Represents money WE OWE - Current Liability on balance sheet

CREATE TABLE partner_payables_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Invoice aggregates
    total_invoice_amount NUMERIC(15,2) DEFAULT 0,
    total_outstanding_amount NUMERIC(15,2) DEFAULT 0,
    total_paid_amount NUMERIC(15,2) DEFAULT 0,
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
CREATE INDEX idx_partner_payables_agg_partner ON partner_payables_aggregates(partner_id);
CREATE INDEX idx_partner_payables_agg_company ON partner_payables_aggregates(company_id);
CREATE INDEX idx_partner_payables_agg_outstanding ON partner_payables_aggregates(company_id, total_outstanding_amount);

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE partner_payables_aggregates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized users can view partner payables aggregates"
ON partner_payables_aggregates FOR SELECT TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    authorize('partners.read')
);

-- Function to recalculate partner payables aggregates (Accounts Payable)
-- Only processes suppliers and vendors (purchase invoices)
CREATE OR REPLACE FUNCTION recalculate_partner_payables_aggregates(
    p_partner_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_company_id UUID;
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
    -- Get partner company_id
    SELECT company_id
    INTO v_company_id
    FROM partners
    WHERE id = p_partner_id;

    IF v_company_id IS NULL THEN
        RETURN; -- Partner doesn't exist or was deleted
    END IF;

    -- Calculate purchase invoice aggregates (payables)
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
    AND invoice_type = 'purchase'
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

    -- Upsert into payables aggregates table
    INSERT INTO partner_payables_aggregates (
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

-- Trigger function to update payables aggregates when purchase invoices change
CREATE OR REPLACE FUNCTION trigger_update_partner_payables_on_invoice()
RETURNS TRIGGER AS $$
DECLARE
    v_partner_id UUID;
    v_invoice_type invoice_type_enum;
BEGIN
    -- Get partner_id and invoice_type from the party_ledger
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        v_invoice_type := NEW.invoice_type;

        -- Only process purchase invoices (payables)
        IF v_invoice_type = 'purchase' THEN
            SELECT partner_id INTO v_partner_id
            FROM ledgers
            WHERE id = NEW.party_ledger_id;

            IF v_partner_id IS NOT NULL THEN
                PERFORM recalculate_partner_payables_aggregates(v_partner_id);
            END IF;
        END IF;
    END IF;

    -- Handle DELETE (use OLD record)
    IF TG_OP = 'DELETE' THEN
        v_invoice_type := OLD.invoice_type;

        IF v_invoice_type = 'purchase' THEN
            SELECT partner_id INTO v_partner_id
            FROM ledgers
            WHERE id = OLD.party_ledger_id;

            IF v_partner_id IS NOT NULL THEN
                PERFORM recalculate_partner_payables_aggregates(v_partner_id);
            END IF;
        END IF;
    END IF;

    -- Handle UPDATE where party changed (recalculate both old and new party)
    IF TG_OP = 'UPDATE' AND OLD.party_ledger_id != NEW.party_ledger_id THEN
        v_invoice_type := OLD.invoice_type;

        IF v_invoice_type = 'purchase' THEN
            SELECT partner_id INTO v_partner_id
            FROM ledgers
            WHERE id = OLD.party_ledger_id;

            IF v_partner_id IS NOT NULL THEN
                PERFORM recalculate_partner_payables_aggregates(v_partner_id);
            END IF;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on invoices table for payables
CREATE TRIGGER trg_update_partner_payables_on_invoice
AFTER INSERT OR UPDATE OR DELETE ON invoices
FOR EACH ROW
EXECUTE FUNCTION trigger_update_partner_payables_on_invoice();

-- Trigger function to update payables aggregates when payments change
CREATE OR REPLACE FUNCTION trigger_update_partner_payables_on_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_partner_id UUID;
BEGIN
    -- Get partner_id and determine if it's a payables payment
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        SELECT l.partner_id INTO v_partner_id
        FROM ledgers l
        JOIN partners p ON p.id = l.partner_id
        WHERE l.id = NEW.party_ledger_id
        AND p.partner_type IN ('supplier', 'vendor');

        IF v_partner_id IS NOT NULL THEN
            PERFORM recalculate_partner_payables_aggregates(v_partner_id);
        END IF;
    END IF;

    -- Handle DELETE (use OLD record)
    IF TG_OP = 'DELETE' THEN
        SELECT l.partner_id INTO v_partner_id
        FROM ledgers l
        JOIN partners p ON p.id = l.partner_id
        WHERE l.id = OLD.party_ledger_id
        AND p.partner_type IN ('supplier', 'vendor');

        IF v_partner_id IS NOT NULL THEN
            PERFORM recalculate_partner_payables_aggregates(v_partner_id);
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on payments table for payables
CREATE TRIGGER trg_update_partner_payables_on_payment
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW
EXECUTE FUNCTION trigger_update_partner_payables_on_payment();

-- Trigger function to update payables aggregates when adjustment notes change
CREATE OR REPLACE FUNCTION trigger_update_partner_payables_on_adjustment()
RETURNS TRIGGER AS $$
DECLARE
    v_partner_id UUID;
BEGIN
    -- Get partner_id and determine if it's a payables adjustment
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        SELECT l.partner_id INTO v_partner_id
        FROM ledgers l
        JOIN partners p ON p.id = l.partner_id
        WHERE l.id = NEW.party_ledger_id
        AND p.partner_type IN ('supplier', 'vendor');

        IF v_partner_id IS NOT NULL THEN
            PERFORM recalculate_partner_payables_aggregates(v_partner_id);
        END IF;
    END IF;

    -- Handle DELETE (use OLD record)
    IF TG_OP = 'DELETE' THEN
        SELECT l.partner_id INTO v_partner_id
        FROM ledgers l
        JOIN partners p ON p.id = l.partner_id
        WHERE l.id = OLD.party_ledger_id
        AND p.partner_type IN ('supplier', 'vendor');

        IF v_partner_id IS NOT NULL THEN
            PERFORM recalculate_partner_payables_aggregates(v_partner_id);
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on adjustment_notes table for payables
CREATE TRIGGER trg_update_partner_payables_on_adjustment
AFTER INSERT OR UPDATE OR DELETE ON adjustment_notes
FOR EACH ROW
EXECUTE FUNCTION trigger_update_partner_payables_on_adjustment();

-- Trigger function to create initial payables aggregates when a new partner is created
CREATE OR REPLACE FUNCTION trigger_create_partner_payables_aggregates()
RETURNS TRIGGER AS $$
BEGIN
    -- Create initial payables aggregate record with zero values for ALL partners
    INSERT INTO partner_payables_aggregates (
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

-- Create trigger on partners table to initialize payables aggregates
CREATE TRIGGER trg_create_partner_payables_aggregates
AFTER INSERT ON partners
FOR EACH ROW
EXECUTE FUNCTION trigger_create_partner_payables_aggregates();

-- Add comment
COMMENT ON TABLE partner_payables_aggregates IS 'Aggregated accounts payable metrics per partner (suppliers/vendors). Tracks purchase invoices, payments, and adjustments. Updated automatically via triggers.';
