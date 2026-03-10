"use client";

import { useState, useMemo, useEffect } from "react";
import { useDebounce } from "@/hooks/use-debounce";
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
import { PaginationWrapper } from "@/components/ui/pagination-wrapper";
import { Fab } from "@/components/ui/fab";
import {
  getJobWorkStatusConfig,
  JobWorkStatusBadge,
} from "@/components/ui/job-work-status-badge";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { useSession } from "@/contexts/session-context";
import { Progress } from "@/components/ui/progress";
import { useJobWorks } from "@/lib/query/hooks/job-works";
import { usePartners } from "@/lib/query/hooks/partners";
import { useInfiniteProducts } from "@/lib/query/hooks/products";
import { useJobWorkAggregates } from "@/lib/query/hooks/aggregates";
import { getPartnerName } from "@/lib/utils/partner";
import { formatMonthHeader } from "@/lib/utils/date";
import {
  calculateCompletionPercentage,
  DisplayStatus,
  getJobWorkDisplayStatus,
  getProductSummary,
} from "@/lib/utils/job-work";
import type { MeasuringUnit, JobWorkStatus } from "@/types/database/enums";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { formatMeasuringUnitQuantities } from "@/lib/utils/measuring-units";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { JobWorkItemListView } from "@/types/job-works.types";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";

interface OrderListItem {
  id: string;
  orderNumber: number;
  vendorId: string;
  vendorName: string;
  items: JobWorkItemListView[];
  dueDate: string | null;
  startDate: string;
  status:
    | "approval_pending"
    | "in_progress"
    | "overdue"
    | "completed"
    | "cancelled";
  statusText: string;
  completionPercentage: number;
  totalAmount: number;
}

interface MonthGroup {
  month: string;
  monthYear: string;
  orders: OrderListItem[];
}

