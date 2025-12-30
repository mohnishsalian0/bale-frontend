-- Bale Backend - Accounting: Adjustment Note Items
-- Line items for credit/debit notes with product snapshots and GST breakdown

-- =====================================================
-- ADJUSTMENT NOTE ITEMS TABLE
-- =====================================================

CREATE TABLE adjustment_note_items (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    adjustment_note_id UUID NOT NULL REFERENCES adjustment_notes(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),

    -- Quantities
    quantity DECIMAL(10,3) NOT NULL,

    -- Pricing
    rate DECIMAL(15,2) NOT NULL,
    amount DECIMAL(15,2) GENERATED ALWAYS AS (quantity * rate) STORED,

    -- Product snapshot (taken at adjustment note creation time)
    product_name VARCHAR(200),
    product_stock_type VARCHAR(20),
    product_measuring_unit VARCHAR(20),
    product_hsn_code VARCHAR(8),

    -- Tax configuration
    tax_type tax_type_enum NOT NULL,
    gst_rate DECIMAL(5,2),

    -- GST breakdown (calculated based on invoice gst_type)
    cgst_rate DECIMAL(5,2),
    cgst_amount DECIMAL(15,2) DEFAULT 0,
    sgst_rate DECIMAL(5,2),
    sgst_amount DECIMAL(15,2) DEFAULT 0,
    igst_rate DECIMAL(5,2),
    igst_amount DECIMAL(15,2) DEFAULT 0,
    total_tax_amount DECIMAL(15,2) DEFAULT 0,

    notes TEXT,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_adjustment_note_items_company_id ON adjustment_note_items(company_id);
CREATE INDEX idx_adjustment_note_items_adjustment_note ON adjustment_note_items(adjustment_note_id);
CREATE INDEX idx_adjustment_note_items_product ON adjustment_note_items(product_id);
CREATE INDEX idx_adjustment_note_items_warehouse ON adjustment_note_items(warehouse_id);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

CREATE TRIGGER update_adjustment_note_items_updated_at
    BEFORE UPDATE ON adjustment_note_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Update adjustment note totals when items change
CREATE OR REPLACE FUNCTION update_adjustment_note_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_adjustment_note_id UUID;
    v_subtotal DECIMAL(10,2);
    v_total_cgst DECIMAL(10,2);
    v_total_sgst DECIMAL(10,2);
    v_total_igst DECIMAL(10,2);
    v_total_tax DECIMAL(10,2);
    v_round_off DECIMAL(10,2);
    v_total DECIMAL(10,2);
BEGIN
    -- Get adjustment note ID
    v_adjustment_note_id := COALESCE(NEW.adjustment_note_id, OLD.adjustment_note_id);

    -- Calculate totals
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
    FROM adjustment_note_items
    WHERE adjustment_note_id = v_adjustment_note_id;

    -- Total before round-off
    v_total := v_subtotal + v_total_tax;

    -- Calculate round-off (round to nearest rupee)
    v_round_off := ROUND(v_total, 0) - v_total;
    v_total := ROUND(v_total, 0);

    -- Update adjustment note
    UPDATE adjustment_notes
    SET
        subtotal_amount = v_subtotal,
        total_cgst_amount = v_total_cgst,
        total_sgst_amount = v_total_sgst,
        total_igst_amount = v_total_igst,
        total_tax_amount = v_total_tax,
        round_off_amount = v_round_off,
        total_amount = v_total
    WHERE id = v_adjustment_note_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_adjustment_note_totals
    AFTER INSERT OR UPDATE OR DELETE ON adjustment_note_items
    FOR EACH ROW EXECUTE FUNCTION update_adjustment_note_totals();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE adjustment_note_items ENABLE ROW LEVEL SECURITY;

-- Authorized users can view adjustment note items
CREATE POLICY "Authorized users can view adjustment note items"
ON adjustment_note_items
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('adjustment_notes.read')
);

-- Authorized users can create adjustment note items
CREATE POLICY "Authorized users can create adjustment note items"
ON adjustment_note_items
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('adjustment_notes.create')
);

-- Authorized users can update adjustment note items
CREATE POLICY "Authorized users can update adjustment note items"
ON adjustment_note_items
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

-- Authorized users can delete adjustment note items
CREATE POLICY "Authorized users can delete adjustment note items"
ON adjustment_note_items
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

GRANT SELECT, INSERT, UPDATE, DELETE ON adjustment_note_items TO authenticated;
