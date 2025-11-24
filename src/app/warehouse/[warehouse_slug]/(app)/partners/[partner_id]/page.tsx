'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { IconPlus, IconShoppingCart, IconPackage, IconClockHour8, IconTrash } from '@tabler/icons-react';
import ImageWrapper from '@/components/ui/image-wrapper';
import { LoadingState } from '@/components/layouts/loading-state';
import { ErrorState } from '@/components/layouts/error-state';
import { TabUnderline } from '@/components/ui/tab-underline';
import { StatusBadge } from '@/components/ui/status-badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/contexts/session-context';
import { formatCurrency } from '@/lib/utils/financial';
import { getPartnerName } from '@/lib/utils/partner';
import { getInitials } from '@/lib/utils/initials';
import { calculateCompletionPercentage, getOrderDisplayStatus } from '@/lib/utils/sales-order';
import { SummaryTab } from './SummaryTab';
import { OrdersTab } from './OrdersTab';
import { AddPartnerSheet } from '../AddPartnerSheet';
import type { Tables } from '@/types/database/supabase';
import type { PartnerType, SalesOrderStatus } from '@/types/database/enums';

type Partner = Tables<'partners'>;
type SalesOrder = Tables<'sales_orders'>;
type SalesOrderItem = Tables<'sales_order_items'>;
type Product = Tables<'products'>;

interface OrderWithDetails extends SalesOrder {
	status: SalesOrderStatus;
	expected_delivery_date: string | null;
	sales_order_items: Array<
		SalesOrderItem & {
			product: Product | null;
		}
	>;
}

interface TopProduct {
	id: string;
	name: string;
	product_images: string[] | null;
	totalQuantity: number;
}

interface PageParams {
	params: Promise<{
		warehouse_slug: string;
		partner_id: string;
	}>;
}

function getPartnerTypeLabel(type: PartnerType): string {
	switch (type) {
		case 'customer':
			return 'Customer';
		case 'supplier':
			return 'Supplier';
		case 'vendor':
			return 'Vendor';
		case 'agent':
			return 'Agent';
		default:
			return type;
	}
}

