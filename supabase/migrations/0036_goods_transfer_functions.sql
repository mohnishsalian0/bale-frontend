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
    v_transfer_date DATE;
    v_stock_unit_id UUID;
    v_stock_unit RECORD;
BEGIN
    -- Derive company_id from JWT
    v_company_id := COALESCE(
        (p_transfer_data->>'company_id')::UUID,
        get_jwt_company_id()
    );

    v_from_warehouse_id := (p_transfer_data->>'from_warehouse_id')::UUID;
    v_to_warehouse_id := (p_transfer_data->>'to_warehouse_id')::UUID;
    v_transfer_date := (p_transfer_data->>'transfer_date')::DATE;

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

        -- Validate stock unit status is available
        IF v_stock_unit.status != 'available' THEN
            RAISE EXCEPTION 'Stock unit % is not available (status: %). Cannot transfer',
                v_stock_unit_id, v_stock_unit.status;
        END IF;

        -- Chronological validation
        IF v_stock_unit.last_activity_date IS NOT NULL AND v_transfer_date < v_stock_unit.last_activity_date THEN
            RAISE EXCEPTION 'Cannot create transfer with transfer_date % before last activity on stock unit % (last activity: %)',
                v_transfer_date, v_stock_unit_id, v_stock_unit.last_activity_date;
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
-- GOODS TRANSFER UPDATE FUNCTION
-- =====================================================

-- Function to update goods transfer with new items atomically
CREATE OR REPLACE FUNCTION update_goods_transfer_with_items(
    p_transfer_id UUID,
    p_transfer_data JSONB,
    p_stock_unit_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id UUID;
    v_from_warehouse_id UUID;
    v_to_warehouse_id UUID;
    v_old_from_warehouse_id UUID;
    v_stock_unit_id UUID;
    v_stock_unit RECORD;
    v_transfer_status TEXT;
BEGIN
    -- Get existing transfer details
    SELECT
        company_id,
        from_warehouse_id,
        status
    INTO
        v_company_id,
        v_old_from_warehouse_id,
        v_transfer_status
    FROM goods_transfers
    WHERE id = p_transfer_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transfer not found';
    END IF;

    -- Validate transfer can be edited
    IF v_transfer_status != 'in_transit' THEN
        RAISE EXCEPTION 'Cannot edit transfer - status must be in_transit';
    END IF;

    -- Extract new warehouse IDs from update data
    v_from_warehouse_id := (p_transfer_data->>'from_warehouse_id')::UUID;
    v_to_warehouse_id := (p_transfer_data->>'to_warehouse_id')::UUID;

    -- Validate different warehouses
    IF v_from_warehouse_id = v_to_warehouse_id THEN
        RAISE EXCEPTION 'Cannot transfer to the same warehouse';
    END IF;

    -- Delete existing transfer items
    DELETE FROM goods_transfer_items
    WHERE transfer_id = p_transfer_id;

    -- Update transfer header
    UPDATE goods_transfers
    SET
        from_warehouse_id = v_from_warehouse_id,
        to_warehouse_id = v_to_warehouse_id,
        transfer_date = (p_transfer_data->>'transfer_date')::DATE,
        expected_delivery_date = (p_transfer_data->>'expected_delivery_date')::DATE,
        transport_type = p_transfer_data->>'transport_type',
        transport_reference_number = p_transfer_data->>'transport_reference_number',
        notes = p_transfer_data->>'notes',
        modified_by = auth.uid()
    WHERE id = p_transfer_id;

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

        -- Create new transfer item
        INSERT INTO goods_transfer_items (
            company_id,
            transfer_id,
            stock_unit_id,
            quantity_transferred
        )
        VALUES (
            v_company_id,
            p_transfer_id,
            v_stock_unit_id,
            v_stock_unit.remaining_quantity
        );
    END LOOP;

    -- Reconciliation will be triggered automatically by the trigger
END;
$$;

-- =====================================================
-- GRANT EXECUTE PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION create_goods_transfer_with_items(JSONB, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION update_goods_transfer_with_items(UUID, JSONB, UUID[]) TO authenticated;
