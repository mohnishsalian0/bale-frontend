-- Bale Backend - Product Variants
-- Product grouping/categorization for catalog organization

-- =====================================================
-- PRODUCT VARIANTS TABLE
-- =====================================================

CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),

    variant_name VARCHAR(100) NOT NULL, -- e.g., "Cotton Solids", "Embroidered Collection"
    variant_type VARCHAR(50), -- e.g., "Color", "Material", "Custom"
    display_order INTEGER DEFAULT 0,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_product_variants_company_id ON product_variants(company_id);
CREATE INDEX idx_product_variants_display_order ON product_variants(company_id, display_order);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

CREATE TRIGGER update_product_variants_updated_at
    BEFORE UPDATE ON product_variants
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =====================================================
-- PRODUCT VARIANTS RLS POLICIES
-- =====================================================

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- Authorized users can view product variants in their company
CREATE POLICY "Authorized users can view product variants"
ON product_variants
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND authorize('products.read')
);

-- Authorized users can create product variants
CREATE POLICY "Authorized users can create product variants"
ON product_variants
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND authorize('products.create')
);

-- Authorized users can update product variants
CREATE POLICY "Authorized users can update product variants"
ON product_variants
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND authorize('products.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND authorize('products.update')
);

-- Authorized users can delete product variants
CREATE POLICY "Authorized users can delete product variants"
ON product_variants
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND authorize('products.delete')
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

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON product_variants TO authenticated;
GRANT SELECT ON product_variants TO anon;
