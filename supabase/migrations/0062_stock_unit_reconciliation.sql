-- Bale Backend - Stock Unit Reconciliation
-- Automatically maintain stock unit remaining_quantity based on goods outward dispatches

-- =====================================================
-- STOCK UNIT RECONCILIATION FUNCTION
-- =====================================================

-- Reconcile stock_units: update remaining_quantity and status from goods_outward_items and adjustments
-- Triggered via BEFORE UPDATE on stock_units (dummy update pattern from goods_outward_items and adjustments)
CREATE OR REPLACE FUNCTION reconcile_stock_unit()
RETURNS TRIGGER AS $$
DECLARE
    v_total_dispatched DECIMAL(10,3);
    v_total_adjustments DECIMAL(10,3);
    v_has_outward BOOLEAN;
BEGIN
    -- Calculate total dispatched from all non-cancelled, non-deleted outwards
    -- Exclude cancelled stock units (those soft-deleted due to inward cancellation)
    SELECT COALESCE(SUM(goi.quantity_dispatched), 0)
    INTO v_total_dispatched
    FROM goods_outward_items goi
    INNER JOIN goods_outwards go ON go.id = goi.outward_id
    WHERE goi.stock_unit_id = NEW.id
      AND goi.is_cancelled = FALSE
      AND go.is_cancelled = FALSE
      AND go.deleted_at IS NULL
      AND NEW.deleted_at IS NULL;  -- Exclude cancelled (soft-deleted) stock units

    -- Calculate total adjustments (wastage = negative, found = positive)
    -- Exclude soft-deleted adjustments
    SELECT COALESCE(SUM(quantity_adjusted), 0)
    INTO v_total_adjustments
    FROM stock_unit_adjustments
    WHERE stock_unit_id = NEW.id
      AND deleted_at IS NULL;

    -- Check if this stock unit has ever been dispatched (for edit/delete guards)
    -- Only check if stock unit itself is not cancelled (deleted)
    IF NEW.deleted_at IS NULL THEN
        SELECT EXISTS(
            SELECT 1 FROM goods_outward_items goi
            INNER JOIN goods_outwards go ON go.id = goi.outward_id
            WHERE goi.stock_unit_id = NEW.id
              AND go.is_cancelled = FALSE
              AND go.deleted_at IS NULL
        ) INTO v_has_outward;
    ELSE
        -- Cancelled stock units should not block edits
        v_has_outward := FALSE;
    END IF;

    -- For piece type products with singleton pattern, we also need to account for
    -- additions from multiple inwards. The initial_quantity represents cumulative receipts.
    -- For non-piece types, initial_quantity is set once at creation.

    -- Calculate remaining quantity: initial - dispatched + adjustments
    -- Note: adjustments can be positive (found stock) or negative (wastage)
    NEW.remaining_quantity := NEW.initial_quantity - v_total_dispatched + v_total_adjustments;

    -- Set has_outward flag
    NEW.has_outward := v_has_outward;

    -- Validate: prevent negative remaining quantity (data integrity)
    IF NEW.remaining_quantity < 0 THEN
        RAISE EXCEPTION 'Remaining quantity cannot be negative for stock unit. Initial: %, Dispatched: %, Adjustments: %',
            NEW.initial_quantity, v_total_dispatched, v_total_adjustments;
    END IF;

    -- Auto-update status based on remaining quantity
    -- Don't override 'removed' status (manual action)
    IF NEW.status != 'removed' THEN
        IF NEW.remaining_quantity <= 0 THEN
            NEW.status := 'empty';
        ELSIF NEW.remaining_quantity >= NEW.initial_quantity THEN
            NEW.status := 'full';
        ELSE
            NEW.status := 'partial';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reconcile_stock_unit() IS 'Calculates remaining_quantity and auto-updates status for stock units based on non-cancelled goods_outward_items and stock_unit_adjustments. Automatically restores stock when outwards/adjustments are cancelled/deleted. Excludes cancelled (soft-deleted) stock units from reconciliation. Validates against negative quantities. Status logic: empty (<=0), full (>=initial), partial (between), removed (manual override preserved).';

-- Trigger reconciliation on stock_units BEFORE INSERT OR UPDATE
CREATE TRIGGER trigger_reconcile_stock_unit
    BEFORE INSERT OR UPDATE ON stock_units
    FOR EACH ROW
    EXECUTE FUNCTION reconcile_stock_unit();

-- =====================================================
-- TRIGGER RECONCILIATION FROM GOODS OUTWARD ITEMS CHANGES
-- =====================================================

-- Trigger stock_units reconciliation when goods_outward_items change
CREATE OR REPLACE FUNCTION trigger_stock_unit_reconciliation()
RETURNS TRIGGER AS $$
DECLARE
    v_stock_unit_id UUID;
BEGIN
    -- Get the affected stock unit ID
    v_stock_unit_id := COALESCE(NEW.stock_unit_id, OLD.stock_unit_id);

    IF v_stock_unit_id IS NOT NULL THEN
        -- Touch the stock_unit to trigger reconcile_stock_unit()
        -- The BEFORE UPDATE trigger will recalculate remaining_quantity
        UPDATE stock_units
        SET updated_at = updated_at  -- Dummy update to trigger reconciliation
        WHERE id = v_stock_unit_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reconcile_stock_on_outward_item_change
    AFTER INSERT OR UPDATE OR DELETE ON goods_outward_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_stock_unit_reconciliation();

COMMENT ON FUNCTION trigger_stock_unit_reconciliation() IS 'Triggers stock_units reconciliation when goods_outward_items are created, updated, or deleted. Uses dummy update pattern to recalculate remaining_quantity and status. Stock is automatically restored when outwards are cancelled because changes trigger this reconciliation. Note: stock_unit_adjustments also trigger reconciliation via their own trigger in migration 0065.';

COMMENT ON TRIGGER trigger_reconcile_stock_unit ON stock_units IS 'Calculates remaining_quantity and status based on non-cancelled goods_outward_items and stock_unit_adjustments. Triggered by dummy updates from outward item changes. Cancelling an outward automatically triggers reconciliation.';
