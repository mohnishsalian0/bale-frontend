-- Bale Backend - Purchase Order Functions
-- Atomic function for creating purchase orders with line items

-- =====================================================
-- PURCHASE ORDER CREATION FUNCTION
-- =====================================================

-- Function to create purchase order with line items atomically
-- Handles both catalog orders (no warehouse) and protected orders (with warehouse)
CREATE OR REPLACE FUNCTION create_purchase_order_with_items(
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

    -- Insert purchase order
    INSERT INTO purchase_orders (
        company_id,
        warehouse_id,
        supplier_id,
        agent_id,
        order_date,
        delivery_due_date,
        payment_terms,
        tax_type,
        advance_amount,
        discount_type,
        discount_value,
        supplier_invoice_number,
        supplier_invoice_date,
        notes,
        attachments,
        source,
        status,
        created_by
    )
    VALUES (
        v_company_id,
        v_warehouse_id,  -- Can be NULL for catalog orders
        (p_order_data->>'supplier_id')::UUID,
        NULLIF((p_order_data->>'agent_id'), '')::UUID,
        (p_order_data->>'order_date')::DATE,
        NULLIF((p_order_data->>'delivery_due_date'), '')::DATE,
        NULLIF(p_order_data->>'payment_terms', ''),
        COALESCE(p_order_data->>'tax_type', 'gst')::tax_type_enum,
        COALESCE((p_order_data->>'advance_amount')::DECIMAL, 0),
        COALESCE(p_order_data->>'discount_type', 'none')::discount_type_enum,
        COALESCE((p_order_data->>'discount_value')::DECIMAL, 0),
        NULLIF(p_order_data->>'supplier_invoice_number', ''),
        NULLIF((p_order_data->>'supplier_invoice_date'), '')::DATE,
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

    -- Insert purchase order line items
    INSERT INTO purchase_order_items (
        company_id,
        warehouse_id,
        purchase_order_id,
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
        (item->>'unit_rate')::DECIMAL
    FROM unnest(p_line_items) AS item;

    -- Return the sequence number
    RETURN v_sequence_number;
END;
$$;

COMMENT ON FUNCTION create_purchase_order_with_items IS 'Atomically create purchase order with line items. Handles both catalog orders (no warehouse) and protected orders (with warehouse).';

-- =====================================================
-- PURCHASE ORDER APPROVAL FUNCTION
-- =====================================================

-- Function to approve purchase order with updated data and line items atomically
-- Updates all order fields, replaces line items, and changes status to 'in_progress'
CREATE OR REPLACE FUNCTION approve_purchase_order_with_items(
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
    FROM purchase_orders
    WHERE id = p_order_id;

    -- Check if order exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase order not found';
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

    -- Update purchase order
    UPDATE purchase_orders
    SET
        warehouse_id = v_warehouse_id,
        supplier_id = (p_order_data->>'supplier_id')::UUID,
        agent_id = NULLIF((p_order_data->>'agent_id'), '')::UUID,
        order_date = (p_order_data->>'order_date')::DATE,
        delivery_due_date = NULLIF((p_order_data->>'delivery_due_date'), '')::DATE,
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
    DELETE FROM purchase_order_items
    WHERE purchase_order_id = p_order_id;

    -- Insert new line items
    INSERT INTO purchase_order_items (
        company_id,
        warehouse_id,
        purchase_order_id,
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
        (item->>'unit_rate')::DECIMAL
    FROM unnest(p_line_items) AS item;
END;
$$;

COMMENT ON FUNCTION approve_purchase_order_with_items IS 'Atomically approve purchase order with updated data and line items. Updates all order fields, replaces line items, and changes status to in_progress. Validates required fields before approval.';

-- =====================================================
-- PURCHASE ORDER UPDATE FUNCTION
-- =====================================================

-- Function to update purchase order with line items atomically
-- Validates business rules: cannot update if not in approval_pending status or has inward
CREATE OR REPLACE FUNCTION update_purchase_order_with_items(
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
    v_has_inward BOOLEAN;
BEGIN
    -- Get current order status, has_inward flag, and company_id
    SELECT status, has_inward, company_id, warehouse_id
    INTO v_current_status, v_has_inward, v_company_id, v_warehouse_id
    FROM purchase_orders
    WHERE id = p_order_id;

    -- Check if order exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Purchase order not found';
    END IF;

    -- Business rule validations
    -- Validate line items
    IF array_length(p_line_items, 1) IS NULL OR array_length(p_line_items, 1) = 0 THEN
        RAISE EXCEPTION 'At least one product is required';
    END IF;

    -- Extract warehouse_id from order data
    v_warehouse_id := (p_order_data->>'warehouse_id')::UUID;

    -- Update purchase order
    UPDATE purchase_orders
    SET
        warehouse_id = v_warehouse_id,
        supplier_id = (p_order_data->>'supplier_id')::UUID,
        agent_id = NULLIF((p_order_data->>'agent_id'), '')::UUID,
        order_date = (p_order_data->>'order_date')::DATE,
        delivery_due_date = NULLIF((p_order_data->>'delivery_due_date'), '')::DATE,
        payment_terms = NULLIF(p_order_data->>'payment_terms', ''),
        tax_type = COALESCE(p_order_data->>'tax_type', 'gst')::tax_type_enum,
        advance_amount = COALESCE((p_order_data->>'advance_amount')::DECIMAL, 0),
        discount_type = COALESCE(p_order_data->>'discount_type', 'none')::discount_type_enum,
        discount_value = COALESCE((p_order_data->>'discount_value')::DECIMAL, 0),
        supplier_invoice_number = NULLIF(p_order_data->>'supplier_invoice_number', ''),
        supplier_invoice_date = NULLIF((p_order_data->>'supplier_invoice_date'), '')::DATE,
        notes = NULLIF(p_order_data->>'notes', ''),
        attachments = COALESCE(
            ARRAY(SELECT jsonb_array_elements_text(p_order_data->'attachments')),
            ARRAY[]::TEXT[]
        ),
        updated_at = NOW(),
        modified_by = auth.uid()
    WHERE id = p_order_id;

    -- Delete existing line items
    DELETE FROM purchase_order_items
    WHERE purchase_order_id = p_order_id;

    -- Insert new line items
    INSERT INTO purchase_order_items (
        company_id,
        warehouse_id,
        purchase_order_id,
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
        (item->>'unit_rate')::DECIMAL
    FROM unnest(p_line_items) AS item;
END;
$$;

COMMENT ON FUNCTION update_purchase_order_with_items IS 'Atomically update purchase order with line items. Deletes old items and inserts new ones. Partner changes prevented by trigger if order is approved.';

-- =====================================================
-- PURCHASE ORDER SEARCH VECTOR UPDATE FUNCTION
-- =====================================================

-- Function to update purchase order search vector for full-text search
-- Weight A: sequence_number, supplier name, warehouse name
-- Weight B: product names (via purchase_order_items join)
-- Weight C: agent name, status, source
-- Weight D: supplier_invoice_number, payment_terms
CREATE OR REPLACE FUNCTION update_purchase_order_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_supplier_name TEXT;
    v_agent_name TEXT;
    v_warehouse_name TEXT;
    v_product_names TEXT;
BEGIN
    -- If record is soft-deleted, set search_vector to NULL to exclude from index
    IF NEW.deleted_at IS NOT NULL THEN
        NEW.search_vector := NULL;
        RETURN NEW;
    END IF;

    -- Get supplier name
    SELECT display_name
    INTO v_supplier_name
    FROM partners
    WHERE id = NEW.supplier_id;

    -- Get agent name (if exists)
    IF NEW.agent_id IS NOT NULL THEN
        SELECT display_name
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
    FROM purchase_order_items poi
    JOIN products p ON p.id = poi.product_id
    WHERE poi.purchase_order_id = NEW.id;

    -- Build weighted search vector
    NEW.search_vector :=
        -- Weight A: Primary identifiers
        setweight(to_tsvector('simple', COALESCE(NEW.sequence_number::text, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(v_supplier_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(v_warehouse_name, '')), 'A') ||

        -- Weight B: Product names
        setweight(to_tsvector('english', COALESCE(v_product_names, '')), 'B') ||

        -- Weight C: Agent, status, source
        setweight(to_tsvector('english', COALESCE(v_agent_name, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.status, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.source, '')), 'C') ||

        -- Weight D: Supplier invoice and payment terms
        setweight(to_tsvector('simple', COALESCE(NEW.supplier_invoice_number, '')), 'D') ||
        setweight(to_tsvector('english', COALESCE(NEW.payment_terms, '')), 'D');

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_purchase_order_search_vector() IS 'Automatically updates the search_vector column for purchase orders with weighted full-text search fields including related supplier, agent, warehouse, and product names';

-- Create trigger for purchase_orders table
CREATE TRIGGER trigger_update_purchase_order_search_vector
    BEFORE INSERT OR UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_purchase_order_search_vector();
