"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { IconSearch, IconTruckDelivery } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TabPills } from "@/components/ui/tab-pills";
import { Fab } from "@/components/ui/fab";
import { DropdownMenu } from "@radix-ui/react-dropdown-menu";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import IconGoodsInward from "@/components/icons/IconGoodsInward";
import IconGoodsOutward from "@/components/icons/IconGoodsOutward";
import { PaginationWrapper } from "@/components/ui/pagination-wrapper";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { useSession } from "@/contexts/session-context";
import { formatMeasuringUnitQuantities } from "@/lib/utils/measuring-units";
import { getPartnerName, getPartnerTypeLabel } from "@/lib/utils/partner";
import { formatMonthHeader } from "@/lib/utils/date";
import type {
  MeasuringUnit,
  PartnerType,
  TransferStatus,
} from "@/types/database/enums";
import {
  useGoodsInwards,
  useGoodsOutwards,
} from "@/lib/query/hooks/stock-flow";
import { useGoodsTransfers } from "@/lib/query/hooks/goods-transfers";
import { usePartners } from "@/lib/query/hooks/partners";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  getInwardProductsSummary,
  getInwardQuantitiesByUnit,
  getOutwardProductsSummary,
  getOutwardQuantitiesByUnit,
  getTransferProductsSummary,
  getTransferQuantitiesByUnit,
  getTransferWarehousesName,
  getReceiverName,
  getSenderName,
} from "@/lib/utils/stock-flow";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { useInfiniteProducts } from "@/lib/query/hooks/products";
import { Button } from "@/components/ui/button";
import { TransferStatusBadge } from "@/components/ui/transfer-status-badge";

interface StockFlowItem {
  id: string;
  type: "outward" | "inward" | "transfer";
  status?: TransferStatus;
  productsSummary: string;
  partnerId: string | null;
  senderOrReceiverName: string;
  date: string;
  quantities: Map<MeasuringUnit, number>;
  billNumber: string;
  sequenceNumber: number;
}

interface MonthGroup {
  month: string;
  monthYear: string;
  items: StockFlowItem[];
}

