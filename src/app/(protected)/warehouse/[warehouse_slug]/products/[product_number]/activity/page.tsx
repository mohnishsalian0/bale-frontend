"use client";

import { use, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconBox } from "@tabler/icons-react";
import { TabPills } from "@/components/ui/tab-pills";
import { PaginationWrapper } from "@/components/ui/pagination-wrapper";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { Badge } from "@/components/ui/badge";
import { formatAbsoluteDate, formatMonthHeader } from "@/lib/utils/date";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import {
  ACTIVITY_EVENT_CONFIG,
  getProductActivityTitle,
} from "@/lib/utils/stock-units";
import { useSession } from "@/contexts/session-context";
import { useProductWithInventoryAndOrdersByNumber } from "@/lib/query/hooks/products";
import { useProductActivity } from "@/lib/query/hooks/product-activity";
import type { MeasuringUnit } from "@/types/database/enums";
import type {
  ProductActivityEventType,
  ProductActivityTypeFilter,
} from "@/types/products.types";

interface PageParams {
  params: Promise<{ warehouse_slug: string; product_number: string }>;
}

const TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "inward", label: "Inward" },
  { value: "outward", label: "Outward" },
  { value: "transfer_out", label: "Transfer out" },
  { value: "transfer_in", label: "Transfer in" },
  { value: "convert_in", label: "Convert in" },
  { value: "convert_out", label: "Convert out" },
];

function getEventPath(
  warehouseSlug: string,
  eventType: ProductActivityEventType,
  referenceNumber: string,
): string {
  // reference_number format: "GI-42", "GO-7", "GT-3", "GC-11"
  const seqNum = referenceNumber.split("-")[1];
  switch (eventType) {
    case "inward":
      return `/warehouse/${warehouseSlug}/goods-inward/${seqNum}`;
    case "outward":
      return `/warehouse/${warehouseSlug}/goods-outward/${seqNum}`;
    case "transfer_out":
    case "transfer_in":
      return `/warehouse/${warehouseSlug}/goods-transfer/${seqNum}`;
    case "convert_in":
    case "convert_out":
      return `/warehouse/${warehouseSlug}/goods-convert/${seqNum}`;
  }
}

export default function ActivityPage({ params }: PageParams) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { product_number, warehouse_slug } = use(params);
  const { warehouse } = useSession();

  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const selectedFilter = (searchParams.get("filter") ||
    "all") as ProductActivityTypeFilter;
  const PAGE_SIZE = 20;

  // Product from cache (fetched by layout)
  const { data: product } = useProductWithInventoryAndOrdersByNumber(
    product_number,
    warehouse.id,
  );

  const { data, isLoading, isError, refetch } = useProductActivity(
    product?.id,
    warehouse.id,
    selectedFilter,
    currentPage,
    PAGE_SIZE,
  );

  const events = data?.data || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const monthGroups = useMemo(() => {
    const groups: Record<
      string,
      { month: string; monthYear: string; events: typeof events }
    > = {};

    events.forEach((event) => {
      const date = new Date(event.event_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthDisplay = formatMonthHeader(date);

      if (!groups[monthKey]) {
        groups[monthKey] = {
          month: monthDisplay,
          monthYear: monthKey,
          events: [],
        };
      }
      groups[monthKey].events.push(event);
    });

    return Object.values(groups).sort(
      (a, b) =>
        new Date(b.monthYear + "-01").getTime() -
        new Date(a.monthYear + "-01").getTime(),
    );
  }, [events]);

  const unitAbbr = product
    ? getMeasuringUnitAbbreviation(product.measuring_unit as MeasuringUnit)
    : "";

  const handleFilterChange = (filter: string) => {
    router.push(
      `/warehouse/${warehouse_slug}/products/${product_number}/activity?filter=${filter}&page=1`,
    );
  };

  const handlePageChange = (page: number) => {
    router.push(
      `/warehouse/${warehouse_slug}/products/${product_number}/activity?filter=${selectedFilter}&page=${page}`,
    );
  };

  if (isLoading) return <LoadingState message="Loading activity..." />;

  if (isError)
    return (
      <ErrorState
        title="Failed to load activity"
        message="Unable to fetch product activity"
        onRetry={refetch}
      />
    );

  if (monthGroups.length === 0) {
    return (
      <>
        <div className="flex gap-4 px-4 py-4 overflow-x-auto scrollbar-hide">
          <TabPills
            options={TYPE_FILTER_OPTIONS}
            value={selectedFilter}
            onValueChange={handleFilterChange}
          />
        </div>
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <IconBox className="size-12 text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            No activity
          </h3>
          <p className="text-sm text-gray-500 text-center">
            No {selectedFilter === "all" ? "" : selectedFilter + " "}activity
            found for this product
          </p>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col flex-1 border-b border-dashed border-gray-300">
      {/* Filter Pills */}
      <div className="flex gap-4 px-4 py-4 overflow-x-auto scrollbar-hide">
        <TabPills
          options={TYPE_FILTER_OPTIONS}
          value={selectedFilter}
          onValueChange={handleFilterChange}
        />
      </div>

      {/* Event List grouped by month */}
      <div className="flex flex-col">
        {monthGroups.map((group) => (
          <div key={group.monthYear} className="flex flex-col">
            {/* Month Header */}
            <div className="sticky top-11 z-10 flex items-center justify-between px-4 py-2 border-t border-dashed border-gray-300 bg-gray-100">
              <p className="text-xs font-semibold text-gray-700">
                {group.month}
              </p>
            </div>

            {group.events.map((event) => {
              const config = ACTIVITY_EVENT_CONFIG[event.event_type];
              const title = getProductActivityTitle(
                event.event_type,
                event.counterparty_name,
              );
              const path = getEventPath(
                warehouse_slug,
                event.event_type,
                event.reference_number,
              );

              return (
                <button
                  key={`${event.event_type}-${event.event_id}`}
                  onClick={() => router.push(path)}
                  className="flex items-center gap-4 p-4 border-t border-dashed border-gray-300 hover:bg-gray-100 hover:cursor-pointer transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className="text-base font-medium text-gray-700 truncate"
                        title={title}
                      >
                        {title}
                      </p>
                      <Badge color={config.badgeColor} className="shrink-0">
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {event.reference_number}
                      <span> &nbsp;•&nbsp; </span>
                      {formatAbsoluteDate(event.event_date)}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p
                      className={`text-sm font-semibold ${config.quantityColor}`}
                    >
                      {Number(event.quantity).toFixed(2)} {unitAbbr}
                    </p>
                    <p className="text-xs text-gray-500">
                      {config.quantityLabel}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <PaginationWrapper
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
