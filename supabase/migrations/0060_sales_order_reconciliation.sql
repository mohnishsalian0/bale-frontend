-- Bale Backend - Sales Order Reconciliation
-- Automatically maintain sales order progress and status based on goods outward dispatches

-- =====================================================
-- HELPER FUNCTIONS FOR STATUS TRACKING
-- =====================================================

-- Function to set status_changed_at on UPDATE when status changes
CREATE OR REPLACE FUNCTION set_status_changed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.status_changed_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to set status_changed_by on UPDATE when status changes
CREATE OR REPLACE FUNCTION set_status_changed_by()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        NEW.status_changed_by := get_jwt_user_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to sales_orders table
CREATE TRIGGER trigger_set_status_changed_at
    BEFORE UPDATE ON sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_status_changed_at();

CREATE TRIGGER trigger_set_status_changed_by
    BEFORE UPDATE ON sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_status_changed_by();

COMMENT ON FUNCTION set_status_changed_at() IS 'Automatically sets status_changed_at timestamp when status changes';
COMMENT ON FUNCTION set_status_changed_by() IS 'Automatically sets status_changed_by user ID when status changes';

-- =====================================================
-- SALES ORDER ITEMS RECONCILIATION FUNCTION
-- =====================================================

-- Reconcile sales_order_items: update dispatched_quantity from goods_outward_items
-- Triggered via BEFORE UPDATE on sales_order_items (dummy update pattern from goods_outward_items)
CREATE OR REPLACE FUNCTION reconcile_sales_order_items()
RETURNS TRIGGER AS $$
DECLARE
    v_product_dispatched DECIMAL(10,3);
    v_sales_order_id UUID;
BEGIN
    -- Get sales_order_id
    v_sales_order_id := NEW.sales_order_id;

    -- Calculate total dispatched for this product from all non-cancelled outwards
    SELECT COALESCE(SUM(goi.quantity_dispatched), 0)
    INTO v_product_dispatched
    FROM goods_outward_items goi
    INNER JOIN goods_outwards go ON go.id = goi.outward_id
    INNER JOIN stock_units su ON su.id = goi.stock_unit_id
    WHERE go.sales_order_id = v_sales_order_id
      AND su.product_id = NEW.product_id
      AND go.is_cancelled = FALSE
      AND go.deleted_at IS NULL;

    -- Validate: prevent over-fulfillment
    IF v_product_dispatched > NEW.required_quantity THEN
        RAISE EXCEPTION 'Dispatched quantity (%) exceeds required quantity (%) for product in sales order',
            v_product_dispatched, NEW.required_quantity;
    END IF;

    -- Update dispatched_quantity
    NEW.dispatched_quantity := v_product_dispatched;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reconcile_sales_order_items() IS 'Updates dispatched_quantity for sales_order_items based on goods_outward_items. Validates against over-fulfillment.';

-- Trigger reconciliation on sales_order_items BEFORE INSERT OR UPDATE
CREATE TRIGGER trigger_reconcile_sales_order_items
    BEFORE INSERT OR UPDATE ON sales_order_items
    FOR EACH ROW
    EXECUTE FUNCTION reconcile_sales_order_items();

-- =====================================================
-- SALES ORDER RECONCILIATION FUNCTION
-- =====================================================

-- Reconcile sales_order: has_outward flag, totals, GST
-- Triggered via BEFORE UPDATE on sales_orders (dummy update pattern from sales_order_items)
CREATE OR REPLACE FUNCTION reconcile_sales_order()
RETURNS TRIGGER AS $$
DECLARE
    v_item RECORD;
    v_has_any_outward BOOLEAN;
    v_subtotal DECIMAL(15,2);
    v_discount_amount DECIMAL(15,2);
    v_discounted_total DECIMAL(15,2);
    v_gst_amount DECIMAL(15,2);
    v_final_total DECIMAL(15,2);
    v_item_taxable_amount DECIMAL(10,2);
