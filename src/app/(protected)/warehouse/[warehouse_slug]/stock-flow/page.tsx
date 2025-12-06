"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { IconSearch } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
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
import {
  formatMeasuringUnitQuantities,
  getMeasuringUnit,
} from "@/lib/utils/measuring-units";
import { getPartnerName } from "@/lib/utils/partner";
import { formatMonthHeader } from "@/lib/utils/date";
import type { MeasuringUnit } from "@/types/database/enums";
import {
  useGoodsInwards,
  useGoodsOutwards,
} from "@/lib/query/hooks/stock-flow";
import { usePartners } from "@/lib/query/hooks/partners";
import { useIsMobile } from "@/hooks/use-mobile";

interface StockFlowItem {
  id: string;
  type: "outward" | "inward";
  productName: string;
  partnerId: string | null;
  partnerName: string;
  date: string;
  quantities: Map<MeasuringUnit, number>;
  billNumber: string;
  sequence_number: number;
}

interface MonthGroup {
  month: string;
  monthYear: string;
  inCount: Map<MeasuringUnit, number>;
  outCount: Map<MeasuringUnit, number>;
  items: StockFlowItem[];
}

export default function StockFlowPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { warehouse } = useSession();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"outward" | "inward">(
    "inward",
  );
  const [selectedPartner, setSelectedPartner] = useState("all");

  // Get current page from URL (default to 1)
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const PAGE_SIZE = 25;

  // Determine which view is active
  const isInwardView = selectedFilter === "inward";

  // Fetch data based on selected filter (only one type at a time)
  // Use 'enabled' to prevent the unused query from running
  const {
    data: inwardsResponse,
    isLoading: inwardsLoading,
    isError: inwardsError,
    refetch: refetchInwards,
  } = useGoodsInwards(
    warehouse.id,
    {},
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
    {},
    !isInwardView ? currentPage : 1,
    PAGE_SIZE,
  );
  const { data: partners = [], isLoading: partnersLoading } = usePartners();

  // Use only the selected filter's data
  const loading = isInwardView
    ? inwardsLoading || partnersLoading
    : outwardsLoading || partnersLoading;
  const error = isInwardView ? inwardsError : outwardsError;

  const inwards = isInwardView ? inwardsResponse?.data || [] : [];
  const outwards = isInwardView ? [] : outwardsResponse?.data || [];

  const totalCount = isInwardView
    ? inwardsResponse?.totalCount || 0
    : outwardsResponse?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      router.push(`/warehouse/${warehouse.slug}/stock-flow?page=1`);
    }
  }, [searchQuery, selectedFilter, selectedPartner]);

  // Handle page change
  const handlePageChange = (page: number) => {
    router.push(`/warehouse/${warehouse.slug}/stock-flow?page=${page}`);
  };

  // Transform partners for filter dropdown
  const availablePartners = useMemo(() => {
    return partners.map((partner) => ({
      id: partner.id,
      name: getPartnerName(partner),
    }));
  }, [partners]);

  // Transform and group data
  const { monthGroups, totalReceived, totalOutwarded } = useMemo(() => {
    // Transform inwards
    const inwardItems: StockFlowItem[] = inwards.map((r) => {
      const partnerName = getPartnerName(r.partner);

      const stockUnits = r.stock_units || [];
      const firstProduct = stockUnits[0]?.product;

      // Get unique products
      const uniqueProducts = new Set(
        stockUnits.map((unit) => unit.product?.id).filter(Boolean),
      );
      const productCount = uniqueProducts.size;
      const productName =
        productCount > 1
          ? `${firstProduct?.name || "Unknown Product"}, ${productCount - 1} more`
          : firstProduct?.name || "Unknown Product";

      // Aggregate quantities by measuring unit
      const quantitiesMap = new Map<MeasuringUnit, number>();
      stockUnits.forEach((unit) => {
        const measuringUnit = getMeasuringUnit(unit.product);
        const qty = Number(unit.initial_quantity) || 0;
        quantitiesMap.set(
          measuringUnit,
          (quantitiesMap.get(measuringUnit) || 0) + qty,
        );
      });

      return {
        id: r.id,
        type: "inward" as const,
        productName,
        partnerId: r.partner_id,
        partnerName,
        date: r.inward_date,
        quantities: quantitiesMap,
        billNumber: `GI-${r.sequence_number}`,
        sequence_number: r.sequence_number,
      };
    });

    // Transform outwards
    const outwardItems: StockFlowItem[] = outwards.map((d) => {
      const partnerName = d.partner
        ? d.partner.company_name ||
          `${d.partner.first_name} ${d.partner.last_name}`
        : "Unknown Partner";

      const items = d.goods_outward_items || [];
      const firstProduct = items[0]?.stock_unit?.product;

      // Get unique products
      const uniqueProducts = new Set(
        items.map((item) => item.stock_unit?.product?.id).filter(Boolean),
      );
      const productCount = uniqueProducts.size;
      const productName =
        productCount > 1
          ? `${firstProduct?.name || "Unknown Product"}, ${productCount - 1} more`
          : firstProduct?.name || "Unknown Product";

      // Aggregate quantities by measuring unit
      const quantitiesMap = new Map<MeasuringUnit, number>();
      items.forEach((item) => {
        const measuringUnit = getMeasuringUnit(
          item.stock_unit?.product || null,
        );
        const qty = Number(item.quantity_dispatched) || 0;
        quantitiesMap.set(
          measuringUnit,
          (quantitiesMap.get(measuringUnit) || 0) + qty,
        );
      });

      return {
        id: d.id,
        type: "outward" as const,
        productName,
        partnerId: d.partner_id,
        partnerName,
        date: d.outward_date,
        quantities: quantitiesMap,
        billNumber: `GO-${d.sequence_number}`,
        sequence_number: d.sequence_number,
      };
    });

    // Combine and sort by date
    const allItems = [...outwardItems, ...inwardItems].sort(
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
          inCount: new Map<MeasuringUnit, number>(),
          outCount: new Map<MeasuringUnit, number>(),
          items: [],
        };
      }

      groups[monthKey].items.push(item);

      // Aggregate quantities by unit for month totals
      item.quantities.forEach((qty, unit) => {
        if (item.type === "inward") {
          const currentIn = groups[monthKey].inCount.get(unit) || 0;
          groups[monthKey].inCount.set(unit, currentIn + qty);
        } else {
          const currentOut = groups[monthKey].outCount.get(unit) || 0;
          groups[monthKey].outCount.set(unit, currentOut + qty);
        }
      });
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

    return {
      monthGroups: sortedGroups,
      totalReceived: inwardByUnit,
      totalOutwarded: outwardByUnit,
    };
  }, [inwards, outwards]);

  const filteredGroups = monthGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const matchesSearch =
          item.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.productName.toLowerCase().includes(searchQuery.toLowerCase());

        // Filter is already applied by only fetching one type, so no need to filter again
        const matchesFilter = true;

        const matchesPartner =
          selectedPartner === "all" || item.partnerId === selectedPartner;

        return matchesSearch && matchesFilter && matchesPartner;
      }),
    }))
    .filter((group) => group.items.length > 0);

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
          } else {
            refetchOutwards();
          }
        }}
      />
    );
  }

  return (
    <div className="relative flex flex-col flex-1 overflow-y-auto">
      {/* Header */}
      <div
        className={`flex items-end justify-between gap-4 p-4 pb-0 ${isMobile && "flex-col-reverse items-start"}`}
      >
        <div className={`${isMobile ? "w-full" : "flex-1"}`}>
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Stock flow</h1>
            <p className="text-sm font-medium text-gray-500 mt-2">
              <span className="text-teal-700">
                {formatMeasuringUnitQuantities(totalReceived)} received
              </span>
              <span> & </span>
              <span className="text-yellow-700">
                {formatMeasuringUnitQuantities(totalOutwarded)} dispatched
              </span>
              <span> in past month</span>
            </p>
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
      <div className="flex gap-4 px-4 py-4">
        {/* Tab Pills */}
        <TabPills
          options={[
            { value: "inward", label: "Inward" },
            { value: "outward", label: "Outward" },
          ]}
          value={selectedFilter}
          onValueChange={(value) =>
            setSelectedFilter(value as "outward" | "inward")
          }
        />

        {/* Partner Filter */}
        <Select value={selectedPartner} onValueChange={setSelectedPartner}>
          <SelectTrigger className="flex-1 h-10 max-w-34">
            <SelectValue placeholder="All partners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All partners</SelectItem>
            {availablePartners.map((partner) => (
              <SelectItem key={partner.id} value={partner.id}>
                {partner.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stock Flow List */}
      <div className="flex flex-col">
        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-600 mb-2">No transactions found</p>
            <p className="text-sm text-gray-500">
              {searchQuery
                ? "Try adjusting your search"
                : "Start by adding a outward or inward"}
            </p>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div key={group.monthYear} className="flex flex-col">
              {/* Month Header */}
              <div
                className={`sticky top-0 z-10 flex items-center justify-between px-4 py-2 border-t border-dashed border-gray-300 bg-gray-100`}
              >
                <p className="text-xs font-semibold text-gray-700">
                  {group.month}
                </p>
                <p className="text-sm font-semibold text-right max-w-2/3">
                  <span className="text-teal-700">
                    {formatMeasuringUnitQuantities(group.inCount)}{" "}
                  </span>
                  <span className="text-teal-700 font-normal">In</span>
                  <span>, </span>
                  <span className="text-yellow-700">
                    {formatMeasuringUnitQuantities(group.outCount)}{" "}
                  </span>
                  <span className="text-yellow-700 font-normal">Out</span>
                </p>
              </div>

              {/* Transaction Items */}
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.type === "outward") {
                      router.push(
                        `/warehouse/${warehouse.slug}/goods-outward/${item.sequence_number}`,
                      );
                    } else if (item.type === "inward") {
                      router.push(
                        `/warehouse/${warehouse.slug}/goods-inward/${item.sequence_number}`,
                      );
                    }
                  }}
                  className="flex items-center gap-4 p-4 border-t border-dashed border-gray-300 hover:bg-gray-100 hover:cursor-pointer transition-colors"
                >
                  <div className="flex-3 text-left">
                    <p className="text-base font-medium text-gray-700">
                      {item.productName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {item.partnerName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Goods {item.type} on {formatDate(item.date)}
                    </p>
                  </div>
                  <div className="flex-1 items-end justify-center text-right text-wrap">
                    <p
                      className={`text-sm font-semibold ${
                        item.type === "inward"
                          ? "text-teal-700"
                          : "text-yellow-700"
                      }`}
                    >
                      {formatMeasuringUnitQuantities(item.quantities)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {item.type === "inward" ? "In" : "Out"}
                    </p>
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
            <IconGoodsInward className="size-8 mr-1 fill-gray-500 group-hover:fill-primary-foreground" />
            Goods Inward
          </DropdownMenuItem>
          <DropdownMenuItem
            className="group"
            onSelect={() =>
              router.push(`/warehouse/${warehouse.slug}/goods-outward/create`)
            }
          >
            <IconGoodsOutward className="size-8 mr-1 fill-gray-500 group-hover:fill-primary-foreground" />
            Goods Outward
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