export default function JobWorksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { warehouse } = useSession();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Initialize filters from query params
  const [selectedStatus, setSelectedStatus] = useState(
    searchParams.get("status") || "all",
  );
  const [selectedProduct, setSelectedProduct] = useState("all");
  const [selectedVendor, setSelectedVendor] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  // Get current page from URL (default to 1)
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const PAGE_SIZE = 25;

  // Parse status filter - can be comma-separated like "approval_pending,in_progress"
  const statusFilter =
    selectedStatus !== "all"
      ? selectedStatus.includes(",")
        ? (selectedStatus.split(",") as DisplayStatus[])
        : (selectedStatus as DisplayStatus)
      : undefined;

  // Fetch aggregate stats for all active job works (unfiltered)
  const { data: jobWorkStats } = useJobWorkAggregates({
    warehouseId: warehouse.id,
  });

  // Fetch job works with pagination
  const {
    data: ordersResponse,
    isLoading: ordersLoading,
    isError: ordersError,
  } = useJobWorks({
    filters: {
      warehouseId: warehouse.id,
      search_term: debouncedSearchQuery || undefined,
      status: statusFilter,
      productId: selectedProduct !== "all" ? selectedProduct : undefined,
      vendorId: selectedVendor !== "all" ? selectedVendor : undefined,
      date_from: dateRange?.from
        ? format(dateRange.from, "yyyy-MM-dd")
        : undefined,
      date_to: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
    },
    page: currentPage,
    pageSize: PAGE_SIZE,
  });
  const { data: vendors = [], isLoading: vendorsLoading } = usePartners({
    partner_type: "vendor",
  });

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

  const loading = ordersLoading || vendorsLoading || productsLoading;
  const error = ordersError;

  const orders = ordersResponse?.data || [];
  const totalCount = ordersResponse?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const products = productsData?.pages.flatMap((page) => page.data) || [];

  // Reset to page 1 when filters change
  useEffect(() => {
    if (currentPage !== 1) {
      router.push(`/warehouse/${warehouse.slug}/job-works?page=1`);
    }
  }, [
    debouncedSearchQuery,
    selectedStatus,
    selectedProduct,
    selectedVendor,
    dateRange,
  ]);

  // Handle page change
  const handlePageChange = (page: number) => {
    router.push(`/warehouse/${warehouse.slug}/job-works?page=${page}`);
  };

  // Process orders data using useMemo
  const monthGroups = useMemo(() => {
    if (!orders.length) {
      return [];
    }

    // Transform orders
    const orderItems: OrderListItem[] = orders.map((order) => {
      const vendorName = getPartnerName(order.vendor);

      const items = order.job_work_items;

      // Calculate completion percentage using utility
      const completionPercentage = calculateCompletionPercentage(
        order.job_work_items || [],
      );

      // Determine status (including overdue) using utility
      const displayStatusData = getJobWorkDisplayStatus(
        order.status as JobWorkStatus,
        order.due_date,
      );

      return {
        id: order.id,
        orderNumber: order.sequence_number,
        vendorId: order.vendor_id,
        vendorName,
        items,
        dueDate: order.due_date,
        startDate: order.start_date,
        status: displayStatusData.status,
        statusText: displayStatusData.text,
        completionPercentage,
        totalAmount: order.total_amount || 0,
      };
    });

    // Group by month (based on start date)
    const groups: { [key: string]: MonthGroup } = {};

    orderItems.forEach((order) => {
      const date = new Date(order.startDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthDisplay = formatMonthHeader(date);

      if (!groups[monthKey]) {
        groups[monthKey] = {
          month: monthDisplay,
          monthYear: monthKey,
          orders: [],
        };
      }

      groups[monthKey].orders.push(order);
    });

    return Object.values(groups)
      .map((group) => ({
        ...group,
        orders: group.orders.sort((a, b) => {
          // Sort orders within each month from newest to oldest
          return (
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          );
        }),
      }))
      .sort((a, b) => {
        const [monthA, yearA] = a.monthYear.split(" ");
        const [monthB, yearB] = b.monthYear.split(" ");
        const dateA = new Date(`${monthA} 1, ${yearA}`);
        const dateB = new Date(`${monthB} 1, ${yearB}`);
        return dateB.getTime() - dateA.getTime();
      });
  }, [orders]);

  // Get aggregate stats from hook
  const activeOrdersCount = jobWorkStats?.count || 0;
  const pendingQuantitiesByUnit = formatMeasuringUnitQuantities(
    jobWorkStats?.pending_quantities_by_unit ||
      new Map<MeasuringUnit, number>(),
  );

  // Loading state
  if (loading) {
    return <LoadingState message="Loading job works..." />;
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        title="Failed to load job works"
        message="Unable to fetch job works data"
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="relative flex flex-col grow">
      {/* Header */}
      <div
        className={`flex items-end justify-between gap-4 p-4 pb-0 ${isMobile && "flex-col-reverse items-start"}`}
      >
        <div className={`${isMobile ? "w-full" : "flex-1"}`}>
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Job works</h1>
            <p className="text-sm text-gray-500 mt-2">
              <span className="text-teal-700 font-medium">
                {activeOrdersCount}
              </span>
              <span> active orders</span>
              <span> • </span>
              <span className="text-teal-700 font-medium">
                {pendingQuantitiesByUnit}
              </span>
              <span className="text-gray-500"> pending to receive</span>
            </p>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Input
              type="text"
              placeholder="Search by order number, vendor, product..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              className="pr-10"
            />
            <IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-gray-700" />
          </div>
        </div>

        {/* Mascot */}
        <div className="relative size-30 shrink-0">
          <Image
            src="/illustrations/raw-materials.png"
            alt="Job works"
            fill
            sizes="120px"
            className="object-contain"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 px-4 py-4 overflow-x-auto scrollbar-hide shrink-0">
        {/* Status Filter */}
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="flex-shrink-0 h-10 max-w-34">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="approval_pending">Approval Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

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
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => fetchNextPage()}
                className="w-full"
              >
                {isFetchingNextPage ? "Loading..." : "Load More"}
              </Button>
            )}
          </SelectContent>
        </Select>

        {/* Vendor Filter */}
        <Select value={selectedVendor} onValueChange={setSelectedVendor}>
          <SelectTrigger className="flex-shrink-0 h-10 max-w-34">
            <SelectValue placeholder="All vendors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All vendors</SelectItem>
            {vendors.map((vendor) => (
              <SelectItem key={vendor.id} value={vendor.id}>
                {getPartnerName(vendor)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </div>

      {/* Job Works List */}
      <div className="flex flex-col">
        {monthGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-gray-600 mb-2">No job works found</p>
            <p className="text-sm text-gray-500">
              {searchQuery ||
              selectedStatus !== "all" ||
              selectedProduct !== "all" ||
              selectedVendor !== "all" ||
              dateRange
                ? "Try adjusting your search or filters"
                : "Start by adding a job work"}
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

              {/* Order Items */}
              {group.orders.map((order) => {
                const showProgressBar =
                  order.status === "in_progress" || order.status === "overdue";
                const progressBarColor = getJobWorkStatusConfig(
                  order.status,
                ).color;

                return (
                  <button
                    key={order.id}
                    onClick={() =>
                      router.push(
                        `/warehouse/${warehouse.slug}/job-works/${order.orderNumber}/details`,
                      )
                    }
                    className="flex flex-col gap-2 p-4 border-t border-dashed border-gray-300 hover:bg-gray-100 transition-colors"
                  >
                    {/* Title and Status Badge */}
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-base font-medium text-gray-700">
                          {order.vendorName}
                        </p>
                        <JobWorkStatusBadge
                          status={order.status}
                          text={order.statusText}
                        />
                      </div>

                      {/* Subtexts spanning full width */}
                      <p className="text-sm text-gray-500 text-left mt-1">
                        {getProductSummary(order.items)}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-500">
                          {"JW-"}
                          {order.orderNumber}
                          {order.dueDate &&
                            ` • Due on ${formatAbsoluteDate(order.dueDate)}`}
                        </p>
                        {order.status !== "approval_pending" && (
                          <p className="text-xs text-gray-500">
                            {order.completionPercentage}% received
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {showProgressBar && (
                      <Progress
                        color={progressBarColor}
                        value={order.completionPercentage}
                      />
                    )}
                  </button>
                );
              })}
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
        onClick={() =>
          router.push(`/warehouse/${warehouse.slug}/job-works/create`)
        }
        className="fixed bottom-20 right-4"
      />
    </div>
  );
}
