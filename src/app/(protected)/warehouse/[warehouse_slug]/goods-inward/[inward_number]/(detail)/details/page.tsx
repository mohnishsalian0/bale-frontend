"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import {
  IconNote,
  IconBuildingWarehouse,
  IconMapPin,
  IconShoppingCart,
  IconCalendar,
  IconHash,
} from "@tabler/icons-react";
import IconJobWork from "@/components/icons/IconJobWork";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { Section } from "@/components/layouts/section";
import { useGoodsInwardBySequenceNumber } from "@/lib/query/hooks/stock-flow";
import { getInitials } from "@/lib/utils/initials";
import {
  getPartnerName,
  getFormattedAddress,
  getPartnerShippingAddress,
} from "@/lib/utils/partner";
import { formatAbsoluteDate } from "@/lib/utils/date";
import {
  getTransportIcon,
  getTransportTypeDisplay,
} from "@/lib/utils/transport";
import type { ComponentType } from "react";

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    inward_number: string;
  }>;
}

export default function InwardDetailsPage({ params }: PageParams) {
  const router = useRouter();
  const { inward_number } = use(params);

  // Fetch goods inward using TanStack Query (cached from layout)
  const {
    data: inward,
    isLoading: loading,
    isError: error,
  } = useGoodsInwardBySequenceNumber(inward_number);

  if (loading) {
    return <LoadingState message="Loading inward details..." />;
  }

  if (error || !inward) {
    return (
      <ErrorState
        title="Goods inward not found"
        message="This goods inward does not exist or has been deleted"
        onRetry={() => router.back()}
        actionText="Go back"
      />
    );
  }

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

  // Source is always from partner (warehouse transfers handled separately)
  const sourceName = getPartnerName(inward.partner);
  const sourceAddressLines = getFormattedAddress(getPartnerShippingAddress(inward.partner));

  const TransportIcon = getTransportIcon(inward.transport_type);

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Reason for Inward Section */}
      <Section
        title={reasonTitle}
        subtitle="Reason for inward"
        icon={ReasonIcon}
      />

      {/* Source Section (Sender) */}
      <Section
        title={sourceName}
        subtitle="Sender"
        icon={() => <>{getInitials(sourceName)}</>}
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
        icon={() => <IconBuildingWarehouse />}
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
        icon={() => <TransportIcon />}
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
        </div>
      </Section>

      {/* Agent Section (Conditional) */}
      {inward.agent && (
        <Section
          title={getPartnerName(inward.agent)}
          subtitle="Agent"
          icon={() => <>{getInitials(getPartnerName(inward.agent))}</>}
        />
      )}

      {/* Notes Section */}
      <Section
        title="Inward notes"
        subtitle={inward.notes || "No note added"}
        icon={() => <IconNote />}
      />
    </div>
  );
}
