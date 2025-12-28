"use client";

import { IconCheck } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { useInfinitePurchaseOrders } from "@/lib/query/hooks/purchase-orders";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { getPartnerName } from "@/lib/utils/partner";
import { PurchaseStatusBadge } from "@/components/ui/purchase-status-badge";
import {
  getFullProductInfo,
  getOrderDisplayStatus,
} from "@/lib/utils/purchase-order";
import type { PurchaseOrderStatus } from "@/types/database/enums";

interface PurchaseOrderInfiniteListProps {
  partnerId?: string | null;
  statusFilter?: PurchaseOrderStatus | PurchaseOrderStatus[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedOrderId: string | null;
  onSelectOrder: (orderId: string) => void;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

export function PurchaseOrderInfiniteList({
  partnerId,
  statusFilter,
  searchQuery,
  onSearchChange,
  selectedOrderId,
  onSelectOrder,
  searchPlaceholder = "Search by supplier or PO number",
  emptyMessage = "No purchase orders found",
}: PurchaseOrderInfiniteListProps) {
  // Fetch purchase orders with infinite scroll
  const {
    data: purchaseOrdersData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfinitePurchaseOrders({
    supplierId: partnerId || undefined,
    status: statusFilter,
    search_term: searchQuery || undefined,
  });

  const purchaseOrders =
    purchaseOrdersData?.pages.flatMap((page) => page.data) || [];

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

      {/* Purchase orders list */}
      <div className="flex-1 overflow-y-auto" onScroll={handleScroll}>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">Loading purchase orders...</p>
          </div>
        ) : purchaseOrders.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">{emptyMessage}</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col">
              {purchaseOrders.map((order) => {
                const isSelected = order.id === selectedOrderId;
                const supplierName = order.supplier
                  ? getPartnerName(order.supplier)
                  : "Unknown";
                const displayStatus = getOrderDisplayStatus(
                  order.status as PurchaseOrderStatus,
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
                          PO-{order.sequence_number}
                        </p>
                        <PurchaseStatusBadge status={displayStatus} />
                      </div>
                      <p className="text-sm text-gray-500">
                        {getFullProductInfo(order.purchase_order_items)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {supplierName} · {formatAbsoluteDate(order.created_at)}
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
