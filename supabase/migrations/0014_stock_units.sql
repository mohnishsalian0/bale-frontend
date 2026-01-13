-- Bale Backend - Stock Units and Inventory Management
-- Individual fabric rolls/pieces tracking with qr code management

-- =====================================================
-- STOCK UNITS TABLE
-- =====================================================

CREATE TABLE stock_units (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    
    -- Identity
    sequence_number INTEGER NOT NULL,

    -- Physical specifications
    remaining_quantity DECIMAL(10,3) NOT NULL,
    initial_quantity DECIMAL(10,3) NOT NULL, -- Track initial quantity at creation
    supplier_number VARCHAR(100),
    quality_grade TEXT, -- Custom quality grade with auto-suggestions from previously used values
    warehouse_location TEXT,
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'full'
        CHECK (status IN ('full', 'partial', 'empty', 'removed')),
    
    -- Dates
    manufacturing_date DATE,

    -- Inward tracking (links back to goods inward that created this unit)
    created_from_inward_id UUID, -- FK will be added in goods movement migration

    -- Outward tracking (has this unit ever been dispatched)
    has_outward BOOLEAN DEFAULT false,

    notes TEXT,

    -- QR Code tracking
    qr_generated_at TIMESTAMPTZ,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL DEFAULT get_jwt_user_id(),
    modified_by UUID,
    deleted_at TIMESTAMPTZ,
    
    UNIQUE(company_id, sequence_number)
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

-- Sequence number lookup within company
CREATE INDEX idx_stock_units_sequence_number ON stock_units(company_id, sequence_number);

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

-- Auto-generate sequence numbers
CREATE OR REPLACE FUNCTION auto_generate_unit_sequence()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sequence_number IS NULL THEN
        NEW.sequence_number := get_next_sequence('stock_units', NEW.company_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_unit_sequence
    BEFORE INSERT ON stock_units
    FOR EACH ROW EXECUTE FUNCTION auto_generate_unit_sequence();

-- NOTE: Status auto-update logic has been merged into reconcile_stock_unit() function
-- in migration 0062_stock_unit_reconciliation.sql for better consistency and maintainability.

-- =====================================================
-- STOCK UNITS TABLE RLS POLICIES
-- =====================================================

ALTER TABLE stock_units ENABLE ROW LEVEL SECURITY;

-- Authorized users can view stock units in their assigned warehouses
CREATE POLICY "Authorized users can view stock units"
ON stock_units
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('stock_units.read')
);

-- Authorized users can create stock units in their assigned warehouses
CREATE POLICY "Authorized users can create stock units"
ON stock_units
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('stock_units.create')
);

-- Authorized users can update stock units in their assigned warehouses
CREATE POLICY "Authorized users can update stock units"
ON stock_units
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('stock_units.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('stock_units.update')
);

-- Authorized users can delete stock units in their assigned warehouses
CREATE POLICY "Authorized users can delete stock units"
ON stock_units
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('stock_units.delete')
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON stock_units TO authenticated;
