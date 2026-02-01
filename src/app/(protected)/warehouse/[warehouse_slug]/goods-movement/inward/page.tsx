"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/contexts/session-context";
import { useGoodsInwards } from "@/lib/query/hooks/stock-flow";
import { PaginationWrapper } from "@/components/ui/pagination-wrapper";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { formatMonthHeader, formatDateWithOrdinal } from "@/lib/utils/date";
import { formatMeasuringUnitQuantities } from "@/lib/utils/measuring-units";
import {
  getSenderName,
  getInwardProductsSummary,
  getInwardQuantitiesByUnit,
} from "@/lib/utils/stock-flow";
import type { MeasuringUnit } from "@/types/database/enums";

interface InwardItem {
  id: string;
  productsSummary: string;
  partnerId: string | null;
  senderName: string;
  date: string;
  quantities: Map<MeasuringUnit, number>;
  billNumber: string;
  sequenceNumber: number;
}

interface MonthGroup {
  month: string;
  monthYear: string;
  items: InwardItem[];
}

export default function InwardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { warehouse } = useSession();

  // Get filters from URL
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const selectedPartner = searchParams.get("partner");
  const selectedProduct = searchParams.get("product");
  const searchQuery = searchParams.get("search");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");

  const PAGE_SIZE = 25;

  // Build filters for backend
  const filters = {
    partner_id: selectedPartner || undefined,
    product_id: selectedProduct || undefined,
    search_term: searchQuery || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  };

  // Fetch data
  const {
    data: response,
    isLoading,
    isError,
    refetch,
  } = useGoodsInwards(warehouse.id, filters, currentPage, PAGE_SIZE);

  const inwards = response?.data || [];
  const totalCount = response?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Transform and group by month
  const monthGroups = useMemo(() => {
    const items: InwardItem[] = inwards.map((r) => {
      const senderName = getSenderName(r);
      const productsSummary = getInwardProductsSummary(r);
      const quantities = getInwardQuantitiesByUnit(r);

      return {
        id: r.id,
        productsSummary,
        partnerId: r.partner_id,
        senderName,
        date: r.inward_date,
        quantities,
        billNumber: `GI-${r.sequence_number}`,
        sequenceNumber: r.sequence_number,
      };
    });

    // Group by month
    const groups: { [key: string]: MonthGroup } = {};

    items.forEach((item) => {
      const date = new Date(item.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthDisplay = formatMonthHeader(date);

      if (!groups[monthKey]) {
        groups[monthKey] = {
          month: monthDisplay,
          monthYear: monthKey,
          items: [],
        };
      }

      groups[monthKey].items.push(item);
    });

    return Object.values(groups).sort((a, b) =>
      b.monthYear.localeCompare(a.monthYear),
    );
  }, [inwards]);

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    router.push(
      `/warehouse/${warehouse.slug}/goods-movement/inward?${params.toString()}`,
    );
  };

  // Loading state
  if (isLoading) {
    return <LoadingState message="Loading inwards..." />;
  }

  // Error state
  if (isError) {
    return (
      <ErrorState
        title="Failed to load inwards"
        message="Unable to fetch goods inward records"
        onRetry={refetch}
      />
    );
  }

  return (
    <>
      {/* List */}
      <div className="flex flex-col">
        {monthGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-600 mb-2">No inward transactions found</p>
            <p className="text-sm text-gray-500">
              {searchQuery || selectedProduct || selectedPartner || dateFrom
                ? "Try adjusting your search or filters"
                : "Start by adding a goods inward"}
            </p>
          </div>
        ) : (
          monthGroups.map((group) => (
            <div key={group.monthYear} className="flex flex-col">
              {/* Month Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 border-t border-dashed border-gray-300 bg-gray-100">
                <p className="text-xs font-semibold text-gray-700">
                  {group.month}
                </p>
              </div>

              {/* Transaction Items */}
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() =>
                    router.push(
                      `/warehouse/${warehouse.slug}/goods-inward/${item.sequenceNumber}`,
                    )
                  }
                  className="flex gap-4 p-4 border-t border-dashed border-gray-300 hover:bg-gray-100 hover:cursor-pointer transition-colors"
                >
                  <div className="flex-3 text-left">
                    <p className="text-base font-medium text-gray-700">
                      From {item.senderName}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {item.productsSummary}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      GI-{item.sequenceNumber}
                      <span> &nbsp;•&nbsp; </span>
                      {formatDateWithOrdinal(item.date)}
                    </p>
                  </div>
                  <div className="flex-1 items-end justify-center text-right text-wrap">
                    <p className="text-sm font-semibold text-yellow-700">
                      {formatMeasuringUnitQuantities(item.quantities)}
                    </p>
                    <p className="text-xs text-gray-500">In</p>
                  </div>
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <PaginationWrapper
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </>
  );
}
