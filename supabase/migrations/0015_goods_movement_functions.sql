-- Bale Backend - Goods Movement Functions
-- Atomic functions for creating goods inward and outward transactions

-- =====================================================
-- GOODS INWARD FUNCTION
-- =====================================================

-- Function to create goods inward with stock units atomically
CREATE OR REPLACE FUNCTION create_goods_inward_with_units(
    p_inward_data JSONB,
    p_stock_units JSONB[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inward_id UUID;
    v_result JSONB;
BEGIN
    -- Insert goods inward
    INSERT INTO goods_inwards (
        company_id,
        warehouse_id,
        inward_number,
        inward_type,
        inward_date,
        invoice_number,
        partner_id,
        from_warehouse_id,
        job_work_id,
        sales_order_id,
        other_reason,
        notes,
        created_by
    )
    VALUES (
        (p_inward_data->>'company_id')::UUID,
        (p_inward_data->>'warehouse_id')::UUID,
        p_inward_data->>'inward_number',
        p_inward_data->>'inward_type',
        (p_inward_data->>'inward_date')::DATE,
        p_inward_data->>'invoice_number',
        (p_inward_data->>'partner_id')::UUID,
        (p_inward_data->>'from_warehouse_id')::UUID,
        (p_inward_data->>'job_work_id')::UUID,
        (p_inward_data->>'sales_order_id')::UUID,
        p_inward_data->>'other_reason',
        p_inward_data->>'notes',
        (p_inward_data->>'created_by')::UUID
    )
    RETURNING id INTO v_inward_id;

    -- Insert stock units
    INSERT INTO stock_units (
        company_id,
        warehouse_id,
        product_id,
        created_from_inward_id,
        remaining_quantity,
        initial_quantity,
        unit_number,
        status,
        quality_grade,
        supplier_number,
        location_description,
        notes,
        created_by
    )
    SELECT
        (unit->>'company_id')::UUID,
        (unit->>'warehouse_id')::UUID,
        (unit->>'product_id')::UUID,
        v_inward_id,
        (unit->>'initial_quantity')::DECIMAL,
        (unit->>'initial_quantity')::DECIMAL,
        unit->>'unit_number',
        unit->>'status',
        unit->>'quality_grade',
        unit->>'supplier_number',
        unit->>'location_description',
        unit->>'notes',
        (unit->>'created_by')::UUID
    FROM unnest(p_stock_units) AS unit;

    -- Return the inward ID
    v_result := jsonb_build_object('id', v_inward_id);
    RETURN v_result;
END;
$$;

-- =====================================================
-- GOODS OUTWARD FUNCTION
-- =====================================================

-- Function to create goods outward with stock unit updates atomically
CREATE OR REPLACE FUNCTION create_goods_outward_with_items(
    p_outward_data JSONB,
    p_stock_unit_items JSONB[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_outward_id UUID;
    v_stock_unit_item JSONB;
    v_stock_unit_id UUID;
    v_dispatch_quantity DECIMAL;
    v_current_quantity DECIMAL;
    v_new_quantity DECIMAL;
    v_result JSONB;
BEGIN
    -- Insert goods outward
    INSERT INTO goods_outwards (
        company_id,
        warehouse_id,
        outward_number,
        outward_type,
        partner_id,
        to_warehouse_id,
        sales_order_id,
        job_work_id,
        other_reason,
        outward_date,
        due_date,
        invoice_number,
        invoice_amount,
        transport_details,
        notes,
        created_by
    )
    VALUES (
        (p_outward_data->>'company_id')::UUID,
        (p_outward_data->>'warehouse_id')::UUID,
        p_outward_data->>'outward_number',
        p_outward_data->>'outward_type',
        (p_outward_data->>'partner_id')::UUID,
        (p_outward_data->>'to_warehouse_id')::UUID,
        (p_outward_data->>'sales_order_id')::UUID,
        (p_outward_data->>'job_work_id')::UUID,
        p_outward_data->>'other_reason',
        (p_outward_data->>'outward_date')::DATE,
        (p_outward_data->>'due_date')::DATE,
        p_outward_data->>'invoice_number',
        (p_outward_data->>'invoice_amount')::DECIMAL,
        p_outward_data->>'transport_details',
        p_outward_data->>'notes',
        (p_outward_data->>'created_by')::UUID
    )
    RETURNING id INTO v_outward_id;

    -- Process each stock unit item
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

        -- Insert goods outward item
        INSERT INTO goods_outward_items (
            company_id,
            outward_id,
            stock_unit_id,
						quantity
        )
        VALUES (
            (p_outward_data->>'company_id')::UUID,
            v_outward_id,
            v_stock_unit_id,
						v_dispatch_quantity
        );

        -- Update stock unit
        IF v_new_quantity <= 0 THEN
            -- Full dispatch - set status to dispatched and quantity to 0
            UPDATE stock_units
            SET
                remaining_quantity = 0,
                status = 'dispatched',
                updated_at = NOW()
            WHERE id = v_stock_unit_id;
        ELSE
            -- Partial dispatch - reduce quantity but keep in_stock
            UPDATE stock_units
            SET
                remaining_quantity = v_new_quantity,
                updated_at = NOW()
            WHERE id = v_stock_unit_id;
        END IF;
    END LOOP;

    -- Return the outward ID
    v_result := jsonb_build_object('id', v_outward_id);
    RETURN v_result;
END;
$$;
