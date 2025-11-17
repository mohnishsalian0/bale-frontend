'use client';

import { use, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
	IconEdit,
	IconPackage,
	IconCash,
	IconBuildingWarehouse,
	IconNote,
	IconMapPin,
	IconCurrencyRupee,
	IconPercentage,
	IconPhoto
} from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { LoadingState } from '@/components/layouts/loading-state';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/contexts/session-context';
import { getInitials } from '@/lib/utils/initials';
import { formatCurrency, calculateOrderFinancials } from '@/lib/utils/financial';
import { getMeasuringUnitAbbreviation } from '@/lib/utils/measuring-units';
import type { Tables } from '@/types/database/supabase';
import type { DiscountType } from '@/types/database/enums';
import { NotesEditSheet } from './NotesEditSheet';
import { CustomerEditSheet } from './CustomerEditSheet';
import { AgentEditSheet } from './AgentEditSheet';
import { WarehouseEditSheet } from './WarehouseEditSheet';
import { PaymentTermsEditSheet } from './PaymentTermsEditSheet';
import { ShipmentEditSheet } from './ShipmentEditSheet';
import { LineItemsEditSheet } from './LineItemsEditSheet';

type SalesOrder = Tables<'sales_orders'>;
type Partner = Tables<'partners'>;
type Warehouse = Tables<'warehouses'>;
type Product = Tables<'products'>;
type SalesOrderItem = Tables<'sales_order_items'>;

interface OrderWithDetails extends SalesOrder {
	customer: Partner | null;
	agent: Partner | null;
	warehouse: Warehouse | null;
	sales_order_items: Array<
		SalesOrderItem & {
			product: Product | null;
		}
	>;
}

interface PageParams {
	params: Promise<{
		warehouse_slug: string;
		sequence_number: string;
	}>;
}

