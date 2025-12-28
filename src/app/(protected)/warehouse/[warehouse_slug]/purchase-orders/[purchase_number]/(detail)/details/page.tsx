"use client";

import { use, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import type { PurchaseOrderUpdate } from "@/types/purchase-orders.types";
import { Section } from "@/components/layouts/section";
import { getProductIcon } from "@/lib/utils/product";
import { usePurchaseOrderByNumber } from "@/lib/query/hooks/purchase-orders";
import { getStatusConfig } from "@/components/ui/purchase-status-badge";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { usePurchaseOrderMutations } from "@/lib/query/hooks/purchase-orders";
import { toast } from "sonner";

// Import Edit Sheets
import { PartnerEditSheet } from "@/components/layouts/partner-edit-sheet";
import { PaymentTermsEditSheet } from "@/components/layouts/payment-terms-edit-sheet";
import { WarehouseEditSheet } from "@/components/layouts/warehouse-edit-sheet";
import { TransportEditSheet } from "@/components/layouts/transport-edit-sheet";
import { NotesEditSheet } from "@/components/layouts/notes-edit-sheet";

interface PageParams {
  params: Promise<{
    purchase_number: string;
  }>;
}

export default function PurchaseOrderDetailsPage({ params }: PageParams) {
  const router = useRouter();
  const { purchase_number } = use(params);

  // Edit sheet states
  const [showSupplierEdit, setShowSupplierEdit] = useState(false);
  const [showAgentEdit, setShowAgentEdit] = useState(false);
  const [showPaymentTermsEdit, setShowPaymentTermsEdit] = useState(false);
  const [showWarehouseEdit, setShowWarehouseEdit] = useState(false);
  const [showTransportEdit, setShowTransportEdit] = useState(false);
  const [showNotesEdit, setShowNotesEdit] = useState(false);

  // Fetch purchase order using TanStack Query
  const {
    data: order,
    isLoading,
    isError,
  } = usePurchaseOrderByNumber(purchase_number);

  // Get update mutation
  const { update: updateMutation } = usePurchaseOrderMutations(null);

  // Handler for updating purchase order
  const handleUpdate = (
    data: Partial<PurchaseOrderUpdate>,
    onSuccessCallback?: () => void,
  ) => {
    if (!order) return;

    updateMutation.mutate(
      {
        orderId: order.id,
        data,
      },
      {
        onSuccess: () => {
          toast.success("Purchase order updated successfully");
          onSuccessCallback?.();
        },
        onError: (error) => {
          console.error("Error updating purchase order:", error);
          toast.error("Failed to update purchase order");
        },
      },
    );
  };

  // Get financials from database-calculated values
  const financials = useMemo(() => {
    if (!order) return null;
    const itemTotal = order.purchase_order_items.reduce(
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
  const displayStatus: DisplayStatus = useMemo(() => {
    if (!order) return "in_progress";
    return getOrderDisplayStatus(
      order.status as PurchaseOrderStatus,
      order.delivery_due_date,
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

  // Check if order is editable (only in approval_pending status)
  const isEditable = order.status === "approval_pending";

  return (
    <>
      <div className="flex flex-col gap-3 p-4">
        {/* Line Items Section */}
        <Section
          title={`${order.purchase_order_items.length} items at ₹${formatCurrency(financials?.finalTotal || 0)}`}
          subtitle="Line items"
          onEdit={
            isEditable
              ? () =>
                  router.push(
                    `/warehouse/${order.warehouse?.slug || ""}/purchase-orders/${purchase_number}/edit-items`,
                  )
              : undefined
          }
          icon={() => <IconPackage />}
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
                    <p className="text-xs text-gray-500">
                      {item.required_quantity}{" "}
                      {getMeasuringUnitAbbreviation(
                        item.product?.measuring_unit as MeasuringUnit,
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

        {/* Supplier Section */}
        <Section
          title={getPartnerName(order.supplier)}
          subtitle="Supplier"
          onEdit={isEditable ? () => setShowSupplierEdit(true) : undefined}
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

        {/* Agent Section */}
        <Section
          title={getAgentName(order.agent)}
          subtitle="Agent"
          onEdit={isEditable ? () => setShowAgentEdit(true) : undefined}
          icon={() => <>{getInitials(getPartnerName(order.agent))}</>}
        />

        {/* Payment Terms Section */}
        <Section
          title={order.payment_terms || "NET 30"}
          subtitle="Payment terms"
          onEdit={isEditable ? () => setShowPaymentTermsEdit(true) : undefined}
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
          onEdit={isEditable ? () => setShowWarehouseEdit(true) : undefined}
          icon={() => <IconBuildingWarehouse />}
        >
          {order.warehouse &&
            getFormattedAddress(order.warehouse).length > 0 && (
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
          onEdit={isEditable ? () => setShowTransportEdit(true) : undefined}
          icon={() => <IconCalendar />}
        >
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Order date</span>
              <span className="font-semibold text-gray-700">
                {formatAbsoluteDate(order.order_date)}
              </span>
            </div>
            {order.delivery_due_date && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Expected delivery</span>
                <span className="font-semibold text-gray-700">
                  {formatAbsoluteDate(order.delivery_due_date)}
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
            icon={() => <IconFileInvoice />}
          />
        )}

        {/* Notes Section */}
        <Section
          title="Notes"
          subtitle={!order.notes && !order.status_notes ? "No notes added" : ""}
          onEdit={isEditable ? () => setShowNotesEdit(true) : undefined}
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
                    <p className="text-sm text-gray-700">
                      {order.status_notes}
                    </p>
                  </div>
                )}
            </div>
          )}
        </Section>
      </div>

      {/* Edit Sheets */}
      <PartnerEditSheet
        key={`supplier-${order.id}-${showSupplierEdit}`}
        open={showSupplierEdit}
        onOpenChange={setShowSupplierEdit}
        onSave={handleUpdate}
        isPending={updateMutation.isPending}
        partnerType="supplier"
        currentPartnerId={order.supplier_id}
      />

      <PartnerEditSheet
        key={`agent-${order.id}-${showAgentEdit}`}
        open={showAgentEdit}
        onOpenChange={setShowAgentEdit}
        onSave={handleUpdate}
        isPending={updateMutation.isPending}
        partnerType="agent"
        currentPartnerId={order.agent_id}
      />

      <PaymentTermsEditSheet
        key={`payment-${order.id}-${showPaymentTermsEdit}`}
        open={showPaymentTermsEdit}
        onOpenChange={setShowPaymentTermsEdit}
        onSave={handleUpdate}
        isPending={updateMutation.isPending}
        currentPaymentTerms={order.payment_terms}
        currentAdvanceAmount={order.advance_amount || 0}
        currentDiscountType={order.discount_type as DiscountType}
        currentDiscountValue={order.discount_value || 0}
      />

      <WarehouseEditSheet
        key={`warehouse-${order.id}-${showWarehouseEdit}`}
        open={showWarehouseEdit}
        onOpenChange={setShowWarehouseEdit}
        onSave={handleUpdate}
        isPending={updateMutation.isPending}
        currentWarehouseId={order.warehouse_id || ""}
        hasStockFlow={order.has_inward || false}
        stockFlowLabel="inward"
      />

      <TransportEditSheet
        key={`transport-${order.id}-${showTransportEdit}`}
        open={showTransportEdit}
        onOpenChange={setShowTransportEdit}
        onSave={handleUpdate}
        isPending={updateMutation.isPending}
        currentExpectedDeliveryDate={order.delivery_due_date}
      />

      <NotesEditSheet
        key={`notes-${order.id}-${showNotesEdit}`}
        open={showNotesEdit}
        onOpenChange={setShowNotesEdit}
        onSave={handleUpdate}
        isPending={updateMutation.isPending}
        initialNotes={order.notes}
      />
    </>
  );
}
