import { createClient } from '@/lib/supabase/client';
import { ProductStockStatus } from '@/types/database/enums';
import type { Tables } from '@/types/database/supabase';

type Company = Tables<'companies'>;
type Product = Tables<'products'>;
type CatalogConfiguration = Tables<'catalog_configurations'>;
type ProductMaterial = Tables<'product_materials'>;
type ProductColor = Tables<'product_colors'>;
type ProductTag = Tables<'product_tags'>;

export interface PublicProduct extends Product {
	in_stock_quantity: number;
	stock_status: ProductStockStatus;
	materials: ProductMaterial[];
	colors: ProductColor[];
	tags: ProductTag[];
}

/**
 * Get company by slug (public access)
 */
export async function getCompanyBySlug(slug: string): Promise<Company | null> {
	const supabase = createClient();

	console.log('Fetching company with slug:', slug);

	const { data, error } = await supabase
		.from('companies')
		.select('*')
		.eq('slug', slug)
		.is('deleted_at', null)
		.single();

	console.log('Query result:', { data, error });

	if (error) {
		console.error('Error fetching company:', error);
		return null;
	}

	return data as Company;
}

/**
 * Get catalog configuration for a company
 */
export async function getCatalogConfiguration(
	companyId: string
): Promise<CatalogConfiguration | null> {
	const supabase = createClient();

	const { data, error } = await supabase
		.from('catalog_configurations')
		.select('*')
		.eq('company_id', companyId)
		.single();

	if (error) {
		console.error('Error fetching catalog configuration:', error);
		return null;
	}

	return data as CatalogConfiguration;
}

/**
 * Get public catalog products with stock status
 * This uses anonymous access via RLS policies
 */
export async function getPublicProducts(
	companyId: string,
	warehouseId?: string
): Promise<PublicProduct[]> {
	const supabase = createClient();

	console.log('Fetching products for company:', companyId);

	// Fetch products that are visible on catalog with materials, colors, and tags
	const { data: products, error: productsError } = await supabase
		.from('products')
		.select(
			`
			*,
			inventory_agg:product_inventory_aggregates!product_id(
				in_stock_quantity,
				warehouse_id
			),
			product_material_assignments(
				material:product_materials(*)
			),
			product_color_assignments(
				color:product_colors(*)
			),
			product_tag_assignments(
				tag:product_tags(*)
			)
		`
		)
		.eq('company_id', companyId)
		.eq('show_on_catalog', true)
		.is('deleted_at', null)
		.order('name', { ascending: true });

	console.log('Products query result:', { products, productsError });

	if (productsError) {
		console.error('Error fetching public products:', productsError);
		return [];
	}

	// Transform products with stock status and flatten attributes
	const publicProducts: PublicProduct[] = (products || []).map((product: any) => {
		// Find inventory for the specified warehouse, or sum across all warehouses
		let totalStock = 0;
		if (product.inventory_agg && Array.isArray(product.inventory_agg)) {
			if (warehouseId) {
				const warehouseInventory = product.inventory_agg.find(
					(inv: any) => inv.warehouse_id === warehouseId
				);
				totalStock = Number(warehouseInventory?.in_stock_quantity || 0);
			} else {
				// Sum across all warehouses
				totalStock = product.inventory_agg.reduce(
					(sum: number, inv: any) => sum + Number(inv.in_stock_quantity || 0),
					0
				);
			}
		}

		// Determine stock status based on min_stock_threshold
		let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
		if (totalStock === 0) {
			stockStatus = 'out_of_stock';
		} else if (
			product.min_stock_threshold &&
			totalStock <= product.min_stock_threshold
		) {
			stockStatus = 'low_stock';
		} else {
			stockStatus = 'in_stock';
		}

		// Extract materials, colors, and tags from nested structure
		const materials = (product.product_material_assignments || [])
			.map((a: any) => a.material)
			.filter(Boolean);
		const colors = (product.product_color_assignments || [])
			.map((a: any) => a.color)
			.filter(Boolean);
		const tags = (product.product_tag_assignments || [])
			.map((a: any) => a.tag)
			.filter(Boolean);

		// Remove the nested assignment fields from the product
		const {
			product_material_assignments,
			product_color_assignments,
			product_tag_assignments,
			inventory_agg,
			...rest
		} = product;

		return {
			...rest,
			in_stock_quantity: totalStock,
			stock_status: stockStatus,
			materials,
			colors,
			tags,
		};
	});

	return publicProducts;
}
