-- Bale Backend - Purchase Order Reconciliation
-- Automatically maintain purchase order progress and status based on goods inward receipts

-- =====================================================
-- PURCHASE ORDER STATUS TRACKING
-- =====================================================

-- Add status tracking triggers to purchase_orders table
CREATE TRIGGER trigger_set_purchase_status_changed_at
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_status_changed_at();

CREATE TRIGGER trigger_set_purchase_status_changed_by
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_status_changed_by();

-- =====================================================
-- PURCHASE ORDER ITEMS RECONCILIATION FUNCTION
-- =====================================================

-- Reconcile purchase_order_items: update received_quantity from stock_units (goods_inward)
-- Triggered via BEFORE UPDATE on purchase_order_items (dummy update pattern from stock_units)
CREATE OR REPLACE FUNCTION reconcile_purchase_order_items()
RETURNS TRIGGER AS $$
DECLARE
    v_product_received DECIMAL(10,3);
    v_purchase_order_id UUID;
BEGIN
    -- Get purchase_order_id
    v_purchase_order_id := NEW.purchase_order_id;

    -- Calculate total received for this product from all inwards
    SELECT COALESCE(SUM(su.initial_quantity), 0)
    INTO v_product_received
    FROM stock_units su
    INNER JOIN goods_inwards gi ON gi.id = su.created_from_inward_id
    WHERE gi.purchase_order_id = v_purchase_order_id
      AND su.product_id = NEW.product_id
      AND gi.deleted_at IS NULL
      AND su.deleted_at IS NULL;

    -- Validate: prevent over-receipt
    IF v_product_received > NEW.required_quantity THEN
        RAISE EXCEPTION 'Received quantity (%) exceeds required quantity (%) for product in purchase order',
            v_product_received, NEW.required_quantity;
    END IF;

    -- Update received_quantity
    NEW.received_quantity := v_product_received;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reconcile_purchase_order_items() IS 'Updates received_quantity for purchase_order_items based on stock_units from goods_inward. Validates against over-receipt.';

-- Trigger reconciliation on purchase_order_items BEFORE INSERT OR UPDATE
CREATE TRIGGER trigger_reconcile_purchase_order_items
    BEFORE INSERT OR UPDATE ON purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION reconcile_purchase_order_items();

-- =====================================================
-- PURCHASE ORDER RECONCILIATION FUNCTION
-- =====================================================

-- Reconcile purchase_order: has_inward flag, totals, GST
-- Triggered via BEFORE UPDATE on purchase_orders (dummy update pattern from purchase_order_items)
CREATE OR REPLACE FUNCTION reconcile_purchase_order()
RETURNS TRIGGER AS $$
DECLARE
    v_item RECORD;
    v_has_any_inward BOOLEAN;
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
    FROM purchase_order_items
    WHERE purchase_order_id = NEW.id;

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
                poi.line_total,
                COALESCE(p.gst_rate, 0) as product_gst_rate
            FROM purchase_order_items poi
            INNER JOIN products p ON p.id = poi.product_id
            WHERE poi.purchase_order_id = NEW.id
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

    -- Update has_inward flag
    SELECT EXISTS(
        SELECT 1
        FROM goods_inwards
        WHERE purchase_order_id = NEW.id
          AND deleted_at IS NULL
    ) INTO v_has_any_inward;

    -- Update NEW with all calculated values
    NEW.has_inward := v_has_any_inward;
    NEW.total_amount := v_final_total;
    NEW.gst_amount := v_gst_amount;
    NEW.discount_amount := v_discount_amount;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reconcile_purchase_order() IS 'Calculates purchase order totals, GST, and has_inward flag. Does NOT update items.';

-- Trigger reconciliation on purchase_orders BEFORE UPDATE
CREATE TRIGGER trigger_reconcile_purchase_order
    BEFORE INSERT OR UPDATE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION reconcile_purchase_order();

-- =====================================================
-- TRIGGER ORDER RECONCILIATION FROM PURCHASE ORDER ITEMS CHANGES
-- =====================================================

-- Trigger reconciliation when purchase_order_items change
CREATE OR REPLACE FUNCTION trigger_purchase_order_reconciliation_from_items()
RETURNS TRIGGER AS $$
DECLARE
    v_purchase_order_id UUID;
BEGIN
    -- Get the affected purchase order ID
    v_purchase_order_id := COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);

    -- Touch the purchase_order to trigger reconcile_purchase_order()
    UPDATE purchase_orders
    SET updated_at = updated_at  -- Dummy update to trigger reconciliation
    WHERE id = v_purchase_order_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reconcile_from_items
    AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_purchase_order_reconciliation_from_items();