BEGIN
    -- Calculate subtotal from all line items
    SELECT COALESCE(SUM(line_total), 0)
    INTO v_subtotal
    FROM sales_order_items
    WHERE sales_order_id = NEW.id;

    -- Calculate discount amount based on type
    IF NEW.discount_type = 'none' THEN
        v_discount_amount := 0;
    ELSIF NEW.discount_type = 'percentage' THEN
        v_discount_amount := ROUND(v_subtotal * (COALESCE(NEW.discount_value, 0) / 100), 2);
    ELSIF NEW.discount_type = 'flat_amount' THEN
        v_discount_amount := ROUND(COALESCE(NEW.discount_value, 0), 2);
    ELSE
        v_discount_amount := 0;
    END IF;

    -- Calculate discounted total
    v_discounted_total := v_subtotal - v_discount_amount;

    -- Calculate GST amount from product-level rates
    v_gst_amount := 0;
    IF NEW.tax_type IN ('gst', 'igst') THEN
        FOR v_item IN
            SELECT
                soi.line_total,
                COALESCE(p.gst_rate, 0) as product_gst_rate
            FROM sales_order_items soi
            INNER JOIN products p ON p.id = soi.product_id
            WHERE soi.sales_order_id = NEW.id
        LOOP
            -- Calculate proportional discount for this item
            IF v_subtotal > 0 THEN
                v_item_taxable_amount := ROUND((v_item.line_total / v_subtotal) * v_discounted_total, 2);
            ELSE
                v_item_taxable_amount := 0;
            END IF;

            -- Add GST for this item
            v_gst_amount := v_gst_amount + ROUND(v_item_taxable_amount * (v_item.product_gst_rate / 100), 2);
        END LOOP;
    END IF;

    -- Calculate final total
    v_final_total := ROUND(v_discounted_total + v_gst_amount, 2);

    -- Update has_outward flag
    SELECT EXISTS(
        SELECT 1
        FROM goods_outwards
        WHERE sales_order_id = NEW.id
          AND is_cancelled = FALSE
          AND deleted_at IS NULL
    ) INTO v_has_any_outward;

    -- Update NEW with all calculated values
    NEW.has_outward := v_has_any_outward;
    NEW.total_amount := v_final_total;
    NEW.gst_amount := v_gst_amount;
    NEW.discount_amount := v_discount_amount;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reconcile_sales_order() IS 'Calculates sales order totals, GST, and has_outward flag. Does NOT update items.';

-- Trigger reconciliation on sales_orders BEFORE UPDATE
CREATE TRIGGER trigger_reconcile_sales_order
    BEFORE INSERT OR UPDATE ON sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION reconcile_sales_order();

-- =====================================================
-- TRIGGER RECONCILIATION FROM SALES ORDER ITEMS CHANGES
-- =====================================================

-- Trigger reconciliation when sales_order_items change
CREATE OR REPLACE FUNCTION trigger_sales_order_reconciliation_from_items()
RETURNS TRIGGER AS $$
DECLARE
    v_sales_order_id UUID;
BEGIN
    -- Get the affected sales order ID
    v_sales_order_id := COALESCE(NEW.sales_order_id, OLD.sales_order_id);

    -- Touch the sales_order to trigger reconcile_sales_order()
    UPDATE sales_orders
    SET updated_at = updated_at  -- Dummy update to trigger reconciliation
    WHERE id = v_sales_order_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reconcile_from_items
    AFTER INSERT OR UPDATE OR DELETE ON sales_order_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sales_order_reconciliation_from_items();

-- =====================================================
-- TRIGGER ITEM RECONCILIATION FROM GOODS OUTWARD CHANGES
-- =====================================================

-- Trigger sales_order_items reconciliation when goods_outward_items change
CREATE OR REPLACE FUNCTION trigger_sales_order_items_reconciliation()
RETURNS TRIGGER AS $$
DECLARE
    v_sales_order_id UUID;
    v_product_id UUID;
