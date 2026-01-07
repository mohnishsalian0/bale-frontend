-- Bale Backend - Stock Unit Adjustments
-- Track wastage, found stock, and corrections for individual stock units

-- =====================================================
-- STOCK UNIT ADJUSTMENTS TABLE
-- =====================================================

CREATE TABLE stock_unit_adjustments (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    stock_unit_id UUID NOT NULL REFERENCES stock_units(id) ON DELETE CASCADE,

    -- Adjustment details
    quantity_adjusted DECIMAL(10,3) NOT NULL CHECK (quantity_adjusted != 0),
    -- Positive values = found stock/additions
    -- Negative values = wastage/reductions

    adjustment_date DATE NOT NULL,
    reason TEXT NOT NULL,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL DEFAULT get_jwt_user_id(),
    modified_by UUID,
    deleted_at TIMESTAMPTZ
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Multi-tenant index
CREATE INDEX idx_stock_unit_adjustments_company_id ON stock_unit_adjustments(company_id);

-- Warehouse-specific queries
CREATE INDEX idx_stock_unit_adjustments_warehouse_id ON stock_unit_adjustments(warehouse_id);

-- Stock unit relationship (most common query)
CREATE INDEX idx_stock_unit_adjustments_stock_unit_id ON stock_unit_adjustments(stock_unit_id);

-- Date-based filtering
CREATE INDEX idx_stock_unit_adjustments_date ON stock_unit_adjustments(company_id, adjustment_date);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

-- Auto-update timestamps
CREATE TRIGGER update_stock_unit_adjustments_updated_at
    BEFORE UPDATE ON stock_unit_adjustments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-set modified_by
CREATE TRIGGER set_stock_unit_adjustments_modified_by
    BEFORE UPDATE ON stock_unit_adjustments
    FOR EACH ROW EXECUTE FUNCTION set_modified_by();

-- Auto-populate warehouse_id from stock_unit
CREATE OR REPLACE FUNCTION auto_set_adjustment_warehouse()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.warehouse_id IS NULL THEN
        SELECT warehouse_id INTO NEW.warehouse_id
        FROM stock_units
        WHERE id = NEW.stock_unit_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_adjustment_warehouse
    BEFORE INSERT ON stock_unit_adjustments
    FOR EACH ROW EXECUTE FUNCTION auto_set_adjustment_warehouse();

-- Trigger stock unit reconciliation when adjustments change
CREATE OR REPLACE FUNCTION trigger_stock_unit_reconciliation_on_adjustment()
RETURNS TRIGGER AS $$
DECLARE
    v_stock_unit_id UUID;
BEGIN
    -- Get the affected stock unit ID
    v_stock_unit_id := COALESCE(NEW.stock_unit_id, OLD.stock_unit_id);

    IF v_stock_unit_id IS NOT NULL THEN
        -- Touch the stock_unit to trigger reconcile_stock_unit()
        -- The BEFORE UPDATE trigger will recalculate remaining_quantity
        UPDATE stock_units
        SET updated_at = updated_at  -- Dummy update to trigger reconciliation
        WHERE id = v_stock_unit_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reconcile_stock_on_adjustment_change
    AFTER INSERT OR UPDATE OR DELETE ON stock_unit_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_stock_unit_reconciliation_on_adjustment();

COMMENT ON FUNCTION trigger_stock_unit_reconciliation_on_adjustment() IS 'Triggers stock_units reconciliation when adjustments are created, updated, or deleted. Uses dummy update pattern to recalculate remaining_quantity including adjustments.';

-- =====================================================
-- STOCK UNIT ADJUSTMENTS RLS POLICIES
-- =====================================================

ALTER TABLE stock_unit_adjustments ENABLE ROW LEVEL SECURITY;

-- Authorized users can view adjustments in their assigned warehouses
CREATE POLICY "Authorized users can view stock unit adjustments"
ON stock_unit_adjustments
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('stock_units.read')
);

-- Authorized users can create adjustments in their assigned warehouses
CREATE POLICY "Authorized users can create stock unit adjustments"
ON stock_unit_adjustments
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('stock_units.update')
);

-- Authorized users can update adjustments in their assigned warehouses
CREATE POLICY "Authorized users can update stock unit adjustments"
ON stock_unit_adjustments
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('stock_units.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('stock_units.update')
);

-- Authorized users can delete adjustments in their assigned warehouses
CREATE POLICY "Authorized users can delete stock unit adjustments"
ON stock_unit_adjustments
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('stock_units.delete')
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON stock_unit_adjustments TO authenticated;
