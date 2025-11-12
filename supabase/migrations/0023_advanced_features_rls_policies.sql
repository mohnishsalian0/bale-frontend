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

-- Authorized users can view QR batches in their assigned warehouses
CREATE POLICY "Authorized users can view QR batches"
ON qr_batches
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('qr_batches.read')
);

-- Authorized users can create QR batches in their assigned warehouses
CREATE POLICY "Authorized users can create QR batches"
ON qr_batches
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('qr_batches.create')
);

-- Authorized users can update QR batches in their assigned warehouses
CREATE POLICY "Authorized users can update QR batches"
ON qr_batches
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('qr_batches.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('qr_batches.update')
);

-- Authorized users can view QR batch items in their assigned warehouses
CREATE POLICY "Authorized users can view QR batch items"
ON qr_batch_items
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('qr_batches.read')
);

-- Authorized users can manage QR batch items in their assigned warehouses
CREATE POLICY "Authorized users can manage QR batch items"
ON qr_batch_items
FOR ALL
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    (authorize('qr_batches.update') OR authorize('qr_batches.delete'))
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    (authorize('qr_batches.create') OR authorize('qr_batches.update'))
);

-- =====================================================
-- CATALOG CONFIGURATION RLS POLICIES
-- =====================================================

-- Authorized users can manage catalog configuration
CREATE POLICY "Authorized users can manage catalog configuration"
ON catalog_configurations
FOR ALL
TO authenticated
USING (
    company_id = get_jwt_company_id() AND (
        authorize('catalog.read') OR authorize('catalog.update') OR authorize('catalog.delete')
    )
)
WITH CHECK (
    company_id = get_jwt_company_id() AND (
        authorize('catalog.create') OR authorize('catalog.update')
    )
);

-- =====================================================
-- PRODUCT VARIANTS RLS POLICIES
-- =====================================================

-- Authorized users can view product variants in their company
CREATE POLICY "Authorized users can view product variants"
ON product_variants
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND authorize('products.read')
);

-- Authorized users can manage product variants
CREATE POLICY "Authorized users can manage product variants"
ON product_variants
FOR ALL
TO authenticated
USING (
    company_id = get_jwt_company_id() AND (
        authorize('products.update') OR authorize('products.delete')
    )
)
WITH CHECK (
    company_id = get_jwt_company_id() AND (
        authorize('products.create') OR authorize('products.update')
    )
);

-- Authorized users can view product variant items in their company
CREATE POLICY "Authorized users can view product variant items"
ON product_variant_items
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND authorize('products.read')
);

-- Authorized users can manage product variant items
CREATE POLICY "Authorized users can manage product variant items"
ON product_variant_items
FOR ALL
TO authenticated
USING (
    company_id = get_jwt_company_id() AND (
        authorize('products.update') OR authorize('products.delete')
    )
)
WITH CHECK (
    company_id = get_jwt_company_id() AND (
        authorize('products.create') OR authorize('products.update')
    )
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