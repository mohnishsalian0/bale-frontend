import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database/supabase';
import {
	type ProductWithAttributes,
	PRODUCT_WITH_ATTRIBUTES_SELECT,
	transformProductWithAttributes
} from './products';

type SalesOrder = Tables<'sales_orders'>;
type Partner = Tables<'partners'>;
type StockUnit = Tables<'stock_units'>;
type Product = Tables<'products'>;
type SalesOrderItem = Tables<'sales_order_items'>;
type Warehouse = Tables<'warehouses'>;

export interface StockUnitWithProduct extends StockUnit {
	product: ProductWithAttributes | null;
};

export interface DashboardSalesOrderProduct extends ProductWithAttributes { }

export interface DashboardSalesOrder extends SalesOrder {
	customer: Partner | null;
	agent: Partner | null;
	warehouse: Warehouse | null;
	sales_order_items: Array<
		SalesOrderItem & {
			product: DashboardSalesOrderProduct[] | null;
		}
	>;
}

export interface LowStockProduct extends ProductWithAttributes {
	current_stock: number;
}

export interface PendingQRProduct extends ProductWithAttributes {
	pending_qr_count: number;
}

export interface RecentPartner extends Partner {
	last_interaction: string | null;
}

/**
 * Fetch sales orders for dashboard (approval_pending, in_progress, and overdue)
 * Limited to 5 most recent orders
 */
export async function getDashboardSalesOrders(
	warehouseId: string
): Promise<DashboardSalesOrder[]> {
	const supabase = createClient();

	const { data, error } = await supabase
		.from('sales_orders')
		.select(
			`
			*,
			customer:partners!sales_orders_customer_id_fkey(
				id, first_name, last_name, company_name
			),
			agent:partners!sales_orders_agent_id_fkey(
				id, first_name, last_name, company_name
			),
			warehouse:warehouses(id, name),
			sales_order_items(
				id, product_id, required_quantity, dispatched_quantity,
				pending_quantity, unit_rate, line_total,
				product:products(
					id, name, measuring_unit, product_images, sequence_number,
					product_material_assignments(
						material:product_materials(*)
					),
					product_color_assignments(
						color:product_colors(*)
					),
					product_tag_assignments(
						tag:product_tags(*)
					)
				)
			)
		`
		)
		.eq('warehouse_id', warehouseId)
		.in('status', ['approval_pending', 'in_progress'])
		.is('deleted_at', null)
		.order('order_date', { ascending: false })
		.limit(5);

	if (error) {
		console.error('Error fetching dashboard sales orders:', error);
		throw error;
	}

	return (data || []) as DashboardSalesOrder[];
}

/**
 * Fetch products with low stock (below minimum threshold)
 * Limited to 5 products
 * Uses RPC function with aggregates for efficient single-query lookup
 */
export async function getLowStockProducts(
	warehouseId: string
): Promise<LowStockProduct[]> {
	const supabase = createClient();

	// Use RPC function to get low stock product IDs efficiently
	const { data: lowStockData, error: rpcError } = await supabase
		.rpc('get_low_stock_products', {
			p_warehouse_id: warehouseId,
			p_limit: 5
		});

	if (rpcError) {
		console.error('Error fetching low stock products:', rpcError);
		throw rpcError;
	}

	if (!lowStockData || lowStockData.length === 0) {
		return [];
	}

	// Fetch full product details for the low stock products
	const productIds = lowStockData.map((item: any) => item.product_id);

	const { data: products, error: productsError } = await supabase
		.from('products')
		.select(PRODUCT_WITH_ATTRIBUTES_SELECT)
		.in('id', productIds);

	if (productsError) {
		console.error('Error fetching product details:', productsError);
		throw productsError;
	}

	if (!products) {
		return [];
	}

	// Map products with their current stock from RPC result
	const lowStockProducts: LowStockProduct[] = products.map((product: any) => {
		const stockData = lowStockData.find((item: any) => item.product_id === product.id);
		const transformedProduct = transformProductWithAttributes(product);

		return {
			...transformedProduct,
			current_stock: Number(stockData?.in_stock_quantity || 0),
		};
	});

	return lowStockProducts;
}

/**
 * Fetch products with pending QR code generation
 * Limited to 5 products
 */
