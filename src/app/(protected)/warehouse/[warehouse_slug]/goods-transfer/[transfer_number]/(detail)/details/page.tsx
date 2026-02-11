"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import {
  IconNote,
  IconBuildingWarehouse,
  IconMapPin,
  IconCalendar,
  IconHash,
} from "@tabler/icons-react";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { Section } from "@/components/layouts/section";
import { useGoodsTransferBySequenceNumber } from "@/lib/query/hooks/goods-transfers";
import { getFormattedAddress } from "@/lib/utils/partner";
import { formatAbsoluteDate } from "@/lib/utils/date";
import {
  getTransportIcon,
  getTransportTypeDisplay,
} from "@/lib/utils/transport";

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    transfer_number: string;
  }>;
}

export default function TransferDetailsPage({ params }: PageParams) {
  const router = useRouter();
  const { transfer_number } = use(params);

  // Fetch goods transfer using TanStack Query (cached from layout)
  const {
    data: transfer,
    isLoading: loading,
    isError: error,
  } = useGoodsTransferBySequenceNumber(transfer_number);

  if (loading) {
    return <LoadingState message="Loading transfer details..." />;
  }

  if (error || !transfer) {
    return (
      <ErrorState
        title="Goods transfer not found"
        message="This goods transfer does not exist or has been deleted"
        onRetry={() => router.back()}
        actionText="Go back"
      />
    );
  }

  const fromWarehouseName =
    transfer.from_warehouse?.name || "Unknown Warehouse";
  const toWarehouseName = transfer.to_warehouse?.name || "Unknown Warehouse";
  const fromWarehouseAddressLines = getFormattedAddress(
    transfer.from_warehouse,
  );
  const toWarehouseAddressLines = getFormattedAddress(transfer.to_warehouse);

  const TransportIcon = getTransportIcon(transfer.transport_type);

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* From Warehouse Section */}
      <Section
        title={fromWarehouseName}
        subtitle="Transfer from"
        icon={() => <IconBuildingWarehouse />}
      >
        {fromWarehouseAddressLines.length > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-700 flex items-center gap-2">
              <IconMapPin className="size-4" />
              Address
            </span>
            <div className="font-semibold text-gray-700 text-right max-w-[200px]">
              {fromWarehouseAddressLines.map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* To Warehouse Section */}
      <Section
        title={toWarehouseName}
        subtitle="Transfer to"
        icon={() => <IconBuildingWarehouse />}
      >
        {toWarehouseAddressLines.length > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-700 flex items-center gap-2">
              <IconMapPin className="size-4" />
              Address
            </span>
            <div className="font-semibold text-gray-700 text-right max-w-[200px]">
              {toWarehouseAddressLines.map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Transport Section */}
      {transfer.transport_type && (
        <Section
          title={getTransportTypeDisplay(transfer.transport_type)}
          subtitle="Transport"
          icon={() => <TransportIcon />}
        >
          <div className="space-y-3">
            {transfer.transport_reference_number && (
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-1.5 text-gray-700">
                  <IconHash className="size-4 text-gray-500" />
                  <span>Reference number</span>
                </div>
                <span className="font-semibold text-gray-700">
                  {transfer.transport_reference_number}
                </span>
              </div>
            )}
            {transfer.expected_delivery_date && (
              <div className="flex justify-between text-sm">
                <div className="flex items-center gap-1.5 text-gray-700">
                  <IconCalendar className="size-4 text-gray-500" />
                  <span>Expected delivery</span>
                </div>
                <span className="font-semibold text-gray-700">
                  {formatAbsoluteDate(transfer.expected_delivery_date)}
                </span>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Notes Section */}
      <Section
        title="Transfer notes"
        subtitle={transfer.notes || "No note added"}
        icon={() => <IconNote />}
      />
    </div>
  );
}