BEGIN
    -- Get the affected sales order ID and product from goods_outward + stock_unit
    IF TG_OP = 'DELETE' THEN
        SELECT go.sales_order_id, su.product_id
        INTO v_sales_order_id, v_product_id
        FROM goods_outwards go
        INNER JOIN stock_units su ON su.id = OLD.stock_unit_id
        WHERE go.id = OLD.outward_id;
    ELSE
        SELECT go.sales_order_id, su.product_id
        INTO v_sales_order_id, v_product_id
        FROM goods_outwards go
        INNER JOIN stock_units su ON su.id = NEW.stock_unit_id
        WHERE go.id = NEW.outward_id;
    END IF;

    -- Only reconcile if linked to a sales order
    IF v_sales_order_id IS NOT NULL AND v_product_id IS NOT NULL THEN
        -- Touch the sales_order_item to trigger reconcile_sales_order_items()
        UPDATE sales_order_items
        SET updated_at = updated_at  -- Dummy update to trigger reconciliation
        WHERE sales_order_id = v_sales_order_id
          AND product_id = v_product_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reconcile_items_on_outward_change
    AFTER INSERT OR UPDATE OR DELETE ON goods_outward_items
    FOR EACH ROW EXECUTE FUNCTION trigger_sales_order_items_reconciliation();

COMMENT ON FUNCTION trigger_sales_order_items_reconciliation() IS 'Triggers sales_order_items reconciliation when goods_outward_items are created, updated, or deleted';

-- =====================================================
-- VALIDATION: PREVENT OUTWARD FOR NON-APPROVED ORDERS
-- =====================================================

-- Prevent creating goods_outward for sales orders not in 'in_progress' status
CREATE OR REPLACE FUNCTION validate_sales_order_status_for_outward()
RETURNS TRIGGER AS $$
DECLARE
    v_order_status VARCHAR(20);
BEGIN
    -- Only validate if linked to a sales order
    IF NEW.sales_order_id IS NOT NULL THEN
        -- Get sales order status
        SELECT status INTO v_order_status
        FROM sales_orders
        WHERE id = NEW.sales_order_id;

        -- Only allow outward for approved (in_progress) orders
        IF v_order_status != 'in_progress' THEN
            RAISE EXCEPTION 'Cannot create goods outward for sales order with status "%". Order must be approved (in_progress) first.',
                v_order_status;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_sales_order_status_for_outward
    BEFORE INSERT OR UPDATE ON goods_outwards
    FOR EACH ROW EXECUTE FUNCTION validate_sales_order_status_for_outward();

COMMENT ON FUNCTION validate_sales_order_status_for_outward() IS 'Prevents creating goods outward for sales orders that are not in in_progress status';

-- =====================================================
-- VALIDATION: PREVENT CANCELLATION IF HAS OUTWARD
-- =====================================================

-- Prevent sales order cancellation if it has goods outward
CREATE OR REPLACE FUNCTION prevent_cancel_if_has_outward()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if status is being changed to 'cancelled'
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        -- Check if order has any outward
        IF NEW.has_outward = TRUE THEN
            RAISE EXCEPTION 'Cannot cancel sales order - goods outward exists. Delete all goods outward records first.'
                USING HINT = 'Delete or cancel all linked goods outward records before cancelling the sales order';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_cancel_if_has_outward
    BEFORE UPDATE ON sales_orders
    FOR EACH ROW
    WHEN (NEW.status = 'cancelled' AND OLD.status != 'cancelled')
    EXECUTE FUNCTION prevent_cancel_if_has_outward();

COMMENT ON FUNCTION prevent_cancel_if_has_outward() IS 'Prevents cancelling sales orders that have linked goods outward records';

COMMENT ON TRIGGER trigger_reconcile_sales_order ON sales_orders IS 'Consolidates all sales order calculations: dispatched quantities, has_outward flag, totals, GST. Triggered by dummy updates from sales_order_items and goods_outward_items changes.';
