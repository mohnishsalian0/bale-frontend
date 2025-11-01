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

-- Admins can view all outwards, staff can view outwards from their assigned warehouse
CREATE POLICY "Users can view goods outwards in their scope"
ON goods_outwards
FOR SELECT
TO authenticated
USING (
    company_id = get_user_company_id() AND (
        is_company_admin() OR warehouse_id = get_user_warehouse_id()
    )
);

-- Admins can create outwards from any warehouse, staff only from their assigned warehouse
CREATE POLICY "Users can create goods outwards in their scope"
ON goods_outwards
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_user_company_id() AND (
        is_company_admin() OR warehouse_id = get_user_warehouse_id()
    )
);

-- Admins can update all outwards, staff only from their assigned warehouse
CREATE POLICY "Users can update goods outwards in their scope"
ON goods_outwards
FOR UPDATE
TO authenticated
USING (
    company_id = get_user_company_id() AND (
        is_company_admin() OR warehouse_id = get_user_warehouse_id()
    )
)
WITH CHECK (
    company_id = get_user_company_id() AND (
        is_company_admin() OR warehouse_id = get_user_warehouse_id()
    )
);

-- Admins can delete outwards, staff only from their assigned warehouse
CREATE POLICY "Users can delete goods outwards in their scope"
ON goods_outwards
FOR DELETE
TO authenticated
USING (
    company_id = get_user_company_id() AND (
        is_company_admin() OR warehouse_id = get_user_warehouse_id()
    )
);

-- =====================================================
-- GOODS OUTWARD ITEMS TABLE RLS POLICIES
-- =====================================================

-- Users can view outward items if they can view the parent outward
CREATE POLICY "Users can view goods outward items in their scope"
ON goods_outward_items
FOR SELECT
TO authenticated
USING (
    company_id = get_user_company_id() AND
    EXISTS (
        SELECT 1 FROM goods_outwards go
        WHERE go.id = outward_id
        AND go.company_id = get_user_company_id()
        AND (is_company_admin() OR go.warehouse_id = get_user_warehouse_id())
    )
);

-- Users can manage outward items if they can manage the parent outward
CREATE POLICY "Users can manage goods outward items in their scope"
ON goods_outward_items
FOR ALL
TO authenticated
USING (
    company_id = get_user_company_id() AND
    EXISTS (
        SELECT 1 FROM goods_outwards go
        WHERE go.id = outward_id
        AND go.company_id = get_user_company_id()
        AND (is_company_admin() OR go.warehouse_id = get_user_warehouse_id())
    )
)
WITH CHECK (
    company_id = get_user_company_id() AND
    EXISTS (
        SELECT 1 FROM goods_outwards go
        WHERE go.id = outward_id
        AND go.company_id = get_user_company_id()
        AND (is_company_admin() OR go.warehouse_id = get_user_warehouse_id())
    )
);

-- =====================================================
-- GOODS INWARD TABLE RLS POLICIES
-- =====================================================

-- Admins can view all inwards, staff can view inwards for their assigned warehouse
CREATE POLICY "Users can view goods inwards in their scope"
ON goods_inwards
FOR SELECT
TO authenticated
USING (
    company_id = get_user_company_id() AND (
        is_company_admin() OR warehouse_id = get_user_warehouse_id()
    )
);

-- Admins can create inwards for any warehouse, staff only for their assigned warehouse
CREATE POLICY "Users can create goods inwards in their scope"
ON goods_inwards
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_user_company_id() AND (
        is_company_admin() OR warehouse_id = get_user_warehouse_id()
    )
);

-- Admins can update all inwards, staff only for their assigned warehouse
CREATE POLICY "Users can update goods inwards in their scope"
ON goods_inwards
FOR UPDATE
TO authenticated
USING (
    company_id = get_user_company_id() AND (
        is_company_admin() OR warehouse_id = get_user_warehouse_id()
    )
)
WITH CHECK (
    company_id = get_user_company_id() AND (
        is_company_admin() OR warehouse_id = get_user_warehouse_id()
    )
);

-- Only admins can delete inwards (soft delete for audit)
CREATE POLICY "Company admins can delete goods inwards"
ON goods_inwards
FOR DELETE
TO authenticated
USING (
    company_id = get_user_company_id() AND is_company_admin()
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON goods_outwards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON goods_outward_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON goods_inwards TO authenticated;
