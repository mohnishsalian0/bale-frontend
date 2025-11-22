import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database/supabase';

type SalesOrder = Tables<'sales_orders'>;
type Partner = Tables<'partners'>;
type StockUnit = Tables<'stock_units'>;
type Product = Tables<'products'>;
type SalesOrderItem = Tables<'sales_order_items'>;
type Warehouse = Tables<'warehouses'>;

export interface StockUnitWithProduct extends StockUnit {
	product: Product | null;
};

export interface DashboardSalesOrder extends SalesOrder {
	customer: Partner | null;
	agent: Partner | null;
	warehouse: Warehouse | null;
	sales_order_items: Array<
		SalesOrderItem & {
			product: Product[] | null;
		}
	>;
}

export interface LowStockProduct extends Product {
	current_stock: number;
}

export interface PendingQRProduct extends Product {
	pending_qr_count: number;
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
					id, name, material, color_name, measuring_unit,
					product_images, sequence_number
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
 */
export async function getLowStockProducts(
	warehouseId: string
): Promise<LowStockProduct[]> {
	const supabase = createClient();

	// First, get products with min_stock_alert enabled
	const { data: products, error: productsError } = await supabase
		.from('products')
		.select('*')
		.eq('min_stock_alert', true)
		.is('deleted_at', null)
		.not('min_stock_threshold', 'is', null);

	if (productsError) {
		console.error('Error fetching low stock products:', productsError);
		throw productsError;
	}

	if (!products || products.length === 0) {
		return [];
	}

	// For each product, calculate current stock in the warehouse
	const lowStockProducts: LowStockProduct[] = [];

	for (const product of products) {
		const { data: stockUnits, error: stockError } = await supabase
			.from('stock_units')
			.select('remaining_quantity')
			.eq('product_id', product.id)
			.eq('warehouse_id', warehouseId)
			.eq('status', 'in_stock');

		if (stockError) {
			console.error('Error fetching stock for product:', product.id, stockError);
			continue;
		}

		const currentStock = (stockUnits || []).reduce(
			(sum, unit) => sum + (Number(unit.remaining_quantity) || 0),
			0
		);

		// Check if stock is below threshold
		if (currentStock < (product.min_stock_threshold || 0)) {
			lowStockProducts.push({
				...product,
				current_stock: Number(currentStock.toFixed(2)),
			});
		}

		// Limit to 5 products
		if (lowStockProducts.length >= 5) {
			break;
		}
	}

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
					id, name, material, color_name, measuring_unit,
					product_images, sequence_number
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
	const productMap = new Map<string, { product: Product; count: number }>();

	for (const unit of stockUnits as StockUnitWithProduct[]) {
		if (!unit.product) continue;

		const existing = productMap.get(unit.product_id);
		if (existing) {
			existing.count += 1;
		} else {
			productMap.set(unit.product_id, {
				product: unit.product,
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
