-- Bale Backend - Goods Convert Functions
-- Business logic for fabric conversion/processing operations

-- =====================================================
-- GOODS CONVERT CREATION FUNCTION
-- =====================================================

-- Function to create goods convert with input items atomically
CREATE OR REPLACE FUNCTION create_goods_convert_with_items(
    p_convert_data JSONB,
    p_input_stock_units JSONB[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_convert_id UUID;
    v_company_id UUID;
    v_warehouse_id UUID;
    v_start_date DATE;
    v_input JSONB;
    v_stock_unit_id UUID;
    v_quantity_consumed DECIMAL(10,3);
    v_stock_unit RECORD;
BEGIN
    -- Derive company_id from JWT
    v_company_id := COALESCE(
        (p_convert_data->>'company_id')::UUID,
        get_jwt_company_id()
    );

    v_warehouse_id := (p_convert_data->>'warehouse_id')::UUID;
    v_start_date := (p_convert_data->>'start_date')::DATE;

    -- Create convert header
    INSERT INTO goods_converts (
        company_id,
        warehouse_id,
        conversion_type,
        vendor_id,
        agent_id,
        invoice_id,
        reference_number,
        job_work_id,
        start_date,
        notes,
        created_by
    )
    VALUES (
        v_company_id,
        v_warehouse_id,
        p_convert_data->>'conversion_type',
        (p_convert_data->>'vendor_id')::UUID,
        (p_convert_data->>'agent_id')::UUID,
        (p_convert_data->>'invoice_id')::UUID,
        p_convert_data->>'reference_number',
        (p_convert_data->>'job_work_id')::UUID,
        v_start_date,
        p_convert_data->>'notes',
        COALESCE((p_convert_data->>'created_by')::UUID, auth.uid())
    )
    RETURNING id INTO v_convert_id;

    -- Process each input stock unit
    FOREACH v_input IN ARRAY p_input_stock_units
    LOOP
        v_stock_unit_id := (v_input->>'stock_unit_id')::UUID;
        v_quantity_consumed := (v_input->>'quantity_consumed')::DECIMAL;

        -- Get stock unit details with row lock
        SELECT * INTO v_stock_unit
        FROM stock_units
        WHERE id = v_stock_unit_id
        FOR UPDATE;

        IF v_stock_unit IS NULL THEN
            RAISE EXCEPTION 'Stock unit % not found', v_stock_unit_id;
        END IF;

        -- Validate stock unit is at convert warehouse
        IF v_stock_unit.current_warehouse_id != v_warehouse_id THEN
            RAISE EXCEPTION 'Stock unit % is not at convert warehouse. Current location: %, Expected: %',
                v_stock_unit_id, v_stock_unit.current_warehouse_id, v_warehouse_id;
        END IF;

        -- Validate stock unit status is available
        IF v_stock_unit.status != 'available' THEN
            RAISE EXCEPTION 'Stock unit % is not available (status: %). Cannot use in convert',
                v_stock_unit_id, v_stock_unit.status;
        END IF;

        -- Validate quantity
        IF v_quantity_consumed > v_stock_unit.remaining_quantity THEN
            RAISE EXCEPTION 'Cannot consume % from stock unit % - only % remaining',
                v_quantity_consumed, v_stock_unit_id, v_stock_unit.remaining_quantity;
        END IF;

        -- Chronological validation
        IF v_stock_unit.last_activity_date IS NOT NULL AND v_start_date < v_stock_unit.last_activity_date THEN
            RAISE EXCEPTION 'Cannot create convert with start_date % before last activity on stock unit % (last activity: %)',
                v_start_date, v_stock_unit_id, v_stock_unit.last_activity_date;
        END IF;

        -- Create input item
        INSERT INTO goods_convert_input_items (
            company_id,
            convert_id,
            stock_unit_id,
            quantity_consumed
        )
        VALUES (
            v_company_id,
            v_convert_id,
            v_stock_unit_id,
            v_quantity_consumed
        );

        -- Set stock unit status to 'processing'
        -- Note: Quantity NOT changed yet (waits for completion)
        UPDATE stock_units
        SET status = 'processing'
        WHERE id = v_stock_unit_id;
    END LOOP;

    -- Return the convert ID
    RETURN v_convert_id;
END;
$$;

-- =====================================================
-- GOODS CONVERT COMPLETION FUNCTION
-- =====================================================

-- Function to complete goods convert with output stock units
CREATE OR REPLACE FUNCTION complete_goods_convert(
    p_convert_id UUID,
    p_output_stock_units JSONB[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_convert RECORD;
    v_output JSONB;
    v_stock_unit_id UUID;
    v_lot_attribute_id UUID;
    v_lot_number TEXT;
BEGIN
    -- Get convert details
    SELECT * INTO v_convert
    FROM goods_converts
    WHERE id = p_convert_id
    FOR UPDATE;

    IF v_convert IS NULL THEN
        RAISE EXCEPTION 'Goods convert not found';
    END IF;

    -- Validate status
    IF v_convert.status != 'in_progress' THEN
        RAISE EXCEPTION 'Cannot complete convert - status is % (must be in_progress)', v_convert.status;
    END IF;

    -- Update convert status
    UPDATE goods_converts
    SET
        status = 'completed',
        completion_date = COALESCE((p_output_stock_units[1]->>'completion_date')::DATE, CURRENT_DATE)
    WHERE id = p_convert_id;

    -- Process each output stock unit
    FOREACH v_output IN ARRAY p_output_stock_units
    LOOP
        -- Handle lot_number if provided
        v_lot_number := v_output->>'lot_number';
        v_lot_attribute_id := NULL;

        IF v_lot_number IS NOT NULL AND v_lot_number != '' THEN
            -- Find or create lot_number attribute
            SELECT id INTO v_lot_attribute_id
            FROM attributes
            WHERE company_id = v_convert.company_id
              AND name = v_lot_number
              AND group_name = 'lot_number';

            IF v_lot_attribute_id IS NULL THEN
                INSERT INTO attributes (company_id, name, group_name)
                VALUES (v_convert.company_id, v_lot_number, 'lot_number')
                RETURNING id INTO v_lot_attribute_id;
            END IF;
        END IF;

        -- Create output stock unit
        INSERT INTO stock_units (
            company_id,
            current_warehouse_id,
            product_id,
            origin_type,
            origin_convert_id,
            origin_inward_id,
            remaining_quantity,
            initial_quantity,
            lot_number_attribute_id,
            quality_grade,
            stock_number,
            warehouse_location,
            manufacturing_date,
            notes,
            status,
            created_by
        )
        VALUES (
            v_convert.company_id,
            v_convert.warehouse_id,
            (v_output->>'product_id')::UUID,
            'convert',
            p_convert_id,
            NULL,
            (v_output->>'initial_quantity')::DECIMAL,
            (v_output->>'initial_quantity')::DECIMAL,
            v_lot_attribute_id,
            v_output->>'quality_grade',
            v_output->>'stock_number',
            v_output->>'warehouse_location',
            (v_output->>'manufacturing_date')::DATE,
            v_output->>'notes',
            'available', -- Will be set by reconciliation
            COALESCE((v_output->>'created_by')::UUID, auth.uid())
        )
        RETURNING id INTO v_stock_unit_id;

        -- Create wastage adjustment if wastage exists
        IF COALESCE((v_output->>'wastage_quantity')::DECIMAL, 0) > 0 THEN
            INSERT INTO stock_unit_adjustments (
                company_id,
                warehouse_id,
                stock_unit_id,
                quantity_adjusted,
                adjustment_date,
                reason,
                convert_id,
                created_by
            )
            VALUES (
                v_convert.company_id,
                v_convert.warehouse_id,
                v_stock_unit_id,
                -(v_output->>'wastage_quantity')::DECIMAL, -- Negative for wastage
                v_convert.completion_date,
                COALESCE(v_output->>'wastage_reason', 'Wastage during conversion'),
                p_convert_id,
                auth.uid()
            );
        END IF;
    END LOOP;

    -- Trigger reconciliation for all input stock units
    -- This will reduce their remaining_quantity and set status back to 'available'
    UPDATE stock_units
    SET updated_at = NOW()
    WHERE id IN (
        SELECT stock_unit_id
        FROM goods_convert_input_items
        WHERE convert_id = p_convert_id
    );
END;
$$;

-- =====================================================
-- GOODS CONVERT CANCELLATION FUNCTION
-- =====================================================

-- Function to cancel goods convert
CREATE OR REPLACE FUNCTION cancel_goods_convert(
    p_convert_id UUID,
    p_cancellation_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_convert RECORD;
BEGIN
    -- Get convert details
    SELECT * INTO v_convert
    FROM goods_converts
    WHERE id = p_convert_id
    FOR UPDATE;

    IF v_convert IS NULL THEN
        RAISE EXCEPTION 'Goods convert not found';
    END IF;

    -- Validate status
    IF v_convert.status != 'in_progress' THEN
        RAISE EXCEPTION 'Cannot cancel convert - status is % (must be in_progress)', v_convert.status;
    END IF;

    -- Validate cancellation reason
    IF p_cancellation_reason IS NULL OR TRIM(p_cancellation_reason) = '' THEN
        RAISE EXCEPTION 'Cancellation reason is required';
    END IF;

    -- Update convert status
    UPDATE goods_converts
    SET
        status = 'cancelled',
        cancellation_reason = p_cancellation_reason
    WHERE id = p_convert_id;

    -- Trigger reconciliation for all input stock units
    -- This will set their status back to 'available'
    UPDATE stock_units
    SET updated_at = NOW()
    WHERE id IN (
        SELECT stock_unit_id
        FROM goods_convert_input_items
        WHERE convert_id = p_convert_id
    );
END;
$$;

-- =====================================================
-- GRANT EXECUTE PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION create_goods_convert_with_items(JSONB, JSONB[]) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_goods_convert(UUID, JSONB[]) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_goods_convert(UUID, TEXT) TO authenticated;
