'use client';

import Image from 'next/image';
import {
	IconPackage,
	IconCash,
	IconBuildingWarehouse,
	IconNote,
	IconMapPin,
	IconCurrencyRupee,
	IconPercentage,
	IconPhoto
} from '@tabler/icons-react';
import { Progress } from '@/components/ui/progress';
import { getInitials } from '@/lib/utils/initials';
import { formatCurrency } from '@/lib/utils/financial';
import { getMeasuringUnitAbbreviation } from '@/lib/utils/measuring-units';
import { getPartnerName, getPartnerAddress } from '@/lib/utils/partner';
import type { DisplayStatus } from '@/lib/utils/sales-order';
import type { Tables } from '@/types/database/supabase';
import type { SalesOrderStatus } from '@/types/database/enums';
import { Section } from '@/components/layouts/section';

type Partner = Tables<'partners'>;
type Warehouse = Tables<'warehouses'>;
type Product = Tables<'products'>;
type SalesOrderItem = Tables<'sales_order_items'>;

interface OrderWithDetails {
	id: string;
	sequence_number: number;
	status: SalesOrderStatus;
	payment_terms: string | null;
	advance_amount: number | null;
	discount_type: string;
	discount_value: number | null;
	gst_rate: number | null;
	notes: string | null;
	has_outward: boolean | null;
	customer: Partner | null;
	agent: Partner | null;
	warehouse: Warehouse | null;
	sales_order_items: Array<
		SalesOrderItem & {
			product: Product | null;
		}
	>;
}

interface OrderDetailsTabProps {
	order: OrderWithDetails;
	financials: {
		itemTotal: number;
		discountAmount: number;
		gstAmount: number;
		totalAmount: number;
	} | null;
	displayStatus: DisplayStatus;
	onEditLineItems: () => void;
	onEditCustomer: () => void;
	onEditAgent: () => void;
	onEditPaymentTerms: () => void;
	onEditWarehouse: () => void;
	onEditNotes: () => void;
}

