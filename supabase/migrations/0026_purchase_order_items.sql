
-- Bale Backend - Purchase Order Management
-- Supplier order management with real-time fulfillment tracking

-- =====================================================
-- PURCHASE ORDER LINE ITEMS
-- =====================================================

CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE DEFAULT get_jwt_company_id(),
    warehouse_id UUID REFERENCES warehouses(id),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),

    -- Quantities
    required_quantity DECIMAL(10,3) NOT NULL,
    received_quantity DECIMAL(10,3) DEFAULT 0,
    pending_quantity DECIMAL(10,3) GENERATED ALWAYS AS (required_quantity - received_quantity) STORED,

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

-- Purchase Order Items indexes
CREATE INDEX idx_purchase_order_items_company_id ON purchase_order_items(company_id);
CREATE INDEX idx_purchase_order_items_purchase_order ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_purchase_order_items_product ON purchase_order_items(product_id);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATES
-- =====================================================

CREATE TRIGGER update_purchase_order_items_updated_at
    BEFORE UPDATE ON purchase_order_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-populate unit rate from product master (cost price)
CREATE OR REPLACE FUNCTION auto_populate_purchase_unit_rate()
RETURNS TRIGGER AS $$
BEGIN
    -- Only auto-populate unit_rate if not provided or is zero
    -- This allows users to override with custom rates
    IF NEW.unit_rate IS NULL OR NEW.unit_rate = 0 THEN
        -- Fetch cost price from product master
        SELECT cost_price_per_unit
        INTO NEW.unit_rate
        FROM products
        WHERE id = NEW.product_id;

        -- If product has no cost price, leave unit_rate as provided
        NEW.unit_rate := COALESCE(NEW.unit_rate, 0);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_populate_purchase_unit_rate
    BEFORE INSERT OR UPDATE ON purchase_order_items
    FOR EACH ROW EXECUTE FUNCTION auto_populate_purchase_unit_rate();

-- Update purchase order total when line items change
CREATE OR REPLACE FUNCTION update_purchase_order_total()
RETURNS TRIGGER AS $$
DECLARE
    order_id UUID;
    subtotal DECIMAL(10,2);
    disc_type discount_type_enum;
    disc_value DECIMAL(10,2);
    gst_rate_val DECIMAL(5,2);
    discount_amount DECIMAL(10,2);
    discounted_total DECIMAL(10,2);
    gst_amt DECIMAL(10,2);
    final_total DECIMAL(10,2);
BEGIN
    -- Get the purchase order ID from the affected row
    order_id := COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);

    -- Calculate subtotal from all line items
    SELECT COALESCE(SUM(line_total), 0)
    INTO subtotal
    FROM purchase_order_items
    WHERE purchase_order_id = order_id;

    -- Get discount info and GST rate from purchase order
    SELECT discount_type, discount_value, gst_rate
    INTO disc_type, disc_value, gst_rate_val
    FROM purchase_orders
    WHERE id = order_id;

    -- Calculate discount amount based on type
    IF disc_type = 'none' THEN
        discount_amount := 0;
    ELSIF disc_type = 'percentage' THEN
        discount_amount := subtotal * (COALESCE(disc_value, 0) / 100);
    ELSIF disc_type = 'flat_amount' THEN
        discount_amount := COALESCE(disc_value, 0);
    ELSE
        discount_amount := 0;
    END IF;

    -- Calculate discounted total
    discounted_total := subtotal - discount_amount;

    -- Calculate GST amount (applied after discount)
    gst_amt := discounted_total * (COALESCE(gst_rate_val, 0) / 100);

    -- Calculate final total
    final_total := discounted_total + gst_amt;

    -- Update the purchase order totals
    UPDATE purchase_orders
    SET total_amount = final_total,
        gst_amount = gst_amt
    WHERE id = order_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_purchase_order_total
    AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
    FOR EACH ROW EXECUTE FUNCTION update_purchase_order_total();

-- Prevent reducing required quantity below received quantity
CREATE OR REPLACE FUNCTION validate_purchase_required_quantity()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if required_quantity is being reduced below received_quantity
    IF NEW.required_quantity < NEW.received_quantity THEN
        RAISE EXCEPTION 'Cannot reduce required quantity (%) below received quantity (%). Please cancel existing inwards first.',
            NEW.required_quantity, NEW.received_quantity
            USING HINT = 'To reduce quantity: 1) Cancel existing inwards, 2) Update required quantity, 3) Create new inwards if needed',
                  ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_purchase_required_quantity
    BEFORE UPDATE ON purchase_order_items
    FOR EACH ROW EXECUTE FUNCTION validate_purchase_required_quantity();


-- =====================================================
-- PURCHASE ORDER ITEMS TABLE RLS POLICIES
-- =====================================================

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Authorized users can view purchase order items if they can view the parent purchase order
CREATE POLICY "Authorized users can view purchase order items"
ON purchase_order_items
FOR SELECT
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
    authorize('purchase_orders.read')
);

-- Authorized users can create purchase order items
CREATE POLICY "Authorized users can create purchase order items"
ON purchase_order_items
FOR INSERT
TO authenticated
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
		authorize('purchase_order_items.create')
);

-- Authorized users can update purchase order items
CREATE POLICY "Authorized users can update purchase order items"
ON purchase_order_items
FOR UPDATE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
		authorize('purchase_order_items.update')
)
WITH CHECK (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
		authorize('purchase_order_items.update')
);

-- Authorized users can delete purchase order items
CREATE POLICY "Authorized users can delete purchase order items"
ON purchase_order_items
FOR DELETE
TO authenticated
USING (
    company_id = get_jwt_company_id() AND
    has_warehouse_access(warehouse_id) AND
		authorize('purchase_order_items.delete')
);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON purchase_order_items TO authenticated;
