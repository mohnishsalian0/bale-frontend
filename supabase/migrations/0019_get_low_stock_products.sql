-- Function to get low stock products efficiently using aggregates
-- Returns products where in_stock_quantity < min_stock_threshold
-- Returns complete product data with materials, colors, and tags as JSONB

CREATE OR REPLACE FUNCTION get_low_stock_products(
	p_warehouse_id UUID,
	p_limit INT DEFAULT 5
)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
	RETURN QUERY
	SELECT jsonb_build_object(
		'id', p.id,
		'sequence_number', p.sequence_number,
		'product_code', p.product_code,
		'name', p.name,
		'show_on_catalog', p.show_on_catalog,
		'is_active', p.is_active,
		'stock_type', p.stock_type,
		'measuring_unit', p.measuring_unit,
		'product_images', p.product_images,
		'min_stock_alert', p.min_stock_alert,
		'min_stock_threshold', p.min_stock_threshold,
		'inventory', jsonb_build_object(
			'in_stock_units', pia.in_stock_units,
			'in_stock_quantity', pia.in_stock_quantity,
			'in_stock_value', pia.in_stock_value
		),
		'attributes', COALESCE((
			SELECT jsonb_agg(jsonb_build_object(
				'id', pa.id,
				'name', pa.name,
				'group_name', pa.group_name,
				'color_hex', pa.color_hex
			))
			FROM product_attribute_assignments paa
			JOIN product_attributes pa ON pa.id = paa.attribute_id
			WHERE paa.product_id = p.id
		), '[]'::jsonb)
	)
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
