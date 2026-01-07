-- Bale Backend - Product Variant Items
-- Products grouped into variants for catalog organization

-- =====================================================
-- PRODUCT VARIANT ITEMS TABLE
-- =====================================================

CREATE TABLE product_variant_items (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

    variant_value VARCHAR(100) NOT NULL, -- e.g., "Red", "Blue", "Cotton"
    display_order INTEGER DEFAULT 0,

    UNIQUE(variant_id, product_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_product_variant_items_variant_id ON product_variant_items(variant_id);
CREATE INDEX idx_product_variant_items_product_id ON product_variant_items(product_id);
CREATE INDEX idx_product_variant_items_display_order ON product_variant_items(variant_id, display_order);

-- =====================================================
-- PRODUCT VARIANT ITEMS RLS POLICIES
-- =====================================================

ALTER TABLE product_variant_items ENABLE ROW LEVEL SECURITY;

-- Authorized users can view product variant items in their company
CREATE POLICY "Authorized users can view product variant items"
ON product_variant_items
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND authorize('products.read')
);

-- Authorized users can create product variant items
CREATE POLICY "Authorized users can create product variant items"
ON product_variant_items
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND authorize('products.create')
);

-- Authorized users can update product variant items
CREATE POLICY "Authorized users can update product variant items"
ON product_variant_items
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND authorize('products.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND authorize('products.update')
);

-- Authorized users can delete product variant items
CREATE POLICY "Authorized users can delete product variant items"
ON product_variant_items
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND authorize('products.delete')
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

GRANT SELECT, INSERT, UPDATE, DELETE ON product_variant_items TO authenticated;
GRANT SELECT ON product_variant_items TO anon;
