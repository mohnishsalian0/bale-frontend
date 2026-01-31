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
  IconCalendar,
  IconFileInvoice,
} from "@tabler/icons-react";
import {
  getStatusConfig,
  PurchaseStatusBadge,
} from "@/components/ui/purchase-status-badge";
import { InvoiceStatusBadge } from "@/components/ui/invoice-status-badge";
import { Progress } from "@/components/ui/progress";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import ImageWrapper from "@/components/ui/image-wrapper";
import { Section } from "@/components/layouts/section";
import { ActionsFooter } from "@/components/layouts/actions-footer";
import { CancelDialog } from "@/components/layouts/cancel-dialog";
import { ApprovalDialog } from "@/components/layouts/approval-dialog";
import { DeleteDialog } from "@/components/layouts/delete-dialog";
import { GoodsInwardSelectionDialog } from "../GoodsInwardSelectionDialog";
import { useSession } from "@/contexts/session-context";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/financial";
import { formatCurrency as formatCurrencyUtil } from "@/lib/utils/currency";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import { formatMeasuringUnitQuantities } from "@/lib/utils/measuring-units";
import { getInitials } from "@/lib/utils/initials";
import {
  getPartnerName,
  getFormattedAddress,
  mapPartnerBillingAddress,
} from "@/lib/utils/partner";
import {
  getAgentName,
  getOrderDisplayStatus,
  calculateCompletionPercentage,
  type DisplayStatus,
} from "@/lib/utils/purchase-order";
import {
  getSenderName,
  getInwardProductsSummary,
  getInwardQuantitiesByUnit,
} from "@/lib/utils/stock-flow";
import {
  getInvoiceDisplayStatus,
  getInvoiceItemSummary,
} from "@/lib/utils/invoice";
import { getProductIcon } from "@/lib/utils/product";
import { getPurchaseOrderActions } from "@/lib/utils/action-menu";
import {
  usePurchaseOrderByNumber,
  usePurchaseOrderMutations,
} from "@/lib/query/hooks/purchase-orders";
import { useGoodsInwardsByPurchaseOrder } from "@/lib/query/hooks/stock-flow";
import { useInvoices } from "@/lib/query/hooks/invoices";
import { toast } from "sonner";
import type {
  MeasuringUnit,
  StockType,
  PurchaseOrderStatus,
  InvoiceStatus,
} from "@/types/database/enums";
import IconGoodsInward from "@/components/icons/IconGoodsInward";
import { CompleteDialog } from "@/components/layouts/complete-dialog";

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    purchase_number: string;
  }>;
}