-- =====================================================
-- TRIGGER ITEM RECONCILIATION FROM GOODS INWARD CHANGES
-- =====================================================

-- Trigger purchase_order_items reconciliation when stock_units change
CREATE OR REPLACE FUNCTION trigger_purchase_order_items_reconciliation()
RETURNS TRIGGER AS $$
DECLARE
    v_purchase_order_id UUID;
    v_product_id UUID;
BEGIN
    -- Get the affected purchase order ID and product from goods_inward
    IF TG_OP = 'DELETE' THEN
        IF OLD.created_from_inward_id IS NOT NULL THEN
            SELECT gi.purchase_order_id
            INTO v_purchase_order_id
            FROM goods_inwards gi
            WHERE gi.id = OLD.created_from_inward_id;

            v_product_id := OLD.product_id;
        END IF;
    ELSE
        IF NEW.created_from_inward_id IS NOT NULL THEN
            SELECT gi.purchase_order_id
            INTO v_purchase_order_id
            FROM goods_inwards gi
            WHERE gi.id = NEW.created_from_inward_id;

            v_product_id := NEW.product_id;
        END IF;
    END IF;

    -- Only reconcile if linked to a purchase order
    IF v_purchase_order_id IS NOT NULL AND v_product_id IS NOT NULL THEN
        -- Touch the purchase_order_item to trigger reconcile_purchase_order_items()
        UPDATE purchase_order_items
        SET updated_at = updated_at  -- Dummy update to trigger reconciliation
        WHERE purchase_order_id = v_purchase_order_id
          AND product_id = v_product_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reconcile_items_on_inward_change
    AFTER INSERT OR UPDATE OR DELETE ON stock_units
    FOR EACH ROW EXECUTE FUNCTION trigger_purchase_order_items_reconciliation();

COMMENT ON FUNCTION trigger_purchase_order_items_reconciliation() IS 'Triggers purchase_order_items reconciliation when stock_units from goods_inward are created, updated, or deleted';

-- =====================================================
-- VALIDATION: PREVENT INWARD FOR NON-APPROVED ORDERS
-- =====================================================

-- Prevent creating goods_inward for purchase orders not in 'in_progress' status
CREATE OR REPLACE FUNCTION validate_purchase_order_status_for_inward()
RETURNS TRIGGER AS $$
DECLARE
    v_order_status VARCHAR(20);
BEGIN
    -- Only validate if linked to a purchase order
    IF NEW.purchase_order_id IS NOT NULL THEN
        -- Get purchase order status
        SELECT status INTO v_order_status
        FROM purchase_orders
        WHERE id = NEW.purchase_order_id;

        -- Only allow inward for approved (in_progress) orders
        IF v_order_status != 'in_progress' THEN
            RAISE EXCEPTION 'Cannot create goods inward for purchase order with status "%". Order must be approved (in_progress) first.',
                v_order_status;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_purchase_order_status_for_inward
    BEFORE INSERT OR UPDATE ON goods_inwards
    FOR EACH ROW EXECUTE FUNCTION validate_purchase_order_status_for_inward();

COMMENT ON FUNCTION validate_purchase_order_status_for_inward() IS 'Prevents creating goods inward for purchase orders that are not in in_progress status';

-- =====================================================
-- VALIDATION: PREVENT CANCELLATION IF HAS INWARD
-- =====================================================

-- Prevent purchase order cancellation if it has goods inward
CREATE OR REPLACE FUNCTION prevent_purchase_cancel_if_has_inward()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if status is being changed to 'cancelled'
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        -- Check if order has any inward
        IF NEW.has_inward = TRUE THEN
            RAISE EXCEPTION 'Cannot cancel purchase order - goods inward exists. Delete all goods inward records first.'
                USING HINT = 'Delete all linked goods inward records before cancelling the purchase order';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_purchase_cancel_if_has_inward
    BEFORE UPDATE ON purchase_orders
    FOR EACH ROW
    WHEN (NEW.status = 'cancelled' AND OLD.status != 'cancelled')
    EXECUTE FUNCTION prevent_purchase_cancel_if_has_inward();

COMMENT ON FUNCTION prevent_purchase_cancel_if_has_inward() IS 'Prevents cancelling purchase orders that have linked goods inward records';

COMMENT ON TRIGGER trigger_reconcile_purchase_order ON purchase_orders IS 'Calculates purchase order totals, GST, and has_inward flag. Triggered by dummy updates from purchase_order_items changes.';
COMMENT ON TRIGGER trigger_reconcile_purchase_order_items ON purchase_order_items IS 'Updates received_quantity from stock_units. Triggered by dummy updates from stock_units changes.';
