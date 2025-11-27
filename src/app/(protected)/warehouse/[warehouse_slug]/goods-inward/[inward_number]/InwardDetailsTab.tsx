"use client";

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
} from "@tabler/icons-react";
import IconJobWork from "@/components/icons/IconJobWork";
import { Section } from "@/components/layouts/section";
import { getInitials } from "@/lib/utils/initials";
import { getPartnerName, getFormattedAddress } from "@/lib/utils/partner";
import { formatAbsoluteDate } from "@/lib/utils/date";
import type { Tables } from "@/types/database/supabase";
import type { ComponentType } from "react";

type GoodsInward = Tables<"goods_inwards">;
type Partner = Tables<"partners">;
type Warehouse = Tables<"warehouses">;
type SalesOrder = Tables<"sales_orders">;
type JobWork = Tables<"job_works">;

interface InwardWithDetails extends GoodsInward {
  partner: Partner | null;
  agent: Partner | null;
  warehouse: Warehouse | null;
  from_warehouse: Warehouse | null;
  sales_order: SalesOrder | null;
  job_work: JobWork | null;
}

interface InwardDetailsTabProps {
  inward: InwardWithDetails;
}

// Helper function to get transport icon
function getTransportIcon(transportType: string | null) {
  switch (transportType) {
    case "road":
      return IconTruck;
    case "rail":
      return IconTrain;
    case "air":
      return IconPlane;
    case "sea":
      return IconShip;
    case "courier":
      return IconPackage;
    default:
      return IconBox;
  }
}

// Helper function to get transport type display name
function getTransportTypeDisplay(transportType: string | null): string {
  if (!transportType) return "Not specified";
  return transportType.charAt(0).toUpperCase() + transportType.slice(1);
}

export function InwardDetailsTab({ inward }: InwardDetailsTabProps) {
  // Determine reason for inward
  let reasonTitle = "Unknown";
  let ReasonIcon: ComponentType<{ className?: string }> = IconNote;

  if (inward.inward_type === "job_work" && inward.job_work) {
    reasonTitle = `JW-${inward.job_work.sequence_number}`;
    ReasonIcon = IconJobWork;
  } else if (inward.inward_type === "sales_return" && inward.sales_order) {
    reasonTitle = `SO-${inward.sales_order.sequence_number}`;
    ReasonIcon = IconShoppingCart;
  } else if (inward.inward_type === "other" && inward.other_reason) {
    reasonTitle = inward.other_reason;
    ReasonIcon = IconNote;
  }

  // Determine source (from partner or from warehouse)
  const isWarehouseTransfer = !!inward.from_warehouse;
  const sourceName = isWarehouseTransfer
    ? inward.from_warehouse?.name || "Unknown Warehouse"
    : getPartnerName(inward.partner);
  const sourceAddressLines = isWarehouseTransfer
    ? getFormattedAddress(inward.from_warehouse)
    : getFormattedAddress(inward.partner);

  const TransportIcon = getTransportIcon(inward.transport_type);

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Reason for Inward Section */}
      <Section
        title={reasonTitle}
        subtitle="Reason for inward"
        onEdit={() => {}}
        icon={ReasonIcon}
      />

      {/* Source Section (Sender) */}
      <Section
        title={sourceName}
        subtitle="Sender"
        onEdit={() => {}}
        icon={
          isWarehouseTransfer
            ? () => <IconBuildingWarehouse className="size-5" />
            : () => <>{getInitials(sourceName)}</>
        }
      >
        {sourceAddressLines.length > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-700 flex items-center gap-2">
              <IconMapPin className="size-4" />
              Address
            </span>
            <div className="font-semibold text-gray-700 text-right max-w-[200px]">
              {sourceAddressLines.map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Destination Warehouse Section */}
      <Section
        title={inward.warehouse?.name || "Unknown Warehouse"}
        subtitle="Inward destination"
        onEdit={() => {}}
        icon={() => <IconBuildingWarehouse className="size-5" />}
      >
        {inward.warehouse &&
          getFormattedAddress(inward.warehouse).length > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 flex items-center gap-2">
                <IconMapPin className="size-4" />
                Address
              </span>
              <div className="font-semibold text-gray-700 text-right max-w-[200px]">
                {getFormattedAddress(inward.warehouse).map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </div>
          )}
      </Section>

      {/* Transport Section */}
      <Section
        title={getTransportTypeDisplay(inward.transport_type)}
        subtitle="Transport"
        onEdit={() => {}}
        icon={() => <TransportIcon className="size-5" />}
      >
        <div className="space-y-3">
          {inward.transport_reference_number && (
            <div className="flex justify-between text-sm">
              <div className="flex items-center gap-1.5 text-gray-700">
                <IconHash className="size-4 text-gray-500" />
                <span>Reference number</span>
              </div>
              <span className="font-semibold text-gray-700">
                {inward.transport_reference_number}
              </span>
            </div>
          )}
          {inward.expected_delivery_date && (
            <div className="flex justify-between text-sm">
              <div className="flex items-center gap-1.5 text-gray-700">
                <IconCalendar className="size-4 text-gray-500" />
                <span>Expected delivery</span>
              </div>
              <span className="font-semibold text-gray-700">
                {formatAbsoluteDate(inward.expected_delivery_date)}
              </span>
            </div>
          )}
          {inward.transport_details && (
            <div className="text-sm text-gray-700 pt-2">
              <p className="text-gray-500 mb-1">Transport details:</p>
              <p className="whitespace-pre-wrap">{inward.transport_details}</p>
            </div>
          )}
        </div>
      </Section>

      {/* Agent Section (Conditional) */}
      {inward.agent && (
        <Section
          title={getPartnerName(inward.agent)}
          subtitle="Agent"
          onEdit={() => {}}
          icon={() => <>{getInitials(getPartnerName(inward.agent))}</>}
        />
      )}

      {/* Notes Section */}
      <Section
        title="Inward notes"
        subtitle={inward.notes || "No note added"}
        onEdit={() => {}}
        icon={() => <IconNote className="size-5" />}
      />
    </div>
  );
}