export default function StockFlowPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { warehouse } = useSession();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [selectedFilter, setSelectedFilter] = useState<
    "outward" | "inward" | "transfer"
  >("inward");
  const [selectedPartner, setSelectedPartner] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Get current page from URL (default to 1)
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const PAGE_SIZE = 25;

  // Determine which view is active
  const isInwardView = selectedFilter === "inward";
  const isOutwardView = selectedFilter === "outward";
  const isTransferView = selectedFilter === "transfer";

  // Build filters for backend
  const inwardFilters = {
    partner_id: selectedPartner !== "all" ? selectedPartner : undefined,
    product_id: selectedProduct !== "all" ? selectedProduct : undefined,
    search_term: debouncedSearchQuery || undefined,
    date_from: dateRange?.from
      ? format(dateRange.from, "yyyy-MM-dd")
      : undefined,
    date_to: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
  };

  const outwardFilters = {
    partner_id: selectedPartner !== "all" ? selectedPartner : undefined,
    product_id: selectedProduct !== "all" ? selectedProduct : undefined,
    search_term: debouncedSearchQuery || undefined,
    date_from: dateRange?.from
      ? format(dateRange.from, "yyyy-MM-dd")
      : undefined,
    date_to: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
  };

  const transferFilters = {
    search_term: debouncedSearchQuery || undefined,
    date_from: dateRange?.from
      ? format(dateRange.from, "yyyy-MM-dd")
      : undefined,
    date_to: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
  };

  // Fetch data based on selected filter (only one type at a time)
  // Use 'enabled' to prevent the unused query from running
  const {
    data: inwardsResponse,
    isLoading: inwardsLoading,
    isError: inwardsError,
    refetch: refetchInwards,
  } = useGoodsInwards(
    warehouse.id,
    inwardFilters,
    isInwardView ? currentPage : 1,
    PAGE_SIZE,
  );
  const {
    data: outwardsResponse,
    isLoading: outwardsLoading,
    isError: outwardsError,
    refetch: refetchOutwards,
  } = useGoodsOutwards(
    warehouse.id,
    outwardFilters,
    isOutwardView ? currentPage : 1,
    PAGE_SIZE,
  );
  const {
    data: transfersResponse,
    isLoading: transfersLoading,
    isError: transfersError,
    refetch: refetchTransfers,
  } = useGoodsTransfers(
    warehouse.id,
    transferFilters,
    isTransferView ? currentPage : 1,
    PAGE_SIZE,
  );
  const { data: partners = [], isLoading: partnersLoading } = usePartners();

  // Fetch products
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

  // Use only the selected filter's data
  const loading = isInwardView
    ? inwardsLoading || partnersLoading || productsLoading
    : isOutwardView
      ? outwardsLoading || partnersLoading || productsLoading
      : transfersLoading || productsLoading;
  const error = isInwardView
    ? inwardsError
    : isOutwardView
      ? outwardsError
      : transfersError;

  const inwards = isInwardView ? inwardsResponse?.data || [] : [];
  const outwards = isOutwardView ? outwardsResponse?.data || [] : [];
  const transfers = isTransferView ? transfersResponse?.data || [] : [];
  const products = productsData?.pages.flatMap((page) => page.data) || [];

  const totalCount = isInwardView
    ? inwardsResponse?.totalCount || 0
    : isOutwardView
      ? outwardsResponse?.totalCount || 0
      : transfersResponse?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Reset to page 1 when server-side filters change (use debounced search)
  useEffect(() => {
    if (currentPage !== 1) {
      router.push(`/warehouse/${warehouse.slug}/stock-flow?page=1`);
    }
  }, [
    debouncedSearchQuery,
    selectedFilter,
    selectedPartner,
    selectedProduct,
    dateRange,
  ]);

  // Handle page change
  const handlePageChange = (page: number) => {
    router.push(`/warehouse/${warehouse.slug}/stock-flow?page=${page}`);
  };

  // Transform inwards
  const monthGroups = useMemo(() => {
    // Transform inwards
    const inwardItems: StockFlowItem[] = inwards.map((r) => {
      const senderName = getSenderName(r);
      const productsSummary = getInwardProductsSummary(r);
      const quantities = getInwardQuantitiesByUnit(r);

      return {
        id: r.id,
        type: "inward" as const,
        productsSummary,
        partnerId: r.partner_id,
        senderOrReceiverName: senderName,
        date: r.inward_date,
        quantities,
        billNumber: `GI-${r.sequence_number}`,
        sequenceNumber: r.sequence_number,
      };
    });

    // Transform outwards
    const outwardItems: StockFlowItem[] = outwards.map((d) => {
      const receiverName = getReceiverName(d);
      const productsSummary = getOutwardProductsSummary(d);
      const quantities = getOutwardQuantitiesByUnit(d);

      return {
        id: d.id,
        type: "outward" as const,
        productsSummary,
        partnerId: d.partner_id,
        senderOrReceiverName: receiverName,
        date: d.outward_date,
        quantities,
        billNumber: `GO-${d.sequence_number}`,
        sequenceNumber: d.sequence_number,
      };
    });

    // Transform transfers
    const transferItems: StockFlowItem[] = transfers.map((t) => {
      const transferName = getTransferWarehousesName(t);
      const status = t.status as TransferStatus;
      const productsSummary = getTransferProductsSummary(t);
      const quantities = getTransferQuantitiesByUnit(t);

      return {
        id: t.id,
        type: "transfer" as const,
        status,
        productsSummary,
        partnerId: null,
        senderOrReceiverName: transferName,
        date: t.transfer_date,
        quantities,
        billNumber: `GT-${t.sequence_number}`,
        sequenceNumber: t.sequence_number,
      };
    });

    // Combine and sort by date
    const allItems = [...outwardItems, ...inwardItems, ...transferItems].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    // Group by month
    const groups: { [key: string]: MonthGroup } = {};

    allItems.forEach((item) => {
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

    const sortedGroups = Object.values(groups).sort((a, b) => {
      // monthYear is now in format "YYYY-MM"
      return b.monthYear.localeCompare(a.monthYear);
    });

    // Calculate totals for past month, aggregated by unit
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const recentInwardItems = inwardItems.filter(
      (item) => new Date(item.date) >= oneMonthAgo,
    );
    const recentOutwardItems = outwardItems.filter(
      (item) => new Date(item.date) >= oneMonthAgo,
    );

    // Aggregate past month totals
    const inwardByUnit = new Map<MeasuringUnit, number>();
    recentInwardItems.forEach((item) => {
      item.quantities.forEach((qty, unit) => {
        inwardByUnit.set(unit, (inwardByUnit.get(unit) || 0) + qty);
      });
    });

    const outwardByUnit = new Map<MeasuringUnit, number>();
    recentOutwardItems.forEach((item) => {
      item.quantities.forEach((qty, unit) => {
        outwardByUnit.set(unit, (outwardByUnit.get(unit) || 0) + qty);
      });
    });

    return sortedGroups;
  }, [inwards, outwards, transfers]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const suffix =
      day === 1 || day === 21 || day === 31
        ? "st"
        : day === 2 || day === 22
          ? "nd"
          : day === 3 || day === 23
            ? "rd"
            : "th";
    const month = date.toLocaleString("en-US", { month: "long" });
    return `${day}${suffix} ${month}`;
  };

  // Loading state
  if (loading) {
    return <LoadingState message="Loading stock flow..." />;
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        title="Failed to load stock flow"
        message="Unable to fetch stock flow"
        onRetry={() => {
          if (isInwardView) {
            refetchInwards();
          } else if (isOutwardView) {
            refetchOutwards();
          } else {
            refetchTransfers();
          }
        }}
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
            <h1 className="text-3xl font-bold text-gray-900">Stock flow</h1>
            {/* <p className="text-sm font-medium text-gray-500 mt-2"> */}
            {/*   <span className="text-yellow-700"> */}
            {/*     {formatMeasuringUnitQuantities(totalReceived)} received */}
            {/*   </span> */}
            {/*   <span> & </span> */}
            {/*   <span className="text-teal-700"> */}
            {/*     {formatMeasuringUnitQuantities(totalOutwarded)} dispatched */}
            {/*   </span> */}
            {/*   <span> in past month</span> */}
            {/* </p> */}
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Input
              type="text"
              placeholder="Search by bill number"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
            />
            <IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-gray-700" />
          </div>
        </div>

        {/* Mascot */}
        <div className="relative size-35 shrink-0 flex items-end">
          <Image
            src="/mascot/truck-delivery.png"
            alt="Stock flow"
            width={140}
            height={120}
            // fill
            priority
            className="object-contain"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 px-4 py-4 overflow-x-auto scrollbar-hide shrink-0">
        {/* Tab Pills */}
        <TabPills
          options={[
            { value: "inward", label: "Inward" },
            { value: "outward", label: "Outward" },
            { value: "transfer", label: "Transfer" },
          ]}
          value={selectedFilter}
          onValueChange={(value) =>
            setSelectedFilter(value as "outward" | "inward" | "transfer")
          }
        />

        {/* Product Filter */}
        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
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
                onMouseDown={(e) => e.preventDefault()} // Prevent dropdown from closing
                onClick={() => fetchNextPage()}
                className="w-full"
              >
                {isFetchingNextPage ? "Loading..." : "Load More"}
              </Button>
            )}
          </SelectContent>
        </Select>

        {/* Partner Filter */}
        <Select value={selectedPartner} onValueChange={setSelectedPartner}>
          <SelectTrigger className="flex-shrink-0 h-10 max-w-34">
            <SelectValue placeholder="All partners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All partners</SelectItem>
            {partners.map((partner) => (
              <SelectItem key={partner.id} value={partner.id}>
                <p>{getPartnerName(partner)}</p>
                <p className="text-xs text-gray-500">
                  {getPartnerTypeLabel(partner.partner_type as PartnerType)}
                </p>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Range Picker */}
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </div>

      {/* Stock Flow List */}
      <div className="flex flex-col">
        {monthGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-600 mb-2">No transactions found</p>
            <p className="text-sm text-gray-500">
              {searchQuery ||
              selectedProduct !== "all" ||
              selectedPartner !== "all" ||
              dateRange
                ? "Try adjusting your search or filters"
                : "Start by adding a outward or inward"}
            </p>
          </div>
        ) : (
          monthGroups.map((group) => (
            <div key={group.monthYear} className="flex flex-col">
              {/* Month Header */}
              <div
                className={`sticky top-0 z-10 flex items-center justify-between px-4 py-2 border-t border-dashed border-gray-300 bg-gray-100`}
              >
                <p className="text-xs font-semibold text-gray-700">
                  {group.month}
                </p>
              </div>

              {/* Transaction Items */}
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.type === "outward") {
                      router.push(
                        `/warehouse/${warehouse.slug}/goods-outward/${item.sequenceNumber}`,
                      );
                    } else if (item.type === "inward") {
                      router.push(
                        `/warehouse/${warehouse.slug}/goods-inward/${item.sequenceNumber}`,
                      );
                    } else if (item.type === "transfer") {
                      router.push(
                        `/warehouse/${warehouse.slug}/goods-transfer/${item.sequenceNumber}`,
                      );
                    }
                  }}
                  className="flex gap-4 p-4 border-t border-dashed border-gray-300 hover:bg-gray-100 hover:cursor-pointer transition-colors"
                >
                  <div className="flex-3 text-left">
                    <p className="text-base font-medium text-gray-700">
                      {item.type === "inward"
                        ? `From ${item.senderOrReceiverName}`
                        : item.type === "outward"
                          ? `To ${item.senderOrReceiverName}`
                          : item.senderOrReceiverName}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {item.productsSummary}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {item.type === "inward"
                        ? "GI"
                        : item.type === "outward"
                          ? "GO"
                          : "GT"}
                      -{item.sequenceNumber}
                      <span> &nbsp;•&nbsp; </span>
                      {formatDate(item.date)}
                    </p>
                  </div>
                  <div className="flex-1 items-end justify-center text-right text-wrap">
                    <p
                      className={`text-sm font-semibold ${
                        item.type === "inward"
                          ? "text-yellow-700"
                          : item.type === "outward"
                            ? "text-teal-700"
                            : "text-primary-700"
                      }`}
                    >
                      {formatMeasuringUnitQuantities(item.quantities)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.type === "inward"
                        ? "In"
                        : item.type === "outward"
                          ? "Out"
                          : "Transfer"}
                    </p>
                    {item.type === "transfer" && item.status && (
                      <TransferStatusBadge
                        status={item.status}
                        className="mt-1"
                      />
                    )}
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild className="focus-visible:ring-0">
          <Fab className="fixed bottom-20 right-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-56 mx-4"
          align="start"
          side="top"
          sideOffset={8}
        >
          <DropdownMenuItem
            className="group"
            onSelect={() =>
              router.push(`/warehouse/${warehouse.slug}/goods-inward/create`)
            }
          >
            <IconGoodsInward className="size-8 mr-1 text-gray-500 group-hover:text-primary-foreground" />
            Goods Inward
          </DropdownMenuItem>
          <DropdownMenuItem
            className="group"
            onSelect={() =>
              router.push(`/warehouse/${warehouse.slug}/goods-outward/create`)
            }
          >
            <IconGoodsOutward className="size-8 mr-1 text-gray-500 group-hover:text-primary-foreground" />
            Goods Outward
          </DropdownMenuItem>
          <DropdownMenuItem
            className="group"
            onSelect={() =>
              router.push(`/warehouse/${warehouse.slug}/goods-transfer/create`)
            }
          >
            <IconTruckDelivery
              className="size-5.5 mr-3.5 text-gray-500 group-hover:text-primary-foreground"
              stroke={1.5}
            />
            Goods Transfer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
