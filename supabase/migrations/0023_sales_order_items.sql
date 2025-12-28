
-- Bale Backend - Sales Order Management
-- Customer order management with real-time fulfillment tracking

-- =====================================================
-- SALES ORDER LINE ITEMS
-- =====================================================

CREATE TABLE sales_order_items (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    warehouse_id UUID REFERENCES warehouses(id),
    sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    
    -- Quantities
    required_quantity DECIMAL(10,3) NOT NULL,
    dispatched_quantity DECIMAL(10,3) DEFAULT 0,
    pending_quantity DECIMAL(10,3) GENERATED ALWAYS AS (required_quantity - dispatched_quantity) STORED,
    
    -- Pricing
    unit_rate DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(10,2) GENERATED ALWAYS AS (required_quantity * COALESCE(unit_rate, 0)) STORED,
    
    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Sales Order Items indexes
CREATE INDEX idx_sales_order_items_company_id ON sales_order_items(company_id);
CREATE INDEX idx_sales_order_items_sales_order ON sales_order_items(sales_order_id);
CREATE INDEX idx_sales_order_items_product ON sales_order_items(product_id);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

CREATE TRIGGER update_sales_order_items_updated_at
    BEFORE UPDATE ON sales_order_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-populate unit rate from product master
CREATE OR REPLACE FUNCTION auto_populate_unit_rate()
RETURNS TRIGGER AS $$
BEGIN
    -- Only auto-populate unit_rate if not provided or is zero
    -- This allows users to override with custom rates
    IF NEW.unit_rate IS NULL OR NEW.unit_rate = 0 THEN
        -- Fetch selling price from product master
        SELECT selling_price_per_unit 
        INTO NEW.unit_rate
        FROM products 
        WHERE id = NEW.product_id;
        
        -- If product has no selling price, leave unit_rate as provided
        NEW.unit_rate := COALESCE(NEW.unit_rate, 0);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_populate_unit_rate
    BEFORE INSERT OR UPDATE ON sales_order_items
    FOR EACH ROW EXECUTE FUNCTION auto_populate_unit_rate();

-- Note: update_sales_order_total() and validate_required_quantity() have been removed
-- All calculations are now handled by reconcile_sales_order() in migration 0060


-- =====================================================
-- SALES ORDER ITEMS TABLE RLS POLICIES
-- =====================================================

ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;

-- Authorized users can view sales order items if they can view the parent sales order
CREATE POLICY "Authorized users can view sales order items"
ON sales_order_items
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('sales_orders.read')
);

-- Authorized users can create sales order items
CREATE POLICY "Authorized users can create sales order items"
ON sales_order_items
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
		authorize('sales_order_items.create')
);

-- Authorized users can update sales order items
CREATE POLICY "Authorized users can update sales order items"
ON sales_order_items
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
		authorize('sales_order_items.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
		authorize('sales_order_items.update')
);

-- Authorized users can delete sales order items
CREATE POLICY "Authorized users can delete sales order items"
ON sales_order_items
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
		authorize('sales_order_items.delete')
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON sales_order_items TO authenticated;
