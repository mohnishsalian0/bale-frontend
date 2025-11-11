-- Bale Backend - Stock Units and Inventory Management
-- Individual fabric rolls/pieces tracking with barcode management

-- =====================================================
-- STOCK UNITS TABLE
-- =====================================================

CREATE TABLE stock_units (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    
    -- Identity
    unit_number VARCHAR(100) NOT NULL,

    -- Physical specifications
    remaining_quantity DECIMAL(10,3) NOT NULL,
    initial_quantity DECIMAL(10,3) NOT NULL, -- Track initial quantity at creation
    supplier_number VARCHAR(100),
    quality_grade TEXT, -- Custom quality grade with auto-suggestions from previously used values
    warehouse_location TEXT,
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'in_stock'
        CHECK (status IN ('in_stock', 'dispatched', 'removed')),
    
    -- Dates
    manufacturing_date DATE,

    -- Inward tracking (links back to goods inward that created this unit)
    created_from_inward_id UUID, -- FK will be added in goods movement migration

    notes TEXT,

    -- Barcode tracking
    barcode_generated_at TIMESTAMPTZ,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL DEFAULT get_current_user_id() REFERENCES users(id),
    modified_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ,
    
    UNIQUE(company_id, unit_number)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Multi-tenant index
CREATE INDEX idx_stock_units_company_id ON stock_units(company_id);

-- Warehouse-specific indexes (most common queries)
CREATE INDEX idx_stock_units_warehouse_id ON stock_units(warehouse_id);
CREATE INDEX idx_stock_units_status ON stock_units(warehouse_id, status);

-- Product relationship
CREATE INDEX idx_stock_units_product_id ON stock_units(product_id);

-- Unit number lookup within company
CREATE INDEX idx_stock_units_unit_number ON stock_units(company_id, unit_number);

-- Inward tracking (for audit trail)
CREATE INDEX idx_stock_units_inward_id ON stock_units(created_from_inward_id);

-- Quality grade filtering
CREATE INDEX idx_stock_units_quality_grade ON stock_units(company_id, quality_grade);

-- FIFO queries (crucial for piece dispatch performance)
CREATE INDEX idx_stock_units_fifo ON stock_units(company_id, product_id, created_at, id)
    WHERE deleted_at IS NULL;

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

-- Auto-update timestamps
CREATE TRIGGER update_stock_units_updated_at
    BEFORE UPDATE ON stock_units
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-set modified_by
CREATE TRIGGER set_stock_units_modified_by
    BEFORE UPDATE ON stock_units
    FOR EACH ROW EXECUTE FUNCTION set_modified_by();

-- Auto-generate stock unit numbers
CREATE OR REPLACE FUNCTION auto_generate_unit_number()
RETURNS TRIGGER AS $$
DECLARE
    product_num TEXT;
    next_seq INTEGER;
BEGIN
    IF NEW.unit_number IS NULL OR NEW.unit_number = '' THEN
        SELECT product_number INTO product_num FROM products WHERE id = NEW.product_id;
        
        -- Get next sequence for this product
        SELECT COALESCE(MAX(CAST(SUBSTRING(unit_number FROM product_num || '-SU(\d+)$') AS INTEGER)), 0) + 1
        INTO next_seq
        FROM stock_units 
        WHERE product_id = NEW.product_id;
        
        NEW.unit_number := product_num || '-SU' || LPAD(next_seq::TEXT, 6, '0');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_unit_number
    BEFORE INSERT ON stock_units
    FOR EACH ROW EXECUTE FUNCTION auto_generate_unit_number();

-- =====================================================
-- SECURITY CONSTRAINTS
-- =====================================================

-- Ensure stock units belong to a company
ALTER TABLE stock_units ADD CONSTRAINT check_stock_unit_company_not_null 
    CHECK (company_id IS NOT NULL);
