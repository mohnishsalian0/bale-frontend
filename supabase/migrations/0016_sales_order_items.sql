
-- Bale Backend - Sales Order Management
-- Customer order management with real-time fulfillment tracking

-- =====================================================
-- SALES ORDER LINE ITEMS
-- =====================================================

CREATE TABLE sales_order_items (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    
    -- Quantities
    required_quantity DECIMAL(10,3) NOT NULL,
    dispatched_quantity DECIMAL(10,3) DEFAULT 0,
    pending_quantity DECIMAL(10,3) GENERATED ALWAYS AS (required_quantity - dispatched_quantity) STORED,
    
    -- Pricing
    unit_rate DECIMAL(10,2),
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

-- Update sales order total when line items change
CREATE OR REPLACE FUNCTION update_sales_order_total()
RETURNS TRIGGER AS $$
DECLARE
    order_id UUID;
    subtotal DECIMAL(10,2);
    discount_pct DECIMAL(5,2);
    final_total DECIMAL(10,2);
BEGIN
    -- Get the sales order ID from the affected row
    order_id := COALESCE(NEW.sales_order_id, OLD.sales_order_id);
    
    -- Calculate subtotal from all line items
    SELECT COALESCE(SUM(line_total), 0) 
    INTO subtotal
    FROM sales_order_items 
    WHERE sales_order_id = order_id;
    
    -- Get discount percentage from sales order
    SELECT discount_percentage 
    INTO discount_pct
    FROM sales_orders 
    WHERE id = order_id;
    
    -- Calculate final total with discount applied
    final_total := subtotal * (1 - (COALESCE(discount_pct, 0) / 100));
    
    -- Update the sales order total
    UPDATE sales_orders 
    SET total_amount = final_total
    WHERE id = order_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sales_order_total
    AFTER INSERT OR UPDATE OR DELETE ON sales_order_items
    FOR EACH ROW EXECUTE FUNCTION update_sales_order_total();

-- Prevent reducing required quantity below dispatched quantity
CREATE OR REPLACE FUNCTION validate_required_quantity()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if required_quantity is being reduced below dispatched_quantity
    IF NEW.required_quantity < NEW.dispatched_quantity THEN
        RAISE EXCEPTION 'Cannot reduce required quantity (%) below dispatched quantity (%). Please cancel existing dispatches first.',
            NEW.required_quantity, NEW.dispatched_quantity
            USING HINT = 'To reduce quantity: 1) Cancel existing dispatches, 2) Update required quantity, 3) Create new dispatches if needed',
                  ERRCODE = 'check_violation';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_required_quantity
    BEFORE UPDATE ON sales_order_items
    FOR EACH ROW EXECUTE FUNCTION validate_required_quantity();


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
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('sales_orders.read')
);

-- Authorized users can create sales order items
CREATE POLICY "Authorized users can create sales order items"
ON sales_order_items
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
		authorize('sales_order_items.create')
);

-- Authorized users can update sales order items
CREATE POLICY "Authorized users can update sales order items"
ON sales_order_items
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
		authorize('sales_order_items.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
		authorize('sales_order_items.update')
);

-- Authorized users can delete sales order items
CREATE POLICY "Authorized users can delete sales order items"
ON sales_order_items
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
		authorize('sales_order_items.delete')
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON sales_order_items TO authenticated;

-- Grant limited permissions to anonymous users (for public catalog)
GRANT INSERT ON sales_order_items TO anon;
