'use client';

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
import { getInitials } from '@/lib/utils/initials';
import { formatCurrency } from '@/lib/utils/financial';
import { getMeasuringUnitAbbreviation } from '@/lib/utils/measuring-units';
import { getPartnerName, getPartnerAddress } from '@/lib/utils/partner';
import type { Tables } from '@/types/database/supabase';
import type { SalesOrderStatus } from '@/types/database/enums';

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
			<div className="border-b border-border">
				<div className="p-4 space-y-6">
					{/* Header Row */}
					<div className="flex items-start justify-between">
						<div>
							<div className="flex items-center gap-2">
								<h3 className="text-lg font-semibold text-gray-700">
									{order.sales_order_items.length} items at ₹{formatCurrency(financials?.totalAmount || 0)}
								</h3>
								<Button variant="ghost" size="icon" onClick={onEditLineItems}>
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
										{order.status !== 'approval_pending' && (
											<div className="max-w-sm mt-2 h-1.5 bg-gray-200 rounded-full">
												<div
													className="h-full bg-primary-500 rounded-full transition-all"
													style={{
														width: `${item.required_quantity > 0 ? ((item.dispatched_quantity || 0) / item.required_quantity) * 100 : 0}%`,
													}}
												/>
											</div>
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
				</div>
			</div>

			{/* Customer Section */}
			<div className="border-b border-border">
				<div className="p-4 space-y-4">
					{/* Header Row */}
					<div className="flex items-start justify-between">
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2">
								<h3 className="text-lg font-semibold text-gray-700 truncate" title={getPartnerName(order.customer)}>
									{getPartnerName(order.customer)}
								</h3>
								<Button variant="ghost" size="icon" onClick={onEditCustomer}>
									<IconEdit />
								</Button>
							</div>
							<p className="text-sm text-gray-500">Customer</p>
						</div>
						<div className="size-12 rounded-xl bg-gray-200 flex items-center justify-center shrink-0">
							<span className="text-lg font-semibold text-gray-700">
								{getInitials(getPartnerName(order.customer))}
							</span>
						</div>
					</div>

					{getPartnerAddress(order.customer) && (
						<div className="flex items-start gap-1.5 text-sm text-gray-700">
							<IconMapPin className="size-4 text-gray-500 mt-0.5 shrink-0" />
							<span>{getPartnerAddress(order.customer)}</span>
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
									<h3 className="text-lg font-semibold text-gray-700 truncate" title={getPartnerName(order.agent)}>
										{getPartnerName(order.agent)}
									</h3>
									<Button variant="ghost" size="icon" onClick={onEditAgent}>
										<IconEdit />
									</Button>
								</div>
								<p className="text-sm text-gray-500">Agent</p>
							</div>
							<div className="size-12 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
								<span className="text-lg font-semibold text-gray-700">
									{getInitials(getPartnerName(order.agent))}
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
								<h3 className="text-lg font-semibold text-gray-700">{order.payment_terms || 'NET 30'}</h3>
								<Button variant="ghost" size="icon" onClick={onEditPaymentTerms}>
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
				</div>
			</div>

			{/* Warehouse Section */}
			<div className="border-b border-border">
				<div className="p-4 space-y-4">
					{/* Header Row */}
					<div className="flex items-start justify-between">
						<div>
							<div className="flex items-center gap-2">
								<h3 className="text-lg font-semibold text-gray-700">{order.warehouse?.name || 'Unknown Warehouse'}</h3>
								<Button
									variant="ghost"
									size="icon"
									onClick={onEditWarehouse}
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
				</div>
			</div>

			{/* Notes Section */}
			<div className="border-b border-border">
				<div className="p-4 space-y-6">
					{/* Header Row */}
					<div className="flex items-start justify-between">
						<div>
							<div className="flex items-center gap-2">
								<h3 className="text-lg font-semibold text-gray-700">Order notes</h3>
								<Button variant="ghost" size="icon" onClick={onEditNotes}>
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
	);
}
