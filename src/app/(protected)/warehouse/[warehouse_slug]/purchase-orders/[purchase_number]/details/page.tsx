"use client";

import { use, useMemo } from "react";
import {
  IconPackage,
  IconCash,
  IconBuildingWarehouse,
  IconNote,
  IconMapPin,
  IconCurrencyRupee,
  IconPercentage,
  IconCalendar,
  IconFileInvoice,
} from "@tabler/icons-react";
import { Progress } from "@/components/ui/progress";
import ImageWrapper from "@/components/ui/image-wrapper";
import { getInitials } from "@/lib/utils/initials";
import { formatCurrency } from "@/lib/utils/financial";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import { getPartnerName, getFormattedAddress } from "@/lib/utils/partner";
import {
  DisplayStatus,
  getAgentName,
  getOrderDisplayStatus,
} from "@/lib/utils/purchase-order";
import type {
  MeasuringUnit,
  StockType,
  DiscountType,
  PurchaseOrderStatus,
} from "@/types/database/enums";
import { Section } from "@/components/layouts/section";
import { getProductIcon } from "@/lib/utils/product";
import { usePurchaseOrderByNumber } from "@/lib/query/hooks/purchase-orders";
import { getStatusConfig } from "@/components/ui/purchase-status-badge";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { calculateOrderFinancials } from "@/lib/utils/financial";

interface PageParams {
  params: Promise<{
    purchase_number: string;
  }>;
}

export default function PurchaseOrderDetailsPage({ params }: PageParams) {
  const { purchase_number } = use(params);

  // Fetch purchase order using TanStack Query
  const {
    data: order,
    isLoading,
    isError,
  } = usePurchaseOrderByNumber(purchase_number);

  // Calculate financials
  const financials = useMemo(() => {
    if (!order) return null;
    const itemTotal = order.purchase_order_items.reduce(
      (sum, item) => sum + (item.line_total || 0),
      0,
    );
    return calculateOrderFinancials(
      itemTotal,
      order.discount_type as DiscountType,
      order.discount_value || 0,
      order.gst_rate || 10,
    );
  }, [order]);

  // Compute display status (includes 'overdue' logic) using utility
  const displayStatus: DisplayStatus = useMemo(() => {
    if (!order) return "in_progress";
    return getOrderDisplayStatus(
      order.status as PurchaseOrderStatus,
      order.expected_delivery_date,
    );
  }, [order]);

  const progressBarColor = getStatusConfig(displayStatus).color;

  if (isLoading) {
    return <LoadingState message="Loading order details..." />;
  }

  if (isError || !order) {
    return (
      <ErrorState
        title="Could not load order"
        message="An error occurred while fetching the order details."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Line Items Section */}
      <Section
        title={`${order.purchase_order_items.length} items at ₹${formatCurrency(financials?.totalAmount || 0)}`}
        subtitle="Line items"
        icon={() => <IconPackage className="size-5" />}
      >
        <div>
          <ul className="space-y-6">
            {order.purchase_order_items.map((item) => (
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
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.required_quantity}{" "}
                    {getMeasuringUnitAbbreviation(
                      item.product?.measuring_unit as MeasuringUnit,
                    )}
                    {order.status !== "approval_pending" && (
                      <>
                        {" "}
                        ({item.received_quantity || 0}{" "}
                        {getMeasuringUnitAbbreviation(
                          item.product?.measuring_unit as MeasuringUnit,
                        )}{" "}
                        received)
                      </>
                    )}
                  </p>
                  {/* Progress bar */}
                  {order.status !== "approval_pending" && (
                    <Progress
                      size="sm"
                      color={progressBarColor}
                      value={
                        item.required_quantity > 0
                          ? ((item.received_quantity || 0) /
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
                      ` (${order.discount_value || 0}%)`}
                  </span>
                  <span className="font-semibold">
                    -₹{formatCurrency(financials.discountAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-700">
                <span>Item total</span>
                <span className="font-semibold">
                  ₹{formatCurrency(financials.itemTotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-700">
                <span>GST ({order.gst_rate}%)</span>
                <span className="font-semibold">
                  ₹{formatCurrency(financials.gstAmount)}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-gray-700 pt-2 border-t">
                <span>Total</span>
                <span className="font-semibold">
                  ₹{formatCurrency(financials.totalAmount)}
                </span>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Supplier Section */}
      <Section
        title={getPartnerName(order.supplier)}
        subtitle="Supplier"
        icon={() => <>{getInitials(getPartnerName(order.supplier))}</>}
      >
        {getFormattedAddress(order.supplier).length > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-700 flex items-center gap-2">
              <IconMapPin className="size-4" />
              Address
            </span>
            <div className="font-semibold text-gray-700 text-right max-w-[200px]">
              {getFormattedAddress(order.supplier).map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Agent Section (Conditional) */}
      {order.agent && (
        <Section
          title={getAgentName(order.agent)}
          subtitle="Agent"
          icon={() => <>{getInitials(getPartnerName(order.agent))}</>}
        />
      )}

      {/* Payment Terms Section */}
      <Section
        title={order.payment_terms || "NET 30"}
        subtitle="Payment terms"
        icon={() => <IconCash className="size-5" />}
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
                  ? `${order.discount_value || 0}%`
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
        icon={() => <IconBuildingWarehouse className="size-5" />}
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

      {/* Important Dates Section */}
      <Section
        title="Important dates"
        subtitle={formatAbsoluteDate(order.order_date)}
        icon={() => <IconCalendar className="size-5" />}
      >
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-700">Order date</span>
            <span className="font-semibold text-gray-700">
              {formatAbsoluteDate(order.order_date)}
            </span>
          </div>
          {order.expected_delivery_date && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Expected delivery</span>
              <span className="font-semibold text-gray-700">
                {formatAbsoluteDate(order.expected_delivery_date)}
              </span>
            </div>
          )}
        </div>
      </Section>

      {/* Supplier Invoice Section */}
      {order.supplier_invoice_number && (
        <Section
          title={order.supplier_invoice_number}
          subtitle="Supplier invoice"
          icon={() => <IconFileInvoice className="size-5" />}
        />
      )}

      {/* Notes Section */}
      <Section
        title="Order notes"
        subtitle={order.notes || "No note added"}
        icon={() => <IconNote className="size-5" />}
      />

      {/* Status Notes (for cancelled/completed orders) */}
      {order.status_notes && (
        <Section
          title={
            order.status === "cancelled"
              ? "Cancellation reason"
              : "Completion notes"
          }
          subtitle={order.status_notes}
          icon={() => <IconNote className="size-5" />}
        />
      )}
    </div>
  );
}
