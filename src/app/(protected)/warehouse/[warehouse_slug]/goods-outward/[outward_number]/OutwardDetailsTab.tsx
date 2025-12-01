"use client";

import Link from "next/link";
import {
  IconNote,
  IconBuildingWarehouse,
  IconMapPin,
  IconShoppingCart,
  IconCalendar,
  IconHash,
} from "@tabler/icons-react";
import IconJobWork from "@/components/icons/IconJobWork";
import { Section } from "@/components/layouts/section";
import { getInitials } from "@/lib/utils/initials";
import { getPartnerName, getFormattedAddress } from "@/lib/utils/partner";
import { formatAbsoluteDate } from "@/lib/utils/date";
import {
  getTransportIcon,
  getTransportTypeDisplay,
} from "@/lib/utils/transport";
import type { OutwardDetailView } from "@/types/stock-flow.types";
import type { ComponentType } from "react";

interface OutwardDetailsTabProps {
  outward: OutwardDetailView;
}

export function OutwardDetailsTab({ outward }: OutwardDetailsTabProps) {
  // Determine reason for outward
  let reasonTitle = "Unknown";
  let ReasonIcon: ComponentType<{ className?: string }> = IconNote;
  let reasonLink: string | null = null;

  if (outward.outward_type === "sales" && outward.sales_order) {
    reasonTitle = `SO-${outward.sales_order.sequence_number}`;
    ReasonIcon = IconShoppingCart;
    // TODO: Add warehouse slug to construct proper link
    // reasonLink = `/warehouse/${warehouseSlug}/sales-orders/${outward.sales_order.sequence_number}`;
  } else if (outward.outward_type === "job_work" && outward.job_work) {
    reasonTitle = `JW-${outward.job_work.sequence_number}`;
    ReasonIcon = IconJobWork;
    // TODO: Add link to job work details when implemented
  } else if (outward.outward_type === "other" && outward.other_reason) {
    reasonTitle = outward.other_reason;
    ReasonIcon = IconNote;
  }

  // Determine receiver (partner or warehouse)
  const isWarehouseTransfer = !!outward.to_warehouse;
  const receiverName = isWarehouseTransfer
    ? outward.to_warehouse?.name || "Unknown Warehouse"
    : getPartnerName(outward.partner);
  const receiverAddressLines = isWarehouseTransfer
    ? getFormattedAddress(outward.to_warehouse)
    : getFormattedAddress(outward.partner);

  const TransportIcon = getTransportIcon(outward.transport_type);

  return (
    <div className="flex flex-col gap-3 p-4">
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
        {receiverAddressLines.length > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-700 flex items-center gap-2">
              <IconMapPin className="size-4" />
              Address
            </span>
            <div className="font-semibold text-gray-700 text-right max-w-[200px]">
              {receiverAddressLines.map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Source Warehouse Section */}
      <Section
        title={outward.warehouse?.name || "Unknown Warehouse"}
        subtitle="Outward source"
        onEdit={() => {}}
        icon={() => <IconBuildingWarehouse className="size-5" />}
      >
        {outward.warehouse &&
          getFormattedAddress(outward.warehouse).length > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 flex items-center gap-2">
                <IconMapPin className="size-4" />
                Address
              </span>
              <div className="font-semibold text-gray-700 text-right max-w-[200px]">
                {getFormattedAddress(outward.warehouse).map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>
          )}
      </Section>

      {/* Transport Section */}
      <Section
        title={getTransportTypeDisplay(outward.transport_type)}
        subtitle="Transport"
        onEdit={() => {}}
        icon={() => <TransportIcon className="size-5" />}
      >
        <div className="space-y-3">
          {outward.transport_reference_number && (
            <div className="flex justify-between text-sm">
              <div className="flex items-center gap-1.5 text-gray-700">
                <IconHash className="size-4 text-gray-500" />
                <span>Reference number</span>
              </div>
              <span className="font-semibold text-gray-700">
                {outward.transport_reference_number}
              </span>
            </div>
          )}
          {outward.expected_delivery_date && (
            <div className="flex justify-between text-sm">
              <div className="flex items-center gap-1.5 text-gray-700">
                <IconCalendar className="size-4 text-gray-500" />
                <span>Expected delivery</span>
              </div>
              <span className="font-semibold text-gray-700">
                {formatAbsoluteDate(outward.expected_delivery_date)}
              </span>
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
        subtitle={outward.notes || "No note added"}
        onEdit={() => {}}
        icon={() => <IconNote className="size-5" />}
      />
    </div>
  );
}
