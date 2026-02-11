-- Bale Backend - Product Activity Function
-- Track complete activity history for a product within a warehouse

-- =====================================================
-- PRODUCT ACTIVITY FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_product_activity(
    p_product_id   UUID,
    p_warehouse_id UUID,
    p_type_filter  TEXT    DEFAULT 'all',  -- 'all'|'inward'|'outward'|'transfer_out'|'transfer_in'|'convert_in'|'convert_out'
    p_limit        INTEGER DEFAULT 20,
    p_offset       INTEGER DEFAULT 0
)
RETURNS TABLE (
    event_id          UUID,
    event_type        TEXT,
    event_date        DATE,
    reference_number  TEXT,
    reference_id      UUID,
    counterparty_name TEXT,
    quantity          NUMERIC,
    status            TEXT,
    total_count       BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH all_events AS (

        -- 1. INWARD: Product came in from a partner/vendor via goods inward
        SELECT
            gi.id                                                               AS event_id,
            'inward'::TEXT                                                      AS event_type,
            gi.inward_date                                                      AS event_date,
            'GI-' || gi.sequence_number::TEXT                                  AS reference_number,
            gi.id                                                               AS reference_id,
            p.display_name                                                      AS counterparty_name,
            SUM(su.initial_quantity)                                            AS quantity,
            'completed'::TEXT                                                   AS status
        FROM goods_inwards gi
        JOIN stock_units su ON su.origin_inward_id = gi.id
        LEFT JOIN partners p ON gi.partner_id = p.id
        WHERE su.product_id          = p_product_id
          AND gi.warehouse_id        = p_warehouse_id
          AND su.deleted_at          IS NULL
        GROUP BY gi.id, gi.sequence_number, gi.inward_date, p.display_name

        UNION ALL

        -- 2. OUTWARD: Product dispatched to customer/partner via goods outward
        SELECT
            go.id                                                               AS event_id,
            'outward'::TEXT                                                     AS event_type,
            go.outward_date                                                     AS event_date,
            'GO-' || go.sequence_number::TEXT                                  AS reference_number,
            go.id                                                               AS reference_id,
            p.display_name                                                      AS counterparty_name,
            SUM(goi.quantity_dispatched)                                        AS quantity,
            CASE WHEN go.is_cancelled THEN 'cancelled' ELSE 'completed' END    AS status
        FROM goods_outwards go
        JOIN goods_outward_items goi ON goi.outward_id    = go.id
        JOIN stock_units su          ON goi.stock_unit_id = su.id
        LEFT JOIN partners p         ON go.partner_id     = p.id
        WHERE su.product_id          = p_product_id
          AND go.warehouse_id        = p_warehouse_id
          AND goi.is_cancelled       = FALSE
        GROUP BY go.id, go.sequence_number, go.outward_date, go.is_cancelled, p.display_name

        UNION ALL

        -- 3. TRANSFER OUT: Product sent FROM this warehouse to another
        SELECT
            gt.id                                                               AS event_id,
            'transfer_out'::TEXT                                                AS event_type,
            gt.transfer_date                                                    AS event_date,
            'GT-' || gt.sequence_number::TEXT                                  AS reference_number,
            gt.id                                                               AS reference_id,
            w_to.name::TEXT                                                     AS counterparty_name,
            SUM(gti.quantity_transferred)                                       AS quantity,
            gt.status::TEXT                                                     AS status
        FROM goods_transfers gt
        JOIN goods_transfer_items gti ON gti.transfer_id   = gt.id
        JOIN stock_units su           ON gti.stock_unit_id = su.id
        JOIN warehouses w_to          ON gt.to_warehouse_id = w_to.id
        WHERE su.product_id           = p_product_id
          AND gt.from_warehouse_id    = p_warehouse_id
        GROUP BY gt.id, gt.sequence_number, gt.transfer_date, gt.status, w_to.name

        UNION ALL

        -- 4. TRANSFER IN: Product received INTO this warehouse from another
        SELECT
            gt.id                                                               AS event_id,
            'transfer_in'::TEXT                                                 AS event_type,
            gt.transfer_date                                                    AS event_date,
            'GT-' || gt.sequence_number::TEXT                                  AS reference_number,
            gt.id                                                               AS reference_id,
            w_from.name::TEXT                                                   AS counterparty_name,
            SUM(gti.quantity_transferred)                                       AS quantity,
            gt.status::TEXT                                                     AS status
        FROM goods_transfers gt
        JOIN goods_transfer_items gti ON gti.transfer_id     = gt.id
        JOIN stock_units su           ON gti.stock_unit_id   = su.id
        JOIN warehouses w_from        ON gt.from_warehouse_id = w_from.id
        WHERE su.product_id           = p_product_id
          AND gt.to_warehouse_id      = p_warehouse_id
        GROUP BY gt.id, gt.sequence_number, gt.transfer_date, gt.status, w_from.name

        UNION ALL

        -- 5. CONVERT IN: Product was produced as OUTPUT of a goods convert
        SELECT
            gc.id                                                               AS event_id,
            'convert_in'::TEXT                                                  AS event_type,
            COALESCE(gc.completion_date, gc.start_date)                        AS event_date,
            'GC-' || gc.sequence_number::TEXT                                  AS reference_number,
            gc.id                                                               AS reference_id,
            v.display_name                                                      AS counterparty_name,
            SUM(su.initial_quantity)                                            AS quantity,
            gc.status::TEXT                                                     AS status
        FROM goods_converts gc
        JOIN stock_units su  ON su.origin_convert_id = gc.id
        LEFT JOIN partners v ON gc.vendor_id         = v.id
        WHERE su.product_id  = p_product_id
          AND gc.warehouse_id = p_warehouse_id
          AND su.deleted_at   IS NULL
        GROUP BY gc.id, gc.sequence_number, gc.completion_date, gc.start_date,
                 gc.status, v.display_name

        UNION ALL

        -- 6. CONVERT OUT: Product was used as INPUT into a goods convert
        SELECT
            gc.id                                                               AS event_id,
            'convert_out'::TEXT                                                 AS event_type,
            gc.start_date                                                       AS event_date,
            'GC-' || gc.sequence_number::TEXT                                  AS reference_number,
            gc.id                                                               AS reference_id,
            v.display_name                                                      AS counterparty_name,
            SUM(gci.quantity_consumed)                                          AS quantity,
            gc.status::TEXT                                                     AS status
        FROM goods_converts gc
        JOIN goods_convert_input_items gci ON gci.convert_id   = gc.id
        JOIN stock_units su                ON gci.stock_unit_id = su.id
        LEFT JOIN partners v               ON gc.vendor_id      = v.id
        WHERE su.product_id                = p_product_id
          AND gc.warehouse_id              = p_warehouse_id
        GROUP BY gc.id, gc.sequence_number, gc.start_date, gc.status, v.display_name

    ),
    filtered_events AS (
        SELECT *
        FROM all_events ae
        WHERE p_type_filter = 'all' OR ae.event_type = p_type_filter
    )
    SELECT
        fe.event_id,
        fe.event_type,
        fe.event_date,
        fe.reference_number,
        fe.reference_id,
        fe.counterparty_name,
        fe.quantity,
        fe.status,
        COUNT(*) OVER()::BIGINT AS total_count
    FROM filtered_events fe
    ORDER BY fe.event_date DESC, fe.reference_number DESC
    LIMIT  p_limit
    OFFSET p_offset;
END;
$$;

-- =====================================================
-- GRANT EXECUTE PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_product_activity(UUID, UUID, TEXT, INTEGER, INTEGER) TO authenticated;
