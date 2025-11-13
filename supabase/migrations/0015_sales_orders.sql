-- Bale Backend - Sales Order Management
-- Customer order management with real-time fulfillment tracking

-- =====================================================
-- SALES ORDERS TABLE
-- =====================================================

CREATE TABLE sales_orders (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    
    -- Order identification
    sequence_number INTEGER NOT NULL,
    
    -- Customer information
    customer_id UUID NOT NULL REFERENCES partners(id),
    agent_id UUID REFERENCES partners(id),
    
    -- Order details
    order_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE, -- Optional, can be set later during order processing
    warehouse_id UUID NOT NULL REFERENCES warehouses(id),
    
    -- Financial
    advance_amount DECIMAL(10,2) DEFAULT 0,
    discount_percentage DECIMAL(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100), -- Percentage value (0-100)
    total_amount DECIMAL(10,2) DEFAULT 0,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'approval_pending' 
        CHECK (status IN ('approval_pending', 'in_progress', 'completed', 'cancelled')),
    
    -- Status change tracking
    status_changed_at TIMESTAMPTZ,
    status_changed_by UUID,
    status_notes TEXT, -- Completion notes or cancellation reason

    notes TEXT,
    attachments TEXT[], -- Array of file URLs

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

CREATE INDEX idx_sales_orders_company_id ON sales_orders(company_id);
CREATE INDEX idx_sales_orders_customer ON sales_orders(company_id, customer_id);
CREATE INDEX idx_sales_orders_status ON sales_orders(company_id, status);
CREATE INDEX idx_sales_orders_date ON sales_orders(company_id, order_date);
CREATE INDEX idx_sales_orders_warehouse ON sales_orders(warehouse_id);
CREATE INDEX idx_sales_orders_sequence_number ON sales_orders(company_id, sequence_number);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

-- Auto-update timestamps
CREATE TRIGGER update_sales_orders_updated_at
    BEFORE UPDATE ON sales_orders
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-set modified_by
CREATE TRIGGER set_sales_orders_modified_by
    BEFORE UPDATE ON sales_orders
    FOR EACH ROW EXECUTE FUNCTION set_modified_by();

-- Auto-generate order numbers
CREATE OR REPLACE FUNCTION auto_generate_order_sequence()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sequence_number IS NULL THEN
        NEW.sequence_number := get_next_sequence('sales_orders', NEW.company_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_order_sequence
    BEFORE INSERT ON sales_orders
    FOR EACH ROW EXECUTE FUNCTION auto_generate_order_sequence();

-- Update sales order total when discount percentage changes
CREATE OR REPLACE FUNCTION update_sales_order_total_on_discount()
RETURNS TRIGGER AS $$
DECLARE
    subtotal DECIMAL(10,2);
    final_total DECIMAL(10,2);
BEGIN
    -- Only recalculate if discount_percentage changed
    IF OLD.discount_percentage IS DISTINCT FROM NEW.discount_percentage THEN
        -- Calculate subtotal from all line items
        SELECT COALESCE(SUM(line_total), 0) 
        INTO subtotal
        FROM sales_order_items 
        WHERE sales_order_id = NEW.id;
        
        -- Calculate final total with new discount applied
        final_total := subtotal * (1 - (COALESCE(NEW.discount_percentage, 0) / 100));
        
        -- Update the total amount
        NEW.total_amount := final_total;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sales_order_total_on_discount
    BEFORE UPDATE ON sales_orders
    FOR EACH ROW EXECUTE FUNCTION update_sales_order_total_on_discount();

-- =====================================================
-- SALES ORDERS TABLE RLS POLICIES
-- =====================================================

ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;

-- Authorized users can view sales orders in their assigned warehouses
CREATE POLICY "Authorized users can view sales orders"
ON sales_orders
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
    authorize('sales_orders.read')
);

-- Authorized users can create sales orders
CREATE POLICY "Authorized users can create sales orders"
ON sales_orders
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
		authorize('sales_orders.create')
);

-- Authorized users can update sales orders
CREATE POLICY "Authorized users can update sales orders"
ON sales_orders
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
		authorize('sales_orders.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
		authorize('sales_orders.update')
);

-- Authorized users can delete sales orders
CREATE POLICY "Authorized users can delete sales orders"
ON sales_orders
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    warehouse_id = ANY(get_jwt_warehouse_ids()) AND
		authorize('sales_orders.delete')
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON sales_orders TO authenticated;

-- Grant limited permissions to anonymous users (for public catalog)
GRANT INSERT ON sales_orders TO anon;