export default function PartnerDetailPage({ params }: PageParams) {
	const router = useRouter();
	const { partner_id } = use(params);
	const { warehouse } = useSession();
	const [partner, setPartner] = useState<Partner | null>(null);
	const [orders, setOrders] = useState<OrderWithDetails[]>([]);
	const [topProduct, setTopProduct] = useState<TopProduct | null>(null);
	const [totalOrders, setTotalOrders] = useState(0);
	const [totalOrderValue, setTotalOrderValue] = useState(0);
	const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<'summary' | 'orders'>('summary');
	const [showEditPartner, setShowEditPartner] = useState(false);

	const fetchPartner = async () => {
		try {
			setLoading(true);
			setError(null);

			const supabase = createClient();

			// Fetch partner with order aggregates
			const { data: partnerData, error: partnerError } = await supabase
				.from('partners')
				.select(`
					*,
					order_agg:partner_order_aggregates!partner_id(
						approval_pending_count,
						approval_pending_value,
						in_progress_count,
						in_progress_value,
						completed_count,
						completed_value,
						total_orders,
						lifetime_order_value
					)
				`)
				.eq('id', partner_id)
				.is('deleted_at', null)
				.single();

			if (partnerError) throw partnerError;
			if (!partnerData) throw new Error('Partner not found');

			setPartner(partnerData as Partner);

			// Get aggregated values
			const orderAgg = (partnerData as any).order_agg?.[0];
			if (orderAgg) {
				setTotalOrders(orderAgg.total_orders || 0);
				setTotalOrderValue(orderAgg.lifetime_order_value || 0);
				setPendingOrdersCount(
					(orderAgg.approval_pending_count || 0) + (orderAgg.in_progress_count || 0)
				);
			}

			// Fetch orders based on partner type
			const isCustomer = partnerData.partner_type === 'customer';

			if (isCustomer) {
				// Fetch sales orders for customer
				const { data: ordersData, error: ordersError } = await supabase
					.from('sales_orders')
					.select(`
						*,
						expected_delivery_date,
						sales_order_items(
							id, product_id, required_quantity, dispatched_quantity,
							pending_quantity, unit_rate, line_total,
							product:products(
								id, name, measuring_unit,
								product_images, sequence_number
							)
						)
					`)
					.eq('customer_id', partner_id)
					.is('deleted_at', null)
					.order('order_date', { ascending: false });

				if (ordersError) throw ordersError;

				const typedOrders = ordersData as OrderWithDetails[] || [];
				setOrders(typedOrders);

				// Calculate top product
				const productQuantities = new Map<string, { product: Product; quantity: number }>();

				typedOrders.forEach(order => {
					order.sales_order_items.forEach(item => {
						if (item.product) {
							const existing = productQuantities.get(item.product.id);
							if (existing) {
								existing.quantity += item.required_quantity || 0;
							} else {
								productQuantities.set(item.product.id, {
									product: item.product,
									quantity: item.required_quantity || 0,
								});
							}
						}
					});
				});

				// Find top product
				let maxQuantity = 0;
				let topProd: TopProduct | null = null;

				productQuantities.forEach(({ product, quantity }) => {
					if (quantity > maxQuantity) {
						maxQuantity = quantity;
						topProd = {
							id: product.id,
							name: product.name,
							product_images: product.product_images,
							totalQuantity: quantity,
						};
					}
				});

				setTopProduct(topProd);
			} else {
				// For suppliers/vendors, we'd fetch purchase orders (not implemented yet)
				setOrders([]);
				setTopProduct(null);
			}
		} catch (err) {
			console.error('Error fetching partner:', err);
			setError(err instanceof Error ? err.message : 'Failed to load partner');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchPartner();
	}, [partner_id]);

	if (loading) {
		return <LoadingState message="Loading partner details..." />;
	}

	if (error || !partner) {
		return (
			<ErrorState
				title="Partner not found"
				message={error || 'This partner does not exist or has been deleted'}
				onRetry={() => router.back()}
				actionText="Go back"
			/>
		);
	}

	const partnerName = getPartnerName(partner);
	const partnerType = partner.partner_type as PartnerType;
	const isCustomer = partnerType === 'customer';
	const isSupplier = partnerType === 'supplier';

	// Get pending order for display
	const pendingOrder = orders.find(
		order => order.status === 'in_progress' || order.status === 'approval_pending'
	);

	return (
		<div className="flex flex-col flex-1 overflow-y-auto">
			<div className="relative flex flex-col flex-1">
				{/* Header */}
				<div className="p-4 pb-6">
					<div className="flex items-center gap-4">
						{/* Partner Image */}
						<ImageWrapper
							size="xl"
							shape="circle"
							imageUrl={partner.image_url || undefined}
							alt={partnerName}
							placeholderInitials={getInitials(partnerName)}
						/>

						<div className="flex-1 min-w-0">
							<h1 className="text-2xl font-bold text-gray-900" title={partnerName}>
								{partnerName}
							</h1>
							<p className="text-sm text-gray-500">
								{getPartnerTypeLabel(partnerType)}
							</p>
						</div>
					</div>
				</div>

				{/* Summary Cards */}
				<div className="grid grid-cols-2 gap-3 px-4 pb-6">
					{/* Total Orders Card */}
					<div className="col-span-2 sm:col-span-1 border border-border rounded-lg p-4">
						<div className="flex gap-2 mb-2">
							<IconShoppingCart className="size-4 text-gray-500" />
							<span className="text-xs text-gray-500">Total orders</span>
						</div>
						<p className="text-lg font-bold text-gray-700">
							{totalOrders} orders • ₹{formatCurrency(totalOrderValue)}
						</p>
					</div>

					{/* Top Product Card */}
					<div className="col-span-2 sm:col-span-1 border border-border rounded-lg p-4">
						<div className="flex gap-2 mb-2">
							<IconPackage className="size-4 text-gray-500" />
							<span className="text-xs text-gray-500">
								Top {isCustomer ? 'purchased' : 'supplied'} item
							</span>
						</div>
						{topProduct ? (
							<div className="flex gap-3">
								<ImageWrapper
									size="sm"
									shape="square"
									imageUrl={topProduct.product_images?.[0]}
									alt={topProduct.name}
									placeholderIcon={IconPackage}
								/>
								<div className="flex-1 min-w-0">
									<p className="font-medium text-gray-900 truncate">
										{topProduct.name}
									</p>
									<p className="text-xs text-gray-500 truncate">
										{topProduct.totalQuantity} units ordered
									</p>
								</div>
								<p className="font-semibold text-gray-700">
									{topProduct.totalQuantity}
								</p>
							</div>
						) : (
							<p className="text-sm text-gray-500">No orders yet</p>
						)}
					</div>

					{/* Pending Orders Section */}
					{pendingOrdersCount > 0 && pendingOrder && (() => {
						const displayStatus = getOrderDisplayStatus(
							pendingOrder.status,
							pendingOrder.expected_delivery_date
						);
						const completionPercentage = calculateCompletionPercentage(pendingOrder.sales_order_items);
						const showProgressBar = displayStatus === 'in_progress' || displayStatus === 'overdue';
						const progressColor = displayStatus === 'overdue' ? 'yellow' : 'blue';

						return (
							<button
								onClick={() => router.push(`/warehouse/${warehouse.slug}/sales-orders/${pendingOrder.sequence_number}`)}
								className="col-span-2 border border-border rounded-lg p-4 hover:bg-gray-50 hover:cursor-pointer transition-colors text-left"
							>
								<div className="flex items-center justify-between mb-2">
									<div className="flex gap-2">
										<IconClockHour8 className="size-4 text-gray-500" />
										<span className="text-xs text-gray-500">
											{pendingOrdersCount} pending {pendingOrdersCount === 1 ? 'order' : 'orders'}
										</span>
									</div>
									<StatusBadge status={displayStatus} />
								</div>
								<p className="font-medium text-gray-900">
									{pendingOrder.sales_order_items
										.map(item => item.product?.name)
										.filter(Boolean)
										.slice(0, 2)
										.join(', ')}
									{pendingOrder.sales_order_items.length > 2 &&
										` +${pendingOrder.sales_order_items.length - 2} more`}
								</p>
								<div className="flex items-center justify-between mt-1">
									<p className="text-xs text-gray-500">
										SO-{pendingOrder.sequence_number}
									</p>
									{displayStatus !== 'approval_pending' && (
										<p className="text-xs text-gray-500">{completionPercentage}% completed</p>
									)}
								</div>
								{showProgressBar && (
									<Progress color={progressColor} value={completionPercentage} className="mt-2" />
								)}
							</button>
						);
					})()}
				</div>

				{/* Tabs */}
				<TabUnderline
					activeTab={activeTab}
					onTabChange={(tab) => setActiveTab(tab as 'summary' | 'orders')}
					tabs={[
						{ value: 'summary', label: 'Summary' },
						{ value: 'orders', label: 'Orders' },
					]}
				/>

				{/* Tab Content */}
				<div className="flex-1">
					{activeTab === 'summary' && (
						<SummaryTab
							partner={partner}
							onEdit={() => setShowEditPartner(true)}
						/>
					)}
					{activeTab === 'orders' && (
						<OrdersTab
							orders={orders}
							warehouseSlug={warehouse.slug}
						/>
					)}
				</div>

				{/* Bottom Action Bar */}
				<div className="sticky bottom-0 p-4 bg-background border-t border-border flex gap-3 z-10">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" size="icon">
								•••
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" side="top" sideOffset={8}>
							<DropdownMenuItem
								variant="destructive"
								onClick={() => console.log('Delete partner')}
							>
								<IconTrash />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>

					<Button
						variant="outline"
						onClick={() => setShowEditPartner(true)}
						className="flex-1"
					>
						Edit
					</Button>

					{isCustomer && (
						<Button
							onClick={() => router.push(`/warehouse/${warehouse.slug}/sales-orders/create`)}
							className="flex-2"
						>
							<IconPlus className="size-5" />
							Sales order
						</Button>
					)}

					{isSupplier && (
						<Button
							onClick={() => router.push(`/warehouse/${warehouse.slug}/goods-inward/create`)}
							className="flex-2"
						>
							<IconPlus className="size-5" />
							Purchase order
						</Button>
					)}
				</div>

				{/* Edit Partner Sheet */}
				{showEditPartner && (
					<AddPartnerSheet
						open={showEditPartner}
						onOpenChange={setShowEditPartner}
						onPartnerAdded={fetchPartner}
					/>
				)}
			</div>
		</div>
	);
}
