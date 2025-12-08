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
    v_company_id UUID;
    v_warehouse_id UUID;
    v_unit JSONB;
    v_product_id UUID;
    v_product_stock_type TEXT;
    v_quantity DECIMAL;
    v_existing_unit_id UUID;
    v_existing_initial_qty DECIMAL;
    v_existing_remaining_qty DECIMAL;
BEGIN
    -- Derive company_id from JWT if not provided (short-circuit evaluation)
    v_company_id := COALESCE(
        (p_inward_data->>'company_id')::UUID,
        get_jwt_company_id()
    );

    v_warehouse_id := (p_inward_data->>'warehouse_id')::UUID;

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
        v_company_id,
        v_warehouse_id,
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
        COALESCE((p_inward_data->>'created_by')::UUID, auth.uid())
    )
    RETURNING id INTO v_inward_id;

    -- Process each stock unit
    FOREACH v_unit IN ARRAY p_stock_units
    LOOP
        v_product_id := (v_unit->>'product_id')::UUID;
        v_quantity := (v_unit->>'initial_quantity')::DECIMAL;

        -- Get product stock_type
        SELECT stock_type INTO v_product_stock_type
        FROM products
        WHERE id = v_product_id;

        -- Handle piece type products (singleton pattern)
        IF v_product_stock_type = 'piece' THEN
            -- Check if singleton stock unit exists for this product in this warehouse
            SELECT id, initial_quantity, remaining_quantity
            INTO v_existing_unit_id, v_existing_initial_qty, v_existing_remaining_qty
            FROM stock_units
            WHERE product_id = v_product_id
              AND warehouse_id = v_warehouse_id
              AND deleted_at IS NULL
            LIMIT 1;

            IF v_existing_unit_id IS NOT NULL THEN
                -- Update existing singleton
                UPDATE stock_units
                SET
                    initial_quantity = v_existing_initial_qty + v_quantity,
                    remaining_quantity = v_existing_remaining_qty + v_quantity,
                    updated_at = NOW()
                WHERE id = v_existing_unit_id;
            ELSE
                -- Create new singleton for piece type
                INSERT INTO stock_units (
                    company_id,
                    warehouse_id,
                    product_id,
                    created_from_inward_id,
                    remaining_quantity,
                    initial_quantity,
                    quality_grade,
                    created_by
                )
                VALUES (
                    v_company_id,
                    v_warehouse_id,
                    v_product_id,
                    v_inward_id,
                    v_quantity,
                    v_quantity,
                    COALESCE(v_unit->>'quality_grade', 'A'),
                    COALESCE((v_unit->>'created_by')::UUID, auth.uid())
                );
            END IF;
        ELSE
            -- Handle non-piece type products (create new stock units as usual)
            INSERT INTO stock_units (
                company_id,
                warehouse_id,
                product_id,
                created_from_inward_id,
                remaining_quantity,
                initial_quantity,
                status,
                quality_grade,
                supplier_number,
                warehouse_location,
                notes,
                created_by
            )
            VALUES (
                v_company_id,
                v_warehouse_id,
                v_product_id,
                v_inward_id,
                v_quantity,
                v_quantity,
                v_unit->>'status',
                v_unit->>'quality_grade',
                v_unit->>'supplier_number',
                v_unit->>'warehouse_location',
                v_unit->>'notes',
                COALESCE((v_unit->>'created_by')::UUID, auth.uid())
            );
        END IF;
    END LOOP;

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
    v_company_id UUID;
    v_stock_unit_item JSONB;
    v_stock_unit_id UUID;
    v_dispatch_quantity DECIMAL;
    v_current_quantity DECIMAL;
    v_new_quantity DECIMAL;
BEGIN
    -- Derive company_id from JWT if not provided (short-circuit evaluation)
    v_company_id := COALESCE(
        (p_outward_data->>'company_id')::UUID,
        get_jwt_company_id()
    );

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
        v_company_id,
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
        COALESCE((p_outward_data->>'created_by')::UUID, auth.uid())
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
            v_company_id,
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

-- =====================================================
-- GOODS INWARD SEARCH VECTOR UPDATE FUNCTION
-- =====================================================

-- Function to update goods inward search vector for full-text search
-- Weight A: sequence_number, partner name, warehouse name
-- Weight B: product names (via stock_units join)
-- Weight C: inward_type, sales_order_sequence, purchase_order_number, other_reason
-- Weight D: transport_reference_number, transport_type, transport_details
CREATE OR REPLACE FUNCTION update_goods_inward_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_partner_name TEXT;
    v_warehouse_name TEXT;
    v_product_names TEXT;
    v_sales_order_sequence TEXT;
