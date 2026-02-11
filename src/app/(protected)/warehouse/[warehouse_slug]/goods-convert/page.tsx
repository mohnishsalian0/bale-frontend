"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { IconSearch, IconRecycle } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Fab } from "@/components/ui/fab";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { PaginationWrapper } from "@/components/ui/pagination-wrapper";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { ConvertStatusBadge } from "@/components/ui/convert-status-badge";
import { useSession } from "@/contexts/session-context";
import { useGoodsConverts } from "@/lib/query/hooks/goods-converts";
import { usePartners } from "@/lib/query/hooks/partners";
import { useInfiniteProducts } from "@/lib/query/hooks/products";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatMonthHeader, formatDateWithOrdinal } from "@/lib/utils/date";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import {
  getConvertNumber,
  getInputProductsSummary,
  getInputQuantitiesByUnit,
} from "@/lib/utils/goods-convert";
import type { MeasuringUnit, ConvertStatus } from "@/types/database/enums";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";

interface ConvertItem {
  id: string;
  status: ConvertStatus;
  serviceType: string;
  vendorName: string;
  outputProduct: string;
  inputProductsSummary: string;
  date: string;
  inputQuantities: Map<MeasuringUnit, number>;
  outputQuantity: number;
  outputMeasuringUnit: MeasuringUnit;
  convertNumber: string;
  sequenceNumber: number;
}

interface MonthGroup {
  month: string;
  monthYear: string;
  items: ConvertItem[];
}

