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
        partner_id,
        from_warehouse_id,
        job_work_id,
        sales_order_id,
        purchase_order_id,
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
        (p_inward_data->>'partner_id')::UUID,
        (p_inward_data->>'from_warehouse_id')::UUID,
        (p_inward_data->>'job_work_id')::UUID,
        (p_inward_data->>'sales_order_id')::UUID,
        (p_inward_data->>'purchase_order_id')::UUID,
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
        purchase_order_id,
        other_reason,
        outward_date,
        expected_delivery_date,
        transport_reference_number,
        transport_type,
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
        (p_outward_data->>'purchase_order_id')::UUID,
        p_outward_data->>'other_reason',
        (p_outward_data->>'outward_date')::DATE,
        (p_outward_data->>'expected_delivery_date')::DATE,
        p_outward_data->>'transport_reference_number',
        p_outward_data->>'transport_type',
        p_outward_data->>'notes',
        COALESCE((p_outward_data->>'created_by')::UUID, auth.uid())
    )
    RETURNING id INTO v_outward_id;

    -- Process each stock unit item
    FOREACH v_stock_unit_item IN ARRAY p_stock_unit_items
    LOOP
        v_stock_unit_id := (v_stock_unit_item->>'stock_unit_id')::UUID;
        v_dispatch_quantity := (v_stock_unit_item->>'quantity')::DECIMAL;

        -- Insert goods outward item
        -- Stock unit remaining_quantity will be auto-reconciled by trigger
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
    END LOOP;

    -- Return the outward ID
    RETURN v_outward_id;
END;
$$;

-- =====================================================
-- GOODS INWARD SEARCH VECTOR UPDATE FUNCTION
-- =====================================================

-- Function to update goods inward search vector for full-text search
-- Weight A: sequence_number, partner name, warehouse name
-- Weight B: product names (via stock_units join)
-- Weight C: inward_type, sales_order_sequence, purchase_order_sequence, other_reason
-- Weight D: transport_reference_number, transport_type
CREATE OR REPLACE FUNCTION update_goods_inward_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_partner_name TEXT;
    v_warehouse_name TEXT;
    v_product_names TEXT;
    v_sales_order_sequence TEXT;
    v_purchase_order_sequence TEXT;
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

    -- Get purchase order sequence number (if linked)
    IF NEW.purchase_order_id IS NOT NULL THEN
        SELECT sequence_number::text
        INTO v_purchase_order_sequence
        FROM purchase_orders
        WHERE id = NEW.purchase_order_id;
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
        setweight(to_tsvector('simple', COALESCE(v_purchase_order_sequence, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.other_reason, '')), 'C') ||

        -- Weight D: Transport details
        setweight(to_tsvector('simple', COALESCE(NEW.transport_reference_number, '')), 'D') ||
        setweight(to_tsvector('english', COALESCE(NEW.transport_type, '')), 'D');

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
-- Weight C: outward_type, sales_order_sequence, purchase_order_sequence, other_reason
-- Weight D: transport_reference_number, transport_type, cancellation_reason
CREATE OR REPLACE FUNCTION update_goods_outward_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_partner_name TEXT;
    v_warehouse_name TEXT;
    v_product_names TEXT;
    v_sales_order_sequence TEXT;
    v_purchase_order_sequence TEXT;
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

    -- Get purchase order sequence number (if linked)
    IF NEW.purchase_order_id IS NOT NULL THEN
        SELECT sequence_number::text
        INTO v_purchase_order_sequence
        FROM purchase_orders
        WHERE id = NEW.purchase_order_id;
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
        setweight(to_tsvector('simple', COALESCE(v_purchase_order_sequence, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.other_reason, '')), 'C') ||

        -- Weight D: Transport and cancellation details
        setweight(to_tsvector('simple', COALESCE(NEW.transport_reference_number, '')), 'D') ||
        setweight(to_tsvector('english', COALESCE(NEW.transport_type, '')), 'D') ||
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
