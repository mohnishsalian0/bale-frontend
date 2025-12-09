"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SalesStatusBadge } from "@/components/ui/sales-status-badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconDotsVertical, IconPlus } from "@tabler/icons-react";
import {
  calculateCompletionPercentage,
  getOrderDisplayStatus,
  getProductSummary,
  type DisplayStatus,
} from "@/lib/utils/sales-order";
import { getPartnerName } from "@/lib/utils/partner";
import { formatAbsoluteDate } from "@/lib/utils/date";
import type { SalesOrderListView } from "@/types/sales-orders.types";
import type { SalesOrderStatus } from "@/types/database/enums";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/session-context";

interface ActiveSalesOrdersSectionProps {
  orders: SalesOrderListView[];
  warehouseSlug: string;
  onNavigate: (path: string) => void;
}

export function ActiveSalesOrdersSection({
  orders,
  warehouseSlug,
  onNavigate,
}: ActiveSalesOrdersSectionProps) {
  const router = useRouter();
  const { warehouse } = useSession();

  return (
    <div className="flex flex-col mt-6">
      <div className="flex items-center justify-between px-4 py-2">
        <h2 className="text-lg font-bold text-gray-900">Active sales orders</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onNavigate(`/warehouse/${warehouseSlug}/sales-orders/create`)
          }
        >
          <IconPlus className="size-4 mr-1" />
          New order
        </Button>
      </div>

      {orders.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-gray-500">
            No pending or in-progress orders
          </p>
        </div>
      ) : (
        <div className="flex flex-col border-b border-border">
          {orders.map((order) => {
            const displayStatus: DisplayStatus = getOrderDisplayStatus(
              order.status as SalesOrderStatus,
              order.expected_delivery_date,
            );
            const completionPercentage = calculateCompletionPercentage(
              order.sales_order_items,
            );
            const showProgressBar =
              displayStatus === "in_progress" || displayStatus === "overdue";
            const progressColor =
              displayStatus === "overdue" ? "yellow" : "blue";
            const customerName = order.customer
              ? getPartnerName(order.customer)
              : "Unknown Customer";

            return (
              <Card
                key={order.id}
                className="rounded-none border-x-0 border-b-0 shadow-none bg-transparent hover:bg-gray-100"
              >
                <CardContent className="p-4 flex flex-col gap-3">
                  <button
                    onClick={() =>
                      onNavigate(
                        `/warehouse/${warehouseSlug}/sales-orders/${order.sequence_number}`,
                      )
                    }
                    className="flex flex-col gap-2 text-left hover:cursor-pointer"
                  >
                    {/* Title and Status Badge */}
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-base font-medium text-gray-700">
                          {customerName}
                        </p>
                        <SalesStatusBadge status={displayStatus} />
                      </div>

                      {/* Subtexts spanning full width */}
                      <p className="text-sm text-gray-500 mt-2">
                        {getProductSummary(order.sales_order_items)}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-500">
                          SO-{order.sequence_number}
                          {order.expected_delivery_date &&
                            ` • Due on ${formatAbsoluteDate(order.expected_delivery_date)}`}
                        </p>
                        {order.status !== "approval_pending" && (
                          <p className="text-xs text-gray-500">
                            {completionPercentage}% completed
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {showProgressBar && (
                      <Progress
                        color={progressColor}
                        value={completionPercentage}
                      />
                    )}
                  </button>

                  {/* Action Buttons */}
                  <div className="flex">
                    {order.status === "approval_pending" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(
                            `/warehouse/${warehouse.slug}/sales-orders/${order.sequence_number}/approve`,
                          );
                        }}
                      >
                        Approve order
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate(
                              `/warehouse/${warehouseSlug}/goods-outward/create?order=${order.sequence_number}`,
                            );
                          }}
                        >
                          Create outward
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log("Make invoice");
                          }}
                        >
                          Make invoice
                        </Button>
                      </>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="ghost" size="icon-sm">
                          <IconDotsVertical className="size-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {(order.status === "in_progress" ||
                          displayStatus === "overdue") && (
                          <>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log("Mark as complete");
                              }}
                            >
                              Mark as complete
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log("Share");
                          }}
                        >
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log("Download");
                          }}
                        >
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log("Cancel order");
                          }}
                        >
                          Cancel order
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
