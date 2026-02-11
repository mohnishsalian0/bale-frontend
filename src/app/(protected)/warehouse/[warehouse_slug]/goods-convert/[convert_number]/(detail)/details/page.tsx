"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import {
  IconNote,
  IconBuildingWarehouse,
  IconMapPin,
  IconCalendar,
  IconHash,
  IconPhone,
  IconRecycle,
  IconPackage,
  IconBriefcase,
} from "@tabler/icons-react";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { Section } from "@/components/layouts/section";
import { useGoodsConvertBySequenceNumber } from "@/lib/query/hooks/goods-converts";
import { getFormattedAddress, getPartnerName } from "@/lib/utils/partner";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { getInitials } from "@/lib/utils/initials";

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    convert_number: string;
  }>;
}

export default function ConvertDetailsPage({ params }: PageParams) {
  const router = useRouter();
  const { convert_number } = use(params);

  // Fetch goods convert using TanStack Query (cached from layout)
  const {
    data: convert,
    isLoading: loading,
    isError: error,
  } = useGoodsConvertBySequenceNumber(convert_number);

  if (loading) {
    return <LoadingState message="Loading convert details..." />;
  }

  if (error || !convert) {
    return (
      <ErrorState
        title="Goods convert not found"
        message="This goods convert does not exist or has been deleted"
        onRetry={() => router.back()}
        actionText="Go back"
      />
    );
  }

  const vendorName = convert.vendor
    ? getPartnerName(convert.vendor)
    : "Not assigned";
  const warehouseName = convert.warehouse?.name || "Unknown Warehouse";
  const warehouseAddressLines = getFormattedAddress(convert.warehouse);

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Conversion Info Section */}
      <Section
        title="Conversion info"
        subtitle={convert.service_type?.name || "Unknown Service"}
        icon={() => <IconRecycle />}
      >
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-1.5 text-gray-700">
              <IconCalendar className="size-4 text-gray-500" />
              <span>Start date</span>
            </div>
            <span className="font-semibold text-gray-700">
              {formatAbsoluteDate(convert.start_date)}
            </span>
          </div>
          {convert.completion_date && (
            <div className="flex justify-between text-sm">
              <div className="flex items-center gap-1.5 text-gray-700">
                <IconCalendar className="size-4 text-gray-500" />
                <span>Completion date</span>
              </div>
              <span className="font-semibold text-gray-700">
                {formatAbsoluteDate(convert.completion_date)}
              </span>
            </div>
          )}
        </div>
      </Section>

      {/* Output Product Section */}
      <Section
        title={convert.output_product?.name || "Unknown Product"}
        subtitle="Output product"
        icon={() => <IconPackage />}
      />

      {/* Vendor Section (if assigned) */}
      {convert.vendor && (
        <Section
          title={vendorName}
          subtitle="Vendor"
          icon={() => <>{getInitials(vendorName)}</>}
        >
          {convert.vendor.phone_number && (
            <div className="flex justify-between text-sm">
              <div className="flex items-center gap-1.5 text-gray-700">
                <IconPhone className="size-4 text-gray-500" />
                <span>Phone</span>
              </div>
              <span className="font-semibold text-gray-700">
                {convert.vendor.phone_number}
              </span>
            </div>
          )}
        </Section>
      )}

      {/* Agent Section (if assigned) */}
      {convert.agent && (
        <Section
          title={getPartnerName(convert.agent)}
          subtitle="Agent"
          icon={() => <IconBriefcase />}
        />
      )}

      {/* Processing Warehouse Section */}
      <Section
        title={warehouseName}
        subtitle="Processing warehouse"
        icon={() => <IconBuildingWarehouse />}
      >
        {warehouseAddressLines.length > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-700 flex items-center gap-2">
              <IconMapPin className="size-4" />
              Address
            </span>
            <div className="font-semibold text-gray-700 text-right max-w-[200px]">
              {warehouseAddressLines.map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Reference Section */}
      {convert.reference_number && (
        <Section
          title="Reference"
          subtitle={convert.reference_number}
          icon={() => <IconHash />}
        />
      )}

      {/* Job Work Link Section (if linked) */}
      {convert.job_work && (
        <Section
          title={`JW-${convert.job_work.sequence_number}`}
          subtitle="Linked job work"
          icon={() => <IconBriefcase />}
        />
      )}

      {/* Notes Section */}
      <Section
        title="Conversion notes"
        subtitle={convert.notes || "No note added"}
        icon={() => <IconNote />}
      />
    </div>
  );
}
