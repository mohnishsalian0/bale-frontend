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
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_sequence_number INTEGER;
    v_company_id UUID;
    v_warehouse_id UUID;
BEGIN
    -- Derive company_id from JWT if not provided (short-circuit evaluation)
    v_company_id := COALESCE(
        (p_order_data->>'company_id')::UUID,
        get_jwt_company_id()
    );

    -- Validate business rules
    IF array_length(p_line_items, 1) IS NULL OR array_length(p_line_items, 1) = 0 THEN
        RAISE EXCEPTION 'At least one product is required to create an order';
    END IF;

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
    RETURNING id, sequence_number INTO v_order_id, v_sequence_number;

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

    -- Return the sequence number
    RETURN v_sequence_number;
END;
$$;

COMMENT ON FUNCTION create_sales_order_with_items IS 'Atomically create sales order with line items. Handles both catalog orders (no warehouse) and protected orders (with warehouse).';

-- =====================================================
-- SALES ORDER APPROVAL FUNCTION
-- =====================================================

-- Function to approve sales order with updated data and line items atomically
-- Updates all order fields, replaces line items, and changes status to 'in_progress'
CREATE OR REPLACE FUNCTION approve_sales_order_with_items(
    p_order_id UUID,
    p_order_data JSONB,
    p_line_items JSONB[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id UUID;
    v_warehouse_id UUID;
    v_current_status VARCHAR(20);
BEGIN
    -- Get current order status and company_id
    SELECT status, company_id, warehouse_id
    INTO v_current_status, v_company_id, v_warehouse_id
    FROM sales_orders
    WHERE id = p_order_id;

    -- Check if order exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sales order not found';
    END IF;

    -- Validate business rules
    IF v_current_status != 'approval_pending' THEN
        RAISE EXCEPTION 'Order cannot be approved - current status is %', v_current_status;
    END IF;

    IF array_length(p_line_items, 1) IS NULL OR array_length(p_line_items, 1) = 0 THEN
        RAISE EXCEPTION 'At least one product is required for approval';
    END IF;

    -- Extract warehouse_id from order data
    v_warehouse_id := (p_order_data->>'warehouse_id')::UUID;

    -- Update sales order
    UPDATE sales_orders
    SET
        warehouse_id = v_warehouse_id,
        customer_id = (p_order_data->>'customer_id')::UUID,
        agent_id = NULLIF((p_order_data->>'agent_id'), '')::UUID,
        order_date = (p_order_data->>'order_date')::DATE,
        expected_delivery_date = NULLIF((p_order_data->>'expected_delivery_date'), '')::DATE,
        advance_amount = COALESCE((p_order_data->>'advance_amount')::DECIMAL, 0),
        discount_type = COALESCE(p_order_data->>'discount_type', 'none')::discount_type_enum,
        discount_value = COALESCE((p_order_data->>'discount_value')::DECIMAL, 0),
        notes = NULLIF(p_order_data->>'notes', ''),
        attachments = COALESCE(
            ARRAY(SELECT jsonb_array_elements_text(p_order_data->'attachments')),
            ARRAY[]::TEXT[]
        ),
        status = 'in_progress',
        status_changed_at = NOW(),
        status_changed_by = auth.uid(),
        updated_at = NOW(),
        modified_by = auth.uid()
    WHERE id = p_order_id;

    -- Delete existing line items
    DELETE FROM sales_order_items
    WHERE sales_order_id = p_order_id;

    -- Insert new line items
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
        v_warehouse_id,
        p_order_id,
        (item->>'product_id')::UUID,
        (item->>'required_quantity')::DECIMAL,
        COALESCE((item->>'unit_rate')::DECIMAL, 0)
    FROM unnest(p_line_items) AS item;
END;
$$;

COMMENT ON FUNCTION approve_sales_order_with_items IS 'Atomically approve sales order with updated data and line items. Updates all order fields, replaces line items, and changes status to in_progress. Validates required fields before approval.';

-- =====================================================
-- SALES ORDER SEARCH VECTOR UPDATE FUNCTION
-- =====================================================

-- Function to update sales order search vector for full-text search
-- Weight A: sequence_number, customer name, warehouse name
-- Weight B: product names (via sales_order_items join)
-- Weight C: agent name, status, source
-- Weight D: invoice_number, payment_terms
CREATE OR REPLACE FUNCTION update_sales_order_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_customer_name TEXT;
    v_agent_name TEXT;
    v_warehouse_name TEXT;
    v_product_names TEXT;
BEGIN
    -- If record is soft-deleted, set search_vector to NULL to exclude from index
    IF NEW.deleted_at IS NOT NULL THEN
        NEW.search_vector := NULL;
        RETURN NEW;
    END IF;

    -- Get customer name
    SELECT CONCAT(first_name, ' ', last_name, ' ', COALESCE(company_name, ''))
    INTO v_customer_name
    FROM partners
    WHERE id = NEW.customer_id;

    -- Get agent name (if exists)
    IF NEW.agent_id IS NOT NULL THEN
        SELECT CONCAT(first_name, ' ', last_name, ' ', COALESCE(company_name, ''))
        INTO v_agent_name
        FROM partners
        WHERE id = NEW.agent_id;
    END IF;

    -- Get warehouse name (if exists)
    IF NEW.warehouse_id IS NOT NULL THEN
        SELECT name
        INTO v_warehouse_name
        FROM warehouses
        WHERE id = NEW.warehouse_id;
    END IF;

    -- Get aggregated product names from line items
    SELECT string_agg(p.name, ' ')
    INTO v_product_names
    FROM sales_order_items soi
    JOIN products p ON p.id = soi.product_id
    WHERE soi.sales_order_id = NEW.id;

    -- Build weighted search vector
    NEW.search_vector :=
        -- Weight A: Primary identifiers
        setweight(to_tsvector('simple', COALESCE(NEW.sequence_number::text, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(v_customer_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(v_warehouse_name, '')), 'A') ||

        -- Weight B: Product names
        setweight(to_tsvector('english', COALESCE(v_product_names, '')), 'B') ||

        -- Weight C: Agent, status, source
        setweight(to_tsvector('english', COALESCE(v_agent_name, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.status, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.source, '')), 'C') ||

        -- Weight D: Invoice and payment terms
        setweight(to_tsvector('simple', COALESCE(NEW.invoice_number, '')), 'D') ||
        setweight(to_tsvector('english', COALESCE(NEW.payment_terms, '')), 'D');

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_sales_order_search_vector() IS 'Automatically updates the search_vector column for sales orders with weighted full-text search fields including related customer, agent, warehouse, and product names';

-- Create trigger for sales_orders table
CREATE TRIGGER trigger_update_sales_order_search_vector
    BEFORE INSERT OR UPDATE ON sales_orders
    FOR EACH ROW EXECUTE FUNCTION update_sales_order_search_vector();