export default function PurchaseOrderDetailsPage({ params }: PageParams) {
  const router = useRouter();
  const { warehouse_slug, purchase_number } = use(params);
  const { warehouse } = useSession();

  // Dialog states
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);

  // Fetch data using TanStack Query hooks
  const {
    data: order,
    isLoading: orderLoading,
    isError: orderError,
  } = usePurchaseOrderByNumber(purchase_number);

  const { data: inwardsResponse, isLoading: inwardsLoading } =
    useGoodsInwardsByPurchaseOrder(purchase_number);

  const { data: invoicesResponse, isLoading: invoicesLoading } = useInvoices({
    filters: { source_purchase_order_id: order?.id },
    enabled: !!order,
  });

  // Purchase order mutations
  const {
    cancel: cancelOrder,
    complete: completeOrder,
    update: updateOrder,
    delete: deleteOrder,
  } = usePurchaseOrderMutations(warehouse?.id || null);

  const inwards = inwardsResponse?.data || [];
  const inwardsCount = inwardsResponse?.totalCount || 0;
  const invoices = invoicesResponse?.data || [];
  const invoicesCount = invoicesResponse?.totalCount || 0;

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

  // Calculate completion percentage using utility
  const completionPercentage = useMemo(() => {
    if (!order) return 0;
    return calculateCompletionPercentage(order.purchase_order_items);
  }, [order]);

  // Compute display status (includes 'overdue' logic) using utility
  const displayStatusData = useMemo(() => {
    if (!order)
      return { status: "in_progress" as DisplayStatus, text: "In Progress" };
    return getOrderDisplayStatus(
      order.status as PurchaseOrderStatus,
      order.delivery_due_date,
    );
  }, [order]);

  const progressBarColor = getStatusConfig(displayStatusData.status).color;

  // Handler functions
  const handleApprove = () => {
    setShowApproveDialog(true);
  };

  const handleConfirmApprove = () => {
    if (!order) return;
    updateOrder.mutate(
      {
        orderId: order.id,
        data: { status: "in_progress" },
      },
      {
        onSuccess: () => {
          toast.success("Purchase order approved successfully.");
          setShowApproveDialog(false);
        },
        onError: (error) => {
          toast.error("Failed to approve purchase order.");
          console.error("Error approving order:", error);
        },
      },
    );
  };

  const handleComplete = (notes?: string) => {
    if (!order) return;
    completeOrder.mutate(
      { orderId: order.id, completeData: { notes } },
      {
        onSuccess: () => {
          toast.success("Order marked as complete");
          setShowCompleteDialog(false);
        },
        onError: (error) => {
          console.error("Error completing order:", error);
          toast.error("Failed to complete order");
        },
      },
    );
  };

  const handleCancel = (reason: string) => {
    if (!order) return;
    cancelOrder.mutate(
      { orderId: order.id, cancelData: { reason } },
      {
        onSuccess: () => {
          toast.success("Order cancelled");
          setShowCancelDialog(false);
        },
        onError: (error) => {
          console.error("Error cancelling order:", error);
          toast.error("Failed to cancel order");
        },
      },
    );
  };

  const handleShare = async () => {
    if (!order) return;

    const orderUrl = `${window.location.origin}/warehouse/${warehouse.slug}/purchase-orders/${order.sequence_number}`;
    try {
      await navigator.clipboard.writeText(orderUrl);
      toast.success("Link copied to clipboard");
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      toast.error("Failed to copy link");
    }
  };

  const handleDelete = () => {
    if (!order) return;
    deleteOrder.mutate(order.id, {
      onSuccess: () => {
        toast.success("Purchase order deleted successfully");
        router.push(`/warehouse/${warehouse.slug}/purchase-orders`);
        setShowDeleteDialog(false);
      },
      onError: (error) => {
        console.error("Error deleting purchase order:", error);
        toast.error("Failed to delete purchase order");
      },
    });
  };

  const handleEdit = () => {
    router.push(
      `/warehouse/${warehouse_slug}/purchase-orders/${purchase_number}/edit`,
    );
  };

  const handleCreateInvoice = () => {
    setShowInvoiceDialog(true);
  };

  const handleInvoiceFromMovements = (selectedIds: string[]) => {
    if (!order || selectedIds.length === 0) return;

    const params = new URLSearchParams({
      order: order.sequence_number.toString(),
      movements: selectedIds.join(","),
    });

    router.push(
      `/warehouse/${warehouse.slug}/invoices/quick-create/purchase?${params.toString()}`,
    );
  };

  const handleInvoiceFullOrder = () => {
    if (!order) return;

    const params = new URLSearchParams({
      order: order.sequence_number.toString(),
    });

    router.push(
      `/warehouse/${warehouse.slug}/invoices/quick-create/purchase?${params.toString()}`,
    );
  };

  // Loading state
  if (orderLoading || inwardsLoading || invoicesLoading) {
    return <LoadingState message="Loading order..." />;
  }

  // Error state
  if (orderError || !order) {
    return (
      <ErrorState
        title="Order not found"
        message="This order does not exist or has been deleted"
        onRetry={() => router.back()}
        actionText="Go back"
      />
    );
  }

  return (
    <div className="flex flex-col grow">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1
              className={`text-2xl font-bold ${order.status === "cancelled" ? "text-gray-400" : "text-gray-900"}`}
            >
              PO-{order.sequence_number}
            </h1>
            <PurchaseStatusBadge
              status={displayStatusData.status}
              text={displayStatusData.text}
            />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Purchase order on {formatAbsoluteDate(order.order_date)}
          </p>
          {order.supplier_invoice_number && (
            <p className="text-sm text-gray-500">
              {order.supplier_invoice_number}
            </p>
          )}
        </div>

        {/* Progress Bar */}
        {displayStatusData.status !== "approval_pending" && (
          <div className="mt-4 max-w-sm">
            <p className="text-sm text-gray-700 mb-1">
              {completionPercentage}% received
            </p>
            <Progress color={progressBarColor} value={completionPercentage} />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-3 p-4">
          {/* Inwards Section */}
          <Section
            title="Inwards"
            subtitle={`${inwardsCount} goods inward${inwardsCount !== 1 ? "s" : ""}`}
            icon={() => <IconGoodsInward />}
          >
            {inwards.length > 0 ? (
              <div className="flex flex-col">
                {inwards.map((inward) => (
                  <button
                    key={inward.id}
                    onClick={() =>
                      router.push(
                        `/warehouse/${warehouse_slug}/goods-inward/${inward.sequence_number}`,
                      )
                    }
                    className="flex gap-4 py-4 border-t border-dashed border-gray-300 hover:bg-gray-100 hover:cursor-pointer transition-colors"
                  >
                    <div className="flex-2 text-left">
                      <p className="text-base font-medium text-gray-700">
                        GI-{inward.sequence_number}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {getInwardProductsSummary(inward)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        From {getSenderName(inward)}
                        {" • "}
                        {formatAbsoluteDate(inward.inward_date)}
                      </p>
                    </div>
                    <div className="flex-1 items-end justify-center text-right text-wrap">
                      <p className="text-sm font-semibold text-yellow-700">
                        {formatMeasuringUnitQuantities(
                          getInwardQuantitiesByUnit(inward),
                        )}
                      </p>
                      <p className="text-xs text-gray-500">In</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </Section>

          {/* Invoices Section */}
          <Section
            title="Invoices"
            subtitle={`${invoicesCount} invoice${invoicesCount !== 1 ? "s" : ""}`}
            icon={() => <IconFileInvoice />}
          >
            {invoices.length > 0 ? (
              <div className="flex flex-col">
                {invoices.map((invoice) => {
                  const invoiceStatusData = getInvoiceDisplayStatus(invoice);
                  const showProgressBar =
                    invoice.status === "partially_paid" ||
                    invoice.status === "overdue";
                  const progressBarColor =
                    invoice.status === "overdue" ? "yellow" : "blue";
                  const progressValue =
                    invoice.total_amount && invoice.outstanding_amount
                      ? ((invoice.total_amount - invoice.outstanding_amount) /
                          invoice.total_amount) *
                        100
                      : 0;
                  const outstandingInfo =
                    invoice.outstanding_amount && invoice.outstanding_amount > 0
                      ? `Outstanding: ${formatCurrencyUtil(invoice.outstanding_amount)}`
                      : "";

                  return (
                    <button
                      key={invoice.id}
                      onClick={() =>
                        router.push(
                          `/warehouse/${warehouse_slug}/invoices/${invoice.slug}`,
                        )
                      }
                      className="flex flex-col gap-2 py-4 border-t border-dashed border-gray-300 hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-base font-medium text-gray-700">
                              {invoice.invoice_number}
                            </p>
                            <InvoiceStatusBadge
                              status={invoiceStatusData.status as InvoiceStatus}
                              text={invoiceStatusData.text}
                            />
                          </div>
                          <p className="text-sm font-semibold text-gray-700">
                            {formatCurrencyUtil(invoice.total_amount)}
                          </p>
                        </div>

                        <p className="text-sm text-gray-500 text-left mt-1">
                          {getInvoiceItemSummary(invoice.invoice_items)}
                        </p>

                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-500">
                            {invoice.party_name || invoice.party_display_name}
                            {invoice.due_date &&
                              ` • Due on ${formatAbsoluteDate(invoice.due_date)}`}
                          </p>
                          {showProgressBar && outstandingInfo && (
                            <p className="text-xs text-gray-500">
                              {outstandingInfo}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {showProgressBar && (
                        <Progress
                          color={progressBarColor}
                          value={progressValue}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </Section>

          {/* Line Items Section */}
          <Section
            title={`${order.purchase_order_items.length} items at ₹${formatCurrency(financials?.finalTotal || 0)}`}
            subtitle="Line items"
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
                        {item.received_quantity || 0}
                        {" / "}
                        {item.required_quantity}{" "}
                        {getMeasuringUnitAbbreviation(
                          item.product?.measuring_unit as MeasuringUnit,
                        )}{" "}
                        received
                      </p>
                      {/* Progress bar */}
                      {displayStatusData.status !== "approval_pending" && (
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
            icon={() => <>{getInitials(getPartnerName(order.supplier))}</>}
          >
            {getFormattedAddress(mapPartnerBillingAddress(order.supplier))
              .length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-700 flex items-center gap-2">
                  <IconMapPin className="size-4" />
                  Address
                </span>
                <div className="font-semibold text-gray-700 text-right max-w-[200px]">
                  {getFormattedAddress(
                    mapPartnerBillingAddress(order.supplier),
                  ).map((line, index) => (
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
                      ? `${order.discount_value || 0}%`
                      : `₹{formatCurrency(order.discount_value || 0)}`}
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
            subtitle={
              !order.notes && !order.status_notes ? "No notes added" : ""
            }
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
      </div>

      {/* Bottom Action Bar */}
      <ActionsFooter
        items={getPurchaseOrderActions(
          displayStatusData.status,
          order.has_inward || false,
          {
            onApprove: handleApprove,
            onEdit: handleEdit,
            onCreateInward: () =>
              router.push(
                `/warehouse/${warehouse.slug}/goods-inward/create?purchase_order=${order.id}`,
              ),
            onCreateInvoice: handleCreateInvoice,
            onComplete: () => setShowCompleteDialog(true),
            onShare: handleShare,
            onDownload: () => {},
            onCancel: () => setShowCancelDialog(true),
            onDelete: () => setShowDeleteDialog(true),
          },
        )}
      />

      {/* Cancel/Complete Dialogs */}
      {order && (
        <>
          <CancelDialog
            open={showCancelDialog}
            onOpenChange={setShowCancelDialog}
            onConfirm={handleCancel}
            title="Cancel purchase order"
            message="Please provide a reason for cancelling this order. This action cannot be undone."
            loading={cancelOrder.isPending}
          />

          <CompleteDialog
            open={showCompleteDialog}
            title="Mark order as complete"
            description="This will mark the purchase order as completed. You can optionally add completion notes."
            onOpenChange={setShowCompleteDialog}
            onComplete={handleComplete}
            hasNotes={true}
            loading={completeOrder.isPending}
          />

          <ApprovalDialog
            open={showApproveDialog}
            onOpenChange={setShowApproveDialog}
            orderNumber={order.sequence_number}
            orderType="PO"
            onConfirm={handleConfirmApprove}
            loading={updateOrder.isPending}
          />

          {showDeleteDialog && (
            <DeleteDialog
              open={showDeleteDialog}
              onOpenChange={setShowDeleteDialog}
              onConfirm={handleDelete}
              title="Delete purchase order"
              message={`Are you sure you want to delete PO-${order.sequence_number}? This action cannot be undone.`}
              loading={deleteOrder.isPending}
            />
          )}

          <GoodsInwardSelectionDialog
            open={showInvoiceDialog}
            onOpenChange={setShowInvoiceDialog}
            orderNumber={order.sequence_number.toString()}
            onInvoiceFromMovements={handleInvoiceFromMovements}
            onInvoiceFullOrder={handleInvoiceFullOrder}
          />
        </>
      )}
    </div>
  );
}
