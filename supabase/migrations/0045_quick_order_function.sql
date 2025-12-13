-- Bale Backend - Quick Sales Order Function
-- Atomic function for creating sales orders with immediate goods outward

-- =====================================================
-- QUICK SALES ORDER CREATION FUNCTION
-- =====================================================

-- Function to create quick sales order (sales order + goods outward) atomically
-- Used when customer visits store and collects items immediately
CREATE OR REPLACE FUNCTION quick_order_with_outward(
    p_order_data JSONB,
    p_order_items JSONB[],
    p_stock_unit_items JSONB[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_outward_id UUID;
    v_sequence_number INTEGER;
    v_company_id UUID;
    v_warehouse_id UUID;
    v_customer_id UUID;
    v_stock_unit_item JSONB;
    v_stock_unit_id UUID;
    v_dispatch_quantity DECIMAL;
    v_current_quantity DECIMAL;
    v_new_quantity DECIMAL;
BEGIN
    -- Derive company_id from JWT
    v_company_id := COALESCE(
        (p_order_data->>'company_id')::UUID,
        get_jwt_company_id()
    );

    -- Extract required fields
    v_warehouse_id := (p_order_data->>'warehouse_id')::UUID;
    v_customer_id := (p_order_data->>'customer_id')::UUID;

    -- Validate business rules
    IF array_length(p_order_items, 1) IS NULL OR array_length(p_order_items, 1) = 0 THEN
        RAISE EXCEPTION 'At least one product is required to create a quick sales order';
    END IF;

    IF array_length(p_stock_unit_items, 1) IS NULL OR array_length(p_stock_unit_items, 1) = 0 THEN
        RAISE EXCEPTION 'At least one stock unit is required for goods outward';
    END IF;

    IF v_warehouse_id IS NULL THEN
        RAISE EXCEPTION 'Warehouse ID is required for quick sales orders';
    END IF;

    IF v_customer_id IS NULL THEN
        RAISE EXCEPTION 'Customer ID is required for quick sales orders';
    END IF;

    -- Insert sales order with status 'completed'
    INSERT INTO sales_orders (
        company_id,
        warehouse_id,
        customer_id,
        agent_id,
        order_date,
        expected_delivery_date,
        advance_amount,
        discount_type,
        discount_value,
        payment_terms,
        notes,
        attachments,
        source,
        status,
        created_by
    )
    VALUES (
        v_company_id,
        v_warehouse_id,
        v_customer_id,
        NULLIF((p_order_data->>'agent_id'), '')::UUID,
        (p_order_data->>'order_date')::DATE,
        NULLIF((p_order_data->>'expected_delivery_date'), '')::DATE,
        COALESCE((p_order_data->>'advance_amount')::DECIMAL, 0),
        COALESCE(p_order_data->>'discount_type', 'none')::discount_type_enum,
        COALESCE((p_order_data->>'discount_value')::DECIMAL, 0),
        NULLIF(p_order_data->>'payment_terms', ''),
        NULLIF(p_order_data->>'notes', ''),
        COALESCE(
            ARRAY(SELECT jsonb_array_elements_text(p_order_data->'attachments')),
            ARRAY[]::TEXT[]
        ),
        COALESCE(p_order_data->>'source', 'manual'),
        'completed',  -- Quick sales orders are immediately completed
        COALESCE((p_order_data->>'created_by')::UUID, auth.uid())
    )
    RETURNING id, sequence_number INTO v_order_id, v_sequence_number;

    -- Insert sales order line items (aggregated by product)
    INSERT INTO sales_order_items (
        company_id,
        warehouse_id,
        sales_order_id,
        product_id,
        required_quantity,
        dispatched_quantity,  -- Same as required for quick sales orders
        unit_rate
    )
    SELECT
        v_company_id,
        v_warehouse_id,
        v_order_id,
        (item->>'product_id')::UUID,
        (item->>'required_quantity')::DECIMAL,
        (item->>'required_quantity')::DECIMAL,  -- Dispatched immediately
        COALESCE((item->>'unit_rate')::DECIMAL, 0)
    FROM unnest(p_order_items) AS item;

    -- Insert goods outward linked to the sales order
    INSERT INTO goods_outwards (
        company_id,
        warehouse_id,
        sales_order_id,
        partner_id,
        agent_id,
        outward_type,
        outward_date,
        expected_delivery_date,
        transport_reference_number,
        transport_type,
        transport_details,
        notes,
        created_by
    )
    VALUES (
        v_company_id,
        v_warehouse_id,
        v_order_id,
        v_customer_id,
        NULLIF((p_order_data->>'agent_id'), '')::UUID,
        'sales_order',
        (p_order_data->>'order_date')::DATE,  -- Same as order date
        NULLIF((p_order_data->>'expected_delivery_date'), '')::DATE,
        NULLIF(p_order_data->>'transport_reference_number', ''),
        NULLIF(p_order_data->>'transport_type', '')::VARCHAR(20),
        NULLIF(p_order_data->>'transport_details', ''),
        NULLIF(p_order_data->>'notes', ''),
        COALESCE((p_order_data->>'created_by')::UUID, auth.uid())
    )
    RETURNING id INTO v_outward_id;

    -- Insert goods outward items and update stock units
    FOREACH v_stock_unit_item IN ARRAY p_stock_unit_items
    LOOP
        v_stock_unit_id := (v_stock_unit_item->>'stock_unit_id')::UUID;
        v_dispatch_quantity := (v_stock_unit_item->>'quantity')::DECIMAL;

        -- Get current quantity
        SELECT remaining_quantity INTO v_current_quantity
        FROM stock_units
        WHERE id = v_stock_unit_id;

        -- Calculate new quantity
        v_new_quantity := v_current_quantity - v_dispatch_quantity;

        -- Insert outward item
        INSERT INTO goods_outward_items (
            company_id,
            warehouse_id,
            outward_id,
            stock_unit_id,
            quantity_dispatched
        )
        VALUES (
            v_company_id,
            v_warehouse_id,
            v_outward_id,
            v_stock_unit_id,
            v_dispatch_quantity
        );

        -- Update stock unit
        IF v_new_quantity <= 0 THEN
            -- Full dispatch - set quantity to 0
            UPDATE stock_units
            SET
                remaining_quantity = 0,
                updated_at = NOW()
            WHERE id = v_stock_unit_id;
        ELSE
            -- Partial dispatch - reduce quantity
            UPDATE stock_units
            SET
                remaining_quantity = v_new_quantity,
                updated_at = NOW()
            WHERE id = v_stock_unit_id;
        END IF;
    END LOOP;

    -- Update sales order to mark it has outward
    UPDATE sales_orders
    SET has_outward = TRUE
    WHERE id = v_order_id;

    -- Return the sequence number for navigation
    RETURN v_sequence_number;
END;
$$;

COMMENT ON FUNCTION quick_order_with_outward IS 'Atomically create quick sales order (sales order with status completed + goods outward). Used when customer visits store and collects items immediately. Creates aggregated sales order items and individual goods outward items from stock units.';