export default function GoodsConvertPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { warehouse } = useSession();
  const isMobile = useIsMobile();

  // Get filters from URL
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const selectedStatus = searchParams.get("status");
  const selectedVendor = searchParams.get("vendor");
  const selectedProduct = searchParams.get("product");
  const searchQuery = searchParams.get("search");
  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");

  // Parse date range from URL
  const dateRange: DateRange | undefined =
    dateFrom || dateTo
      ? {
          from: dateFrom ? new Date(dateFrom) : undefined,
          to: dateTo ? new Date(dateTo) : undefined,
        }
      : undefined;

  const PAGE_SIZE = 25;

  // Build filters for backend
  const filters = {
    status: selectedStatus || undefined,
    vendor_id: selectedVendor || undefined,
    product_id: selectedProduct || undefined,
    search_term: searchQuery || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  };

  // Fetch data
  const {
    data: response,
    isLoading: convertsLoading,
    isError,
    refetch,
  } = useGoodsConverts(warehouse.id, filters, currentPage, PAGE_SIZE);

  const { data: partners = [], isLoading: partnersLoading } = usePartners({
    partner_type: "vendor",
  });

  const {
    data: productsData,
    isLoading: productsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteProducts(
    {
      is_active: true,
    },
    100,
  );

  const converts = response?.data || [];
  const totalCount = response?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const products = productsData?.pages.flatMap((page) => page.data) || [];

  const loading = convertsLoading || partnersLoading || productsLoading;

  // Transform and group by month
  const monthGroups = useMemo(() => {
    const items: ConvertItem[] = converts.map((c) => {
      const status = c.status as ConvertStatus;
      const serviceType = c.service_type?.name || "Unknown Service";
      const vendorName = c.vendor?.display_name || "Unknown Vendor";
      const outputProduct = c.output_product?.name || "Unknown Product";
      const inputProductsSummary = getInputProductsSummary(c);
      const inputQuantities = getInputQuantitiesByUnit(c);
      const outputMeasuringUnit = c.output_product
        ?.measuring_unit as MeasuringUnit;

      // Calculate output quantities from output stock units (only if completed)
      const outputQuantity = (c.output_stock_units ?? []).reduce(
        (sum, unit) => sum + unit.initial_quantity,
        0,
      );

      return {
        id: c.id,
        status,
        serviceType,
        vendorName,
        outputProduct,
        inputProductsSummary,
        date: c.start_date,
        inputQuantities,
        outputQuantity,
        outputMeasuringUnit,
        convertNumber: getConvertNumber(c.sequence_number),
        sequenceNumber: c.sequence_number,
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
  }, [converts]);

  // Update URL with new filter values
  const updateFilters = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    // Reset to page 1 when filters change
    params.set("page", "1");

    router.push(
      `/warehouse/${warehouse.slug}/goods-convert?${params.toString()}`,
    );
  };

  const handleSearchChange = (value: string) => {
    updateFilters({ search: value || undefined });
  };

  const handleStatusChange = (value: string) => {
    updateFilters({ status: value });
  };

  const handleVendorChange = (value: string) => {
    updateFilters({ vendor: value });
  };

  const handleProductChange = (value: string) => {
    updateFilters({ product: value });
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    updateFilters({
      date_from: range?.from?.toISOString().split("T")[0],
      date_to: range?.to?.toISOString().split("T")[0],
    });
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", page.toString());
    router.push(
      `/warehouse/${warehouse.slug}/goods-convert?${params.toString()}`,
    );
  };

  // Loading state
  if (loading) {
    return <LoadingState message="Loading conversions..." />;
  }

  // Error state
  if (isError) {
    return (
      <ErrorState
        title="Failed to load conversions"
        message="Unable to fetch goods convert records"
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="relative flex flex-col">
      {/* Header */}
      <div
        className={`flex items-end justify-between gap-4 p-4 pb-0 ${isMobile && "flex-col-reverse items-start"}`}
      >
        <div className={`${isMobile ? "w-full" : "flex-1"}`}>
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Goods Convert</h1>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Input
              type="text"
              placeholder="Search by convert number"
              value={searchQuery || ""}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pr-10"
            />
            <IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-gray-700" />
          </div>
        </div>

        {/* Mascot */}
        <div className="relative size-35 shrink-0 flex items-end">
          <Image
            src="/mascot/truck-delivery.png"
            alt="Goods Convert"
            width={140}
            height={120}
            priority
            className="object-contain"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 px-4 py-4 overflow-x-auto scrollbar-hide shrink-0">
        {/* Status Filter */}
        <Select
          value={selectedStatus || "all"}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="flex-shrink-0 h-10 max-w-34">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {/* Vendor Filter */}
        <Select
          value={selectedVendor || "all"}
          onValueChange={handleVendorChange}
        >
          <SelectTrigger className="flex-shrink-0 h-10 max-w-34">
            <SelectValue placeholder="All vendors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All vendors</SelectItem>
            {partners.map((partner) => (
              <SelectItem key={partner.id} value={partner.id}>
                {partner.display_name ||
                  partner.company_name ||
                  `${partner.first_name} ${partner.last_name}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Product Filter (output product) */}
        <Select
          value={selectedProduct || "all"}
          onValueChange={handleProductChange}
        >
          <SelectTrigger className="flex-shrink-0 h-10 max-w-34">
            <SelectValue placeholder="All products" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All products</SelectItem>
            {products.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name}
              </SelectItem>
            ))}

            {/* Load more */}
            {hasNextPage && (
              <Button
                variant="ghost"
                size="sm"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => fetchNextPage()}
                className="w-full"
              >
                {isFetchingNextPage ? "Loading..." : "Load More"}
              </Button>
            )}
          </SelectContent>
        </Select>

        {/* Date Range Picker */}
        <DateRangePicker
          date={dateRange}
          onDateChange={handleDateRangeChange}
        />
      </div>

      {/* List */}
      <div className="flex flex-col border-b border-border">
        {monthGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-600 mb-2">No conversion records found</p>
            <p className="text-sm text-gray-500">
              {searchQuery ||
              selectedProduct ||
              selectedVendor ||
              selectedStatus ||
              dateFrom
                ? "Try adjusting your search or filters"
                : "Start by creating a goods convert"}
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
                      `/warehouse/${warehouse.slug}/goods-convert/${item.sequenceNumber}`,
                    )
                  }
                  className="flex flex-col gap-2 p-4 border-t border-dashed border-gray-300 hover:bg-gray-100 transition-colors"
                >
                  <div>
                    {/* Title and Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-base font-medium text-gray-700">
                        {item.outputProduct} from {item.vendorName}
                      </p>
                      <ConvertStatusBadge status={item.status} />
                    </div>

                    {/* Input Products Summary */}
                    <div className="flex items-end justify-between mt-1">
                      <div>
                        <p className="text-sm text-gray-500 text-left">
                          {item.inputProductsSummary}
                        </p>
                        <p className="text-xs text-gray-500 text-left mt-1">
                          {item.convertNumber}
                          <span> • </span>
                          {formatDateWithOrdinal(item.date)}
                          <span> • </span>
                          {item.serviceType}
                        </p>
                      </div>

                      {/* Convert Number, Date, Service Type, and Quantity */}
                      <div>
                        {item.status === "completed" && (
                          <p className="text-sm font-semibold text-gray-700 text-right text-nowrap">
                            {item.outputQuantity}{" "}
                            {getMeasuringUnitAbbreviation(
                              item.outputMeasuringUnit,
                            )}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 text-right">
                          {item.status === "completed" && "output"}
                        </p>
                      </div>
                    </div>
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

      {/* Floating Action Button */}
      <Fab
        className="fixed bottom-20 right-4"
        onClick={() =>
          router.push(`/warehouse/${warehouse.slug}/goods-convert/create`)
        }
      >
        <IconRecycle className="size-6" stroke={1.5} />
      </Fab>
    </div>
  );
}
