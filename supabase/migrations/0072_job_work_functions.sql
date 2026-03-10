-- Bale Backend - Job Work Functions
-- Atomic functions for creating and updating job works with line items

-- =====================================================
-- JOB WORK CREATION FUNCTION
-- =====================================================

-- Function to create job work with line items atomically
CREATE OR REPLACE FUNCTION create_job_work_with_items(
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
    -- Derive company_id from JWT if not provided
    v_company_id := COALESCE(
        (p_order_data->>'company_id')::UUID,
        get_jwt_company_id()
    );

    -- Validate business rules
    IF array_length(p_line_items, 1) IS NULL OR array_length(p_line_items, 1) = 0 THEN
        RAISE EXCEPTION 'At least one product is required to create a job work';
    END IF;

    -- Extract warehouse_id (required for job works)
    v_warehouse_id := (p_order_data->>'warehouse_id')::UUID;
    IF v_warehouse_id IS NULL THEN
        RAISE EXCEPTION 'Warehouse is required for job works';
    END IF;

    -- Insert job work
    INSERT INTO job_works (
        company_id,
        warehouse_id,
        vendor_id,
        agent_id,
        service_type_attribute_id,
        start_date,
        due_date,
        tax_type,
        advance_amount,
        discount_type,
        discount_value,
        notes,
        attachments,
        status,
        created_by
    )
    VALUES (
        v_company_id,
        v_warehouse_id,
        (p_order_data->>'vendor_id')::UUID,
        NULLIF((p_order_data->>'agent_id'), '')::UUID,
        (p_order_data->>'service_type_attribute_id')::UUID,
        (p_order_data->>'start_date')::DATE,
        NULLIF((p_order_data->>'due_date'), '')::DATE,
        COALESCE(p_order_data->>'tax_type', 'gst')::tax_type_enum,
        COALESCE((p_order_data->>'advance_amount')::DECIMAL, 0),
        COALESCE(p_order_data->>'discount_type', 'none')::discount_type_enum,
        COALESCE((p_order_data->>'discount_value')::DECIMAL, 0),
        NULLIF(p_order_data->>'notes', ''),
        COALESCE(
            ARRAY(SELECT jsonb_array_elements_text(p_order_data->'attachments')),
            ARRAY[]::TEXT[]
        ),
        COALESCE(p_order_data->>'status', 'approval_pending'),
        COALESCE((p_order_data->>'created_by')::UUID, auth.uid())
    )
    RETURNING id, sequence_number INTO v_order_id, v_sequence_number;

    -- Insert job work line items
    INSERT INTO job_work_items (
        company_id,
        warehouse_id,
        job_work_id,
        product_id,
        expected_quantity,
        unit_rate
    )
    SELECT
        v_company_id,
        v_warehouse_id,
        v_order_id,
        (item->>'product_id')::UUID,
        (item->>'expected_quantity')::DECIMAL,
        (item->>'unit_rate')::DECIMAL
    FROM unnest(p_line_items) AS item;

    -- Return the sequence number
    RETURN v_sequence_number;
END;
$$;

COMMENT ON FUNCTION create_job_work_with_items IS 'Atomically create job work with line items. Warehouse is required.';

-- =====================================================
-- JOB WORK UPDATE FUNCTION
-- =====================================================

-- Function to update job work with line items atomically
CREATE OR REPLACE FUNCTION update_job_work_with_items(
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
    v_has_convert BOOLEAN;
BEGIN
    -- Get current order status, has_convert flag, and company_id
    SELECT status, has_convert, company_id, warehouse_id
    INTO v_current_status, v_has_convert, v_company_id, v_warehouse_id
    FROM job_works
    WHERE id = p_order_id;

    -- Check if order exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Job work not found';
    END IF;

    -- Validate line items
    IF array_length(p_line_items, 1) IS NULL OR array_length(p_line_items, 1) = 0 THEN
        RAISE EXCEPTION 'At least one product is required';
    END IF;

    -- Extract warehouse_id from order data
    v_warehouse_id := (p_order_data->>'warehouse_id')::UUID;

    -- Update job work
    UPDATE job_works
    SET
        warehouse_id = v_warehouse_id,
        vendor_id = (p_order_data->>'vendor_id')::UUID,
        agent_id = NULLIF((p_order_data->>'agent_id'), '')::UUID,
        service_type_attribute_id = (p_order_data->>'service_type_attribute_id')::UUID,
        start_date = (p_order_data->>'start_date')::DATE,
        due_date = NULLIF((p_order_data->>'due_date'), '')::DATE,
        tax_type = COALESCE(p_order_data->>'tax_type', 'gst')::tax_type_enum,
        advance_amount = COALESCE((p_order_data->>'advance_amount')::DECIMAL, 0),
        discount_type = COALESCE(p_order_data->>'discount_type', 'none')::discount_type_enum,
        discount_value = COALESCE((p_order_data->>'discount_value')::DECIMAL, 0),
        notes = NULLIF(p_order_data->>'notes', ''),
        attachments = COALESCE(
            ARRAY(SELECT jsonb_array_elements_text(p_order_data->'attachments')),
            ARRAY[]::TEXT[]
        ),
        updated_at = NOW(),
        modified_by = auth.uid()
    WHERE id = p_order_id;

    -- Delete existing line items
    DELETE FROM job_work_items
    WHERE job_work_id = p_order_id;

    -- Insert new line items
    INSERT INTO job_work_items (
        company_id,
        warehouse_id,
        job_work_id,
        product_id,
        expected_quantity,
        unit_rate
    )
    SELECT
        v_company_id,
        v_warehouse_id,
        p_order_id,
        (item->>'product_id')::UUID,
        (item->>'expected_quantity')::DECIMAL,
        (item->>'unit_rate')::DECIMAL
    FROM unnest(p_line_items) AS item;
END;
$$;

COMMENT ON FUNCTION update_job_work_with_items IS 'Atomically update job work with line items. Deletes old items and inserts new ones. Edit guards handled by prevent_job_work_edit trigger.';

-- =====================================================
-- JOB WORK SEARCH VECTOR UPDATE FUNCTION
-- =====================================================

-- Weight A: sequence_number, vendor name, warehouse name
-- Weight B: product names (via job_work_items join), service type
-- Weight C: agent name, status
-- Weight D: notes
CREATE OR REPLACE FUNCTION update_job_work_search_vector()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_vendor_name TEXT;
    v_agent_name TEXT;
    v_warehouse_name TEXT;
    v_service_type_name TEXT;
    v_product_names TEXT;
BEGIN
    -- If record is soft-deleted, set search_vector to NULL
    IF NEW.deleted_at IS NOT NULL THEN
        NEW.search_vector := NULL;
        RETURN NEW;
    END IF;

    -- Get vendor name
    SELECT display_name
    INTO v_vendor_name
    FROM partners
    WHERE id = NEW.vendor_id;

    -- Get agent name (if exists)
    IF NEW.agent_id IS NOT NULL THEN
        SELECT display_name
        INTO v_agent_name
        FROM partners
        WHERE id = NEW.agent_id;
    END IF;

    -- Get warehouse name
    SELECT name
    INTO v_warehouse_name
    FROM warehouses
    WHERE id = NEW.warehouse_id;

    -- Get service type attribute name
    SELECT name
    INTO v_service_type_name
    FROM attributes
    WHERE id = NEW.service_type_attribute_id;

    -- Get aggregated product names from line items
    SELECT string_agg(p.name, ' ')
    INTO v_product_names
    FROM job_work_items jwi
    JOIN products p ON p.id = jwi.product_id
    WHERE jwi.job_work_id = NEW.id;

    -- Build weighted search vector
    NEW.search_vector :=
        -- Weight A: Primary identifiers
        setweight(to_tsvector('simple', COALESCE(NEW.sequence_number::text, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(v_vendor_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(v_warehouse_name, '')), 'A') ||

        -- Weight B: Product names and service type
        setweight(to_tsvector('english', COALESCE(v_product_names, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(v_service_type_name, '')), 'B') ||

        -- Weight C: Agent, status
        setweight(to_tsvector('english', COALESCE(v_agent_name, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.status, '')), 'C') ||

        -- Weight D: Notes
        setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'D');

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION update_job_work_search_vector() IS 'Automatically updates the search_vector column for job works with weighted full-text search fields including related vendor, agent, warehouse, service type, and product names';

-- Create trigger for job_works table
CREATE TRIGGER trigger_update_job_work_search_vector
    BEFORE INSERT OR UPDATE ON job_works
    FOR EACH ROW EXECUTE FUNCTION update_job_work_search_vector();
