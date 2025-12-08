-- Bale Backend - Sales Order Management
-- Customer order management with real-time fulfillment tracking

-- =====================================================
-- DISCOUNT TYPE ENUM
-- =====================================================

CREATE TYPE discount_type_enum AS ENUM ('none', 'percentage', 'flat_amount');

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
    warehouse_id UUID REFERENCES warehouses(id), -- Nullable for catalog orders, must be set before fulfillment

    -- Order source tracking
    source VARCHAR(50) DEFAULT 'manual' NOT NULL,

    -- Financial
    advance_amount DECIMAL(10,2) DEFAULT 0,
    discount_type discount_type_enum DEFAULT 'none' NOT NULL,
    discount_value DECIMAL(10,2) DEFAULT 0,
    payment_terms VARCHAR(100),
    gst_rate DECIMAL(5,2) DEFAULT 10.00,
    gst_amount DECIMAL(10,2),
    total_amount DECIMAL(10,2) DEFAULT 0,

    -- Link tracking flags
    has_outward BOOLEAN DEFAULT false,
    invoice_number VARCHAR(50),
    
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
    created_by UUID DEFAULT get_jwt_user_id(),
    modified_by UUID,
    deleted_at TIMESTAMPTZ,

    -- Full-text search
    search_vector tsvector,

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

-- Full-text search index
CREATE INDEX idx_sales_orders_search ON sales_orders USING GIN(search_vector);

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

-- Update sales order total when discount or GST rate changes
CREATE OR REPLACE FUNCTION update_sales_order_total_on_discount()
RETURNS TRIGGER AS $$
DECLARE
    subtotal DECIMAL(10,2);
    discount_amount DECIMAL(10,2);
    discounted_total DECIMAL(10,2);
    gst_amt DECIMAL(10,2);
    final_total DECIMAL(10,2);
BEGIN
    -- Recalculate if discount_type, discount_value, or gst_rate changed
    IF OLD.discount_type IS DISTINCT FROM NEW.discount_type OR
       OLD.discount_value IS DISTINCT FROM NEW.discount_value OR
       OLD.gst_rate IS DISTINCT FROM NEW.gst_rate THEN
        -- Calculate subtotal from all line items
        SELECT COALESCE(SUM(line_total), 0)
        INTO subtotal
        FROM sales_order_items
        WHERE sales_order_id = NEW.id;

        -- Calculate discount amount based on type
        IF NEW.discount_type = 'none' THEN
            discount_amount := 0;
        ELSIF NEW.discount_type = 'percentage' THEN
            discount_amount := subtotal * (COALESCE(NEW.discount_value, 0) / 100);
        ELSIF NEW.discount_type = 'flat_amount' THEN
            discount_amount := COALESCE(NEW.discount_value, 0);
        ELSE
            discount_amount := 0;
        END IF;

        -- Calculate discounted total
        discounted_total := subtotal - discount_amount;

        -- Calculate GST amount (applied after discount)
        gst_amt := discounted_total * (COALESCE(NEW.gst_rate, 0) / 100);

        -- Calculate final total
        final_total := discounted_total + gst_amt;

        -- Update the amounts
        NEW.gst_amount := gst_amt;
        NEW.total_amount := final_total;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sales_order_total_on_discount
    BEFORE UPDATE ON sales_orders
    FOR EACH ROW EXECUTE FUNCTION update_sales_order_total_on_discount();

-- Update partner's last_interaction_at timestamp
CREATE TRIGGER trigger_sales_orders_update_partner_interaction
    AFTER INSERT OR UPDATE ON sales_orders
    FOR EACH ROW
    WHEN (NEW.deleted_at IS NULL)
    EXECUTE FUNCTION update_partner_last_interaction();

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
    (warehouse_id IS NULL OR has_warehouse_access(warehouse_id)) AND
    authorize('sales_orders.read')
);

-- Authorized users can create sales orders
CREATE POLICY "Authorized users can create sales orders"
ON sales_orders
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    (warehouse_id IS NULL OR has_warehouse_access(warehouse_id)) AND
		authorize('sales_orders.create')
);

-- Authorized users can update sales orders
CREATE POLICY "Authorized users can update sales orders"
ON sales_orders
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    (warehouse_id IS NULL OR has_warehouse_access(warehouse_id)) AND
		authorize('sales_orders.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    (warehouse_id IS NULL OR has_warehouse_access(warehouse_id)) AND
		authorize('sales_orders.update')
);

-- Authorized users can delete sales orders
CREATE POLICY "Authorized users can delete sales orders"
ON sales_orders
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    (warehouse_id IS NULL OR has_warehouse_access(warehouse_id)) AND
		authorize('sales_orders.delete')
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON sales_orders TO authenticated;
