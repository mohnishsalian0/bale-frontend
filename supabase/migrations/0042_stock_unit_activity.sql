-- Bale Backend - Stock Unit Activity Function
-- Track complete activity history for stock units

-- =====================================================
-- STOCK UNIT ACTIVITY FUNCTION
-- =====================================================

-- Function to get complete activity history for a stock unit
-- Includes: creation (inward/convert_in), transfers, outwards, convert_out, and adjustments
CREATE OR REPLACE FUNCTION get_stock_unit_activity(p_stock_unit_id UUID)
RETURNS TABLE (
    event_type TEXT,
    event_date DATE,
    event_number TEXT,
    event_id UUID,
    from_type TEXT,
    from_id UUID,
    from_name TEXT,
    to_type TEXT,
    to_id UUID,
    to_name TEXT,
    quantity_change DECIMAL,
    status TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM (
        -- 1. Creation via goods inward
        SELECT
            'inward'::TEXT as event_type,
            gi.inward_date as event_date,
            'GI-' || gi.sequence_number::TEXT as event_number,
            gi.id as event_id,
            'partner'::TEXT as from_type,
            gi.partner_id as from_id,
            p.display_name as from_name,
            'warehouse'::TEXT as to_type,
            gi.warehouse_id as to_id,
            w.name::TEXT as to_name,
            su.initial_quantity as quantity_change,
            'completed'::TEXT as status,
            gi.notes,
            gi.created_at
        FROM stock_units su
        JOIN goods_inwards gi ON su.origin_inward_id = gi.id
        JOIN warehouses w ON gi.warehouse_id = w.id
        LEFT JOIN partners p ON gi.partner_id = p.id
        WHERE su.id = p_stock_unit_id
        AND su.origin_type = 'inward'

        UNION ALL

        -- 2. Creation via goods convert (conversion output)
        SELECT
            'convert_in'::TEXT as event_type,
            COALESCE(gc.completion_date, gc.start_date) as event_date,
            'GC-' || gc.sequence_number::TEXT as event_number,
            gc.id as event_id,
            'vendor'::TEXT as from_type,
            gc.vendor_id as from_id,
            v.display_name as from_name,
            'warehouse'::TEXT as to_type,
            gc.warehouse_id as to_id,
            w.name::TEXT as to_name,
            su.initial_quantity as quantity_change,
            gc.status,
            gc.notes,
            gc.created_at
        FROM stock_units su
        JOIN goods_converts gc ON su.origin_convert_id = gc.id
        JOIN warehouses w ON gc.warehouse_id = w.id
        LEFT JOIN partners v ON gc.vendor_id = v.id
        WHERE su.id = p_stock_unit_id
        AND su.origin_type = 'convert'

        UNION ALL

        -- 3. Transfers between warehouses
        SELECT
            'transfer'::TEXT as event_type,
            gt.transfer_date as event_date,
            'GT-' || gt.sequence_number::TEXT as event_number,
            gt.id as event_id,
            'warehouse'::TEXT as from_type,
            gt.from_warehouse_id as from_id,
            w_from.name::TEXT as from_name,
            'warehouse'::TEXT as to_type,
            gt.to_warehouse_id as to_id,
            w_to.name::TEXT as to_name,
            gti.quantity_transferred as quantity_change,
            gt.status,
            gt.notes,
            gt.created_at
        FROM goods_transfer_items gti
        JOIN goods_transfers gt ON gti.transfer_id = gt.id
        JOIN warehouses w_from ON gt.from_warehouse_id = w_from.id
        JOIN warehouses w_to ON gt.to_warehouse_id = w_to.id
        WHERE gti.stock_unit_id = p_stock_unit_id

        UNION ALL

        -- 4. Outward dispatches
        SELECT
            'outward'::TEXT as event_type,
            go.outward_date as event_date,
            'GO-' || go.sequence_number::TEXT as event_number,
            go.id as event_id,
            'warehouse'::TEXT as from_type,
            go.warehouse_id as from_id,
            w.name::TEXT as from_name,
            'partner'::TEXT as to_type,
            go.partner_id as to_id,
            p.display_name as to_name,
            -goi.quantity_dispatched as quantity_change,
            CASE WHEN go.is_cancelled THEN 'cancelled' ELSE 'completed' END as status,
            go.notes,
            go.created_at
        FROM goods_outward_items goi
        JOIN goods_outwards go ON goi.outward_id = go.id
        JOIN warehouses w ON go.warehouse_id = w.id
        LEFT JOIN partners p ON go.partner_id = p.id
        WHERE goi.stock_unit_id = p_stock_unit_id
        AND goi.is_cancelled = FALSE

        UNION ALL

        -- 5. Adjustments (quantity changes)
        SELECT
            'adjustment'::TEXT as event_type,
            sua.adjustment_date as event_date,
            NULL::TEXT as event_number,
            sua.id as event_id,
            NULL::TEXT as from_type,
            NULL::UUID as from_id,
            NULL::TEXT as from_name,
            NULL::TEXT as to_type,
            NULL::UUID as to_id,
            NULL::TEXT as to_name,
            sua.quantity_adjusted as quantity_change,
            'completed'::TEXT as status,
            sua.reason as notes,
            sua.created_at
        FROM stock_unit_adjustments sua
        WHERE sua.stock_unit_id = p_stock_unit_id

        UNION ALL

        -- 6. Consumed as input in a goods convert
        SELECT
            'convert_out'::TEXT as event_type,
            gc.start_date as event_date,
            'GC-' || gc.sequence_number::TEXT as event_number,
            gc.id as event_id,
            'vendor'::TEXT as from_type,
            gc.vendor_id as from_id,
            v.display_name as from_name,
            'warehouse'::TEXT as to_type,
            gc.warehouse_id as to_id,
            w.name::TEXT as to_name,
            -gci.quantity_consumed as quantity_change,
            gc.status::TEXT as status,
            gc.notes,
            gc.created_at
        FROM goods_convert_input_items gci
        JOIN goods_converts gc ON gci.convert_id = gc.id
        JOIN warehouses w ON gc.warehouse_id = w.id
        LEFT JOIN partners v ON gc.vendor_id = v.id
        WHERE gci.stock_unit_id = p_stock_unit_id
    ) activity_history
    ORDER BY event_date DESC, created_at DESC;
END;
$$;

-- =====================================================
-- GRANT EXECUTE PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_stock_unit_activity(UUID) TO authenticated;
