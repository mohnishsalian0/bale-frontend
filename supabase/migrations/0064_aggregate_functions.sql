-- Aggregate Functions for Dashboard Statistics
-- Server-side aggregation for invoice, order, and inventory metrics

-- =====================================================
-- INVOICE AGGREGATES
-- =====================================================

CREATE OR REPLACE FUNCTION get_invoice_aggregates(
    p_warehouse_id UUID,
    p_invoice_type TEXT
)
RETURNS TABLE (
    invoice_count BIGINT,
    total_outstanding NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::BIGINT,
        COALESCE(SUM(outstanding_amount), 0)::NUMERIC
    FROM invoices
    WHERE warehouse_id = p_warehouse_id
        AND invoice_type = p_invoice_type::invoice_type_enum
        AND status IN ('open', 'partially_paid')
        AND status != 'cancelled'
        AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SALES ORDER AGGREGATES
-- =====================================================

CREATE OR REPLACE FUNCTION get_sales_order_aggregates(
    p_warehouse_id UUID
)
RETURNS TABLE (
    order_count BIGINT,
    pending_quantities JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        -- Count of pending orders
        (SELECT COUNT(*)::BIGINT
         FROM sales_orders
         WHERE warehouse_id = p_warehouse_id
           AND status IN ('approval_pending', 'in_progress')
           AND deleted_at IS NULL
        ) AS order_count,

        -- Aggregate pending quantities by measuring unit
        -- Returns JSONB array: [{"unit": "metre", "quantity": 100}, {"unit": "piece", "quantity": 50}]
        COALESCE(
            (SELECT jsonb_agg(unit_totals)
             FROM (
                 SELECT jsonb_build_object(
                     'unit', p.measuring_unit,
                     'quantity', SUM(soi.pending_quantity)
                 ) AS unit_totals
                 FROM sales_orders so
                 INNER JOIN sales_order_items soi ON so.id = soi.sales_order_id
                 INNER JOIN products p ON soi.product_id = p.id
                 WHERE so.warehouse_id = p_warehouse_id
                   AND so.status IN ('approval_pending', 'in_progress')
                   AND so.deleted_at IS NULL
                 GROUP BY p.measuring_unit
                 HAVING SUM(soi.pending_quantity) > 0
             ) AS subquery
            ),
            '[]'::jsonb
        ) AS pending_quantities;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PURCHASE ORDER AGGREGATES
-- =====================================================

CREATE OR REPLACE FUNCTION get_purchase_order_aggregates(
    p_warehouse_id UUID
)
RETURNS TABLE (
    order_count BIGINT,
    pending_quantities JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        -- Count of pending orders
        (SELECT COUNT(*)::BIGINT
         FROM purchase_orders
         WHERE warehouse_id = p_warehouse_id
           AND status IN ('approval_pending', 'in_progress')
           AND deleted_at IS NULL
        ) AS order_count,

        -- Aggregate pending quantities by measuring unit
        -- Returns JSONB array: [{"unit": "metre", "quantity": 100}, {"unit": "piece", "quantity": 50}]
        COALESCE(
            (SELECT jsonb_agg(unit_totals)
             FROM (
                 SELECT jsonb_build_object(
                     'unit', p.measuring_unit,
                     'quantity', SUM(poi.pending_quantity)
                 ) AS unit_totals
                 FROM purchase_orders po
                 INNER JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
                 INNER JOIN products p ON poi.product_id = p.id
                 WHERE po.warehouse_id = p_warehouse_id
                   AND po.status IN ('approval_pending', 'in_progress')
                   AND po.deleted_at IS NULL
                 GROUP BY p.measuring_unit
                 HAVING SUM(poi.pending_quantity) > 0
             ) AS subquery
            ),
            '[]'::jsonb
        ) AS pending_quantities;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INVENTORY AGGREGATES
-- =====================================================

CREATE OR REPLACE FUNCTION get_inventory_aggregates(
    p_warehouse_id UUID
)
RETURNS TABLE (
    product_count BIGINT,
    total_quantities JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        -- Count products with stock > 0
        (SELECT COUNT(*)::BIGINT
         FROM product_inventory_aggregates
         WHERE warehouse_id = p_warehouse_id
           AND in_stock_quantity > 0
        ) AS product_count,

        -- Aggregate in_stock_quantity by measuring unit
        -- Returns JSONB array: [{"unit": "metre", "quantity": 100}, {"unit": "piece", "quantity": 50}]
        COALESCE(
            (SELECT jsonb_agg(unit_totals)
             FROM (
                 SELECT jsonb_build_object(
                     'unit', p.measuring_unit,
                     'quantity', SUM(pia.in_stock_quantity)
                 ) AS unit_totals
                 FROM product_inventory_aggregates pia
                 INNER JOIN products p ON pia.product_id = p.id
                 WHERE pia.warehouse_id = p_warehouse_id
                   AND pia.in_stock_quantity > 0
                 GROUP BY p.measuring_unit
                 HAVING SUM(pia.in_stock_quantity) > 0
             ) AS subquery
            ),
            '[]'::jsonb
        ) AS total_quantities;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PRODUCT AGGREGATES
-- =====================================================

CREATE OR REPLACE FUNCTION get_product_aggregates()
RETURNS TABLE (
    total_products BIGINT,
    active_products BIGINT,
    live_products BIGINT,
    stock_type_breakdown JSONB
) AS $$
DECLARE
    v_company_id UUID;
BEGIN
    -- Get company_id from JWT token
    v_company_id := get_jwt_company_id();

    RETURN QUERY
    SELECT
        -- Total products count
        (SELECT COUNT(*)::BIGINT
         FROM products
         WHERE company_id = v_company_id
           AND deleted_at IS NULL
        ) AS total_products,

        -- Active products count
        (SELECT COUNT(*)::BIGINT
         FROM products
         WHERE company_id = v_company_id
           AND is_active = true
           AND deleted_at IS NULL
        ) AS active_products,

        -- Live products count (shown on catalog)
        (SELECT COUNT(*)::BIGINT
         FROM products
         WHERE company_id = v_company_id
           AND show_on_catalog = true
           AND deleted_at IS NULL
        ) AS live_products,

        -- Stock type breakdown
        -- Returns JSONB array: [{"type": "roll", "count": 15}, {"type": "batch", "count": 8}]
        COALESCE(
            (SELECT jsonb_agg(type_counts)
             FROM (
                 SELECT jsonb_build_object(
                     'type', stock_type,
                     'count', COUNT(*)
                 ) AS type_counts
                 FROM products
                 WHERE company_id = v_company_id
                   AND is_active = true
                   AND deleted_at IS NULL
                 GROUP BY stock_type
                 ORDER BY stock_type
             ) AS subquery
            ),
            '[]'::jsonb
        ) AS stock_type_breakdown;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_invoice_aggregates(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sales_order_aggregates(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_purchase_order_aggregates(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_inventory_aggregates(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_product_aggregates() TO authenticated;