export default function SalesOrderDetailPage({ params }: PageParams) {
	const { sequence_number } = use(params);
	const router = useRouter();
	const { warehouse } = useSession();
	const [order, setOrder] = useState<OrderWithDetails | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<'details' | 'outwards'>('details');

	// Edit sheet states
	const [showLineItemsEdit, setShowLineItemsEdit] = useState(false);
	const [showCustomerEdit, setShowCustomerEdit] = useState(false);
	const [showAgentEdit, setShowAgentEdit] = useState(false);
	const [showPaymentTermsEdit, setShowPaymentTermsEdit] = useState(false);
	const [showWarehouseEdit, setShowWarehouseEdit] = useState(false);
	const [showShipmentEdit, setShowShipmentEdit] = useState(false);
	const [showNotesEdit, setShowNotesEdit] = useState(false);

	const fetchOrder = async () => {
		try {
			setLoading(true);
			setError(null);

			const supabase = createClient();

			const { data, error: fetchError } = await supabase
				.from('sales_orders')
				.select(`
					*,
					customer:partners!sales_orders_customer_id_fkey(
						id, first_name, last_name, company_name,
						phone_number, email, address_line1, address_line2,
						city, state, pin_code
					),
					agent:partners!sales_orders_agent_id_fkey(
						id, first_name, last_name, company_name
					),
					warehouse:warehouses(id, name, address_line1, address_line2, city, state, pin_code),
					sales_order_items(
						id, product_id, required_quantity, dispatched_quantity,
						pending_quantity, unit_rate, line_total, notes,
						product:products(
							name, material, color_name, measuring_unit,
							product_images, sequence_number
						)
					)
				`)
				.eq('sequence_number', parseInt(sequence_number))
				.is('deleted_at', null)
				.single();

			if (fetchError) throw fetchError;
			if (!data) throw new Error('Order not found');

			setOrder(data as OrderWithDetails);
		} catch (err) {
			console.error('Error fetching order:', err);
			setError(err instanceof Error ? err.message : 'Failed to load order');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchOrder();
	}, [sequence_number]);

	// Calculate financials
	const financials = useMemo(() => {
		if (!order) return null;

		const itemTotal = order.sales_order_items.reduce((sum, item) => sum + (item.line_total || 0), 0);

		return calculateOrderFinancials(
			itemTotal,
			order.discount_type as DiscountType,
			order.discount_value || 0,
			order.gst_rate || 10
		);
	}, [order]);

	// Calculate completion percentage
	const completionPercentage = useMemo(() => {
		if (!order) return 0;

		const totalRequired = order.sales_order_items.reduce((sum, item) => sum + item.required_quantity, 0);
		const totalDispatched = order.sales_order_items.reduce((sum, item) => sum + (item.dispatched_quantity || 0), 0);

		return totalRequired > 0 ? Math.round((totalDispatched / totalRequired) * 100) : 0;
	}, [order]);

	// Compute display status (includes 'overdue' logic)
	const displayStatus: 'approval_pending' | 'in_progress' | 'overdue' | 'completed' | 'cancelled' = useMemo(() => {
		if (!order) return 'in_progress';

		if (order.status === 'in_progress' && order.expected_delivery_date) {
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const dueDate = new Date(order.expected_delivery_date);
			dueDate.setHours(0, 0, 0, 0);

			if (dueDate < today) {
				return 'overdue';
			}
		}

		return order.status as 'approval_pending' | 'in_progress' | 'completed' | 'cancelled';
	}, [order]);

	// Format date helper
	const formatOrderDate = (dateStr: string) => {
		const date = new Date(dateStr);
		const day = date.getDate();
		const month = date.toLocaleString('en-US', { month: 'short' });
		const year = date.getFullYear();
		return `${day} ${month}, ${year}`;
	};

	// Get customer display name
	const getCustomerName = (customer: Partner | null) => {
		if (!customer) return 'Unknown Customer';
		return customer.company_name || `${customer.first_name} ${customer.last_name}`;
	};

	// Get customer address
	const getCustomerAddress = (customer: Partner | null) => {
		if (!customer) return '';
		const parts = [
			customer.address_line1,
			customer.city,
			customer.state,
			customer.pin_code,
		].filter(Boolean);
		return parts.join(', ');
	};

	// Primary CTA logic
	const getPrimaryCTA = () => {
		if (!order) return null;

		if (order.status === 'approval_pending') {
			return (
				<Button onClick={() => console.log('Approve')} className="flex-1">
					Approve order
				</Button>
			);
		}

		if (order.status === 'in_progress') {
			return (
				<Button
					onClick={() => router.push(`/warehouse/${warehouse.slug}/goods-outward/create?order=${order.sequence_number}`)}
					className="flex-1"
				>
					Create outward
				</Button>
			);
		}

		return null;
	};

	// Loading state
	if (loading) {
		return <LoadingState message="Loading order..." />;
	}

	// Error state
	if (error || !order) {
		return (
			<div className="relative flex flex-col min-h-dvh pb-16">
				<div className="flex items-center justify-center h-screen p-4">
					<div className="flex flex-col items-center gap-3 text-center max-w-md">
						<div className="size-12 rounded-full bg-red-100 flex items-center justify-center">
							<span className="text-2xl">⚠️</span>
						</div>
						<h2 className="text-lg font-semibold text-gray-900">Order not found</h2>
						<p className="text-sm text-gray-700">{error || 'This order does not exist or has been deleted'}</p>
						<Button onClick={() => router.back()} variant="outline" size="sm">
							Go back
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="relative flex flex-col min-h-dvh pb-20">
			{/* Header */}
			<div className="p-4">
				<div>
					<div className="flex items-center gap-2">
						<h1 className="text-2xl font-bold text-gray-900">SO-{order.sequence_number}</h1>
						<StatusBadge status={displayStatus} />
					</div>
					<p className="text-sm text-gray-500">Sales order on {formatOrderDate(order.order_date)}</p>
				</div>

				{/* Progress Bar */}
				<div className='mt-4 max-w-md'>
					<p className="text-sm text-gray-700 mb-1">{completionPercentage}% completed</p>
					<div className="w-full h-2 bg-gray-300 rounded-full">
						<div
							className="h-full bg-primary-600 rounded-full transition-all"
							style={{ width: `${completionPercentage}%` }}
						/>
					</div>
				</div>
			</div>

			{/* Tabs */}
			<div className="flex border-b border-gray-300">
				<button
					onClick={() => setActiveTab('details')}
					className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'details'
						? 'text-primary-700 border-b-2 border-primary-700'
						: 'text-gray-500 hover:text-gray-700'
						}`}
				>
					Order details
				</button>
				<button
					onClick={() => setActiveTab('outwards')}
					className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'outwards'
						? 'text-primary-700 border-b-2 border-primary-700'
						: 'text-gray-500 hover:text-gray-700'
						}`}
				>
					Outwards
				</button>
			</div>

			{/* Tab Content */}
			<div className="flex-1 overflow-y-auto">
				{activeTab === 'details' ? (
					<div className="flex flex-col">
						{/* Line Items Section */}
						<div className="border-b border-border">
							<div className="p-4 space-y-6">
								{/* Header Row */}
								<div className="flex items-start justify-between">
									<div>
										<div className="flex items-center gap-2">
											<h3 className="text-lg font-semibold text-gray-900">
												{order.sales_order_items.length} items at ₹{formatCurrency(order.total_amount || 0)}
											</h3>
											<Button variant="ghost" size="icon" onClick={() => setShowLineItemsEdit(true)}>
												<IconEdit />
											</Button>
										</div>
										<p className="text-sm text-gray-500">Line items</p>
									</div>
									<div className="size-12 rounded-xl bg-gray-200 flex items-center justify-center shrink-0">
										<IconPackage className="size-5 text-gray-700" />
									</div>
								</div>

								<div>

									<ul className="space-y-6">
										{order.sales_order_items.map((item) => (
											<li key={item.id} className="flex gap-3">
												<div className="relative size-8 rounded-lg overflow-hidden bg-gray-200 shrink-0">
													{item.product?.product_images?.[0] ? (
														<Image
															src={item.product.product_images[0]}
															alt={item.product.name}
															fill
															className="object-cover"
														/>
													) : (
														<div className="size-full flex items-center justify-center text-gray-400">
															<IconPhoto className="size-4" />
														</div>
													)}
												</div>
												<div className="flex-1 min-w-0">
													<p className="text-sm font-medium text-gray-900 truncate" title={item.product?.name}>
														{item.product?.name || 'Unknown Product'}
													</p>
													<p className="text-xs text-gray-500 mt-0.5">
														{item.required_quantity}{' '}
														{getMeasuringUnitAbbreviation(item.product?.measuring_unit as any)}
														{' '}({item.dispatched_quantity || 0}{' '}
														{getMeasuringUnitAbbreviation(item.product?.measuring_unit as any)} shipped)
													</p>
													{/* Progress bar */}
													<div className="max-w-sm mt-2 h-1.5 bg-gray-200 rounded-full">
														<div
															className="h-full bg-primary-500 rounded-full transition-all"
															style={{
																width: `${item.required_quantity > 0 ? ((item.dispatched_quantity || 0) / item.required_quantity) * 100 : 0}%`,
															}}
														/>
													</div>
												</div>
												<p className="text-sm font-semibold text-gray-900 shrink-0">₹{formatCurrency(item.line_total || 0)}</p>
											</li>
										))}
									</ul>

									{/* Financial Breakdown */}
									{financials && (
										<div className="space-y-4 pt-3 mt-6 border-t border-gray-200">
											{order.discount_type !== 'none' && (
												<div className="flex justify-between text-sm text-gray-700">
													<span>
														Discount
														{order.discount_type === 'percentage' && ` (${order.discount_value}%)`}
													</span>
													<span>-₹{formatCurrency(financials.discountAmount)}</span>
												</div>
											)}
											<div className="flex justify-between text-sm text-gray-700">
												<span>Item total</span>
												<span>₹{formatCurrency(financials.itemTotal)}</span>
											</div>
											<div className="flex justify-between text-sm text-gray-700">
												<span>GST ({order.gst_rate}%)</span>
												<span>₹{formatCurrency(financials.gstAmount)}</span>
											</div>
											<div className="flex justify-between font-semibold text-gray-900 pt-2 border-t">
												<span>Total</span>
												<span>₹{formatCurrency(financials.totalAmount)}</span>
											</div>
										</div>
									)}
								</div>
							</div>
						</div>

						{/* Customer Section */}
						<div className="border-b border-border">
							<div className="p-4 space-y-4">
								{/* Header Row */}
								<div className="flex items-start justify-between">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2">
											<h3 className="text-lg font-semibold text-gray-900 truncate" title={getCustomerName(order.customer)}>
												{getCustomerName(order.customer)}
											</h3>
											<Button variant="ghost" size="icon" onClick={() => setShowCustomerEdit(true)}>
												<IconEdit />
											</Button>
										</div>
										<p className="text-sm text-gray-500">Customer</p>
									</div>
									<div className="size-12 rounded-xl bg-gray-200 flex items-center justify-center shrink-0">
										<span className="text-lg font-semibold text-gray-700">
											{getInitials(getCustomerName(order.customer))}
										</span>
									</div>
								</div>

								{getCustomerAddress(order.customer) && (
									<div className="flex items-start gap-1.5 text-sm text-gray-700">
										<IconMapPin className="size-4 text-gray-500 mt-0.5 shrink-0" />
										<span>{getCustomerAddress(order.customer)}</span>
									</div>
								)}
							</div>
						</div>

						{/* Agent Section (Conditional) */}
						{order.agent && (
							<div className="border-b border-border">
								<div className="p-4 space-y-4">
									{/* Header Row */}
									<div className="flex items-start justify-between">
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<h3 className="text-lg font-semibold text-gray-900 truncate" title={getCustomerName(order.agent)}>
													{getCustomerName(order.agent)}
												</h3>
												<Button variant="ghost" size="icon" onClick={() => setShowAgentEdit(true)}>
													<IconEdit />
												</Button>
											</div>
											<p className="text-sm text-gray-500">Agent</p>
										</div>
										<div className="size-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
											<span className="text-lg font-semibold text-gray-700">
												{getInitials(getCustomerName(order.agent))}
											</span>
										</div>
									</div>
								</div>
							</div>
						)}

						{/* Payment Terms Section */}
						<div className="border-b border-border">
							<div className="p-4 space-y-4">
								{/* Header Row */}
								<div className="flex items-start justify-between">
									<div>
										<div className="flex items-center gap-2">
											<h3 className="text-lg font-semibold text-gray-900">{order.payment_terms || 'NET 30'}</h3>
											<Button variant="ghost" size="icon" onClick={() => setShowPaymentTermsEdit(true)}>
												<IconEdit />
											</Button>
										</div>
										<p className="text-sm text-gray-500">Payment terms</p>
									</div>
									<div className="size-12 rounded-xl bg-gray-200 flex items-center justify-center shrink-0">
										<IconCash className="size-5 text-gray-700" />
									</div>
								</div>

								<div className="space-y-3">
									<div className="flex justify-between text-sm">
										<div className="flex items-center gap-1.5 text-gray-700">
											<IconCurrencyRupee className="size-4 text-gray-500" />
											<span>Advanced amount</span>
										</div>
										<span className="font-medium text-gray-900">₹{formatCurrency(order.advance_amount || 0)}</span>
									</div>
									{order.discount_type !== 'none' && (
										<div className="flex justify-between text-sm">
											<div className="flex items-center gap-1.5 text-gray-700">
												{order.discount_type === 'percentage' ? (
													<IconPercentage className="size-4 text-gray-500" />
												) : (
													<IconCurrencyRupee className="size-4 text-gray-500" />
												)}
												<span>Discount</span>
											</div>
											<span className="font-medium text-gray-900">
												{order.discount_type === 'percentage' ? `${order.discount_value}%` : `₹${formatCurrency(order.discount_value || 0)}`}
											</span>
										</div>
									)}
								</div>
							</div>
						</div>

						{/* Warehouse Section */}
						<div className="border-b border-border">
							<div className="p-4 space-y-4">
								{/* Header Row */}
								<div className="flex items-start justify-between">
									<div>
										<div className="flex items-center gap-2">
											<h3 className="text-lg font-semibold text-gray-900">{order.warehouse?.name || 'Unknown Warehouse'}</h3>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => setShowWarehouseEdit(true)}
												disabled={order.has_outward || false}
											>
												<IconEdit />
											</Button>
										</div>
										<p className="text-sm text-gray-500">Warehouse</p>
									</div>
									<div className="size-12 rounded-xl bg-gray-200 flex items-center justify-center shrink-0">
										<IconBuildingWarehouse className="size-5 text-gray-700" />
									</div>
								</div>

								{order.warehouse && (
									<div className="flex items-start gap-1.5 text-sm text-gray-700">
										<IconMapPin className="size-4 text-gray-500 mt-0.5 shrink-0" />
										<span>
											{[
												order.warehouse.address_line1,
												order.warehouse.city,
												order.warehouse.state,
												order.warehouse.pin_code,
											]
												.filter(Boolean)
												.join(', ')}
										</span>
									</div>
								)}
							</div>
						</div>

						{/* Notes Section */}
						<div className="border-b border-border">
							<div className="p-4 space-y-6">
								{/* Header Row */}
								<div className="flex items-start justify-between">
									<div>
										<div className="flex items-center gap-2">
											<h3 className="text-lg font-semibold text-gray-900">Order notes</h3>
											<Button variant="ghost" size="icon" onClick={() => setShowNotesEdit(true)}>
												<IconEdit />
											</Button>
										</div>
										{order.notes ? (
											<p className="text-sm text-gray-700">{order.notes}</p>
										) : (
											<p className="text-sm text-gray-600 italic">No note added</p>
										)}
									</div>
									<div className="size-12 rounded-xl bg-gray-200 flex items-center justify-center shrink-0">
										<IconNote className="size-5 text-gray-700" />
									</div>
								</div>
							</div>
						</div>
					</div>
				) : (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<p className="text-gray-700">No outwards linked yet</p>
						<p className="text-sm text-gray-500">Create an outward to dispatch items from this order</p>
					</div>
				)}
			</div>

			{/* Bottom Action Bar */}
			<div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-gray-300 flex gap-3">
				<Button variant="outline" size="icon" onClick={() => console.log('More actions')}>
					•••
				</Button>
				<Button variant="outline" disabled className="flex-1">
					Make invoice
				</Button>
				{getPrimaryCTA()}
			</div>

			{/* Edit Sheets */}
			{order && (
				<>
					<LineItemsEditSheet
						open={showLineItemsEdit}
						onOpenChange={setShowLineItemsEdit}
						orderId={order.id}
						companyId={order.company_id}
						existingLineItems={order.sales_order_items.map(item => ({
							id: item.id,
							product_id: item.product_id,
							required_quantity: item.required_quantity,
						}))}
						onSuccess={fetchOrder}
					/>

					<CustomerEditSheet
						open={showCustomerEdit}
						onOpenChange={setShowCustomerEdit}
						orderId={order.id}
						currentCustomerId={order.customer_id}
						companyId={order.company_id}
						onSuccess={fetchOrder}
					/>

					<AgentEditSheet
						open={showAgentEdit}
						onOpenChange={setShowAgentEdit}
						orderId={order.id}
						currentAgentId={order.agent_id}
						companyId={order.company_id}
						onSuccess={fetchOrder}
					/>

					<PaymentTermsEditSheet
						open={showPaymentTermsEdit}
						onOpenChange={setShowPaymentTermsEdit}
						orderId={order.id}
						currentPaymentTerms={order.payment_terms}
						currentAdvanceAmount={order.advance_amount || 0}
						currentDiscountType={order.discount_type as DiscountType}
						currentDiscountValue={order.discount_value || 0}
						onSuccess={fetchOrder}
					/>

					<WarehouseEditSheet
						open={showWarehouseEdit}
						onOpenChange={setShowWarehouseEdit}
						orderId={order.id}
						currentWarehouseId={order.warehouse_id}
						companyId={order.company_id}
						hasOutward={order.has_outward || false}
						onSuccess={fetchOrder}
					/>

					<ShipmentEditSheet
						open={showShipmentEdit}
						onOpenChange={setShowShipmentEdit}
						orderId={order.id}
						currentExpectedDeliveryDate={order.expected_delivery_date}
						onSuccess={fetchOrder}
					/>

					<NotesEditSheet
						open={showNotesEdit}
						onOpenChange={setShowNotesEdit}
						orderId={order.id}
						initialNotes={order.notes}
						onSuccess={fetchOrder}
					/>
				</>
			)}
		</div>
	);
}
