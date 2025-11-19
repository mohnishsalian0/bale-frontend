'use client';

import { use, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Progress } from '@/components/ui/progress';
import { LoadingState } from '@/components/layouts/loading-state';
import { ErrorState } from '@/components/layouts/error-state';
import { createClient } from '@/lib/supabase/client';
import { useSession } from '@/contexts/session-context';
import { calculateOrderFinancials } from '@/lib/utils/financial';
import { formatAbsoluteDate } from '@/lib/utils/date';
import { calculateCompletionPercentage, getOrderDisplayStatus, type DisplayStatus } from '@/lib/utils/sales-order';
import type { Tables } from '@/types/database/supabase';
import type { DiscountType, SalesOrderStatus } from '@/types/database/enums';
import { NotesEditSheet } from './NotesEditSheet';
import { CustomerEditSheet } from './CustomerEditSheet';
import { AgentEditSheet } from './AgentEditSheet';
import { WarehouseEditSheet } from './WarehouseEditSheet';
import { PaymentTermsEditSheet } from './PaymentTermsEditSheet';
import { ShipmentEditSheet } from './ShipmentEditSheet';
import { OrderDetailsTab } from './OrderDetailsTab';
import { OutwardsTab } from './OutwardsTab';
import { TabUnderline } from '@/components/ui/tab-underline';

type SalesOrder = Tables<'sales_orders'>;
type Partner = Tables<'partners'>;
type Warehouse = Tables<'warehouses'>;
type Product = Tables<'products'>;
type SalesOrderItem = Tables<'sales_order_items'>;

interface OrderWithDetails extends SalesOrder {
	status: SalesOrderStatus;
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
		order_number: string;
	}>;
}

export default function SalesOrderDetailPage({ params }: PageParams) {
	const router = useRouter();
	const { order_number } = use(params);
	const { warehouse } = useSession();
	const [order, setOrder] = useState<OrderWithDetails | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<'details' | 'outwards'>('details');

	// Edit sheet states
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
				.eq('sequence_number', parseInt(order_number))
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
	}, [order_number]);

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

	// Calculate completion percentage using utility
	const completionPercentage = useMemo(() => {
		if (!order) return 0;
		return calculateCompletionPercentage(order.sales_order_items);
	}, [order]);

	// Compute display status (includes 'overdue' logic) using utility
	const displayStatus: DisplayStatus = useMemo(() => {
		if (!order) return 'in_progress';
		return getOrderDisplayStatus(order.status as SalesOrderStatus, order.expected_delivery_date);
	}, [order]);

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
			<ErrorState
				title="Order not found"
				message={error || 'This order does not exist or has been deleted'}
				onRetry={() => router.back()}
				actionText="Go back"
			/>
		);
	}

	return (
		<div className="relative flex flex-col flex-1 overflow-y-auto max-w-3xl border-r border-border">
			{/* Header */}
			<div className="p-4">
				<div>
					<div className="flex items-center gap-2">
						<h1 className="text-2xl font-bold text-gray-900">SO-{order.sequence_number}</h1>
						<StatusBadge status={displayStatus} />
					</div>
					<p className="text-sm text-gray-500">Sales order on {formatAbsoluteDate(order.order_date)}</p>
				</div>

				{/* Progress Bar */}
				{displayStatus !== 'approval_pending' && (
					<div className='mt-4 max-w-sm'>
						<p className="text-sm text-gray-700 mb-1">{completionPercentage}% completed</p>
						<Progress color={displayStatus === 'overdue' ? 'yellow' : 'blue'} value={completionPercentage} />
					</div>
				)}
			</div>

			{/* Tabs */}
			<TabUnderline
				activeTab={activeTab}
				onTabChange={(tab) => setActiveTab(tab as 'details' | 'outwards')}
				tabs={[
					{ value: 'details', label: 'Order details' },
					{ value: 'outwards', label: 'Outwards' },
				]}
			/>

			{/* Tab Content */}
			<div className="flex-1">
				{activeTab === 'details' ? (
					<OrderDetailsTab
						order={order}
						financials={financials}
						displayStatus={displayStatus}
						onEditLineItems={() => { }} // TODO: Handle line item edit
						onEditCustomer={() => setShowCustomerEdit(true)}
						onEditAgent={() => setShowAgentEdit(true)}
						onEditPaymentTerms={() => setShowPaymentTermsEdit(true)}
						onEditWarehouse={() => setShowWarehouseEdit(true)}
						onEditNotes={() => setShowNotesEdit(true)}
					/>
				) : (
					<OutwardsTab
						orderId={order.id}
						warehouseSlug={warehouse?.slug || ''}
					/>
				)}
			</div>

			{/* Bottom Action Bar */}
			<div className="sticky bottom-0 p-4 bg-background border-t border-border flex gap-3 z-10">
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
