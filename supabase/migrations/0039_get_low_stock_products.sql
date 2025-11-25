-- Function to get low stock products efficiently using aggregates
-- Returns products where in_stock_quantity < min_stock_threshold

CREATE OR REPLACE FUNCTION get_low_stock_products(
	p_warehouse_id UUID,
	p_limit INT DEFAULT 5
)
RETURNS TABLE (
	product_id UUID,
	in_stock_quantity NUMERIC,
	min_stock_threshold INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
	RETURN QUERY
	SELECT
		pia.product_id,
		pia.in_stock_quantity,
		p.min_stock_threshold
	FROM product_inventory_aggregates pia
	INNER JOIN products p ON p.id = pia.product_id
	WHERE
		pia.warehouse_id = p_warehouse_id
		AND p.min_stock_alert = true
		AND p.min_stock_threshold IS NOT NULL
		AND p.deleted_at IS NULL
		AND pia.in_stock_quantity < p.min_stock_threshold
	ORDER BY (p.min_stock_threshold - pia.in_stock_quantity) DESC  -- Most urgent first
	LIMIT p_limit;
END;
$$;
