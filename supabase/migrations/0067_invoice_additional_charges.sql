-- Bale Backend - Accounting: Invoice Additional Charges
-- Additional charges (freight, packaging, agent commission, labour, etc.) applied to invoices

-- =====================================================
-- CHARGE TYPE ENUM
-- =====================================================

CREATE TYPE charge_type_enum AS ENUM ('percentage', 'flat_amount');

-- =====================================================
-- INVOICE ADDITIONAL CHARGES TABLE
-- =====================================================

CREATE TABLE invoice_additional_charges (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,

    -- Charge details
    ledger_id UUID NOT NULL REFERENCES ledgers(id),
    charge_name VARCHAR(200), -- Snapshot from ledgers.name

    -- Amount configuration
    charge_type charge_type_enum NOT NULL,
    charge_value DECIMAL(10,2) NOT NULL, -- Input: 2.00 (for 2%) or 500.00 (for ₹500)
    charge_amount DECIMAL(15,2) DEFAULT 0, -- Calculated: actual charge amount

    -- Tax configuration (all charges are taxable)
    gst_rate DECIMAL(5,2), -- Overall GST rate (e.g., 18.00 for 18%)

    -- GST breakdown (calculated based on invoice.tax_type: GST or IGST)
    cgst_rate DECIMAL(5,2), -- gst_rate / 2 (if GST selected)
    cgst_amount DECIMAL(15,2) DEFAULT 0,
    sgst_rate DECIMAL(5,2), -- gst_rate / 2 (if GST selected)
    sgst_amount DECIMAL(15,2) DEFAULT 0,
    igst_rate DECIMAL(5,2), -- gst_rate (if IGST selected)
    igst_amount DECIMAL(15,2) DEFAULT 0,
    total_tax_amount DECIMAL(15,2) DEFAULT 0, -- Sum of all GST

    -- Display order
    sequence_order INTEGER NOT NULL DEFAULT 0,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Business rule: Cannot add same ledger twice on same invoice
    UNIQUE(invoice_id, ledger_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_invoice_additional_charges_company_id ON invoice_additional_charges(company_id);
CREATE INDEX idx_invoice_additional_charges_invoice ON invoice_additional_charges(invoice_id);
CREATE INDEX idx_invoice_additional_charges_ledger ON invoice_additional_charges(ledger_id);
CREATE INDEX idx_invoice_additional_charges_sequence ON invoice_additional_charges(invoice_id, sequence_order);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

CREATE TRIGGER update_invoice_additional_charges_updated_at
    BEFORE UPDATE ON invoice_additional_charges
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Calculate charge amount and GST before insert/update
CREATE OR REPLACE FUNCTION calculate_additional_charge_amounts()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_subtotal DECIMAL(15,2);
    v_invoice_discount_amount DECIMAL(15,2);
    v_amount_after_discount DECIMAL(15,2);
    v_invoice_tax_type tax_type_enum;
    v_charge_base_amount DECIMAL(15,2);
    v_ledger_name VARCHAR(200);
    v_ledger_gst_rate DECIMAL(5,2);
BEGIN
    -- Snapshot ledger details (name and GST rate)
    SELECT name, gst_rate
    INTO v_ledger_name, v_ledger_gst_rate
    FROM ledgers
    WHERE id = NEW.ledger_id;

    NEW.charge_name := v_ledger_name;
    NEW.gst_rate := COALESCE(v_ledger_gst_rate, 0);

    -- Get invoice details
    SELECT
        subtotal_amount,
        discount_amount,
        tax_type
    INTO
        v_invoice_subtotal,
        v_invoice_discount_amount,
        v_invoice_tax_type
    FROM invoices
    WHERE id = NEW.invoice_id;

    -- Calculate amount after discount (base for percentage charges)
    v_amount_after_discount := v_invoice_subtotal - v_invoice_discount_amount;

    -- Calculate charge amount based on type (with rounding to 2 decimal places)
    IF NEW.charge_type = 'percentage' THEN
        NEW.charge_amount := ROUND(v_amount_after_discount * (NEW.charge_value / 100), 2);
    ELSIF NEW.charge_type = 'flat_amount' THEN
        NEW.charge_amount := ROUND(NEW.charge_value, 2);
    END IF;

    -- Base amount for GST calculation is the charge_amount
    v_charge_base_amount := NEW.charge_amount;

    -- Calculate GST rates and amounts based on invoice tax type (with rounding to 2 decimal places)
    IF v_invoice_tax_type = 'gst' THEN
        -- Split GST into CGST + SGST
        NEW.cgst_rate := NEW.gst_rate / 2;
        NEW.sgst_rate := NEW.gst_rate / 2;
        NEW.igst_rate := 0;

        NEW.cgst_amount := ROUND(v_charge_base_amount * (NEW.cgst_rate / 100), 2);
        NEW.sgst_amount := ROUND(v_charge_base_amount * (NEW.sgst_rate / 100), 2);
        NEW.igst_amount := 0;
    ELSIF v_invoice_tax_type = 'igst' THEN
        -- Use IGST only
        NEW.cgst_rate := 0;
        NEW.sgst_rate := 0;
        NEW.igst_rate := NEW.gst_rate;

        NEW.cgst_amount := 0;
        NEW.sgst_amount := 0;
        NEW.igst_amount := ROUND(v_charge_base_amount * (NEW.igst_rate / 100), 2);
    ELSE
        -- No tax
        NEW.cgst_rate := 0;
        NEW.sgst_rate := 0;
        NEW.igst_rate := 0;
        NEW.cgst_amount := 0;
        NEW.sgst_amount := 0;
        NEW.igst_amount := 0;
    END IF;

    -- Calculate total tax (with rounding to 2 decimal places)
    NEW.total_tax_amount := ROUND(NEW.cgst_amount + NEW.sgst_amount + NEW.igst_amount, 2);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_charge_amounts
    BEFORE INSERT OR UPDATE ON invoice_additional_charges
    FOR EACH ROW EXECUTE FUNCTION calculate_additional_charge_amounts();

-- Trigger to recalculate invoice totals when charges change
CREATE TRIGGER trigger_recalculate_invoice_totals_on_charge_change
    AFTER INSERT OR UPDATE OR DELETE ON invoice_additional_charges
    FOR EACH ROW EXECUTE FUNCTION update_invoice_totals();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE invoice_additional_charges ENABLE ROW LEVEL SECURITY;

-- Authorized users can view additional charges
CREATE POLICY "Authorized users can view additional charges"
ON invoice_additional_charges
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    authorize('invoices.read')
);

-- Authorized users can create additional charges
CREATE POLICY "Authorized users can create additional charges"
ON invoice_additional_charges
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    authorize('invoices.create')
);

-- Authorized users can update additional charges
CREATE POLICY "Authorized users can update additional charges"
ON invoice_additional_charges
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    authorize('invoices.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    authorize('invoices.update')
);

-- Authorized users can delete additional charges
CREATE POLICY "Authorized users can delete additional charges"
ON invoice_additional_charges
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    authorize('invoices.delete')
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON invoice_additional_charges TO authenticated;
