-- Bale Backend - Goods Movement RLS Policies
-- Security policies for goods outward and inward

-- =====================================================
-- ENABLE RLS ON GOODS MOVEMENT TABLES
-- =====================================================

ALTER TABLE goods_outwards ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_outward_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_inwards ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- GOODS OUTWARD TABLE RLS POLICIES
-- =====================================================

-- Authorized users can view goods outwards in their assigned warehouses
CREATE POLICY "Authorized users can view goods outwards"
ON goods_outwards
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('goods_outwards.read')
);

-- Authorized users can create goods outwards in their assigned warehouses
CREATE POLICY "Authorized users can create goods outwards"
ON goods_outwards
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('goods_outwards.create')
);

-- Authorized users can update goods outwards in their assigned warehouses
CREATE POLICY "Authorized users can update goods outwards"
ON goods_outwards
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('goods_outwards.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('goods_outwards.update')
);

-- Authorized users can delete goods outwards in their assigned warehouses
CREATE POLICY "Authorized users can delete goods outwards"
ON goods_outwards
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('goods_outwards.delete')
);

-- =====================================================
-- GOODS OUTWARD ITEMS TABLE RLS POLICIES
-- =====================================================

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

-- Authorized users can manage goods outward items in their assigned warehouses
CREATE POLICY "Authorized users can manage goods outward items"
ON goods_outward_items
FOR ALL
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    (authorize('goods_outwards.update') OR authorize('goods_outwards.delete'))
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    (authorize('goods_outwards.create') OR authorize('goods_outwards.update'))
);

-- =====================================================
-- GOODS INWARD TABLE RLS POLICIES
-- =====================================================

-- Authorized users can view goods inwards in their assigned warehouses
CREATE POLICY "Authorized users can view goods inwards"
ON goods_inwards
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('goods_inwards.read')
);

-- Authorized users can create goods inwards in their assigned warehouses
CREATE POLICY "Authorized users can create goods inwards"
ON goods_inwards
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('goods_inwards.create')
);

-- Authorized users can update goods inwards in their assigned warehouses
CREATE POLICY "Authorized users can update goods inwards"
ON goods_inwards
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('goods_inwards.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('goods_inwards.update')
);

-- Authorized users can delete goods inwards
CREATE POLICY "Authorized users can delete goods inwards"
ON goods_inwards
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('goods_inwards.delete')
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON goods_outwards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON goods_outward_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON goods_inwards TO authenticated;
