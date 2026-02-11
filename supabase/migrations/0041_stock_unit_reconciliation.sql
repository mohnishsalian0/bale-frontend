-- Bale Backend - Stock Unit Reconciliation
-- Automatically maintain stock unit state based on goods movements

-- =====================================================
-- 1. QUANTITY RECONCILIATION
-- =====================================================

-- Calculates remaining_quantity based on outwards, converts, and adjustments
CREATE OR REPLACE FUNCTION reconcile_stock_unit_quantities()
RETURNS TRIGGER AS $$
DECLARE
    v_total_dispatched DECIMAL(10,3);
    v_total_converted DECIMAL(10,3);
    v_total_adjustments DECIMAL(10,3);
BEGIN
    -- Calculate total dispatched from non-cancelled outwards
    SELECT COALESCE(SUM(goi.quantity_dispatched), 0)
    INTO v_total_dispatched
    FROM goods_outward_items goi
    INNER JOIN goods_outwards go ON go.id = goi.outward_id
    WHERE goi.stock_unit_id = NEW.id
      AND goi.is_cancelled = FALSE
      AND go.is_cancelled = FALSE
      AND go.deleted_at IS NULL;

    -- Calculate total consumed in COMPLETED converts only
    SELECT COALESCE(SUM(gci.quantity_consumed), 0)
    INTO v_total_converted
    FROM goods_convert_input_items gci
    INNER JOIN goods_converts gc ON gc.id = gci.convert_id
    WHERE gci.stock_unit_id = NEW.id
      AND gc.status = 'completed';

    -- Calculate total adjustments (wastage = negative, found = positive)
    SELECT COALESCE(SUM(quantity_adjusted), 0)
    INTO v_total_adjustments
    FROM stock_unit_adjustments
    WHERE stock_unit_id = NEW.id
      AND deleted_at IS NULL;

    -- Calculate remaining quantity: initial - dispatched - converted + adjustments
    NEW.remaining_quantity := NEW.initial_quantity - v_total_dispatched - v_total_converted + v_total_adjustments;

    -- Validate non-negative quantity
    IF NEW.remaining_quantity < 0 THEN
        RAISE EXCEPTION 'Remaining quantity cannot be negative for stock unit. Initial: %, Dispatched: %, Converted: %, Adjustments: %',
            NEW.initial_quantity, v_total_dispatched, v_total_converted, v_total_adjustments;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reconcile_stock_unit_quantities() IS 'Calculates remaining_quantity based on outwards (immediate), converts (only completed), and adjustments (immediate). Validates non-negative quantities.';

-- =====================================================
-- 2. ACTIVITY TRACKING RECONCILIATION
-- =====================================================

-- Maintains activity tracking flags and last activity date
CREATE OR REPLACE FUNCTION reconcile_stock_unit_tracking()
RETURNS TRIGGER AS $$
DECLARE
    v_has_outward BOOLEAN;
    v_has_convert BOOLEAN;
    v_has_transfers BOOLEAN;
    v_last_outward_date DATE;
    v_last_convert_date DATE;
    v_last_transfer_date DATE;
    v_last_adjustment_date DATE;