BEGIN
    -- If record is soft-deleted, set search_vector to NULL to exclude from index
    IF NEW.deleted_at IS NOT NULL THEN
        NEW.search_vector := NULL;
        RETURN NEW;
    END IF;

    -- Get partner name (if exists)
    IF NEW.partner_id IS NOT NULL THEN
        SELECT CONCAT(first_name, ' ', last_name, ' ', COALESCE(company_name, ''))
        INTO v_partner_name
        FROM partners
        WHERE id = NEW.partner_id;
    END IF;

    -- Get warehouse name
    SELECT name
    INTO v_warehouse_name
    FROM warehouses
    WHERE id = NEW.warehouse_id;

    -- Get aggregated product names from stock units
    SELECT string_agg(DISTINCT p.name, ' ')
    INTO v_product_names
    FROM stock_units su
    JOIN products p ON p.id = su.product_id
    WHERE su.created_from_inward_id = NEW.id;

    -- Get sales order sequence number (if linked)
    IF NEW.sales_order_id IS NOT NULL THEN
        SELECT sequence_number::text
        INTO v_sales_order_sequence
        FROM sales_orders
        WHERE id = NEW.sales_order_id;
    END IF;

    -- Build weighted search vector
    NEW.search_vector :=
        -- Weight A: Primary identifiers
        setweight(to_tsvector('simple', COALESCE(NEW.sequence_number::text, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(v_partner_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(v_warehouse_name, '')), 'A') ||

        -- Weight B: Product names
        setweight(to_tsvector('english', COALESCE(v_product_names, '')), 'B') ||

        -- Weight C: Type and references
        setweight(to_tsvector('english', COALESCE(NEW.inward_type, '')), 'C') ||
        setweight(to_tsvector('simple', COALESCE(v_sales_order_sequence, '')), 'C') ||
        setweight(to_tsvector('simple', COALESCE(NEW.purchase_order_number, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.other_reason, '')), 'C') ||

        -- Weight D: Transport details
        setweight(to_tsvector('simple', COALESCE(NEW.transport_reference_number, '')), 'D') ||
        setweight(to_tsvector('english', COALESCE(NEW.transport_type, '')), 'D') ||
        setweight(to_tsvector('english', COALESCE(NEW.transport_details, '')), 'D');

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_goods_inward_search_vector() IS 'Automatically updates the search_vector column for goods inwards with weighted full-text search fields including related partner, warehouse, and product names';

-- =====================================================
-- GOODS OUTWARD SEARCH VECTOR UPDATE FUNCTION
-- =====================================================

-- Function to update goods outward search vector for full-text search
-- Weight A: sequence_number, partner name, warehouse name
-- Weight B: product names (via goods_outward_items join)
-- Weight C: outward_type, sales_order_sequence, purchase_order_number, other_reason
-- Weight D: transport_reference_number, transport_type, transport_details, cancellation_reason
CREATE OR REPLACE FUNCTION update_goods_outward_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_partner_name TEXT;
    v_warehouse_name TEXT;
    v_product_names TEXT;
    v_sales_order_sequence TEXT;
BEGIN
    -- If record is soft-deleted, set search_vector to NULL to exclude from index
    IF NEW.deleted_at IS NOT NULL THEN
        NEW.search_vector := NULL;
        RETURN NEW;
    END IF;

    -- Get partner name (if exists)
    IF NEW.partner_id IS NOT NULL THEN
        SELECT CONCAT(first_name, ' ', last_name, ' ', COALESCE(company_name, ''))
        INTO v_partner_name
        FROM partners
        WHERE id = NEW.partner_id;
    END IF;

    -- Get warehouse name
    SELECT name
    INTO v_warehouse_name
    FROM warehouses
    WHERE id = NEW.warehouse_id;

    -- Get aggregated product names from outward items
    SELECT string_agg(DISTINCT p.name, ' ')
    INTO v_product_names
    FROM goods_outward_items goi
    JOIN stock_units su ON su.id = goi.stock_unit_id
    JOIN products p ON p.id = su.product_id
    WHERE goi.outward_id = NEW.id;

    -- Get sales order sequence number (if linked)
    IF NEW.sales_order_id IS NOT NULL THEN
        SELECT sequence_number::text
        INTO v_sales_order_sequence
        FROM sales_orders
        WHERE id = NEW.sales_order_id;
    END IF;

    -- Build weighted search vector
    NEW.search_vector :=
        -- Weight A: Primary identifiers
        setweight(to_tsvector('simple', COALESCE(NEW.sequence_number::text, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(v_partner_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(v_warehouse_name, '')), 'A') ||

        -- Weight B: Product names
        setweight(to_tsvector('english', COALESCE(v_product_names, '')), 'B') ||

        -- Weight C: Type and references
        setweight(to_tsvector('english', COALESCE(NEW.outward_type, '')), 'C') ||
        setweight(to_tsvector('simple', COALESCE(v_sales_order_sequence, '')), 'C') ||
        setweight(to_tsvector('simple', COALESCE(NEW.purchase_order_number, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.other_reason, '')), 'C') ||

        -- Weight D: Transport and cancellation details
        setweight(to_tsvector('simple', COALESCE(NEW.transport_reference_number, '')), 'D') ||
        setweight(to_tsvector('english', COALESCE(NEW.transport_type, '')), 'D') ||
        setweight(to_tsvector('english', COALESCE(NEW.transport_details, '')), 'D') ||
        setweight(to_tsvector('english', COALESCE(NEW.cancellation_reason, '')), 'D');

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_goods_outward_search_vector() IS 'Automatically updates the search_vector column for goods outwards with weighted full-text search fields including related partner, warehouse, and product names';

-- Create triggers for goods_inwards and goods_outwards tables
CREATE TRIGGER trigger_update_goods_inward_search_vector
    BEFORE INSERT OR UPDATE ON goods_inwards
    FOR EACH ROW EXECUTE FUNCTION update_goods_inward_search_vector();

CREATE TRIGGER trigger_update_goods_outward_search_vector
    BEFORE INSERT OR UPDATE ON goods_outwards
    FOR EACH ROW EXECUTE FUNCTION update_goods_outward_search_vector();
