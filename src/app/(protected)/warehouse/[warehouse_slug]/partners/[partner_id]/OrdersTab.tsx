"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { IconShoppingCart } from "@tabler/icons-react";
import { SalesStatusBadge } from "@/components/ui/sales-status-badge";
import { Progress } from "@/components/ui/progress";
import { formatAbsoluteDate } from "@/lib/utils/date";
import {
  calculateCompletionPercentage,
  getOrderDisplayStatus,
  getProductSummary,
  type DisplayStatus,
} from "@/lib/utils/sales-order";
import type { SalesOrderStatus } from "@/types/database/enums";
import type { SalesOrderListView } from "@/lib/queries/sales-orders";

interface MonthGroup {
  month: string;
  monthYear: string;
  orders: SalesOrderListView[];
}

interface OrdersTabProps {
  orders: SalesOrderListView[];
  warehouseSlug: string;
}

export function OrdersTab({ orders, warehouseSlug }: OrdersTabProps) {
  const router = useRouter();

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

  if (orders.length === 0) {
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
    <div>
      {monthGroups.map((group) => (
        <div key={group.monthYear}>
          {/* Month Header */}
          <div className="sticky top-11 z-10 flex items-center justify-between px-4 py-2 border-t border-dashed border-gray-300 bg-gray-200">
            <p className="text-xs font-semibold text-gray-700">{group.month}</p>
          </div>

          {/* Order Items */}
          {group.orders.map((order) => {
            const completionPercentage = calculateCompletionPercentage(
              order.sales_order_items,
            );
            const displayStatus: DisplayStatus = getOrderDisplayStatus(
              order.status as SalesOrderStatus,
              order.expected_delivery_date,
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
                    `/warehouse/${warehouseSlug}/sales-orders/${order.sequence_number}`,
                  )
                }
                className="w-full flex flex-col gap-2 p-4 border-t border-dashed border-gray-300 hover:bg-gray-50 transition-colors"
              >
                {/* Title and Status Badge */}
                <div className="flex items-center justify-between gap-2 text-left">
                  <p className="text-base font-medium text-gray-700 text-left">
                    {"SO-"}
                    {order.sequence_number}
                    {order.expected_delivery_date &&
                      ` • Due on ${formatAbsoluteDate(order.expected_delivery_date)}`}
                  </p>
                  <SalesStatusBadge status={displayStatus} />
                </div>

                {/* Subtexts spanning full width */}
                <div className="flex gap-3 items-center justify-between text-left">
                  <p className="text-xs text-gray-500">
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
  );
}
