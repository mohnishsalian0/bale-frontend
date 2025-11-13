
-- Bale Backend - Goods Movement (Outward and Inward)
-- Comprehensive outward and inward inventory management

-- =====================================================
-- GOODS OUTWARD ITEMS (linking to specific stock units)
-- =====================================================

CREATE TABLE goods_outward_items (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    outward_id UUID NOT NULL REFERENCES goods_outwards(id) ON DELETE CASCADE,
    stock_unit_id UUID NOT NULL REFERENCES stock_units(id),
    quantity_dispatched DECIMAL(10,3) NOT NULL,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Goods Outward Items indexes
CREATE INDEX idx_goods_outward_items_company_id ON goods_outward_items(company_id);
CREATE INDEX idx_goods_outward_items_outward_id ON goods_outward_items(outward_id);
CREATE INDEX idx_goods_outward_items_stock_unit ON goods_outward_items(stock_unit_id);
CREATE INDEX idx_goods_outward_items_stock_unit_quantity ON goods_outward_items(stock_unit_id, quantity_dispatched);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

CREATE TRIGGER update_goods_outward_items_updated_at
    BEFORE UPDATE ON goods_outward_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- GOODS OUTWARD ITEMS TABLE RLS POLICIES
-- =====================================================

ALTER TABLE goods_outward_items ENABLE ROW LEVEL SECURITY;

-- Authorized users can view goods outward items in their assigned warehouses
CREATE POLICY "Authorized users can view goods outward items"
ON goods_outward_items
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('goods_outwards.read')
);

-- Authorized users can create goods outward items in their assigned warehouses
CREATE POLICY "Authorized users can create goods outward items"
ON goods_outward_items
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('goods_outward_items.create')
);

-- Authorized users can update goods outward itemss in their assigned warehouses
CREATE POLICY "Authorized users can update goods outward items"
ON goods_outward_items
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('goods_outward_items.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('goods_outward_items.update')
);

-- Authorized users can delete goods outward items in their assigned warehouses
CREATE POLICY "Authorized users can delete goods outwards"
ON goods_outward_items
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('goods_outward_items.delete')
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON goods_outward_items TO authenticated;
