-- Bale Backend - Goods Converts
-- Conversion/processing tracking for fabric (dyeing, embroidery, printing, etc.)

-- =====================================================
-- GOODS CONVERTS TABLE
-- =====================================================

CREATE TABLE goods_converts (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,

    -- Convert identification
    sequence_number INTEGER NOT NULL,

    -- Conversion details
    service_type_attribute_id UUID NOT NULL REFERENCES attributes(id), -- Service type from attributes (group_name='service_type')
    output_product_id UUID NOT NULL REFERENCES products(id), -- Product created after conversion
    vendor_id UUID NOT NULL REFERENCES partners(id), -- Vendor performing the work
    agent_id UUID REFERENCES partners(id), -- Optional agent/broker

    -- Job work billing
    invoice_id UUID, -- Links to purchase invoice for job work charges

    -- Reference tracking
    reference_number VARCHAR(50), -- Form GST ITC-04, delivery challan, or other reference
    job_work_id UUID REFERENCES job_works(id), -- Optional link for future fulfillment tracking

    -- Timeline
    start_date DATE NOT NULL,
    completion_date DATE,

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress'
        CHECK (status IN ('in_progress', 'completed', 'cancelled')),

    -- Completion tracking
    completed_at TIMESTAMPTZ,
    completed_by UUID,

    -- Cancellation tracking
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID,
    cancellation_reason TEXT,

    -- Additional information
    notes TEXT,
    attachments TEXT[], -- Array of file URLs

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID NOT NULL DEFAULT get_jwt_user_id(),
    modified_by UUID,
    deleted_at TIMESTAMPTZ,

    -- Full-text search
    search_vector tsvector,

    UNIQUE(company_id, sequence_number)
);

-- =====================================================
-- GOODS CONVERT INPUT ITEMS TABLE
-- =====================================================

