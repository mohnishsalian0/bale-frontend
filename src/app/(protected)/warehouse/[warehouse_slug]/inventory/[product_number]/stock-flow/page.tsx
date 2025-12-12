"use client";

import { use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconBox } from "@tabler/icons-react";
import { TabPills } from "@/components/ui/tab-pills";
import { PaginationWrapper } from "@/components/ui/pagination-wrapper";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import { useSession } from "@/contexts/session-context";
import { useProductWithInventoryByNumber } from "@/lib/query/hooks/products";
import { useStockUnitsWithInward } from "@/lib/query/hooks/stock-units";
import { useOutwardItemsByProduct } from "@/lib/query/hooks/stock-flow";
import type { MeasuringUnit } from "@/types/database/enums";
import { getReceiverName, getSenderName } from "@/lib/utils/stock-flow";

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    product_number: string;
  }>;
}

interface InwardFlow {
  type: "inward";
  id: string;
  sequence_number: number;
  date: string;
  sender: string;
  quantity: number;
}

interface OutwardFlow {
  type: "outward";
  id: string;
  sequence_number: number;
  date: string;
  receiver: string;
  quantity: number;
}

type FlowItem = InwardFlow | OutwardFlow;

export default function StockFlowPage({ params }: PageParams) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { product_number, warehouse_slug } = use(params);
  const { warehouse } = useSession();

  // Get current page from URL (default to 1)
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const PAGE_SIZE = 25;

  // Filter: "inward" | "outward" - get from URL params or default to "inward"
  const selectedFilter = (searchParams.get("filter") || "inward") as
    | "inward"
    | "outward";

  // Determine which view is active
  const isInwardView = selectedFilter === "inward";

  // Fetch product (will use cached data from layout)
  const { data: product, isLoading: productLoading } =
    useProductWithInventoryByNumber(product_number, warehouse.id);

  // Fetch data based on selected filter (only one type at a time)
  // Pass correct page number based on active view to prevent unused query from running at wrong offset
  const {
    data: inwardsResponse,
    isLoading: inwardsLoading,
    isError: inwardsError,
    refetch: refetchInwards,
  } = useStockUnitsWithInward(
    warehouse.id,
    { product_id: product?.id },
    isInwardView ? currentPage : 1,
    PAGE_SIZE,
  );

  // Fetch outwards with pagination (only if outward view is active)
  const {
    data: outwardsResponse,
    isLoading: outwardsLoading,
    isError: outwardsError,
    refetch: refetchOutwards,
  } = useOutwardItemsByProduct(
    product?.id || null,
    !isInwardView ? currentPage : 1,
    PAGE_SIZE,
  );

  // Use only the selected filter's data
  const loading = isInwardView
    ? inwardsLoading || productLoading
    : outwardsLoading || productLoading;
  const error = isInwardView ? inwardsError : outwardsError;

  // Only use data for the active filter
  const inwardItems = isInwardView ? inwardsResponse?.data || [] : [];
  const outwardItems = isInwardView ? [] : outwardsResponse?.data || [];

  const inwardTotalCount = inwardsResponse?.totalCount || 0;
  const outwardTotalCount = outwardsResponse?.totalCount || 0;
  const totalCount = isInwardView ? inwardTotalCount : outwardTotalCount;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const unitAbbr = product
    ? getMeasuringUnitAbbreviation(product.measuring_unit as MeasuringUnit)
    : "";

  // Transform inward items - group by goods_inward to avoid duplicates
  const inwardFlows: InwardFlow[] = [];
  if (isInwardView) {
    const inwardMap = new Map<string, InwardFlow>();
    inwardItems
      .filter((item) => item.goods_inward)
      .forEach((item) => {
        const inward = item.goods_inward!;
        const sender = getSenderName(inward);

        if (inwardMap.has(inward.id)) {
          // Add quantity to existing entry
          const existing = inwardMap.get(inward.id)!;
          existing.quantity += item.initial_quantity || 0;
        } else {
          // Create new entry
          inwardMap.set(inward.id, {
            type: "inward" as const,
            id: inward.id,
            sequence_number: inward.sequence_number,
            date: inward.inward_date,
            sender,
            quantity: item.initial_quantity || 0,
          });
        }
      });
    inwardFlows.push(...Array.from(inwardMap.values()));
  }

  // Transform outward items - group by goods_outward to avoid duplicates
  const outwardFlows: OutwardFlow[] = [];
  if (!isInwardView) {
    const outwardMap = new Map<string, OutwardFlow>();
    outwardItems
      .filter((item) => item.outward)
      .forEach((item) => {
        const outward = item.outward!;
        const receiver = getReceiverName(outward);

        if (outwardMap.has(outward.id)) {
          // Add quantity to existing entry
          const existing = outwardMap.get(outward.id)!;
          existing.quantity += item.quantity_dispatched || 0;
        } else {
          // Create new entry
          outwardMap.set(outward.id, {
            type: "outward" as const,
            id: outward.id,
            sequence_number: outward.sequence_number,
            date: outward.outward_date,
            receiver,
            quantity: item.quantity_dispatched || 0,
          });
        }
      });
    outwardFlows.push(...Array.from(outwardMap.values()));
  }

  // Get current flows based on filter
  const currentFlows: FlowItem[] = isInwardView ? inwardFlows : outwardFlows;

  // Sort by date (latest first)
  currentFlows.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const handleFilterChange = (filter: string) => {
    router.push(
      `/warehouse/${warehouse_slug}/inventory/${product_number}/stock-flow?filter=${filter}&page=1`,
    );
  };

  const handlePageChange = (page: number) => {
    router.push(
      `/warehouse/${warehouse_slug}/inventory/${product_number}/stock-flow?filter=${selectedFilter}&page=${page}`,
    );
  };

  if (loading) {
    return <LoadingState message="Loading stock flow..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load stock flow"
        message="Unable to fetch stock flow data"
        onRetry={() => {
          if (isInwardView) {
            refetchInwards();
          } else {
            refetchOutwards();
          }
        }}
      />
    );
  }

  const noData =
    currentFlows.length === 0 && (isInwardView ? currentPage === 1 : true);

  if (noData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <IconBox className="size-12 text-gray-400 mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          No stock flow
        </h3>
        <p className="text-sm text-gray-500 text-center">
          No {selectedFilter} transactions found for this product
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Filter */}
      <div className="flex gap-4 px-4 py-4">
        <TabPills
          options={[
            { value: "inward", label: "Inward" },
            { value: "outward", label: "Outward" },
          ]}
          value={selectedFilter}
          onValueChange={handleFilterChange}
        />
      </div>

      {/* Flow List */}
      <div className="flex flex-col">
        {currentFlows.map((flow) => (
          <button
            key={`${flow.type}-${flow.id}`}
            onClick={() => {
              const path =
                flow.type === "inward"
                  ? `/warehouse/${warehouse.slug}/goods-inward/${flow.sequence_number}`
                  : `/warehouse/${warehouse.slug}/goods-outward/${flow.sequence_number}`;
              router.push(path);
            }}
            className="flex items-center gap-4 p-4 border-t border-dashed border-gray-300 hover:bg-gray-100 hover:cursor-pointer transition-colors"
          >
            <div className="flex-3 text-left">
              <p className="text-base font-medium text-gray-700">
                {flow.type === "inward"
                  ? `From ${flow.sender}`
                  : `To ${flow.receiver}`}
              </p>
              <p className="text-sm text-left text-gray-500 mt-1">
                {flow.type === "inward" ? "GI" : "GO"}-{flow.sequence_number}
                <span> &nbsp;•&nbsp; </span>
                {formatAbsoluteDate(flow.date)}
              </p>
            </div>
            <div className="flex-1 text-right text-wrap">
              <p
                className={`text-sm font-semibold ${
                  flow.type === "inward" ? "text-yellow-700" : "text-teal-700"
                }`}
              >
                {flow.quantity.toFixed(2)} {unitAbbr}
              </p>
              <p className="text-xs text-gray-500">
                {flow.type === "inward" ? "In" : "Out"}
              </p>
            </div>
          </button>
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
