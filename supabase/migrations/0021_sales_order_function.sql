-- Bale Backend - Sales Order Functions
-- Atomic function for creating sales orders with line items

-- =====================================================
-- SALES ORDER CREATION FUNCTION
-- =====================================================

-- Function to create sales order with line items atomically
-- Handles both catalog orders (no warehouse) and protected orders (with warehouse)
CREATE OR REPLACE FUNCTION create_sales_order_with_items(
    p_order_data JSONB,
    p_line_items JSONB[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_company_id UUID;
    v_warehouse_id UUID;
BEGIN
    -- Derive company_id from JWT if not provided (short-circuit evaluation)
    v_company_id := COALESCE(
        (p_order_data->>'company_id')::UUID,
        get_jwt_company_id()
    );

    -- Extract warehouse_id (can be NULL for catalog orders)
    v_warehouse_id := (p_order_data->>'warehouse_id')::UUID;

    -- Insert sales order
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
        notes,
        attachments,
        source,
        status,
        created_by
    )
    VALUES (
        v_company_id,
        v_warehouse_id,  -- Can be NULL for catalog orders
        (p_order_data->>'customer_id')::UUID,
        NULLIF((p_order_data->>'agent_id'), '')::UUID,
        (p_order_data->>'order_date')::DATE,
        NULLIF((p_order_data->>'expected_delivery_date'), '')::DATE,
        COALESCE((p_order_data->>'advance_amount')::DECIMAL, 0),
        COALESCE(p_order_data->>'discount_type', 'none')::discount_type_enum,
        COALESCE((p_order_data->>'discount_value')::DECIMAL, 0),
        NULLIF(p_order_data->>'notes', ''),  -- NULL if empty string
        COALESCE(
            ARRAY(SELECT jsonb_array_elements_text(p_order_data->'attachments')),
            ARRAY[]::TEXT[]
        ),  -- Convert JSONB array to TEXT[]
        COALESCE(p_order_data->>'source', 'manual'),
        COALESCE(p_order_data->>'status', 'approval_pending'),
        COALESCE((p_order_data->>'created_by')::UUID, auth.uid())
    )
    RETURNING id INTO v_order_id;

    -- Insert sales order line items
    INSERT INTO sales_order_items (
        company_id,
        warehouse_id,
        sales_order_id,
        product_id,
        required_quantity,
        unit_rate
    )
    SELECT
        v_company_id,
        v_warehouse_id,  -- Can be NULL for catalog orders
        v_order_id,
        (item->>'product_id')::UUID,
        (item->>'required_quantity')::DECIMAL,
        COALESCE((item->>'unit_rate')::DECIMAL, 0)
    FROM unnest(p_line_items) AS item;

    -- Return the order ID
    RETURN v_order_id;
END;
$$;

COMMENT ON FUNCTION create_sales_order_with_items IS 'Atomically create sales order with line items. Handles both catalog orders (no warehouse) and protected orders (with warehouse).';
