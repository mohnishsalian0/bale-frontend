"use client";

import { use, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  IconPackage,
  IconCash,
  IconBuildingWarehouse,
  IconNote,
  IconMapPin,
  IconCurrencyRupee,
  IconPercentage,
} from "@tabler/icons-react";
import { Progress } from "@/components/ui/progress";
import ImageWrapper from "@/components/ui/image-wrapper";
import { getInitials } from "@/lib/utils/initials";
import { formatCurrency } from "@/lib/utils/financial";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import {
  getPartnerName,
  getFormattedAddress,
  mapPartnerBillingAddress,
} from "@/lib/utils/partner";
import {
  getAgentName,
  getOrderDisplayStatus,
  type DisplayStatus,
} from "@/lib/utils/sales-order";
import type {
  MeasuringUnit,
  StockType,
  SalesOrderStatus,
} from "@/types/database/enums";
import { Section } from "@/components/layouts/section";
import { getProductIcon } from "@/lib/utils/product";
import { useSalesOrderByNumber } from "@/lib/query/hooks/sales-orders";
import { getStatusConfig } from "@/components/ui/sales-status-badge";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";

interface PageParams {
  params: Promise<{
    sale_number: string;
  }>;
}

export default function SalesOrderDetailsPage({ params }: PageParams) {
  const router = useRouter();
  const { sale_number } = use(params);

  // Fetch sales order using TanStack Query
  const {
    data: order,
    isLoading,
    isError,
  } = useSalesOrderByNumber(sale_number);

  // Get financials from database-calculated values
  const financials = useMemo(() => {
    if (!order) return null;
    const itemTotal = order.sales_order_items.reduce(
      (sum, item) => sum + (item.line_total || 0),
      0,
    );
    return {
      subtotal: itemTotal,
      discountAmount: order.discount_amount || 0,
      afterDiscount: itemTotal - (order.discount_amount || 0),
      gstAmount: order.gst_amount || 0,
      finalTotal: order.total_amount || 0,
    };
  }, [order]);

  // Compute display status (includes 'overdue' logic) using utility
  const displayStatusData = useMemo(() => {
    if (!order)
      return { status: "in_progress" as DisplayStatus, text: "In Progress" };
    return getOrderDisplayStatus(
      order.status as SalesOrderStatus,
      order.delivery_due_date,
    );
  }, [order]);

  const progressBarColor = getStatusConfig(displayStatusData.status).color;

  if (isLoading) {
    return <LoadingState message="Loading order details..." />;
  }

  if (isError || !order) {
    return (
      <ErrorState
        title="Could not load order"
        message="An error occurred while fetching the order details."
        onRetry={() => router.refresh()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Line Items Section */}
      <Section
        title={`${order.sales_order_items.length} items at ₹${formatCurrency(financials?.finalTotal || 0)}`}
        subtitle="Line items"
        icon={() => <IconPackage />}
      >
        <div>
          <ul className="space-y-6">
            {order.sales_order_items.map((item) => (
              <li key={item.id} className="flex gap-3">
                <div className="mt-0.5">
                  <ImageWrapper
                    size="sm"
                    shape="square"
                    imageUrl={item.product?.product_images?.[0]}
                    alt={item.product?.name || ""}
                    placeholderIcon={getProductIcon(
                      item.product?.stock_type as StockType,
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium text-gray-700 truncate"
                    title={item.product?.name}
                  >
                    {item.product?.name || "Unknown Product"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.dispatched_quantity || 0}
                    {" / "}
                    {item.required_quantity}{" "}
                    {getMeasuringUnitAbbreviation(
                      item.product?.measuring_unit as MeasuringUnit,
                    )}{" "}
                    shipped
                  </p>
                  {/* Progress bar */}
                  {displayStatusData.status !== "approval_pending" && (
                    <Progress
                      size="sm"
                      color={progressBarColor}
                      value={
                        item.required_quantity > 0
                          ? ((item.dispatched_quantity || 0) /
                              item.required_quantity) *
                            100
                          : 0
                      }
                      className="max-w-sm mt-1"
                    />
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-700 shrink-0">
                  ₹{formatCurrency(item.line_total || 0)}
                </p>
              </li>
            ))}
          </ul>

          {/* Financial Breakdown */}
          {financials && (
            <div className="space-y-4 pt-3 mt-6 border-t border-border">
              {order.discount_type !== "none" && (
                <div className="flex justify-between text-sm text-gray-700">
                  <span>
                    Discount
                    {order.discount_type === "percentage" &&
                      ` (${order.discount_value}%)`}
                  </span>
                  <span className="font-semibold">
                    -₹{formatCurrency(financials.discountAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-700">
                <span>Item total</span>
                <span className="font-semibold">
                  ₹{formatCurrency(financials.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-700">
                <span>GST</span>
                <span className="font-semibold">
                  ₹{formatCurrency(financials.gstAmount)}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-gray-700 pt-2 border-t">
                <span>Total</span>
                <span className="font-semibold">
                  ₹{formatCurrency(financials.finalTotal)}
                </span>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Customer Section */}
      <Section
        title={getPartnerName(order.customer)}
        subtitle="Customer"
        icon={() => <>{getInitials(getPartnerName(order.customer))}</>}
      >
        {getFormattedAddress(mapPartnerBillingAddress(order.customer)).length > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-700 flex items-center gap-2">
              <IconMapPin className="size-4" />
              Address
            </span>
            <div className="font-semibold text-gray-700 text-right max-w-[200px]">
              {getFormattedAddress(mapPartnerBillingAddress(order.customer)).map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Agent Section (Conditional) */}
      <Section
        title={getAgentName(order.agent)}
        subtitle="Agent"
        icon={() => <>{getInitials(getPartnerName(order.agent))}</>}
      />

      {/* Payment Terms Section */}
      <Section
        title={order.payment_terms || "NET 30"}
        subtitle="Payment terms"
        icon={() => <IconCash />}
      >
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <div className="flex items-center gap-1.5 text-gray-700">
              <IconCurrencyRupee className="size-4 text-gray-500" />
              <span>Advanced amount</span>
            </div>
            <span className="font-semibold text-gray-700">
              ₹{formatCurrency(order.advance_amount || 0)}
            </span>
          </div>
          {order.discount_type !== "none" && (
            <div className="flex justify-between text-sm">
              <div className="flex items-center gap-1.5 text-gray-700">
                {order.discount_type === "percentage" ? (
                  <IconPercentage className="size-4 text-gray-500" />
                ) : (
                  <IconCurrencyRupee className="size-4 text-gray-500" />
                )}
                <span>Discount</span>
              </div>
              <span className="font-semibold text-gray-700">
                {order.discount_type === "percentage"
                  ? `${order.discount_value}%`
                  : `₹${formatCurrency(order.discount_value || 0)}`}
              </span>
            </div>
          )}
        </div>
      </Section>

      {/* Warehouse Section */}
      <Section
        title={order.warehouse?.name || "Unknown Warehouse"}
        subtitle="Warehouse"
        icon={() => <IconBuildingWarehouse />}
      >
        {order.warehouse && getFormattedAddress(order.warehouse).length > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-700 flex items-center gap-2">
              <IconMapPin className="size-4" />
              Address
            </span>
            <div className="font-semibold text-gray-700 text-right max-w-[200px]">
              {getFormattedAddress(order.warehouse).map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Notes Section */}
      <Section
        title="Notes"
        subtitle={!order.notes && !order.status_notes ? "No notes added" : ""}
        icon={() => <IconNote />}
      >
        {(order.notes || order.status_notes) && (
          <div className="space-y-4">
            {order.notes && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  Order notes
                </p>
                <p className="text-sm text-gray-700">{order.notes}</p>
              </div>
            )}
            {order.status_notes &&
              (order.status === "completed" ||
                order.status === "cancelled") && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">
                    {order.status === "completed"
                      ? "Completion notes"
                      : "Cancellation reason"}
                  </p>
                  <p className="text-sm text-gray-700">{order.status_notes}</p>
                </div>
              )}
          </div>
        )}
      </Section>
    </div>
  );
}
