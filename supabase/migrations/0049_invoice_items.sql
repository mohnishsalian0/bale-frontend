-- Bale Backend - Accounting: Invoice Items
-- Line items with product snapshots and GST breakdown

-- =====================================================
-- PRODUCT TAX APPLICABILITY ENUM
-- =====================================================

CREATE TYPE product_tax_applicability_enum AS ENUM ('no_tax', 'gst');

-- =====================================================
-- INVOICE ITEMS TABLE
-- =====================================================

CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),

    -- Quantities
    quantity DECIMAL(10,3) NOT NULL,

    -- Pricing
    rate DECIMAL(15,2) NOT NULL,
    amount DECIMAL(15,2) GENERATED ALWAYS AS (quantity * rate) STORED,

    -- Item-level discount
    discount_type discount_type_enum DEFAULT 'none' NOT NULL,
    discount_value DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(15,2) DEFAULT 0, -- Calculated
    taxable_amount DECIMAL(15,2) DEFAULT 0, -- amount - discount

    -- Product snapshot (taken at invoice creation time)
    product_name VARCHAR(200),
    product_stock_type VARCHAR(20), -- 'roll', 'batch', 'piece'
    product_measuring_unit VARCHAR(20), -- 'metre', 'yard', 'kilogram', 'unit', 'piece'
    product_hsn_code VARCHAR(8),

    -- Tax configuration (from product)
    tax_type product_tax_applicability_enum NOT NULL,
    gst_rate DECIMAL(5,2), -- 5.00, 12.00, 18.00, 28.00

    -- GST breakdown (calculated based on invoice gst_type: GST or IGST)
    cgst_rate DECIMAL(5,2), -- gst_rate / 2 (if GST selected)
    cgst_amount DECIMAL(15,2) DEFAULT 0,
    sgst_rate DECIMAL(5,2), -- gst_rate / 2 (if GST selected)
    sgst_amount DECIMAL(15,2) DEFAULT 0,
    igst_rate DECIMAL(5,2), -- gst_rate (if IGST selected)
    igst_amount DECIMAL(15,2) DEFAULT 0,
    total_tax_amount DECIMAL(15,2) DEFAULT 0, -- Sum of all tax

    notes TEXT,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_invoice_items_company_id ON invoice_items(company_id);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_product ON invoice_items(product_id);
CREATE INDEX idx_invoice_items_warehouse ON invoice_items(warehouse_id);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

CREATE TRIGGER update_invoice_items_updated_at
    BEFORE UPDATE ON invoice_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Calculate item-level discount and taxable amount
CREATE OR REPLACE FUNCTION calculate_invoice_item_discount()
RETURNS TRIGGER AS $$
DECLARE
    v_amount DECIMAL(10,2);
BEGIN
    v_amount := NEW.quantity * NEW.rate;

    -- Calculate discount based on type
    IF NEW.discount_type = 'none' THEN
        NEW.discount_amount := 0;
    ELSIF NEW.discount_type = 'percentage' THEN
        NEW.discount_amount := v_amount * (COALESCE(NEW.discount_value, 0) / 100);
    ELSIF NEW.discount_type = 'flat_amount' THEN
        NEW.discount_amount := COALESCE(NEW.discount_value, 0);
    ELSE
        NEW.discount_amount := 0;
    END IF;

    -- Calculate taxable amount (amount - discount)
    NEW.taxable_amount := v_amount - NEW.discount_amount;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_invoice_item_discount
    BEFORE INSERT OR UPDATE ON invoice_items
    FOR EACH ROW EXECUTE FUNCTION calculate_invoice_item_discount();

-- Update invoice totals when items change
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
    v_subtotal DECIMAL(10,2);
    v_total_cgst DECIMAL(10,2);
    v_total_sgst DECIMAL(10,2);
    v_total_igst DECIMAL(10,2);
    v_total_tax DECIMAL(10,2);
    v_invoice_discount_type discount_type_enum;
    v_invoice_discount_value DECIMAL(10,2);
    v_invoice_discount_amount DECIMAL(10,2);
    v_taxable_amount DECIMAL(10,2);
    v_round_off DECIMAL(10,2);
    v_total DECIMAL(10,2);
BEGIN
    -- Get invoice ID
    v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

    -- Calculate subtotal (sum of all item amounts before item discounts)
    SELECT
        COALESCE(SUM(quantity * rate), 0),
        COALESCE(SUM(cgst_amount), 0),
        COALESCE(SUM(sgst_amount), 0),
        COALESCE(SUM(igst_amount), 0),
        COALESCE(SUM(total_tax_amount), 0)
    INTO
        v_subtotal,
        v_total_cgst,
        v_total_sgst,
        v_total_igst,
        v_total_tax
    FROM invoice_items
    WHERE invoice_id = v_invoice_id;

    -- Get invoice-level discount
    SELECT discount_type, discount_value
    INTO v_invoice_discount_type, v_invoice_discount_value
    FROM invoices
    WHERE id = v_invoice_id;

    -- Calculate invoice-level discount (applied to subtotal before tax)
    IF v_invoice_discount_type = 'none' THEN
        v_invoice_discount_amount := 0;
    ELSIF v_invoice_discount_type = 'percentage' THEN
        v_invoice_discount_amount := v_subtotal * (COALESCE(v_invoice_discount_value, 0) / 100);
    ELSIF v_invoice_discount_type = 'flat_amount' THEN
        v_invoice_discount_amount := COALESCE(v_invoice_discount_value, 0);
    ELSE
        v_invoice_discount_amount := 0;
    END IF;

    -- Taxable amount = subtotal - invoice discount
    v_taxable_amount := v_subtotal - v_invoice_discount_amount;

    -- Total before round-off = taxable + tax
    v_total := v_taxable_amount + v_total_tax;

    -- Calculate round-off (round to nearest rupee)
    v_round_off := ROUND(v_total, 0) - v_total;
    v_total := ROUND(v_total, 0);

    -- Update invoice
    UPDATE invoices
    SET
        subtotal_amount = v_subtotal,
        discount_amount = v_invoice_discount_amount,
        taxable_amount = v_taxable_amount,
        total_cgst_amount = v_total_cgst,
        total_sgst_amount = v_total_sgst,
        total_igst_amount = v_total_igst,
        total_tax_amount = v_total_tax,
        round_off_amount = v_round_off,
        total_amount = v_total
    WHERE id = v_invoice_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invoice_totals
    AFTER INSERT OR UPDATE OR DELETE ON invoice_items
    FOR EACH ROW EXECUTE FUNCTION update_invoice_totals();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Authorized users can view invoice items
CREATE POLICY "Authorized users can view invoice items"
ON invoice_items
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('invoices.read')
);

-- Authorized users can create invoice items
CREATE POLICY "Authorized users can create invoice items"
ON invoice_items
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('invoices.create')
);

-- Authorized users can update invoice items
CREATE POLICY "Authorized users can update invoice items"
ON invoice_items
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

-- Authorized users can delete invoice items
CREATE POLICY "Authorized users can delete invoice items"
ON invoice_items
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

GRANT SELECT, INSERT, UPDATE, DELETE ON invoice_items TO authenticated;
