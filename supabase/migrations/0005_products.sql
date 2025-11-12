-- Bale Backend - Products Master Catalog
-- Central product catalog with fabric-specific attributes

-- =====================================================
-- PRODUCTS MASTER TABLE
-- =====================================================

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_user_company_id(),
    
    -- Identity
    product_number VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    show_on_catalog BOOLEAN DEFAULT TRUE,
    
    -- Fabric specifications
    material VARCHAR(50),
    color_name VARCHAR(50),
    color_hex VARCHAR(7), -- RGB hex code
    gsm INTEGER CHECK (gsm BETWEEN 50 AND 500),
    thread_count_cm INTEGER,
    tags TEXT[], -- Array for categorization
    
    -- Stock information
    stock_type VARCHAR(10) NOT NULL CHECK (stock_type IN ('roll', 'batch', 'piece')),
    measuring_unit VARCHAR(20) CHECK (measuring_unit IN ('metre', 'yard', 'kilogram', 'unit')),
    cost_price_per_unit DECIMAL(10,2),
    selling_price_per_unit DECIMAL(10,2),
    min_stock_alert BOOLEAN DEFAULT FALSE,
    min_stock_threshold INTEGER DEFAULT 0,
    
    -- Additional information
    hsn_code VARCHAR(20),
    notes TEXT,
    product_images TEXT[], -- Array of image URLs
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL DEFAULT get_current_user_id() REFERENCES users(id),
    modified_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    
    UNIQUE(company_id, product_number)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Multi-tenant index
CREATE INDEX idx_products_company_id ON products(company_id);

-- Product number lookup within company
CREATE INDEX idx_products_product_number ON products(company_id, product_number);

-- Product name search
CREATE INDEX idx_products_name ON products(company_id, name);

-- Material and color filtering
CREATE INDEX idx_products_material ON products(company_id, material);
CREATE INDEX idx_products_color ON products(company_id, color_name);

-- Catalog visibility
CREATE INDEX idx_products_catalog_visibility ON products(company_id, show_on_catalog);

-- Tag-based search (GIN index for arrays)
CREATE INDEX idx_products_tags ON products USING GIN(tags);

-- Price range queries
CREATE INDEX idx_products_selling_price ON products(company_id, selling_price_per_unit);

-- Stock type filtering
CREATE INDEX idx_products_stock_type ON products(company_id, stock_type);

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

-- Auto-generate product numbers
CREATE OR REPLACE FUNCTION auto_generate_product_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.product_number IS NULL OR NEW.product_number = '' THEN
        NEW.product_number := generate_sequence_number('PROD', 'products', NEW.company_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_product_number
    BEFORE INSERT ON products
    FOR EACH ROW EXECUTE FUNCTION auto_generate_product_number();


-- Ensure measuring_unit matches stock_type
ALTER TABLE products ADD CONSTRAINT check_stock_type_measuring_unit
    CHECK (
        (stock_type = 'roll' AND measuring_unit IN ('metre', 'yard', 'kilogram')) OR
        (stock_type = 'batch' AND measuring_unit = 'unit') OR
        (stock_type = 'piece' AND measuring_unit IS NULL)
    );
