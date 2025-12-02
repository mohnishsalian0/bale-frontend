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
		'name', p.name,
		'show_on_catalog', p.show_on_catalog,
		'stock_type', p.stock_type,
		'measuring_unit', p.measuring_unit,
		'product_images', p.product_images,
		'inventory', jsonb_build_object(
			'in_stock_units', pia.in_stock_units,
			'in_stock_quantity', pia.in_stock_quantity,
			'in_stock_value', pia.in_stock_value
		),
		'materials', COALESCE((
			SELECT jsonb_agg(jsonb_build_object(
				'id', pm.id,
				'name', pm.name,
				'color_hex', pm.color_hex
			))
			FROM product_material_assignments pma
			JOIN product_materials pm ON pm.id = pma.material_id
			WHERE pma.product_id = p.id
		), '[]'::jsonb),
		'colors', COALESCE((
			SELECT jsonb_agg(jsonb_build_object(
				'id', pc.id,
				'name', pc.name,
				'color_hex', pc.color_hex
			))
			FROM product_color_assignments pca
			JOIN product_colors pc ON pc.id = pca.color_id
			WHERE pca.product_id = p.id
		), '[]'::jsonb),
		'tags', COALESCE((
			SELECT jsonb_agg(jsonb_build_object(
				'id', pt.id,
				'name', pt.name,
				'color_hex', pt.color_hex
			))
			FROM product_tag_assignments pta
			JOIN product_tags pt ON pt.id = pta.tag_id
			WHERE pta.product_id = p.id
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
