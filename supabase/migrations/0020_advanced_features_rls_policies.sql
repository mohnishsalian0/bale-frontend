-- Bale Backend - Advanced Features RLS Policies
-- Security policies for QR code system and catalog configuration

-- =====================================================
-- ENABLE RLS ON ADVANCED FEATURE TABLES
-- =====================================================

ALTER TABLE qr_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_batch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variant_items ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- QR CODE MANAGEMENT RLS POLICIES
-- =====================================================

-- Admins can view all QR batches, staff can view batches for their assigned warehouse
CREATE POLICY "Users can view QR batches in their scope"
ON qr_batches
FOR SELECT
TO authenticated
USING (
    company_id = get_user_company_id() AND (
        is_company_admin() OR warehouse_id = get_user_warehouse_id()
    )
);

-- Admins can create QR batches for any warehouse, staff only for their assigned warehouse
CREATE POLICY "Users can create QR batches in their scope"
ON qr_batches
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_user_company_id() AND (
        is_company_admin() OR warehouse_id = get_user_warehouse_id()
    )
);

-- Admins can update all QR batches, staff only for their assigned warehouse
CREATE POLICY "Users can update QR batches in their scope"
ON qr_batches
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

-- Users can view QR batch items in their scope
CREATE POLICY "Users can view QR batch items in their scope"
ON qr_batch_items
FOR SELECT
TO authenticated
USING (
    company_id = get_user_company_id() AND (
        is_company_admin() OR warehouse_id = get_user_warehouse_id()
    )
);

-- Users can manage QR batch items in their scope
CREATE POLICY "Users can manage QR batch items in their scope"
ON qr_batch_items
FOR ALL
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

-- =====================================================
-- CATALOG CONFIGURATION RLS POLICIES
-- =====================================================

-- Only company admins can manage catalog configuration (one per company)
CREATE POLICY "Company admins can manage catalog configuration"
ON catalog_configurations
FOR ALL
TO authenticated
USING (
    company_id = get_user_company_id() AND is_company_admin()
)
WITH CHECK (
    company_id = get_user_company_id() AND is_company_admin()
);

-- =====================================================
-- PRODUCT VARIANTS RLS POLICIES
-- =====================================================

-- Users can view product variants in their company
CREATE POLICY "Users can view product variants in their company"
ON product_variants
FOR SELECT
TO authenticated
USING (
    company_id = get_user_company_id()
);

-- Only company admins can manage product variants
CREATE POLICY "Company admins can manage product variants"
ON product_variants
FOR ALL
TO authenticated
USING (
    company_id = get_user_company_id() AND is_company_admin()
)
WITH CHECK (
    company_id = get_user_company_id() AND is_company_admin()
);

-- Users can view product variant items in their company
CREATE POLICY "Users can view product variant items in their scope"
ON product_variant_items
FOR SELECT
TO authenticated
USING (
    company_id = get_user_company_id()
);

-- Only company admins can manage product variant items
CREATE POLICY "Company admins can manage product variant items"
ON product_variant_items
FOR ALL
TO authenticated
USING (
    company_id = get_user_company_id() AND is_company_admin()
)
WITH CHECK (
    company_id = get_user_company_id() AND is_company_admin()
);

-- =====================================================
-- PUBLIC CATALOG ACCESS (ANONYMOUS USERS)
-- =====================================================

-- Allow anonymous users to view public catalog configurations
CREATE POLICY "Anonymous users can view public catalog configurations"
ON catalog_configurations
FOR SELECT
TO anon
USING (
    accepting_orders = true
);

-- Allow anonymous users to view public product variants
CREATE POLICY "Anonymous users can view public product variants"
ON product_variants
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM catalog_configurations cc 
        WHERE cc.company_id = product_variants.company_id 
        AND cc.accepting_orders = true
    )
);

-- Allow anonymous users to view public product variant items
CREATE POLICY "Anonymous users can view public product variant items"
ON product_variant_items
FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM product_variants pv 
        JOIN catalog_configurations cc ON pv.company_id = cc.company_id
        WHERE pv.id = product_variant_items.variant_id 
        AND cc.accepting_orders = true
    )
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON qr_batches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON qr_batch_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON catalog_configurations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON product_variants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON product_variant_items TO authenticated;

-- Grant limited permissions to anonymous users (for public catalog)
GRANT SELECT ON catalog_configurations TO anon;
GRANT SELECT ON product_variants TO anon;
GRANT SELECT ON product_variant_items TO anon;