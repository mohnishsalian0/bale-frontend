-- Bale Backend - Products Master Catalog
-- Central product catalog with fabric-specific attributes

-- =====================================================
-- PRODUCTS MASTER TABLE
-- =====================================================

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    
    -- Identity
    sequence_number INTEGER NOT NULL,
    name VARCHAR(200) NOT NULL,
    show_on_catalog BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Fabric specifications
    gsm INTEGER CHECK (gsm BETWEEN 50 AND 500),
    thread_count_cm INTEGER,

    -- Stock information
    stock_type VARCHAR(10) NOT NULL CHECK (stock_type IN ('roll', 'batch', 'piece')),
    measuring_unit VARCHAR(20) CHECK (measuring_unit IN ('metre', 'yard', 'kilogram', 'unit')),
    cost_price_per_unit DECIMAL(15,2),
    selling_price_per_unit DECIMAL(15,2),
    min_stock_alert BOOLEAN DEFAULT FALSE,
    min_stock_threshold INTEGER DEFAULT 0,

    -- Tax information
    tax_type VARCHAR(10) NOT NULL DEFAULT 'gst' CHECK (tax_type IN ('no_tax', 'gst')),
    gst_rate DECIMAL(5,2),

    -- Additional information
    hsn_code VARCHAR(20),
    notes TEXT,
    product_images TEXT[], -- Array of image URLs
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL DEFAULT get_jwt_user_id(),
    modified_by UUID,
    deleted_at TIMESTAMPTZ,

    -- Full-text search
    search_vector tsvector,

		CONSTRAINT stock_type_measuring_unit
    CHECK (
        (stock_type = 'roll' AND measuring_unit IN ('metre', 'yard', 'kilogram')) OR
        (stock_type = 'batch' AND measuring_unit = 'unit') OR
        (stock_type = 'piece' AND measuring_unit IS NULL)
    ),

    UNIQUE(company_id, sequence_number)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Multi-tenant index
CREATE INDEX idx_products_company_id ON products(company_id);

-- Sequence number lookup within company
CREATE INDEX idx_products_sequence_number ON products(company_id, sequence_number);

-- Product name search
CREATE INDEX idx_products_name ON products(company_id, name);

-- Catalog visibility
CREATE INDEX idx_products_catalog_visibility ON products(company_id, show_on_catalog);

-- Active status filtering
CREATE INDEX idx_products_active_status ON products(company_id, is_active);

-- Price range queries
CREATE INDEX idx_products_selling_price ON products(company_id, selling_price_per_unit);

-- Stock type filtering
CREATE INDEX idx_products_stock_type ON products(company_id, stock_type);

-- Tax type filtering
CREATE INDEX idx_products_tax_type ON products(company_id, tax_type);

-- Full-text search index
CREATE INDEX idx_products_search ON products USING GIN(search_vector);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

-- Auto-update timestamps
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-set modified_by
CREATE TRIGGER set_products_modified_by
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION set_modified_by();

-- Auto-generate sequence numbers
CREATE OR REPLACE FUNCTION auto_generate_product_sequence()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sequence_number IS NULL THEN
        NEW.sequence_number := get_next_sequence('products', NEW.company_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_product_sequence
    BEFORE INSERT ON products
    FOR EACH ROW EXECUTE FUNCTION auto_generate_product_sequence();

-- =====================================================
-- PRODUCTS TABLE RLS POLICIES
-- =====================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Authorized users can view products in their company
CREATE POLICY "Authorized users can view products"
ON products
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND authorize('products.read')
);

-- Authorized users can create products
CREATE POLICY "Authorized users can create products"
ON products
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND authorize('products.create')
);

-- Authorized users can update products
CREATE POLICY "Authorized users can update products"
ON products
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND authorize('products.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND authorize('products.update')
);

-- Authorized users can delete products
CREATE POLICY "Authorized users can delete products"
ON products
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND authorize('products.delete')
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON products TO authenticated;