export async function getPendingQRProducts(
	warehouseId: string
): Promise<PendingQRProduct[]> {
	const supabase = createClient();

	// Get stock units without QR code generated
	// Using !inner tells Supabase this is a many-to-one relationship (returns single object, not array)
	const { data: stockUnits, error: stockError } = await supabase
		.from('stock_units')
		.select(`
				*,
				product:products(
					id, name, measuring_unit, product_images, sequence_number,
					product_material_assignments(
						material:product_materials(*)
					),
					product_color_assignments(
						color:product_colors(*)
					),
					product_tag_assignments(
						tag:product_tags(*)
					)
				)
		`)
		.eq('warehouse_id', warehouseId)
		.eq('status', 'in_stock')
		.is('qr_generated_at', null)
		.is('deleted_at', null);

	if (stockError) {
		console.error('Error fetching pending QR products:', stockError);
		throw stockError;
	}

	if (!stockUnits || stockUnits.length === 0) {
		return [];
	}

	// Group by product and count pending QR codes
	const productMap = new Map<string, { product: ProductWithAttributes; count: number }>();

	for (const unit of stockUnits as any[]) {
		if (!unit.product) continue;

		const existing = productMap.get(unit.product_id);
		if (existing) {
			existing.count += 1;
		} else {
			productMap.set(unit.product_id, {
				product: transformProductWithAttributes(unit.product),
				count: 1,
			});
		}
	}

	// Convert to array and limit to 5
	const pendingQRProducts: PendingQRProduct[] = Array.from(productMap.values())
		.map(({ product, count }) => ({
			...product,
			pending_qr_count: count,
		}))
		.slice(0, 5);

	return pendingQRProducts;
}

/**
 * Fetch recent partners based on last interaction (sales orders, goods inward/outward)
 * Returns customers and suppliers separately, up to 7 each, ordered by most recent interaction
 */
export async function getRecentPartners(): Promise<{
	customers: RecentPartner[];
	suppliers: RecentPartner[];
	totalCustomers: number;
	totalSuppliers: number;
}> {
	const supabase = createClient();

	// Get all partners with their last interaction dates
	const { data: partners, error: partnersError } = await supabase
		.from('partners')
		.select('*')
		.is('deleted_at', null)
		.order('updated_at', { ascending: false });

	if (partnersError) {
		console.error('Error fetching partners:', partnersError);
		throw partnersError;
	}

	if (!partners || partners.length === 0) {
		return { customers: [], suppliers: [], totalCustomers: 0, totalSuppliers: 0 };
	}

	// For each partner, find their most recent interaction
	const partnersWithInteraction: RecentPartner[] = [];

	for (const partner of partners) {
		// Check sales orders (as customer)
		const { data: salesOrders } = await supabase
			.from('sales_orders')
			.select('created_at')
			.eq('customer_id', partner.id)
			.is('deleted_at', null)
			.order('created_at', { ascending: false })
			.limit(1);

		// Check goods inwards (as supplier/vendor)
		const { data: goodsInwards } = await supabase
			.from('goods_inwards')
			.select('created_at')
			.eq('partner_id', partner.id)
			.is('deleted_at', null)
			.order('created_at', { ascending: false })
			.limit(1);

		// Check goods outwards
		const { data: goodsOutwards } = await supabase
			.from('goods_outwards')
			.select('created_at')
			.eq('partner_id', partner.id)
			.is('deleted_at', null)
			.order('created_at', { ascending: false })
			.limit(1);

		// Find the most recent interaction
		const dates = [
			salesOrders?.[0]?.created_at,
			goodsInwards?.[0]?.created_at,
			goodsOutwards?.[0]?.created_at,
		].filter(Boolean) as string[];

		const lastInteraction = dates.length > 0
			? dates.reduce((latest, date) => date > latest ? date : latest)
			: partner.updated_at;

		partnersWithInteraction.push({
			...partner,
			last_interaction: lastInteraction,
		});
	}

	// Separate customers and suppliers
	const allCustomers = partnersWithInteraction.filter(p => p.partner_type === 'customer');
	const allSuppliers = partnersWithInteraction.filter(p =>
		p.partner_type === 'supplier' || p.partner_type === 'vendor'
	);

	// Sort by last interaction
	const sortByInteraction = (a: RecentPartner, b: RecentPartner) => {
		const dateA = a.last_interaction || '';
		const dateB = b.last_interaction || '';
		return dateB.localeCompare(dateA);
	};

	const customers = allCustomers.sort(sortByInteraction).slice(0, 7);
	const suppliers = allSuppliers.sort(sortByInteraction).slice(0, 7);

	return {
		customers,
		suppliers,
		totalCustomers: allCustomers.length,
		totalSuppliers: allSuppliers.length,
	};
}
