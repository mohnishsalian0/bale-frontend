"use client";

import { IconCheck } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { useInfiniteSalesOrders } from "@/lib/query/hooks/sales-orders";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { getPartnerName } from "@/lib/utils/partner";
import { SalesStatusBadge } from "@/components/ui/sales-status-badge";
import {
  getFullProductInfo,
  getOrderDisplayStatus,
} from "@/lib/utils/sales-order";
import type { SalesOrderStatus } from "@/types/database/enums";

interface SalesOrderInfiniteListProps {
  partnerId?: string | null;
  statusFilter?: SalesOrderStatus | SalesOrderStatus[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedOrderId: string | null;
  onSelectOrder: (orderId: string) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

export function SalesOrderInfiniteList({
  partnerId,
  statusFilter,
  searchQuery,
  onSearchChange,
  selectedOrderId,
  onSelectOrder,
  searchPlaceholder = "Search by customer or SO number",
  emptyMessage = "No sales orders found",
}: SalesOrderInfiniteListProps) {
  // Fetch sales orders with infinite scroll
  const {
    data: salesOrdersData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteSalesOrders({
    customerId: partnerId || undefined,
    status: statusFilter,
    search_term: searchQuery || undefined,
  });

  const salesOrders = salesOrdersData?.pages.flatMap((page) => page.data) || [];

  // Handle scroll to trigger infinite loading
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    // Trigger fetch when scrolled 80% down
    if (scrollPercentage > 0.8 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="p-4 border-b border-border shrink-0">
        <Input
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Sales orders list */}
      <div className="flex-1 overflow-y-auto" onScroll={handleScroll}>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">Loading sales orders...</p>
          </div>
        ) : salesOrders.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">{emptyMessage}</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col">
              {salesOrders.map((order) => {
                const isSelected = order.id === selectedOrderId;
                const customerName = order.customer
                  ? getPartnerName(order.customer)
                  : "Unknown";
                const displayStatusData = getOrderDisplayStatus(
                  order.status as SalesOrderStatus,
                  order.delivery_due_date,
                );

                return (
                  <button
                    key={order.id}
                    onClick={() => onSelectOrder(order.id)}
                    className="flex items-center gap-3 p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-medium text-gray-700">
                          SO-{order.sequence_number}
                        </p>
                        <SalesStatusBadge
                          status={displayStatusData.status}
                          text={displayStatusData.text}
                        />
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {getFullProductInfo(order.sales_order_items)}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {customerName} · {formatAbsoluteDate(order.created_at)}
                      </p>
                    </div>

                    {isSelected && (
                      <div className="flex items-center justify-center size-6 rounded-full bg-primary-500 shrink-0">
                        <IconCheck className="size-4 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Loading more indicator */}
            {isFetchingNextPage && (
              <div className="flex items-center justify-center py-4 border-t border-border">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
                <p className="text-sm text-gray-500 ml-3">Loading more...</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
