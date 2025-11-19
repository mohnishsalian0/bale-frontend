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
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inward_id UUID;
BEGIN
    -- Insert goods inward
    INSERT INTO goods_inwards (
        company_id,
        warehouse_id,
        inward_type,
        inward_date,
        expected_delivery_date,
        transport_reference_number,
        transport_type,
        transport_details,
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
        p_inward_data->>'inward_type',
        (p_inward_data->>'inward_date')::DATE,
        (p_inward_data->>'expected_delivery_date')::DATE,
        p_inward_data->>'transport_reference_number',
        p_inward_data->>'transport_type',
        p_inward_data->>'transport_details',
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
        warehouse_location,
        notes,
        created_by
    )
    SELECT
        (p_inward_data->>'company_id')::UUID,
        (unit->>'warehouse_id')::UUID,
        (unit->>'product_id')::UUID,
        v_inward_id,
        (unit->>'initial_quantity')::DECIMAL,
        (unit->>'initial_quantity')::DECIMAL,
        unit->>'unit_number',
        unit->>'status',
        unit->>'quality_grade',
        unit->>'supplier_number',
        unit->>'warehouse_location',
        unit->>'notes',
        (unit->>'created_by')::UUID
    FROM unnest(p_stock_units) AS unit;

    -- Return the inward ID
    RETURN v_inward_id;
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
RETURNS UUID
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
BEGIN
    -- Insert goods outward
    INSERT INTO goods_outwards (
        company_id,
        warehouse_id,
        outward_type,
        partner_id,
        to_warehouse_id,
        sales_order_id,
        job_work_id,
        other_reason,
        outward_date,
        expected_delivery_date,
        transport_reference_number,
        transport_type,
        transport_details,
        notes,
        created_by
    )
    VALUES (
        (p_outward_data->>'company_id')::UUID,
        (p_outward_data->>'warehouse_id')::UUID,
        p_outward_data->>'outward_type',
        (p_outward_data->>'partner_id')::UUID,
        (p_outward_data->>'to_warehouse_id')::UUID,
        (p_outward_data->>'sales_order_id')::UUID,
        (p_outward_data->>'job_work_id')::UUID,
        p_outward_data->>'other_reason',
        (p_outward_data->>'outward_date')::DATE,
        (p_outward_data->>'expected_delivery_date')::DATE,
        p_outward_data->>'transport_reference_number',
        p_outward_data->>'transport_type',
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
            warehouse_id,
            outward_id,
            stock_unit_id,
            quantity_dispatched
        )
        VALUES (
            (p_outward_data->>'company_id')::UUID,
            (p_outward_data->>'warehouse_id')::UUID,
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
    RETURN v_outward_id;
END;
$$;

-- =====================================================
-- PIECE TRACKING HELPER FUNCTIONS
-- =====================================================

-- Function to get available pieces quantity
CREATE OR REPLACE FUNCTION get_available_pieces_quantity(
    p_company_id UUID,
    p_product_id UUID
)
RETURNS DECIMAL(10,3) AS $$
DECLARE
    total_quantity DECIMAL(10,3);
BEGIN
    -- Sum all inward pieces minus all dispatched pieces
    SELECT COALESCE(SUM(su.initial_quantity), 0) -
           COALESCE(SUM(goi.quantity_dispatched), 0)
    INTO total_quantity
    FROM stock_units su
    LEFT JOIN goods_outward_items goi ON goi.stock_unit_id = su.id
    WHERE su.company_id = p_company_id
      AND su.product_id = p_product_id
      AND su.deleted_at IS NULL;

    RETURN COALESCE(total_quantity, 0);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_available_pieces_quantity IS 'Calculate total available quantity for piece-tracked products (sum of inward minus outward)';

-- =====================================================
-- FIFO DISPATCH FUNCTION FOR PIECES
-- =====================================================

CREATE OR REPLACE FUNCTION dispatch_pieces_fifo(
    p_company_id UUID,
    p_outward_id UUID,
    p_product_id UUID,
    p_quantity_to_dispatch DECIMAL(10,3)
)
RETURNS TABLE(stock_unit_id UUID, quantity_dispatched DECIMAL(10,3)) AS $$
DECLARE
    v_remaining_quantity DECIMAL(10,3);
    v_stock_unit RECORD;
    v_available_in_unit DECIMAL(10,3);
    v_dispatch_from_unit DECIMAL(10,3);
BEGIN
    v_remaining_quantity := p_quantity_to_dispatch;

    -- Loop through stock units in FIFO order (oldest first)
    FOR v_stock_unit IN
        SELECT
            su.id,
            su.initial_quantity,
            COALESCE(SUM(goi.quantity_dispatched), 0) AS total_dispatched
        FROM stock_units su
        LEFT JOIN goods_outward_items goi ON goi.stock_unit_id = su.id
        WHERE su.company_id = p_company_id
          AND su.product_id = p_product_id
          AND su.deleted_at IS NULL
        GROUP BY su.id, su.initial_quantity
        ORDER BY su.created_at ASC, su.id ASC
    LOOP
        -- Calculate available quantity in this unit
        v_available_in_unit := v_stock_unit.initial_quantity - v_stock_unit.total_dispatched;

        -- If nothing available, skip to next unit
        IF v_available_in_unit <= 0 THEN
            CONTINUE;
        END IF;

        -- Dispatch as much as possible from this unit
        v_dispatch_from_unit := LEAST(v_available_in_unit, v_remaining_quantity);

        -- Insert outward item
        INSERT INTO goods_outward_items (
            company_id,
            outward_id,
            stock_unit_id,
            quantity_dispatched
        ) VALUES (
            p_company_id,
            p_outward_id,
            v_stock_unit.id,
            v_dispatch_from_unit
        );

        -- Return the dispatch record
        stock_unit_id := v_stock_unit.id;
        quantity_dispatched := v_dispatch_from_unit;
        RETURN NEXT;

        -- Reduce remaining quantity
        v_remaining_quantity := v_remaining_quantity - v_dispatch_from_unit;

        -- If we've dispatched everything, exit loop
        IF v_remaining_quantity <= 0 THEN
            EXIT;
        END IF;
    END LOOP;

    -- If we still have remaining quantity, it means insufficient stock
    IF v_remaining_quantity > 0 THEN
        RAISE EXCEPTION 'Insufficient stock: requested %, only % available',
            p_quantity_to_dispatch,
            p_quantity_to_dispatch - v_remaining_quantity;
    END IF;

    RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION dispatch_pieces_fifo IS 'Atomically dispatch pieces using FIFO (First In First Out) inventory method. Creates goods_outward_items records automatically.';

-- =====================================================
-- SALES ORDER HAS_OUTWARD FLAG TRIGGER
-- =====================================================

-- Function to update has_outward flag when goods_outward linked/unlinked
CREATE OR REPLACE FUNCTION update_sales_order_outward_flag()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.sales_order_id IS NOT NULL THEN
    -- Outward created with sales order link
    UPDATE sales_orders
    SET has_outward = true
    WHERE id = NEW.sales_order_id;

  ELSIF TG_OP = 'DELETE' AND OLD.sales_order_id IS NOT NULL THEN
    -- Outward deleted, check if any other outwards still linked
    UPDATE sales_orders
    SET has_outward = EXISTS(
      SELECT 1 FROM goods_outwards
      WHERE sales_order_id = OLD.sales_order_id
      AND id != OLD.id
      AND deleted_at IS NULL
    )
    WHERE id = OLD.sales_order_id;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Outward link changed
    IF OLD.sales_order_id IS DISTINCT FROM NEW.sales_order_id THEN
      -- Update old order if exists
      IF OLD.sales_order_id IS NOT NULL THEN
        UPDATE sales_orders
        SET has_outward = EXISTS(
          SELECT 1 FROM goods_outwards
          WHERE sales_order_id = OLD.sales_order_id
          AND deleted_at IS NULL
        )
        WHERE id = OLD.sales_order_id;
      END IF;

      -- Update new order if exists
      IF NEW.sales_order_id IS NOT NULL THEN
        UPDATE sales_orders
        SET has_outward = true
        WHERE id = NEW.sales_order_id;
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger on goods_outwards
CREATE TRIGGER sales_order_outward_link_trigger
AFTER INSERT OR UPDATE OR DELETE ON goods_outwards
FOR EACH ROW
EXECUTE FUNCTION update_sales_order_outward_flag();

COMMENT ON FUNCTION update_sales_order_outward_flag IS 'Automatically maintains has_outward flag on sales_orders when goods_outwards are linked or unlinked';
