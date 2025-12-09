"use client";

import { use, useState, useMemo } from "react";
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
import { getPartnerName, getFormattedAddress } from "@/lib/utils/partner";
import { getAgentName, getOrderDisplayStatus, type DisplayStatus } from "@/lib/utils/sales-order";
import type { MeasuringUnit, StockType, DiscountType, SalesOrderStatus } from "@/types/database/enums";
import { Section } from "@/components/layouts/section";
import { getProductIcon } from "@/lib/utils/product";
import { useSalesOrderByNumber } from "@/lib/query/hooks/sales-orders";
import { getStatusConfig } from "@/components/ui/sales-status-badge";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { calculateOrderFinancials } from "@/lib/utils/financial";

// Import Edit Sheets
import { NotesEditSheet } from "../NotesEditSheet";
import { CustomerEditSheet } from "../CustomerEditSheet";
import { AgentEditSheet } from "../AgentEditSheet";
import { WarehouseEditSheet } from "../WarehouseEditSheet";
import { PaymentTermsEditSheet } from "../PaymentTermsEditSheet";
import { TransportEditSheet } from "../TransportEditSheet";


interface PageParams {
  params: Promise<{
    order_number: string;
  }>;
}

export default function SalesOrderDetailsPage({ params }: PageParams) {
  const router = useRouter();
  const { order_number } = use(params);

  // Edit sheet states
  const [showCustomerEdit, setShowCustomerEdit] = useState(false);
  const [showAgentEdit, setShowAgentEdit] = useState(false);
  const [showPaymentTermsEdit, setShowPaymentTermsEdit] = useState(false);
  const [showWarehouseEdit, setShowWarehouseEdit] = useState(false);
  const [showTransportEdit, setShowTransportEdit] = useState(false);
  const [showNotesEdit, setShowNotesEdit] = useState(false);
  
  // Fetch sales order using TanStack Query
  const {
    data: order,
    isLoading,
    isError,
  } = useSalesOrderByNumber(order_number);

  // Calculate financials
  const financials = useMemo(() => {
    if (!order) return null;
    const itemTotal = order.sales_order_items.reduce(
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
      order.status as SalesOrderStatus,
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
        onRetry={() => router.refresh()}
      />
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3 p-4">
        {/* Line Items Section */}
        <Section
          title={`${order.sales_order_items.length} items at ₹${formatCurrency(financials?.totalAmount || 0)}`}
          subtitle="Line items"
          onEdit={() => {}} // TODO: Handle line item edit
          icon={() => <IconPackage className="size-5" />}
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
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.required_quantity}{" "}
                      {getMeasuringUnitAbbreviation(
                        item.product?.measuring_unit as MeasuringUnit,
                      )}
                      {order.status !== "approval_pending" && (
                        <>
                          {" "}
                          ({item.dispatched_quantity || 0}{" "}
                          {getMeasuringUnitAbbreviation(
                            item.product?.measuring_unit as MeasuringUnit,
                          )}{" "}
                          shipped)
                        </>
                      )}
                    </p>
                    {/* Progress bar */}
                    {displayStatus !== "approval_pending" && (
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

        {/* Customer Section */}
        <Section
          title={getPartnerName(order.customer)}
          subtitle="Customer"
          onEdit={() => setShowCustomerEdit(true)}
          icon={() => <>{getInitials(getPartnerName(order.customer))}</>}
        >
          {getFormattedAddress(order.customer).length > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-700 flex items-center gap-2">
                <IconMapPin className="size-4" />
                Address
              </span>
              <div className="font-semibold text-gray-700 text-right max-w-[200px]">
                {getFormattedAddress(order.customer).map((line, index) => (
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
          onEdit={() => setShowAgentEdit(true)}
          icon={() => <>{getInitials(getPartnerName(order.agent))}</>}
        />

        {/* Payment Terms Section */}
        <Section
          title={order.payment_terms || "NET 30"}
          subtitle="Payment terms"
          onEdit={() => setShowPaymentTermsEdit(true)}
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
          onEdit={() => setShowWarehouseEdit(true)}
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

        {/* Notes Section */}
        <Section
          title="Order notes"
          subtitle={order.notes || "No note added"}
          onEdit={() => setShowNotesEdit(true)}
          icon={() => <IconNote className="size-5" />}
        />
      </div>

      {/* Edit Sheets */}
      <CustomerEditSheet
        open={showCustomerEdit}
        onOpenChange={setShowCustomerEdit}
        orderId={order.id}
        currentCustomerId={order.customer_id}
      />

      <AgentEditSheet
        open={showAgentEdit}
        onOpenChange={setShowAgentEdit}
        orderId={order.id}
        currentAgentId={order.agent_id}
      />

      <PaymentTermsEditSheet
        open={showPaymentTermsEdit}
        onOpenChange={setShowPaymentTermsEdit}
        orderId={order.id}
        currentPaymentTerms={order.payment_terms}
        currentAdvanceAmount={order.advance_amount || 0}
        currentDiscountType={order.discount_type as DiscountType}
        currentDiscountValue={order.discount_value || 0}
      />

      <WarehouseEditSheet
        open={showWarehouseEdit}
        onOpenChange={setShowWarehouseEdit}
        orderId={order.id}
        currentWarehouseId={order.warehouse_id || ""}
        hasOutward={order.has_outward || false}
      />

      <TransportEditSheet
        open={showTransportEdit}
        onOpenChange={setShowTransportEdit}
        orderId={order.id}
        currentExpectedDeliveryDate={order.expected_delivery_date}
      />

      <NotesEditSheet
        open={showNotesEdit}
        onOpenChange={setShowNotesEdit}
        orderId={order.id}
        initialNotes={order.notes}
      />
    </>
  );
}
