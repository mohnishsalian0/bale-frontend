-- Bale Backend - Goods Transfer Functions
-- Business logic for warehouse-to-warehouse stock unit transfers

-- =====================================================
-- GOODS TRANSFER CREATION FUNCTION
-- =====================================================

-- Function to create goods transfer with items and update stock unit locations atomically
CREATE OR REPLACE FUNCTION create_goods_transfer_with_items(
    p_transfer_data JSONB,
    p_stock_unit_ids UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transfer_id UUID;
    v_company_id UUID;
    v_from_warehouse_id UUID;
    v_to_warehouse_id UUID;
    v_stock_unit_id UUID;
    v_stock_unit RECORD;
    v_pending_transfers INTEGER;
BEGIN
    -- Derive company_id from JWT
    v_company_id := COALESCE(
        (p_transfer_data->>'company_id')::UUID,
        get_jwt_company_id()
    );

    v_from_warehouse_id := (p_transfer_data->>'from_warehouse_id')::UUID;
    v_to_warehouse_id := (p_transfer_data->>'to_warehouse_id')::UUID;

    -- Validate different warehouses
    IF v_from_warehouse_id = v_to_warehouse_id THEN
        RAISE EXCEPTION 'Cannot transfer to the same warehouse';
    END IF;

    -- Create transfer header
    INSERT INTO goods_transfers (
        company_id,
        from_warehouse_id,
        to_warehouse_id,
        transfer_date,
        notes,
        status,
        created_by
    )
    VALUES (
        v_company_id,
        v_from_warehouse_id,
        v_to_warehouse_id,
        (p_transfer_data->>'transfer_date')::DATE,
        p_transfer_data->>'notes',
        'in_transit',
        COALESCE((p_transfer_data->>'created_by')::UUID, auth.uid())
    )
    RETURNING id INTO v_transfer_id;

    -- Process each stock unit
    FOREACH v_stock_unit_id IN ARRAY p_stock_unit_ids
    LOOP
        -- Get stock unit details with row lock
        SELECT * INTO v_stock_unit
        FROM stock_units
        WHERE id = v_stock_unit_id
        FOR UPDATE;

        IF v_stock_unit IS NULL THEN
            RAISE EXCEPTION 'Stock unit % not found', v_stock_unit_id;
        END IF;

        -- Validate stock unit is at source warehouse
        IF v_stock_unit.current_warehouse_id != v_from_warehouse_id THEN
            RAISE EXCEPTION 'Stock unit % is not at source warehouse. Current location: %, Expected: %',
                v_stock_unit_id, v_stock_unit.current_warehouse_id, v_from_warehouse_id;
        END IF;

        -- Check for pending transfers involving this stock unit
        SELECT COUNT(*) INTO v_pending_transfers
        FROM goods_transfer_items gti
        JOIN goods_transfers gt ON gti.transfer_id = gt.id
        WHERE gti.stock_unit_id = v_stock_unit_id
        AND gt.status = 'in_transit'
        AND gt.id != v_transfer_id;

        IF v_pending_transfers > 0 THEN
            RAISE EXCEPTION 'Stock unit % has pending transfer. Complete or cancel existing transfer first.', v_stock_unit_id;
        END IF;

        -- Create transfer item
        -- Note: stock unit warehouse will be updated by reconciliation trigger
        -- Quantity transferred defaults to current quantity (full transfer)
        INSERT INTO goods_transfer_items (
            company_id,
            transfer_id,
            stock_unit_id,
            quantity_transferred
        )
        VALUES (
            v_company_id,
            v_transfer_id,
            v_stock_unit_id,
            v_stock_unit.remaining_quantity
        );
    END LOOP;

    -- Transfer stays in 'in_transit' status until user manually completes it
    -- Stock unit locations will be reconciled by trigger

    RETURN v_transfer_id;
END;
$$;

-- =====================================================
-- TRANSFER VALIDATION TRIGGERS
-- =====================================================

-- Trigger: Prevent cancellation if stock unit has moved since transfer
CREATE OR REPLACE FUNCTION prevent_transfer_cancel_with_subsequent_movement()
RETURNS TRIGGER AS $$
DECLARE
    v_stock_unit_id UUID;
    v_subsequent_movements INTEGER;
BEGIN
    -- Only check when cancelling a transfer
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        -- Check each stock unit in this transfer
        FOR v_stock_unit_id IN
            SELECT stock_unit_id FROM goods_transfer_items WHERE transfer_id = NEW.id
        LOOP
            -- Count movements after this transfer date
            SELECT COUNT(*) INTO v_subsequent_movements
            FROM (
                -- Subsequent transfers
                SELECT gt.transfer_date as event_date
                FROM goods_transfers gt
                JOIN goods_transfer_items gti ON gt.id = gti.transfer_id
                WHERE gti.stock_unit_id = v_stock_unit_id
                AND gt.transfer_date > OLD.transfer_date
                AND gt.id != NEW.id
                AND gt.status != 'cancelled'

                UNION ALL

                -- Subsequent outwards
                SELECT go.outward_date as event_date
                FROM goods_outwards go
                JOIN goods_outward_items goi ON go.id = goi.outward_id
                WHERE goi.stock_unit_id = v_stock_unit_id
                AND go.outward_date > OLD.transfer_date
                AND go.is_cancelled = FALSE
            ) subsequent;

            IF v_subsequent_movements > 0 THEN
                RAISE EXCEPTION 'Cannot cancel transfer - stock unit has subsequent movements. Please cancel recent movements first.';
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_transfer_cancel_with_subsequent_movement
    BEFORE UPDATE ON goods_transfers
    FOR EACH ROW
    WHEN (OLD.status != 'cancelled' AND NEW.status = 'cancelled')
    EXECUTE FUNCTION prevent_transfer_cancel_with_subsequent_movement();

-- =====================================================
-- STOCK UNIT LOCATION RECONCILIATION
-- =====================================================

-- Function to reconcile stock unit's current warehouse based on transfer chain
-- Validates: chronological order, warehouse chain consistency, all transfers completed except last
CREATE OR REPLACE FUNCTION reconcile_stock_unit_location(p_stock_unit_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_initial_warehouse_id UUID;
    v_calculated_warehouse_id UUID;
    v_transfer RECORD;
    v_prev_to_warehouse UUID;
    v_transfer_count INTEGER := 0;
    v_has_in_transit BOOLEAN := FALSE;
BEGIN
    -- Get the warehouse from creation (goods inward)
    SELECT gi.warehouse_id INTO v_initial_warehouse_id
    FROM stock_units su
    JOIN goods_inwards gi ON su.created_from_inward_id = gi.id
    WHERE su.id = p_stock_unit_id;

    IF v_initial_warehouse_id IS NULL THEN
        RAISE EXCEPTION 'Cannot reconcile stock unit % - no creation inward found', p_stock_unit_id;
    END IF;

    -- Start with creation warehouse
    v_calculated_warehouse_id := v_initial_warehouse_id;
    v_prev_to_warehouse := v_initial_warehouse_id;

    -- Get all transfers chronologically and validate chain
    FOR v_transfer IN
        SELECT
            gt.id,
            gt.sequence_number,
            gt.from_warehouse_id,
            gt.to_warehouse_id,
            gt.status,
            gt.transfer_date,
            gt.created_at
        FROM goods_transfer_items gti
        JOIN goods_transfers gt ON gti.transfer_id = gt.id
        WHERE gti.stock_unit_id = p_stock_unit_id
        ORDER BY gt.transfer_date ASC, gt.created_at ASC
    LOOP
        v_transfer_count := v_transfer_count + 1;

        -- Validate: from_warehouse must match previous to_warehouse (chain consistency)
        IF v_transfer.from_warehouse_id != v_prev_to_warehouse THEN
            RAISE EXCEPTION 'Transfer chain broken for stock unit %. Transfer GT-% has from_warehouse %, but previous destination was %. Complete or cancel intervening transfers.',
                p_stock_unit_id,
                v_transfer.sequence_number,
                v_transfer.from_warehouse_id,
                v_prev_to_warehouse;
        END IF;

        -- Validate: all transfers except the last must be completed
        IF v_has_in_transit THEN
            RAISE EXCEPTION 'Cannot have multiple in-transit transfers for stock unit %. Transfer GT-% is in-transit but there are subsequent transfers. Complete or cancel GT-% first.',
                p_stock_unit_id,
                v_transfer.sequence_number,
                v_transfer.sequence_number;
        END IF;

        -- Track in-transit status
        IF v_transfer.status = 'in_transit' THEN
            v_has_in_transit := TRUE;
        END IF;

        -- Only apply completed transfers to calculated location
        IF v_transfer.status = 'completed' THEN
            v_calculated_warehouse_id := v_transfer.to_warehouse_id;
            v_prev_to_warehouse := v_transfer.to_warehouse_id;
        ELSIF v_transfer.status = 'in_transit' THEN
            -- In-transit: stock is en route to destination
            -- For now, keep at previous location until completed
            v_prev_to_warehouse := v_transfer.to_warehouse_id;
        ELSIF v_transfer.status = 'cancelled' THEN
            -- Cancelled transfers don't affect location
            -- prev_to_warehouse stays the same
            NULL;
        END IF;
    END LOOP;

    -- Update stock unit if current location is incorrect
    UPDATE stock_units
    SET current_warehouse_id = v_calculated_warehouse_id
    WHERE id = p_stock_unit_id
    AND current_warehouse_id IS DISTINCT FROM v_calculated_warehouse_id;

    -- Log validation success for debugging
    -- RAISE NOTICE 'Stock unit % reconciled. Initial: %, Calculated: %, Transfers: %',
    --     p_stock_unit_id, v_initial_warehouse_id, v_calculated_warehouse_id, v_transfer_count;

END;
$$;

-- Trigger to reconcile stock unit location on transfer item changes
CREATE OR REPLACE FUNCTION trigger_reconcile_on_transfer_item_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Reconcile on INSERT or UPDATE
    IF TG_OP = 'INSERT' THEN
        PERFORM reconcile_stock_unit_location(NEW.stock_unit_id);
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM reconcile_stock_unit_location(NEW.stock_unit_id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reconcile_stock_unit_on_transfer_item
    AFTER INSERT OR UPDATE ON goods_transfer_items
    FOR EACH ROW
    EXECUTE FUNCTION trigger_reconcile_on_transfer_item_change();

-- Trigger to reconcile stock unit location when transfer status changes
CREATE OR REPLACE FUNCTION trigger_reconcile_on_transfer_status_change()
RETURNS TRIGGER AS $$
DECLARE
    v_stock_unit_id UUID;
BEGIN
    -- Reconcile all stock units in this transfer when status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        FOR v_stock_unit_id IN
            SELECT stock_unit_id FROM goods_transfer_items WHERE transfer_id = NEW.id
        LOOP
            PERFORM reconcile_stock_unit_location(v_stock_unit_id);
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reconcile_stock_units_on_transfer_status
    AFTER UPDATE ON goods_transfers
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION trigger_reconcile_on_transfer_status_change();

-- =====================================================
-- TRANSFER CANCELLATION HANDLER
-- =====================================================

-- When transfer is cancelled, revert stock unit locations
CREATE OR REPLACE FUNCTION revert_stock_units_on_transfer_cancel()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        -- Revert all stock units back to source warehouse
        UPDATE stock_units
        SET current_warehouse_id = OLD.from_warehouse_id
        WHERE id IN (
            SELECT stock_unit_id
            FROM goods_transfer_items
            WHERE transfer_id = NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_revert_stock_units_on_transfer_cancel
    AFTER UPDATE ON goods_transfers
    FOR EACH ROW
    WHEN (OLD.status != 'cancelled' AND NEW.status = 'cancelled')
    EXECUTE FUNCTION revert_stock_units_on_transfer_cancel();

-- =====================================================
-- GRANT EXECUTE PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION create_goods_transfer_with_items(JSONB, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION reconcile_stock_unit_location(UUID) TO authenticated;
