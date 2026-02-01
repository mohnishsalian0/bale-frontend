"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Image from "next/image";
import {
  IconSearch,
  IconTransferIn,
  IconTransferOut,
} from "@tabler/icons-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useSession } from "@/contexts/session-context";
import { usePartners } from "@/lib/query/hooks/partners";
import { useInfiniteProducts } from "@/lib/query/hooks/products";
import { useIsMobile } from "@/hooks/use-mobile";
import { getPartnerName, getPartnerTypeLabel } from "@/lib/utils/partner";
import type { PartnerType } from "@/types/database/enums";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";

export default function GoodsMovementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { warehouse } = useSession();
  const isMobile = useIsMobile();

  // Get current view from pathname
  const isInwardView = pathname.endsWith("/inward");

  // Get filter values from URL
  const searchQuery = searchParams.get("search") || "";
  const selectedPartner = searchParams.get("partner") || "all";
  const selectedProduct = searchParams.get("product") || "all";
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

  // Fetch partners and products for filters
  const { data: partners = [] } = usePartners();
  const {
    data: productsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteProducts(
    {
      is_active: true,
    },
    100,
  );

  const products = productsData?.pages.flatMap((page) => page.data) || [];

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

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearchChange = (value: string) => {
    updateFilters({ search: value || undefined });
  };

  const handlePartnerChange = (value: string) => {
    updateFilters({ partner: value });
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

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    router.push(
      `/warehouse/${warehouse.slug}/goods-movement/${value}?${params.toString()}`,
    );
  };

  return (
    <div className="relative flex flex-col">
      {/* Header */}
      <div
        className={`flex items-end justify-between gap-4 p-4 pb-0 ${isMobile && "flex-col-reverse items-start"}`}
      >
        <div className={`${isMobile ? "w-full" : "flex-1"}`}>
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              Goods In &amp; Out
            </h1>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Input
              type="text"
              placeholder="Search by bill number"
              value={searchQuery}
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
            alt="Goods Movement"
            width={140}
            height={120}
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
          ]}
          value={isInwardView ? "inward" : "outward"}
          onValueChange={handleTabChange}
        />

        {/* Product Filter */}
        <Select value={selectedProduct} onValueChange={handleProductChange}>
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

        {/* Partner Filter */}
        <Select value={selectedPartner} onValueChange={handlePartnerChange}>
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
        <DateRangePicker
          date={dateRange}
          onDateChange={handleDateRangeChange}
        />
      </div>

      {/* Content (nested routes) */}
      {children}

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
            <IconTransferIn className="mr-1 size-4" />
            Goods Inward
          </DropdownMenuItem>
          <DropdownMenuItem
            className="group"
            onSelect={() =>
              router.push(`/warehouse/${warehouse.slug}/goods-outward/create`)
            }
          >
            <IconTransferOut className="mr-1 size-4" />
            Goods Outward
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
