'use client';

import Link from 'next/link';
import {
	IconNote,
	IconBuildingWarehouse,
	IconMapPin,
	IconTruck,
	IconTrain,
	IconPlane,
	IconShip,
	IconPackage,
	IconBox,
	IconShoppingCart,
	IconCalendar,
	IconHash,
} from '@tabler/icons-react';
import { Section } from '@/components/layouts/section';
import { getInitials } from '@/lib/utils/initials';
import { getPartnerName, getPartnerAddress } from '@/lib/utils/partner';
import { formatAbsoluteDate } from '@/lib/utils/date';
import JobWorkIcon from '@/components/icons/JobWorkIcon';
import type { Tables } from '@/types/database/supabase';
import type { ComponentType } from 'react';

type GoodsOutward = Tables<'goods_outwards'>;
type Partner = Tables<'partners'>;
type Warehouse = Tables<'warehouses'>;
type SalesOrder = Tables<'sales_orders'>;
type JobWork = Tables<'job_works'>;

interface OutwardWithDetails extends GoodsOutward {
	partner: Partner | null;
	agent: Partner | null;
	warehouse: Warehouse | null;
	to_warehouse: Warehouse | null;
	sales_order: SalesOrder | null;
	job_work: JobWork | null;
}

interface OutwardDetailsTabProps {
	outward: OutwardWithDetails;
}

// Helper function to get shipment icon
function getShipmentIcon(shipmentType: string | null) {
	switch (shipmentType) {
		case 'road':
			return IconTruck;
		case 'rail':
			return IconTrain;
		case 'air':
			return IconPlane;
		case 'sea':
			return IconShip;
		case 'courier':
			return IconPackage;
		default:
			return IconBox;
	}
}

// Helper function to get shipment type display name
function getShipmentTypeDisplay(shipmentType: string | null): string {
	if (!shipmentType) return 'Not specified';
	return shipmentType.charAt(0).toUpperCase() + shipmentType.slice(1);
}

export function OutwardDetailsTab({ outward }: OutwardDetailsTabProps) {
	// Determine reason for outward
	let reasonTitle = 'Unknown';
	let ReasonIcon: ComponentType<{ className?: string }> = IconNote;
	let reasonLink: string | null = null;

	if (outward.outward_type === 'sales' && outward.sales_order) {
		reasonTitle = `SO-${outward.sales_order.sequence_number}`;
		ReasonIcon = IconShoppingCart;
		// TODO: Add warehouse slug to construct proper link
		// reasonLink = `/warehouse/${warehouseSlug}/sales-orders/${outward.sales_order.sequence_number}`;
	} else if (outward.outward_type === 'job_work' && outward.job_work) {
		reasonTitle = `JW-${outward.job_work.sequence_number}`;
		ReasonIcon = JobWorkIcon;
		// TODO: Add link to job work details when implemented
	} else if (outward.outward_type === 'other' && outward.other_reason) {
		reasonTitle = outward.other_reason;
		ReasonIcon = IconNote;
	}

	// Determine receiver (partner or warehouse)
	const isWarehouseTransfer = !!outward.to_warehouse;
	const receiverName = isWarehouseTransfer
		? outward.to_warehouse?.name || 'Unknown Warehouse'
		: getPartnerName(outward.partner);
	const receiverAddress = isWarehouseTransfer
		? outward.to_warehouse
			? [
					outward.to_warehouse.address_line1,
					outward.to_warehouse.address_line2,
					outward.to_warehouse.city,
					outward.to_warehouse.state,
					outward.to_warehouse.pin_code,
			  ]
					.filter(Boolean)
					.join(', ')
			: null
		: getPartnerAddress(outward.partner);

	const ShipmentIcon = getShipmentIcon(outward.shipment_type);

	return (
		<div className="flex flex-col">
			{/* Reason for Outward Section */}
			<Section
				title={reasonTitle}
				subtitle="Reason for outward"
				onEdit={() => {}}
				icon={ReasonIcon}
			>
				{reasonLink && (
					<Link
						href={reasonLink}
						className="text-sm text-primary-700 hover:underline"
					>
						View details →
					</Link>
				)}
			</Section>

			{/* Receiver Section (Dispatch To) */}
			<Section
				title={receiverName}
				subtitle="Receiver"
				onEdit={() => {}}
				icon={
					isWarehouseTransfer
						? () => <IconBuildingWarehouse className="size-5" />
						: () => <>{getInitials(receiverName)}</>
				}
			>
				{receiverAddress && (
					<div className="flex items-start gap-1.5 text-sm text-gray-700">
						<IconMapPin className="size-4 text-gray-500 mt-0.5 shrink-0" />
						<span>{receiverAddress}</span>
					</div>
				)}
			</Section>

			{/* Source Warehouse Section */}
			<Section
				title={outward.warehouse?.name || 'Unknown Warehouse'}
				subtitle="Outward source"
				onEdit={() => {}}
				icon={() => <IconBuildingWarehouse className="size-5" />}
			>
				{outward.warehouse && (
					<div className="flex items-start gap-1.5 text-sm text-gray-700">
						<IconMapPin className="size-4 text-gray-500 mt-0.5 shrink-0" />
						<span>
							{[
								outward.warehouse.address_line1,
								outward.warehouse.address_line2,
								outward.warehouse.city,
								outward.warehouse.state,
								outward.warehouse.pin_code,
							]
								.filter(Boolean)
								.join(', ')}
						</span>
					</div>
				)}
			</Section>

			{/* Shipment Section */}
			<Section
				title={getShipmentTypeDisplay(outward.shipment_type)}
				subtitle="Shipment"
				onEdit={() => {}}
				icon={() => <ShipmentIcon className="size-5" />}
			>
				<div className="space-y-3">
					{outward.shipment_reference_number && (
						<div className="flex justify-between text-sm">
							<div className="flex items-center gap-1.5 text-gray-700">
								<IconHash className="size-4 text-gray-500" />
								<span>Reference number</span>
							</div>
							<span className="font-semibold text-gray-700">{outward.shipment_reference_number}</span>
						</div>
					)}
					{outward.expected_delivery_date && (
						<div className="flex justify-between text-sm">
							<div className="flex items-center gap-1.5 text-gray-700">
								<IconCalendar className="size-4 text-gray-500" />
								<span>Expected delivery</span>
							</div>
							<span className="font-semibold text-gray-700">{formatAbsoluteDate(outward.expected_delivery_date)}</span>
						</div>
					)}
					{outward.transport_details && (
						<div className="text-sm text-gray-700 pt-2">
							<p className="text-gray-500 mb-1">Transport details:</p>
							<p className="whitespace-pre-wrap">{outward.transport_details}</p>
						</div>
					)}
				</div>
			</Section>

			{/* Notes Section */}
			<Section
				title="Outward notes"
				subtitle={outward.notes || 'No note added'}
				onEdit={() => {}}
				icon={() => <IconNote className="size-5" />}
			/>
		</div>
	);
}
