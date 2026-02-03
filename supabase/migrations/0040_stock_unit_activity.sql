-- Bale Backend - Stock Unit Activity Function
-- Track complete activity history for stock units

-- =====================================================
-- STOCK UNIT ACTIVITY FUNCTION
-- =====================================================

-- Function to get complete activity history for a stock unit
-- Includes: creation, transfers, outwards, and adjustments
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
            'created'::TEXT as event_type,
            gi.inward_date as event_date,
            'GI-' || gi.sequence_number::TEXT as event_number,
            gi.id as event_id,
            'partner'::TEXT as from_type,
            gi.partner_id as from_id,
            COALESCE(p.company_name, p.first_name || ' ' || p.last_name) as from_name,
            'warehouse'::TEXT as to_type,
            gi.warehouse_id as to_id,
            w.name as to_name,
            su.initial_quantity as quantity_change,
            'completed'::TEXT as status,
            gi.notes,
            gi.created_at
        FROM stock_units su
        JOIN goods_inwards gi ON su.created_from_inward_id = gi.id
        JOIN warehouses w ON gi.warehouse_id = w.id
        LEFT JOIN partners p ON gi.partner_id = p.id
        WHERE su.id = p_stock_unit_id

        UNION ALL

        -- 2. Transfers between warehouses
        SELECT
            'transfer'::TEXT as event_type,
            gt.transfer_date as event_date,
            'GT-' || gt.sequence_number::TEXT as event_number,
            gt.id as event_id,
            'warehouse'::TEXT as from_type,
            gt.from_warehouse_id as from_id,
            w_from.name as from_name,
            'warehouse'::TEXT as to_type,
            gt.to_warehouse_id as to_id,
            w_to.name as to_name,
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

        -- 3. Outward dispatches
        SELECT
            'dispatched'::TEXT as event_type,
            go.outward_date as event_date,
            'GO-' || go.sequence_number::TEXT as event_number,
            go.id as event_id,
            'warehouse'::TEXT as from_type,
            go.warehouse_id as from_id,
            w.name as from_name,
            'partner'::TEXT as to_type,
            go.partner_id as to_id,
            COALESCE(p.company_name, p.first_name || ' ' || p.last_name) as to_name,
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

        -- 4. Adjustments (quantity changes)
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
    ) activity_history
    ORDER BY event_date DESC, created_at DESC;
END;
$$;

-- =====================================================
-- GRANT EXECUTE PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_stock_unit_activity(UUID) TO authenticated;