BEGIN
    -- Check if unit has been dispatched
    v_has_outward := EXISTS(
        SELECT 1 FROM goods_outward_items goi
        INNER JOIN goods_outwards go ON go.id = goi.outward_id
        WHERE goi.stock_unit_id = NEW.id
          AND go.is_cancelled = FALSE
          AND go.deleted_at IS NULL
    );

    -- Check if unit has been converted
    v_has_convert := EXISTS(
        SELECT 1 FROM goods_convert_input_items gci
        INNER JOIN goods_converts gc ON gc.id = gci.convert_id
        WHERE gci.stock_unit_id = NEW.id
          AND gc.status = 'completed'
          AND gc.deleted_at IS NULL
    );

    -- Check if unit has been transferred
    v_has_transfers := EXISTS(
        SELECT 1 FROM goods_transfer_items gti
        INNER JOIN goods_transfers gt ON gt.id = gti.transfer_id
        WHERE gti.stock_unit_id = NEW.id
          AND gt.deleted_at IS NULL
    );

    -- Get last outward date
    SELECT MAX(go.outward_date)
    INTO v_last_outward_date
    FROM goods_outward_items goi
    INNER JOIN goods_outwards go ON go.id = goi.outward_id
    WHERE goi.stock_unit_id = NEW.id
      AND go.is_cancelled = FALSE
      AND go.deleted_at IS NULL;

    -- Get last convert date (use completion_date if completed, else start_date)
    SELECT MAX(COALESCE(gc.completion_date, gc.start_date))
    INTO v_last_convert_date
    FROM goods_convert_input_items gci
    INNER JOIN goods_converts gc ON gc.id = gci.convert_id
    WHERE gci.stock_unit_id = NEW.id
      AND gc.status IN ('in_progress', 'completed')
      AND gc.deleted_at IS NULL;

    -- Get last transfer date (use completion_date if completed, else transfer_date)
    SELECT MAX(COALESCE(gt.completion_date, gt.transfer_date))
    INTO v_last_transfer_date
    FROM goods_transfer_items gti
    INNER JOIN goods_transfers gt ON gt.id = gti.transfer_id
    WHERE gti.stock_unit_id = NEW.id
      AND gt.status IN ('in_transit', 'completed')
      AND gt.deleted_at IS NULL;

    -- Get last adjustment date
    SELECT MAX(adjustment_date)
    INTO v_last_adjustment_date
    FROM stock_unit_adjustments
    WHERE stock_unit_id = NEW.id
      AND deleted_at IS NULL;

    -- Set tracking flags
    NEW.has_outward := v_has_outward;
    NEW.has_convert := v_has_convert;
    NEW.has_transfers := v_has_transfers;

    -- Calculate last activity date
    NEW.last_activity_date := GREATEST(
        COALESCE(v_last_outward_date, '1900-01-01'::DATE),
        COALESCE(v_last_convert_date, '1900-01-01'::DATE),
        COALESCE(v_last_transfer_date, '1900-01-01'::DATE),
        COALESCE(v_last_adjustment_date, '1900-01-01'::DATE)
    );

    -- Set to NULL if no activities (instead of 1900-01-01)
    IF NEW.last_activity_date = '1900-01-01'::DATE THEN
        NEW.last_activity_date := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reconcile_stock_unit_tracking() IS 'Maintains has_outward, has_convert, has_transfers flags and calculates last_activity_date from all stock movements.';

-- =====================================================
-- 3. OPERATIONAL STATUS RECONCILIATION
-- =====================================================

-- Determines operational status based on active operations
CREATE OR REPLACE FUNCTION reconcile_stock_unit_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Priority order: in_transit > processing > available

    -- Check for in_transit transfers
    IF EXISTS(
        SELECT 1 FROM goods_transfer_items gti
        INNER JOIN goods_transfers gt ON gt.id = gti.transfer_id
        WHERE gti.stock_unit_id = NEW.id
          AND gt.status = 'in_transit'
    ) THEN
        NEW.status := 'in_transit';
        RETURN NEW;
    END IF;

    -- Check for in_progress converts
    IF EXISTS(
        SELECT 1 FROM goods_convert_input_items gci
        INNER JOIN goods_converts gc ON gc.id = gci.convert_id
        WHERE gci.stock_unit_id = NEW.id
          AND gc.status = 'in_progress'
    ) THEN
        NEW.status := 'processing';
        RETURN NEW;
    END IF;

    -- Default: available
    NEW.status := 'available';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reconcile_stock_unit_status() IS 'Determines operational status based on active transfers and converts. Priority: in_transit > processing > available.';

-- =====================================================
-- ATTACH RECONCILIATION TRIGGERS
-- =====================================================

-- Trigger: Reconcile quantities
CREATE TRIGGER trigger_reconcile_stock_unit_quantities
    BEFORE INSERT OR UPDATE ON stock_units
    FOR EACH ROW
    EXECUTE FUNCTION reconcile_stock_unit_quantities();

-- Trigger: Reconcile tracking
CREATE TRIGGER trigger_reconcile_stock_unit_tracking
    BEFORE INSERT OR UPDATE ON stock_units
    FOR EACH ROW
    EXECUTE FUNCTION reconcile_stock_unit_tracking();

-- Trigger: Reconcile status
CREATE TRIGGER trigger_reconcile_stock_unit_status
    BEFORE INSERT OR UPDATE ON stock_units
    FOR EACH ROW
    EXECUTE FUNCTION reconcile_stock_unit_status();

-- Note: Location reconciliation (trigger_reconcile_stock_unit_location) will be added when we consolidate from 0037

-- =====================================================
-- CASCADE RECONCILIATION TRIGGERS
-- =====================================================

