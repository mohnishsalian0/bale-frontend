-- Bale Backend - QR Code Functions
-- Atomic functions for creating QR code batches

-- =====================================================
-- QR BATCH CREATION FUNCTION
-- =====================================================

-- Function to create QR batch with stock units atomically
CREATE OR REPLACE FUNCTION create_qr_batch_with_items(
    p_batch_data JSONB,
    p_stock_unit_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_batch_id UUID;
    v_stock_unit_id UUID;
    v_result JSONB;
BEGIN
    -- Insert QR batch
    INSERT INTO qr_batches (
        company_id,
        warehouse_id,
        batch_name,
        image_url,
        fields_selected,
        pdf_url,
        created_by
    )
    VALUES (
        (p_batch_data->>'company_id')::UUID,
        (p_batch_data->>'warehouse_id')::UUID,
        p_batch_data->>'batch_name',
        p_batch_data->>'image_url',
        (SELECT ARRAY(SELECT jsonb_array_elements_text(p_batch_data->'fields_selected'))),
        p_batch_data->>'pdf_url',
        (p_batch_data->>'created_by')::UUID
    )
    RETURNING id INTO v_batch_id;

    -- Insert QR batch items for each stock unit
    FOREACH v_stock_unit_id IN ARRAY p_stock_unit_ids
    LOOP
        INSERT INTO qr_batch_items (
            warehouse_id,
            batch_id,
            stock_unit_id
        )
        VALUES (
            (p_batch_data->>'warehouse_id')::UUID,
            v_batch_id,
            v_stock_unit_id
        );
    END LOOP;

    -- Return the batch ID
    v_result := jsonb_build_object('id', v_batch_id);
    RETURN v_result;
END;
$$;
