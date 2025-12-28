"use client";

import { use, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconShoppingCart } from "@tabler/icons-react";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { SalesStatusBadge } from "@/components/ui/sales-status-badge";
import { Progress } from "@/components/ui/progress";
import { PaginationWrapper } from "@/components/ui/pagination-wrapper";
import { formatAbsoluteDate } from "@/lib/utils/date";
import {
  calculateCompletionPercentage,
  getOrderDisplayStatus,
  getProductSummary,
  type DisplayStatus,
} from "@/lib/utils/sales-order";
import type { SalesOrderStatus } from "@/types/database/enums";
import type { SalesOrderListView } from "@/lib/queries/sales-orders";
import { usePartnerWithOrderStats } from "@/lib/query/hooks/partners";
import { useSalesOrders } from "@/lib/query/hooks/sales-orders";

interface MonthGroup {
  month: string;
  monthYear: string;
  orders: SalesOrderListView[];
}

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    partner_id: string;
  }>;
}

export default function PartnerOrdersPage({ params }: PageParams) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { partner_id, warehouse_slug } = use(params);

  // Get current page from URL (default to 1)
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const PAGE_SIZE = 25;

  // Fetch partner to check partner_type
  const {
    data: partner,
    isLoading: partnerLoading,
    isError: partnerError,
  } = usePartnerWithOrderStats(partner_id);

  // Fetch orders for this partner with pagination
  const { data: ordersResponse, isLoading: ordersLoading } = useSalesOrders({
    filters: {
      customerId: partner?.partner_type === "customer" ? partner_id : undefined,
    },
    page: currentPage,
    pageSize: PAGE_SIZE,
  });

  const orders = ordersResponse?.data || [];
  const totalCount = ordersResponse?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const loading = partnerLoading || ordersLoading;

  // Group orders by month
  const monthGroups = useMemo(() => {
    const groups: { [key: string]: MonthGroup } = {};

    orders.forEach((order) => {
      const date = new Date(order.order_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthName = date.toLocaleString("en-US", { month: "long" });
      const year = date.getFullYear();

      if (!groups[monthKey]) {
        groups[monthKey] = {
          month: monthName,
          monthYear: `${monthName} ${year}`,
          orders: [],
        };
      }

      groups[monthKey].orders.push(order);
    });

    // Sort groups by date (newest first)
    return Object.values(groups).sort((a, b) => {
      const [monthA, yearA] = a.monthYear.split(" ");
      const [monthB, yearB] = b.monthYear.split(" ");
      const dateA = new Date(`${monthA} 1, ${yearA}`);
      const dateB = new Date(`${monthB} 1, ${yearB}`);
      return dateB.getTime() - dateA.getTime();
    });
  }, [orders]);

  const handlePageChange = (page: number) => {
    router.push(
      `/warehouse/${warehouse_slug}/partners/${partner_id}/orders?page=${page}`,
    );
  };

  if (loading) {
    return <LoadingState message="Loading orders..." />;
  }

  if (partnerError || !partner) {
    return (
      <ErrorState
        title="Partner not found"
        message="This partner does not exist or has been deleted"
        onRetry={() => router.back()}
        actionText="Go back"
      />
    );
  }

  if (orders.length === 0 && currentPage === 1) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <IconShoppingCart className="size-12 text-gray-400 mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">No orders</h3>
        <p className="text-sm text-gray-500 text-center">
          No orders found for this partner
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Orders List */}
      <div className="flex flex-col">
        {monthGroups.map((group) => (
          <div key={group.monthYear}>
            {/* Month Header */}
            <div className="sticky top-11 z-10 flex items-center justify-between px-4 py-2 border-t border-dashed border-gray-300 bg-gray-100">
              <p className="text-xs font-semibold text-gray-700">
                {group.month}
              </p>
            </div>

            {/* Order Items */}
            {group.orders.map((order) => {
              const completionPercentage = calculateCompletionPercentage(
                order.sales_order_items,
              );
              const displayStatus: DisplayStatus = getOrderDisplayStatus(
                order.status as SalesOrderStatus,
                order.delivery_due_date,
              );
              const showProgressBar =
                displayStatus === "in_progress" || displayStatus === "overdue";
              const progressColor =
                displayStatus === "overdue" ? "yellow" : "blue";

              return (
                <button
                  key={order.id}
                  onClick={() =>
                    router.push(
                      `/warehouse/${warehouse_slug}/sales-orders/${order.sequence_number}`,
                    )
                  }
                  className="w-full flex flex-col gap-2 p-4 border-t border-dashed border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  {/* Title and Status Badge */}
                  <div className="flex items-center justify-between gap-2 text-left">
                    <p className="text-base font-medium text-gray-700 text-left">
                      {"SO-"}
                      {order.sequence_number}
                      {order.delivery_due_date &&
                        ` • Due on ${formatAbsoluteDate(order.delivery_due_date)}`}
                    </p>
                    <SalesStatusBadge status={displayStatus} />
                  </div>

                  {/* Subtexts spanning full width */}
                  <div className="flex gap-3 items-center justify-between text-left">
                    <p className="text-sm text-gray-500">
                      {getProductSummary(order.sales_order_items)}
                    </p>
                    {order.status !== "approval_pending" && (
                      <p className="text-xs text-gray-500 text-right text-nowrap">
                        {completionPercentage}% completed
                      </p>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {showProgressBar && (
                    <Progress
                      color={progressColor}
                      value={completionPercentage}
                    />
                  )}
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