CREATE TABLE goods_convert_input_items (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    convert_id UUID NOT NULL REFERENCES goods_converts(id) ON DELETE CASCADE,
    stock_unit_id UUID NOT NULL REFERENCES stock_units(id),
    quantity_consumed DECIMAL(10,3) NOT NULL,

    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- ADD FOREIGN KEY CONSTRAINTS TO RELATED TABLES
-- =====================================================

-- Add FK constraint from stock_units to goods_converts
ALTER TABLE stock_units ADD CONSTRAINT fk_stock_unit_origin_convert
    FOREIGN KEY (origin_convert_id) REFERENCES goods_converts(id);

-- Add FK constraint from stock_unit_adjustments to goods_converts
ALTER TABLE stock_unit_adjustments ADD CONSTRAINT fk_adjustment_convert
    FOREIGN KEY (convert_id) REFERENCES goods_converts(id);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- goods_converts indexes
CREATE INDEX idx_goods_converts_company_id ON goods_converts(company_id);
CREATE INDEX idx_goods_converts_warehouse_id ON goods_converts(warehouse_id);
CREATE INDEX idx_goods_converts_service_type ON goods_converts(service_type_attribute_id);
CREATE INDEX idx_goods_converts_output_product ON goods_converts(output_product_id);
CREATE INDEX idx_goods_converts_vendor_id ON goods_converts(vendor_id);
CREATE INDEX idx_goods_converts_invoice_id ON goods_converts(invoice_id);
CREATE INDEX idx_goods_converts_job_work_id ON goods_converts(job_work_id);
CREATE INDEX idx_goods_converts_status ON goods_converts(company_id, status);
CREATE INDEX idx_goods_converts_date ON goods_converts(company_id, start_date);
CREATE INDEX idx_goods_converts_sequence_number ON goods_converts(company_id, sequence_number);

-- Full-text search index
CREATE INDEX idx_goods_converts_search ON goods_converts USING GIN(search_vector);

-- goods_convert_input_items indexes
CREATE INDEX idx_goods_convert_input_items_company_id ON goods_convert_input_items(company_id);
CREATE INDEX idx_goods_convert_input_items_convert_id ON goods_convert_input_items(convert_id);
CREATE INDEX idx_goods_convert_input_items_stock_unit ON goods_convert_input_items(stock_unit_id);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

-- Auto-update timestamps
CREATE TRIGGER update_goods_converts_updated_at
    BEFORE UPDATE ON goods_converts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_goods_converts_modified_by
    BEFORE UPDATE ON goods_converts
    FOR EACH ROW EXECUTE FUNCTION set_modified_by();

CREATE TRIGGER update_goods_convert_input_items_updated_at
    BEFORE UPDATE ON goods_convert_input_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-generate sequence numbers
CREATE OR REPLACE FUNCTION auto_generate_convert_sequence()
RETURNS TRIGGER AS $$
BEGIN
		NEW.sequence_number := get_next_sequence('goods_converts', NEW.company_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_convert_sequence
    BEFORE INSERT ON goods_converts
    FOR EACH ROW EXECUTE FUNCTION auto_generate_convert_sequence();

-- Auto-set completed_at and completed_by
CREATE TRIGGER set_goods_converts_completed_at
    BEFORE UPDATE ON goods_converts
    FOR EACH ROW
    WHEN (OLD.status != 'completed' AND NEW.status = 'completed')
    EXECUTE FUNCTION set_completed_at();

CREATE TRIGGER set_goods_converts_completed_by
    BEFORE UPDATE ON goods_converts
    FOR EACH ROW
    WHEN (OLD.status != 'completed' AND NEW.status = 'completed')
    EXECUTE FUNCTION set_completed_by();

-- Auto-set cancelled_at and cancelled_by
CREATE TRIGGER set_goods_converts_cancelled_at
    BEFORE UPDATE ON goods_converts
    FOR EACH ROW
    WHEN (OLD.status != 'cancelled' AND NEW.status = 'cancelled')
    EXECUTE FUNCTION set_cancelled_at();

CREATE TRIGGER set_goods_converts_cancelled_by
    BEFORE UPDATE ON goods_converts
    FOR EACH ROW
    WHEN (OLD.status != 'cancelled' AND NEW.status = 'cancelled')
    EXECUTE FUNCTION set_cancelled_by();

-- Update search vector for full-text search
CREATE OR REPLACE FUNCTION update_goods_convert_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_vendor_name TEXT;
    v_warehouse_name TEXT;
    v_service_type_name TEXT;
    v_output_product_name TEXT;
    v_input_product_names TEXT;
    v_invoice_number TEXT;
BEGIN
    -- If record is soft-deleted, set search_vector to NULL to exclude from index
    IF NEW.deleted_at IS NOT NULL THEN
        NEW.search_vector := NULL;
        RETURN NEW;
    END IF;

    -- Get vendor name (if exists)
    IF NEW.vendor_id IS NOT NULL THEN
        SELECT CONCAT(first_name, ' ', last_name, ' ', COALESCE(company_name, ''))
        INTO v_vendor_name
        FROM partners
        WHERE id = NEW.vendor_id;
    END IF;

    -- Get warehouse name
    SELECT name
    INTO v_warehouse_name
    FROM warehouses
    WHERE id = NEW.warehouse_id;

    -- Get service type attribute name
    SELECT name
    INTO v_service_type_name
    FROM attributes
    WHERE id = NEW.service_type_attribute_id;

    -- Get output product name
    SELECT name
    INTO v_output_product_name
    FROM products
    WHERE id = NEW.output_product_id;

    -- Get aggregated input product names
    SELECT string_agg(DISTINCT p.name, ' ')
    INTO v_input_product_names
    FROM goods_convert_input_items gci
    JOIN stock_units su ON su.id = gci.stock_unit_id
    JOIN products p ON p.id = su.product_id
    WHERE gci.convert_id = NEW.id;

    -- Get invoice number (if linked)
    IF NEW.invoice_id IS NOT NULL THEN
        SELECT invoice_number
        INTO v_invoice_number
        FROM invoices
        WHERE id = NEW.invoice_id;
    END IF;

    -- Build weighted search vector
    NEW.search_vector :=
        -- Weight A: Primary identifiers
        setweight(to_tsvector('simple', COALESCE(NEW.sequence_number::text, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(v_vendor_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(v_warehouse_name, '')), 'A') ||

        -- Weight B: Product names and service type
        setweight(to_tsvector('english', COALESCE(v_input_product_names, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(v_output_product_name, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(v_service_type_name, '')), 'B') ||

        -- Weight C: Reference and invoice
        setweight(to_tsvector('simple', COALESCE(NEW.reference_number, '')), 'C') ||
        setweight(to_tsvector('simple', COALESCE(v_invoice_number, '')), 'C') ||

        -- Weight D: Cancellation reason
        setweight(to_tsvector('english', COALESCE(NEW.cancellation_reason, '')), 'D');

    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_goods_convert_search_vector
    BEFORE INSERT OR UPDATE ON goods_converts
    FOR EACH ROW EXECUTE FUNCTION update_goods_convert_search_vector();

-- =====================================================
-- GOODS CONVERTS TABLE RLS POLICIES
-- =====================================================

ALTER TABLE goods_converts ENABLE ROW LEVEL SECURITY;

-- Authorized users can view goods converts in their assigned warehouses
CREATE POLICY "Authorized users can view goods converts"
ON goods_converts
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('inventory.converts.read')
);

-- Authorized users can create goods converts in their assigned warehouses
CREATE POLICY "Authorized users can create goods converts"
ON goods_converts
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('inventory.converts.create')
);

-- Authorized users can update goods converts in their assigned warehouses
CREATE POLICY "Authorized users can update goods converts"
ON goods_converts
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('inventory.converts.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('inventory.converts.update')
);

-- Authorized users can delete goods converts in their assigned warehouses
CREATE POLICY "Authorized users can delete goods converts"
ON goods_converts
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('inventory.converts.delete')
);

-- =====================================================
-- GOODS CONVERT INPUT ITEMS TABLE RLS POLICIES
-- =====================================================

ALTER TABLE goods_convert_input_items ENABLE ROW LEVEL SECURITY;

-- Authorized users can view goods convert input items in their assigned warehouses
CREATE POLICY "Authorized users can view goods convert input items"
ON goods_convert_input_items
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    authorize('inventory.converts.read')
);

-- Authorized users can create goods convert input items in their assigned warehouses
CREATE POLICY "Authorized users can create goods convert input items"
ON goods_convert_input_items
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    authorize('inventory.converts.create')
);

-- Authorized users can update goods convert input items in their assigned warehouses
CREATE POLICY "Authorized users can update goods convert input items"
ON goods_convert_input_items
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    authorize('inventory.converts.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    authorize('inventory.converts.update')
);

-- Authorized users can delete goods convert input items in their assigned warehouses
CREATE POLICY "Authorized users can delete goods convert input items"
ON goods_convert_input_items
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    authorize('inventory.converts.delete')
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON goods_converts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON goods_convert_input_items TO authenticated;
