"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { IconSearch, IconTruckDelivery } from "@tabler/icons-react";
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
import { TransferStatusBadge } from "@/components/ui/transfer-status-badge";
import { useSession } from "@/contexts/session-context";
import { useGoodsTransfers } from "@/lib/query/hooks/goods-transfers";
import { useWarehouses } from "@/lib/query/hooks/warehouses";
import { useInfiniteProducts } from "@/lib/query/hooks/products";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatMonthHeader, formatDateWithOrdinal } from "@/lib/utils/date";
import { formatMeasuringUnitQuantities } from "@/lib/utils/measuring-units";
import {
  getTransferWarehousesName,
  getTransferProductsSummary,
  getTransferQuantitiesByUnit,
} from "@/lib/utils/stock-flow";
import type { MeasuringUnit, TransferStatus } from "@/types/database/enums";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";

interface TransferItem {
  id: string;
  status: TransferStatus;
  productsSummary: string;
  warehousesName: string;
  date: string;
  quantities: Map<MeasuringUnit, number>;
  billNumber: string;
  sequenceNumber: number;
}

interface MonthGroup {
  month: string;
  monthYear: string;
  items: TransferItem[];
}

export default function GoodsTransferPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { warehouse } = useSession();
  const isMobile = useIsMobile();

  // Get filters from URL
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const selectedFromWarehouse = searchParams.get("from_warehouse");
  const selectedToWarehouse = searchParams.get("to_warehouse");
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
    from_warehouse_id: selectedFromWarehouse || undefined,
    to_warehouse_id: selectedToWarehouse || undefined,
    product_id: selectedProduct || undefined,
    search_term: searchQuery || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  };

  // Fetch data
  const {
    data: response,
    isLoading: transfersLoading,
    isError,
    refetch,
  } = useGoodsTransfers(warehouse.id, filters, currentPage, PAGE_SIZE);

  const { data: warehouses = [], isLoading: warehousesLoading } =
    useWarehouses();

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

  const transfers = response?.data || [];
  const totalCount = response?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const products = productsData?.pages.flatMap((page) => page.data) || [];

  const loading = transfersLoading || warehousesLoading || productsLoading;

  // Transform and group by month
  const monthGroups = useMemo(() => {
    const items: TransferItem[] = transfers.map((t) => {
      const warehousesName = getTransferWarehousesName(t);
      const status = t.status as TransferStatus;
      const productsSummary = getTransferProductsSummary(t);
      const quantities = getTransferQuantitiesByUnit(t);

      return {
        id: t.id,
        status,
        productsSummary,
        warehousesName,
        date: t.transfer_date,
        quantities,
        billNumber: `GT-${t.sequence_number}`,
        sequenceNumber: t.sequence_number,
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
  }, [transfers]);

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
      `/warehouse/${warehouse.slug}/goods-transfer?${params.toString()}`,
    );
  };

  const handleSearchChange = (value: string) => {
    updateFilters({ search: value || undefined });
  };

  const handleFromWarehouseChange = (value: string) => {
    updateFilters({ from_warehouse: value });
  };

  const handleToWarehouseChange = (value: string) => {
    updateFilters({ to_warehouse: value });
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
      `/warehouse/${warehouse.slug}/goods-transfer?${params.toString()}`,
    );
  };

  // Loading state
  if (loading) {
    return <LoadingState message="Loading transfers..." />;
  }

  // Error state
  if (isError) {
    return (
      <ErrorState
        title="Failed to load transfers"
        message="Unable to fetch goods transfer records"
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
            <h1 className="text-3xl font-bold text-gray-900">
              Goods Transfer
            </h1>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Input
              type="text"
              placeholder="Search by bill number"
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
            alt="Goods Transfer"
            width={140}
            height={120}
            priority
            className="object-contain"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 px-4 py-4 overflow-x-auto scrollbar-hide shrink-0">
        {/* From Warehouse Filter */}
        <Select
          value={selectedFromWarehouse || "all"}
          onValueChange={handleFromWarehouseChange}
        >
          <SelectTrigger className="flex-shrink-0 h-10 max-w-34">
            <SelectValue placeholder="From warehouse" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All warehouses</SelectItem>
            {warehouses.map((wh) => (
              <SelectItem key={wh.id} value={wh.id}>
                {wh.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* To Warehouse Filter */}
        <Select
          value={selectedToWarehouse || "all"}
          onValueChange={handleToWarehouseChange}
        >
          <SelectTrigger className="flex-shrink-0 h-10 max-w-34">
            <SelectValue placeholder="To warehouse" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All warehouses</SelectItem>
            {warehouses.map((wh) => (
              <SelectItem key={wh.id} value={wh.id}>
                {wh.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Product Filter */}
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
        <DateRangePicker date={dateRange} onDateChange={handleDateRangeChange} />
      </div>

      {/* List */}
      <div className="flex flex-col">
        {monthGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-600 mb-2">No transfer transactions found</p>
            <p className="text-sm text-gray-500">
              {searchQuery ||
              selectedProduct ||
              selectedFromWarehouse ||
              selectedToWarehouse ||
              dateFrom
                ? "Try adjusting your search or filters"
                : "Start by adding a goods transfer"}
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
                      `/warehouse/${warehouse.slug}/goods-transfer/${item.sequenceNumber}`,
                    )
                  }
                  className="flex gap-4 p-4 border-t border-dashed border-gray-300 hover:bg-gray-100 hover:cursor-pointer transition-colors"
                >
                  <div className="flex-3 text-left">
                    <p className="text-base font-medium text-gray-700">
                      {item.warehousesName}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {item.productsSummary}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      GT-{item.sequenceNumber}
                      <span> &nbsp;•&nbsp; </span>
                      {formatDateWithOrdinal(item.date)}
                    </p>
                  </div>
                  <div className="flex-1 items-end justify-center text-right text-wrap">
                    <p className="text-sm font-semibold text-primary-700">
                      {formatMeasuringUnitQuantities(item.quantities)}
                    </p>
                    <p className="text-xs text-gray-500">Transfer</p>
                    <TransferStatusBadge
                      status={item.status}
                      className="mt-1"
                    />
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
          router.push(`/warehouse/${warehouse.slug}/goods-transfer/create`)
        }
      >
        <IconTruckDelivery className="size-6" stroke={1.5} />
      </Fab>
    </div>
  );
}
