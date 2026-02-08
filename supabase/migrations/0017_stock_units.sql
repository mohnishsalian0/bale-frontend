-- Bale Backend - Stock Units and Inventory Management
-- Individual fabric rolls/batches tracking with qr code management

-- =====================================================
-- STOCK UNIT STATUS ENUM
-- =====================================================

CREATE TYPE stock_unit_status_enum AS ENUM ('available', 'in_transit', 'processing');

-- =====================================================
-- STOCK UNITS TABLE
-- =====================================================

CREATE TABLE stock_units (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    current_warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
    
    -- Identity
    sequence_number INTEGER NOT NULL,
    stock_number VARCHAR(100) NOT NULL, -- Auto-generated (ROLL-123, BATCH-456) or custom identifier

    -- Physical specifications
    remaining_quantity DECIMAL(10,3) NOT NULL,
    initial_quantity DECIMAL(10,3) NOT NULL, -- Track initial quantity at creation
    lot_number_attribute_id UUID REFERENCES attributes(id) ON DELETE SET NULL, -- FK to attributes table (group_name = 'lot_number')
    quality_grade TEXT, -- Custom quality grade with auto-suggestions from previously used values
    warehouse_location TEXT,

    -- Status tracking (operational status, not quantity-based)
    status stock_unit_status_enum NOT NULL DEFAULT 'available',

    -- Dates
    manufacturing_date DATE,

    -- Origin tracking (where this unit came from: inward or convert)
    origin_type VARCHAR(10) NOT NULL DEFAULT 'inward' CHECK (origin_type IN ('inward', 'convert')),
    origin_inward_id UUID, -- FK will be added in goods movement migration
    origin_convert_id UUID, -- FK will be added in goods convert migration

    -- Activity tracking flags (has this unit ever been used in these operations)
    has_outward BOOLEAN DEFAULT false,
    has_convert BOOLEAN DEFAULT false,
    has_transfers BOOLEAN DEFAULT false,
    last_activity_date DATE, -- Last date of any activity (outward/convert/transfer/adjustment)

    notes TEXT,

    -- QR Code tracking
    qr_generated_at TIMESTAMPTZ,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL DEFAULT get_jwt_user_id(),
    modified_by UUID,
    deleted_at TIMESTAMPTZ,

    -- Business logic constraints
    CONSTRAINT check_origin_type_consistency
        CHECK (
            (origin_type = 'inward' AND origin_inward_id IS NOT NULL AND origin_convert_id IS NULL) OR
            (origin_type = 'convert' AND origin_convert_id IS NOT NULL AND origin_inward_id IS NULL)
        ),

    UNIQUE(company_id, sequence_number)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Multi-tenant index
CREATE INDEX idx_stock_units_company_id ON stock_units(company_id);

-- Warehouse-specific indexes (most common queries)
CREATE INDEX idx_stock_units_current_warehouse_id ON stock_units(current_warehouse_id);
CREATE INDEX idx_stock_units_status ON stock_units(current_warehouse_id, status);

-- Product relationship
CREATE INDEX idx_stock_units_product_id ON stock_units(product_id);

-- Sequence number lookup within company
CREATE INDEX idx_stock_units_sequence_number ON stock_units(company_id, sequence_number);

-- Origin tracking (for audit trail)
CREATE INDEX idx_stock_units_origin_inward_id ON stock_units(origin_inward_id);
CREATE INDEX idx_stock_units_origin_convert_id ON stock_units(origin_convert_id);

-- Quality grade filtering
CREATE INDEX idx_stock_units_quality_grade ON stock_units(company_id, quality_grade);

-- Lot number filtering
CREATE INDEX idx_stock_units_lot_number_attribute_id ON stock_units(lot_number_attribute_id);

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
DECLARE
	v_stock_type VARCHAR(10);
	v_prefix VARCHAR(10);
BEGIN
		NEW.sequence_number := get_next_sequence('stock_units', NEW.company_id);

    -- Only generate if stock_number is not provided
    IF NEW.stock_number IS NULL THEN
        -- Get stock_type from the product
        SELECT stock_type INTO v_stock_type
        FROM products
        WHERE id = NEW.product_id;

        -- Determine prefix based on stock_type
        v_prefix := CASE
            WHEN v_stock_type = 'roll' THEN 'ROLL'
            WHEN v_stock_type = 'batch' THEN 'BATCH'
            ELSE 'SU'
        END;

        -- Generate stock_number using prefix and sequence_number
        NEW.stock_number := v_prefix || '-' || NEW.sequence_number;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_unit_sequence
    BEFORE INSERT ON stock_units
    FOR EACH ROW EXECUTE FUNCTION auto_generate_unit_sequence();

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
    has_warehouse_access(current_warehouse_id) AND
    authorize('inventory.stock_units.read')
);

-- Authorized users can create stock units in their assigned warehouses
CREATE POLICY "Authorized users can create stock units"
ON stock_units
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(current_warehouse_id) AND
    authorize('inventory.stock_units.create')
);

-- Authorized users can update stock units in their assigned warehouses
CREATE POLICY "Authorized users can update stock units"
ON stock_units
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(current_warehouse_id) AND
    authorize('inventory.stock_units.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(current_warehouse_id) AND
    authorize('inventory.stock_units.update')
);

-- Authorized users can delete stock units in their assigned warehouses
CREATE POLICY "Authorized users can delete stock units"
ON stock_units
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(current_warehouse_id) AND
    authorize('inventory.stock_units.delete')
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON stock_units TO authenticated;