-- Helper function to trigger stock unit reconciliation via dummy update
CREATE OR REPLACE FUNCTION trigger_stock_unit_reconciliation()
RETURNS TRIGGER AS $$
DECLARE
    v_stock_unit_id UUID;
BEGIN
    -- Get the affected stock unit ID
    v_stock_unit_id := COALESCE(NEW.stock_unit_id, OLD.stock_unit_id);

    IF v_stock_unit_id IS NOT NULL THEN
        -- Touch the stock_unit to trigger reconciliation
        -- The BEFORE UPDATE triggers will recalculate all fields
        UPDATE stock_units
        SET updated_at = NOW()
        WHERE id = v_stock_unit_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger reconciliation from goods_outward_items changes
CREATE TRIGGER trigger_reconcile_stock_on_outward_item_change
    AFTER INSERT OR UPDATE OR DELETE ON goods_outward_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_stock_unit_reconciliation();

COMMENT ON TRIGGER trigger_reconcile_stock_on_outward_item_change ON goods_outward_items IS 'Triggers stock unit reconciliation when outward items are created, updated, or deleted.';

-- Trigger reconciliation from stock_unit_adjustments changes
CREATE TRIGGER trigger_reconcile_stock_on_adjustment_change
    AFTER INSERT OR UPDATE OR DELETE ON stock_unit_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_stock_unit_reconciliation();

COMMENT ON TRIGGER trigger_reconcile_stock_on_adjustment_change ON stock_unit_adjustments IS 'Triggers stock unit reconciliation when adjustments are created, updated, or deleted.';

-- Trigger reconciliation from goods_convert_input_items insert/delete
CREATE TRIGGER trigger_reconcile_stock_on_convert_item_insert_delete
    AFTER INSERT OR DELETE ON goods_convert_input_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_stock_unit_reconciliation();

COMMENT ON TRIGGER trigger_reconcile_stock_on_convert_item_insert_delete ON goods_convert_input_items IS 'Triggers stock unit reconciliation when convert input items are created or deleted.';

-- Trigger reconciliation from goods_convert_input_items update (only when quantity changes)
CREATE TRIGGER trigger_reconcile_stock_on_convert_item_quantity_update
    AFTER UPDATE ON goods_convert_input_items
    FOR EACH ROW
    WHEN (OLD.quantity_consumed IS DISTINCT FROM NEW.quantity_consumed)
    EXECUTE FUNCTION trigger_stock_unit_reconciliation();

COMMENT ON TRIGGER trigger_reconcile_stock_on_convert_item_quantity_update ON goods_convert_input_items IS 'Triggers stock unit reconciliation when convert input item quantity is updated.';

-- Helper function for convert-triggered reconciliation
CREATE OR REPLACE FUNCTION trigger_stock_unit_reconciliation_for_convert()
RETURNS TRIGGER AS $$
DECLARE
    v_stock_unit_id UUID;
BEGIN
    -- Reconcile all input stock units from this convert
    FOR v_stock_unit_id IN
        SELECT stock_unit_id FROM goods_convert_input_items WHERE convert_id = NEW.id
    LOOP
        UPDATE stock_units
        SET updated_at = NOW()
        WHERE id = v_stock_unit_id;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger reconciliation when convert completes
CREATE TRIGGER trigger_reconcile_stock_on_convert_completion
    AFTER UPDATE ON goods_converts
    FOR EACH ROW
    WHEN (OLD.status = 'in_progress' AND NEW.status = 'completed')
    EXECUTE FUNCTION trigger_stock_unit_reconciliation_for_convert();

COMMENT ON TRIGGER trigger_reconcile_stock_on_convert_completion ON goods_converts IS 'Triggers stock unit reconciliation when convert is completed.';

-- Trigger reconciliation when convert is cancelled
CREATE TRIGGER trigger_reconcile_stock_on_convert_cancellation
    AFTER UPDATE ON goods_converts
    FOR EACH ROW
    WHEN (OLD.status = 'in_progress' AND NEW.status = 'cancelled')
    EXECUTE FUNCTION trigger_stock_unit_reconciliation_for_convert();

COMMENT ON TRIGGER trigger_reconcile_stock_on_convert_cancellation ON goods_converts IS 'Triggers stock unit reconciliation when convert is cancelled.';

-- Note: Transfer-related reconciliation triggers will be added when consolidating from 0037_goods_transfer_functions.sql