export function OrderDetailsTab({
	order,
	financials,
	displayStatus,
	onEditLineItems,
	onEditCustomer,
	onEditAgent,
	onEditPaymentTerms,
	onEditWarehouse,
	onEditNotes,
}: OrderDetailsTabProps) {
	return (
		<div className="flex flex-col">
			{/* Line Items Section */}
			<Section
				title={`${order.sales_order_items.length} items at ₹${formatCurrency(financials?.totalAmount || 0)}`}
				subtitle="Line items"
				onEdit={onEditLineItems}
				icon={() => <IconPackage className="size-5" />}
			>
				<div>
					<ul className="space-y-6">
						{order.sales_order_items.map((item) => (
							<li key={item.id} className="flex gap-3">
								<div className="relative size-8 mt-0.5 rounded-lg overflow-hidden bg-gray-200 shrink-0">
									{item.product?.product_images?.[0] ? (
										<Image
											src={item.product.product_images[0]}
											alt={item.product.name || ''}
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
									<p className="text-sm font-medium text-gray-700 truncate" title={item.product?.name}>
										{item.product?.name || 'Unknown Product'}
									</p>
									<p className="text-xs text-gray-500 mt-0.5">
										{item.required_quantity}{' '}
										{getMeasuringUnitAbbreviation(item.product?.measuring_unit as any)}
										{order.status !== 'approval_pending' && (
											<>
												{' '}({item.dispatched_quantity || 0}{' '}
												{getMeasuringUnitAbbreviation(item.product?.measuring_unit as any)} shipped)
											</>
										)}
									</p>
									{/* Progress bar */}
									{displayStatus !== 'approval_pending' && (
										<Progress
											size='sm'
											color={displayStatus === 'overdue' ? 'yellow' : 'blue'}
											value={item.required_quantity > 0 ? ((item.dispatched_quantity || 0) / item.required_quantity) * 100 : 0}
											className='max-w-sm mt-1'
										/>
									)}
								</div>
								<p className="text-sm font-semibold text-gray-700 shrink-0">₹{formatCurrency(item.line_total || 0)}</p>
							</li>
						))}
					</ul>

					{/* Financial Breakdown */}
					{financials && (
						<div className="space-y-4 pt-3 mt-6 border-t border-border">
							{order.discount_type !== 'none' && (
								<div className="flex justify-between text-sm text-gray-700">
									<span>
										Discount
										{order.discount_type === 'percentage' && ` (${order.discount_value}%)`}
									</span>
									<span className="font-semibold">-₹{formatCurrency(financials.discountAmount)}</span>
								</div>
							)}
							<div className="flex justify-between text-sm text-gray-700">
								<span>Item total</span>
								<span className="font-semibold">₹{formatCurrency(financials.itemTotal)}</span>
							</div>
							<div className="flex justify-between text-sm text-gray-700">
								<span>GST ({order.gst_rate}%)</span>
								<span className="font-semibold">₹{formatCurrency(financials.gstAmount)}</span>
							</div>
							<div className="flex justify-between font-semibold text-gray-700 pt-2 border-t">
								<span>Total</span>
								<span className="font-semibold">₹{formatCurrency(financials.totalAmount)}</span>
							</div>
						</div>
					)}
				</div>
			</Section>

			{/* Customer Section */}
			<Section
				title={getPartnerName(order.customer)}
				subtitle="Customer"
				onEdit={onEditCustomer}
				icon={() => <>{getInitials(getPartnerName(order.customer))}</>}
			>
				{getPartnerAddress(order.customer) && (
					<div className="flex items-start gap-1.5 text-sm text-gray-700">
						<IconMapPin className="size-4 text-gray-500 mt-0.5 shrink-0" />
						<span>{getPartnerAddress(order.customer)}</span>
					</div>
				)}
			</Section>

			{/* Agent Section (Conditional) */}
			{order.agent && (
				<Section
					title={getPartnerName(order.agent)}
					subtitle="Agent"
					onEdit={onEditAgent}
					icon={() => <>{getInitials(getPartnerName(order.agent))}</>}
				/>
			)}

			{/* Payment Terms Section */}
			<Section
				title={order.payment_terms || 'NET 30'}
				subtitle="Payment terms"
				onEdit={onEditPaymentTerms}
				icon={() => <IconCash className="size-5" />}
			>
				<div className="space-y-3">
					<div className="flex justify-between text-sm">
						<div className="flex items-center gap-1.5 text-gray-700">
							<IconCurrencyRupee className="size-4 text-gray-500" />
							<span>Advanced amount</span>
						</div>
						<span className="font-semibold text-gray-700">₹{formatCurrency(order.advance_amount || 0)}</span>
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
							<span className="font-semibold text-gray-700">
								{order.discount_type === 'percentage' ? `${order.discount_value}%` : `₹${formatCurrency(order.discount_value || 0)}`}
							</span>
						</div>
					)}
				</div>
			</Section>

			{/* Warehouse Section */}
			<Section
				title={order.warehouse?.name || 'Unknown Warehouse'}
				subtitle="Warehouse"
				onEdit={onEditWarehouse}
				icon={() => <IconBuildingWarehouse className="size-5" />}
			>
				{order.warehouse && (
					<div className="flex items-start gap-1.5 text-sm text-gray-700">
						<IconMapPin className="size-4 text-gray-500 mt-0.5 shrink-0" />
						<span>
							{[
								order.warehouse.address_line1,
								order.warehouse.address_line2,
								order.warehouse.city,
								order.warehouse.state,
								order.warehouse.pin_code,
							]
								.filter(Boolean)
								.join(', ')}
						</span>
					</div>
				)}
			</Section>

			{/* Notes Section */}
			<Section
				title="Order notes"
				subtitle={order.notes || 'No note added'}
				onEdit={onEditNotes}
				icon={() => <IconNote className="size-5" />}
			/>
		</div>
	);
}
