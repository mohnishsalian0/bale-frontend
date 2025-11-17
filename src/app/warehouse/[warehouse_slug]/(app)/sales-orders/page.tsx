'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { IconSearch } from '@tabler/icons-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Fab } from '@/components/ui/fab';
import { StatusBadge } from '@/components/ui/status-badge';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/database/supabase';
import { LoadingState } from '@/components/layouts/loading-state';
import { useSession } from '@/contexts/session-context';

type SalesOrderRow = Tables<'sales_orders'>;

interface SalesOrderWithDetails extends SalesOrderRow {
	customer: {
		first_name: string;
		last_name: string;
		company_name: string | null;
	} | null;
	sales_order_items: Array<{
		product: {
			name: string;
		} | null;
		required_quantity: number;
		dispatched_quantity: number;
	}>;
}

interface OrderListItem {
	id: string;
	orderNumber: number;
	customerName: string;
	products: Array<{ name: string; quantity: number }>;
	dueDate: string | null;
	orderDate: string;
	status: 'approval_pending' | 'in_progress' | 'overdue' | 'completed' | 'cancelled';
	completionPercentage: number;
	totalAmount: number;
}

interface MonthGroup {
	month: string;
	monthYear: string;
	orders: OrderListItem[];
}

export default function OrdersPage() {
	const router = useRouter();
	const { warehouse } = useSession();
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedStatus, setSelectedStatus] = useState('all');
	const [selectedProduct, setSelectedProduct] = useState('all');
	const [selectedCustomer, setSelectedCustomer] = useState('all');
	const [monthGroups, setMonthGroups] = useState<MonthGroup[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [totalOrdered, setTotalOrdered] = useState(0);
	const [totalSales, setTotalSales] = useState(0);
	const [availableProducts, setAvailableProducts] = useState<string[]>([]);
	const [availableCustomers, setAvailableCustomers] = useState<Array<{ id: string; name: string }>>([]);

	const fetchSalesOrders = async () => {
		try {
			setLoading(true);
			setError(null);

			const supabase = createClient();

			console.log('Fetching sales orders for warehouse:', warehouse.id);

			// Fetch sales orders with customer and items
			const { data: orders, error: ordersError } = await supabase
				.from('sales_orders')
				.select(`
					*,
					customer:partners!sales_orders_customer_id_fkey(first_name, last_name, company_name),
					sales_order_items(
						product:products(name),
						required_quantity,
						dispatched_quantity
					)
				`)
				.eq('warehouse_id', warehouse.id)
				.is('deleted_at', null)
				.order('order_date', { ascending: false });

			console.log('Orders response:', { orders, ordersError });

			if (ordersError) throw ordersError;

			// Transform orders
			const orderItems: OrderListItem[] = (orders as SalesOrderWithDetails[] || []).map((order) => {
				const customerName = order.customer
					? order.customer.company_name || `${order.customer.first_name} ${order.customer.last_name}`
					: 'Unknown Customer';

				// Calculate products with quantities
				const products = (order.sales_order_items || []).map((item) => ({
					name: item.product?.name || 'Unknown Product',
					quantity: item.required_quantity,
				}));

				// Calculate completion percentage
				const totalRequired = (order.sales_order_items || []).reduce((sum, item) => sum + item.required_quantity, 0);
				const totalDispatched = (order.sales_order_items || []).reduce((sum, item) => sum + item.dispatched_quantity, 0);
				const completionPercentage = totalRequired > 0 ? Math.round((totalDispatched / totalRequired) * 100) : 0;

				// Determine status (including overdue)
				let status: 'approval_pending' | 'in_progress' | 'overdue' | 'completed' | 'cancelled' = 'in_progress';

				if (order.status === 'completed') {
					status = 'completed';
				} else if (order.status === 'cancelled') {
					status = 'cancelled';
				} else if (order.status === 'approval_pending') {
					status = 'approval_pending';
				} else if (order.status === 'in_progress') {
					if (order.expected_delivery_date) {
						const today = new Date();
						today.setHours(0, 0, 0, 0);
						const dueDate = new Date(order.expected_delivery_date);
						dueDate.setHours(0, 0, 0, 0);

						status = dueDate < today ? 'overdue' : 'in_progress';
					} else {
						status = 'in_progress';
					}
				}

				return {
					id: order.id,
					orderNumber: order.sequence_number,
					customerName,
					products,
					dueDate: order.expected_delivery_date,
					orderDate: order.order_date,
					status,
					completionPercentage,
					totalAmount: order.total_amount || 0,
				};
			});

			// Extract unique products and customers for filters
			const productSet = new Set<string>();
			const customerMap = new Map<string, string>();

			(orders as SalesOrderWithDetails[] || []).forEach((order) => {
				order.sales_order_items.forEach((item) => {
					if (item.product?.name) productSet.add(item.product.name);
				});
				if (order.customer) {
					const name = order.customer.company_name || `${order.customer.first_name} ${order.customer.last_name}`;
					customerMap.set(order.customer_id, name);
				}
			});

			setAvailableProducts(Array.from(productSet).sort());
			setAvailableCustomers(
				Array.from(customerMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
			);

			// Group by month (based on order creation date)
			const groups: { [key: string]: MonthGroup } = {};

			orderItems.forEach((order) => {
				const date = new Date(order.orderDate);
				const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
				const monthName = date.toLocaleString('en-US', { month: 'long' });
				const year = date.getFullYear();

				if (!groups[monthKey]) {
					groups[monthKey] = {
						month: monthName,
						monthYear: `${monthName} ${year}`,
						orders: [],
					};
				}

				groups[monthKey].orders.push(order);
			});

			const sortedGroups = Object.values(groups).sort((a, b) => {
				const [monthA, yearA] = a.monthYear.split(' ');
				const [monthB, yearB] = b.monthYear.split(' ');
				const dateA = new Date(`${monthA} 1, ${yearA}`);
				const dateB = new Date(`${monthB} 1, ${yearB}`);
				return dateB.getTime() - dateA.getTime();
			});

			setMonthGroups(sortedGroups);

			// Calculate totals for past month (based on order date)
			const oneMonthAgo = new Date();
			oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

			const recentOrders = orderItems.filter((order) => new Date(order.orderDate) >= oneMonthAgo);
			const totalQty = recentOrders.reduce((sum, order) => {
				return sum + order.products.reduce((pSum, p) => pSum + p.quantity, 0);
			}, 0);
			const totalValue = Math.round(recentOrders.reduce((sum, order) => sum + order.totalAmount, 0));

			setTotalOrdered(totalQty);
			setTotalSales(totalValue);
		} catch (err) {
			console.error('Error fetching sales orders:', err);
			setError(err instanceof Error ? err.message : 'Failed to load sales orders');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchSalesOrders();
	}, []);

	// Filter groups using useMemo
	const filteredGroups = useMemo(() => {
		return monthGroups
			.map((group) => ({
				...group,
				orders: group.orders.filter((order) => {
					const matchesSearch =
						order.orderNumber.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
						order.customerName.toLowerCase().includes(searchQuery.toLowerCase());

					const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;

					const matchesProduct =
						selectedProduct === 'all' || order.products.some((p) => p.name === selectedProduct);

					const matchesCustomer = selectedCustomer === 'all' || order.customerName === selectedCustomer;

					return matchesSearch && matchesStatus && matchesProduct && matchesCustomer;
				}),
			}))
			.filter((group) => group.orders.length > 0);
	}, [monthGroups, searchQuery, selectedStatus, selectedProduct, selectedCustomer]);

	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		const day = date.getDate();
		const suffix =
			day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
		const month = date.toLocaleString('en-US', { month: 'long' });
		return `${day}${suffix} ${month}`;
	};

	const getProductSummary = (products: Array<{ name: string; quantity: number }>) => {
		if (products.length === 0) return 'No products';
		if (products.length === 1) return `${products[0].name} x${products[0].quantity}`;
		if (products.length === 2) {
			return `${products[0].name} x${products[0].quantity}, ${products[1].name} x${products[1].quantity}`;
		}
		const remaining = products.length - 2;
		return `${products[0].name} x${products[0].quantity}, ${products[1].name} x${products[1].quantity}, ${remaining} more`;
	};


	// Loading state
	if (loading) {
		return <LoadingState message="Loading sales orders..." />;
	}

	// Error state
	if (error) {
		return (
			<div className="relative flex flex-col min-h-dvh pb-16">
				<div className="flex items-center justify-center h-screen p-4">
					<div className="flex flex-col items-center gap-3 text-center max-w-md">
						<div className="size-12 rounded-full bg-red-100 flex items-center justify-center">
							<span className="text-2xl">⚠️</span>
						</div>
						<h2 className="text-lg font-semibold text-gray-900">Failed to load sales orders</h2>
						<p className="text-sm text-gray-600">{error}</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="relative flex flex-col min-h-dvh pb-16">
			{/* Header */}
			<div className="flex items-end justify-between gap-4 p-4">
				<div className="flex-1 flex flex-col gap-2">
					<div className="flex flex-col gap-1">
						<h1 className="text-3xl font-bold text-gray-900">Sales orders</h1>
						<p className="text-sm text-gray-500">
							<span className="text-teal-700 font-medium">{totalOrdered} mtr ordered</span>
							<span> & </span>
							<span className="text-teal-700 font-medium">₹{totalSales.toLocaleString()} in sales</span>
							<span> in past month</span>
						</p>
					</div>

					{/* Search */}
					<div className="relative max-w-md">
						<Input
							type="text"
							placeholder="Search by order number"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pr-10"
						/>
						<IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-gray-700" />
					</div>
				</div>

				{/* Mascot */}
				<div className="relative size-25 shrink-0">
					<Image
						src="/illustrations/sales-order-cart.png"
						alt="Sales orders"
						fill
						sizes="100px"
						className="object-contain" />
				</div>
			</div>

			{/* Filters */}
			<div className="flex gap-3 px-4 py-3 overflow-x-auto">
				{/* Status Filter */}
				<Select value={selectedStatus} onValueChange={setSelectedStatus}>
					<SelectTrigger className="flex-shrink-0 w-[160px]">
						<SelectValue placeholder="All status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All status</SelectItem>
						<SelectItem value="approval_pending">Approval Pending</SelectItem>
						<SelectItem value="in_progress">In Progress</SelectItem>
						<SelectItem value="overdue">Overdue</SelectItem>
						<SelectItem value="completed">Completed</SelectItem>
						<SelectItem value="cancelled">Cancelled</SelectItem>
					</SelectContent>
				</Select>

				{/* Product Filter */}
				<Select value={selectedProduct} onValueChange={setSelectedProduct}>
					<SelectTrigger className="flex-shrink-0 w-[160px]">
						<SelectValue placeholder="All products" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All products</SelectItem>
						{availableProducts.map((product) => (
							<SelectItem key={product} value={product}>
								{product}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* Customer Filter */}
				<Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
					<SelectTrigger className="flex-shrink-0 max-w-[160px]">
						<SelectValue placeholder="All customers" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All customers</SelectItem>
						{availableCustomers.map((customer) => (
							<SelectItem key={customer.id} value={customer.name}>
								{customer.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Sales Orders List */}
			<div className="flex flex-col">
				{filteredGroups.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<p className="text-gray-600 mb-2">No orders found</p>
						<p className="text-sm text-gray-500">
							{searchQuery ? 'Try adjusting your search or filters' : 'Start by adding a sales order'}
						</p>
					</div>
				) : (
					filteredGroups.map((group) => (
						<div key={group.monthYear} className="flex flex-col">
							{/* Month Header */}
							<div className="flex items-center justify-between px-4 py-2 border-t border-dashed border-gray-300 bg-gray-200">
								<p className="text-xs font-semibold text-gray-700">{group.month}</p>
							</div>

							{/* Order Items */}
							{group.orders.map((order) => {
								const showProgressBar = order.status === 'in_progress' || order.status === 'overdue';
								const progressColor = order.status === 'overdue' ? 'bg-yellow-300' : 'bg-primary-500';

								return (
									<button
										key={order.id}
										onClick={() => router.push(`/warehouse/${warehouse.slug}/sales-orders/${order.orderNumber}`)}
										className="flex flex-col gap-2 px-4 py-3 border-t border-dashed border-gray-300 hover:bg-gray-50 transition-colors"
									>
										<div className="flex items-start gap-3">
											<div className="flex-1 flex flex-col items-start">
												<p className="text-base font-medium text-gray-900">{order.customerName}</p>
												<p className="text-xs text-gray-500">{getProductSummary(order.products)}</p>
												<p className="text-xs text-gray-500">
													{order.orderNumber}
													{order.dueDate && ` • Due on ${formatDate(order.dueDate)}`}
												</p>
											</div>
											<div className="flex flex-col items-end justify-between gap-1 self-stretch">
												<StatusBadge status={order.status} />
												{order.status !== 'approval_pending' &&
													<p className="text-xs text-gray-500">{order.completionPercentage}% completed</p>}
											</div>
										</div>

										{/* Progress Bar */}
										{
											showProgressBar && (
												<div className="relative w-full h-2.5 border border-gray-500 rounded-xs">
													<div
														className={`absolute top-0 left-0 bottom-0 rounded-xs ${progressColor}`}
														style={{ width: `${order.completionPercentage}%` }}
													/>
												</div>
											)
										}
									</button>
								);
							})}
						</div>
					))
				)}
			</div>

			{/* Floating Action Button */}
			<Fab onClick={() => router.push(`/warehouse/${warehouse.slug}/sales-orders/create`)} className="fixed bottom-20 right-4" />
		</div >
	);
}
