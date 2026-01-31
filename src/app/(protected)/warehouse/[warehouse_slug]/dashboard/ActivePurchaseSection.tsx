"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SalesStatusBadge } from "@/components/ui/sales-status-badge";
import { Progress } from "@/components/ui/progress";
import { CardActions } from "@/components/layouts/card-actions";
import { DashboardSectionSkeleton } from "@/components/layouts/dashboard-section-skeleton";
import { ApprovalDialog } from "@/components/layouts/approval-dialog";
import {
  calculateCompletionPercentage,
  getOrderDisplayStatus,
  getProductSummary,
} from "@/lib/utils/purchase-order";
import { getPartnerName } from "@/lib/utils/partner";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { getPurchaseOrderActions } from "@/lib/utils/action-menu";
import {
  usePurchaseOrders,
  usePurchaseOrderMutations,
} from "@/lib/query/hooks/purchase-orders";
import { useCompany } from "@/lib/query/hooks/company";
import { useSession } from "@/contexts/session-context";
import type { PurchaseOrderListView } from "@/types/purchase-orders.types";
import type { PurchaseOrderStatus } from "@/types/database/enums";
import { GoodsInwardSelectionDialog } from "../purchase-orders/[purchase_number]/GoodsInwardSelectionDialog";
import { toast } from "sonner";
import { CompleteDialog } from "@/components/layouts/complete-dialog";

interface ActivePurchaseSectionProps {
  title: string;
  warehouseSlug: string;
}

/**
 * Self-contained section for displaying active purchase orders
 * Handles its own data fetching, state management, and dialogs
 */
export function ActivePurchaseSection({
  title,
  warehouseSlug,
}: ActivePurchaseSectionProps) {
  const router = useRouter();
  const { warehouse } = useSession();
  const { data: company } = useCompany();

  // Dialog states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [selectedOrder, setSelectedOrder] =
    useState<PurchaseOrderListView | null>(null);

  // Fetch purchase orders
  const {
    data: purchaseOrdersResponse,
    isLoading,
    isError,
  } = usePurchaseOrders({
    filters: {
      warehouseId: warehouse.id,
      status: ["approval_pending", "in_progress"],
      limit: 5,
    },
    page: 1,
    pageSize: 5,
  });

  // Mutations
  const { update: updatePurchaseOrder, complete: completePurchaseOrder } =
    usePurchaseOrderMutations(warehouse.id);

  const orders = purchaseOrdersResponse?.data || [];

  // =====================================================
  // Handler Functions
  // =====================================================

  const handleApprove = (order: PurchaseOrderListView) => {
    setSelectedOrder(order);
    setShowApprovalDialog(true);
  };

  const handleConfirmApprove = () => {
    if (!selectedOrder) return;

    updatePurchaseOrder.mutate(
      {
        orderId: selectedOrder.id,
        data: { status: "in_progress" },
      },
      {
        onSuccess: () => {
          toast.success(
            `Purchase Order PO-${selectedOrder.sequence_number} approved.`,
          );
          setShowApprovalDialog(false);
          setSelectedOrder(null);
        },
        onError: (error) => {
          toast.error("Failed to approve purchase order.");
          console.error("Error approving order:", error);
        },
      },
    );
  };

  const handleComplete = (order: PurchaseOrderListView) => {
    setSelectedOrder(order);
    setShowCompleteDialog(true);
  };

  const handleConfirmComplete = (notes?: string) => {
    if (!selectedOrder) return;

    completePurchaseOrder.mutate(
      { orderId: selectedOrder.id, completeData: { notes } },
      {
        onSuccess: () => {
          toast.success("Purchase order marked as complete");
          setShowCompleteDialog(false);
          setSelectedOrder(null);
        },
        onError: (error) => {
          console.error("Error completing order:", error);
          toast.error("Failed to complete purchase order");
        },
      },
    );
  };

  const handleShare = async (order: PurchaseOrderListView) => {
    if (!company) return;

    const orderUrl = `${window.location.origin}/company/${company.slug}/order/${order.id}`;
    try {
      await navigator.clipboard.writeText(orderUrl);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }

    const orderShareMessage = `Here are the details and live status of order #${order.sequence_number}\n🔗 ${orderUrl}`;
    const encodedMessage = encodeURIComponent(orderShareMessage);
    window.open(`https://wa.me/?text=${encodedMessage}`, "_blank");
  };

  const handleCreateInvoice = (order: PurchaseOrderListView) => {
    setSelectedOrder(order);
    setShowInvoiceDialog(true);
  };

  const handleInvoiceFromMovements = (selectedIds: string[]) => {
    if (!selectedOrder || selectedIds.length === 0) return;

    const params = new URLSearchParams({
      order: selectedOrder.sequence_number.toString(),
      movements: selectedIds.join(","),
    });

    router.push(
      `/warehouse/${warehouseSlug}/invoices/create/purchase?${params.toString()}`,
    );
  };

  const handleInvoiceFullOrder = () => {
    if (!selectedOrder) return;

    const params = new URLSearchParams({
      order: selectedOrder.sequence_number.toString(),
      full_order: "true",
    });

    router.push(
      `/warehouse/${warehouseSlug}/invoices/create/purchase?${params.toString()}`,
    );
  };

  // Loading state
  if (isLoading) {
    return <DashboardSectionSkeleton title={title} itemCount={5} />;
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col mt-6">
        <div className="flex items-center justify-between px-4 py-2">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <Button variant="ghost" size="sm" disabled>
            View all →
          </Button>
        </div>
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-red-600">Failed to load orders</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col mt-6">
        <div className="flex items-center justify-between px-4 py-2">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              router.push(
                `/warehouse/${warehouseSlug}/purchase-orders?status=approval_pending,in_progress`,
              )
            }
          >
            View all →
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
              const displayStatusData = getOrderDisplayStatus(
                order.status as PurchaseOrderStatus,
                order.delivery_due_date,
              );

              const completionPercentage = calculateCompletionPercentage(
                order.purchase_order_items || [],
              );

              const productSummary = getProductSummary(
                order.purchase_order_items,
              );

              const showProgressBar =
                displayStatusData.status === "in_progress" ||
                displayStatusData.status === "overdue";
              const progressColor =
                displayStatusData.status === "overdue" ? "yellow" : "blue";

              const partnerName = order.supplier
                ? getPartnerName(order.supplier)
                : "Unknown Supplier";

              const actionItems = getPurchaseOrderActions(
                displayStatusData.status,
                order.has_inward || false,
                {
                  onApprove: () => handleApprove(order),
                  onCreateInward: () => {
                    router.push(
                      `/warehouse/${warehouseSlug}/goods-inward/create?purchase_order=${order.id}`,
                    );
                  },
                  onCreateInvoice: () => handleCreateInvoice(order),
                  onEdit: () => {
                    router.push(
                      `/warehouse/${warehouseSlug}/purchase-orders/${order.sequence_number}/edit`,
                    );
                  },
                  onComplete: () => handleComplete(order),
                  onShare: () => handleShare(order),
                  onDownload: () => {
                    console.log("Download:", order.id);
                  },
                  onCancel: () => {
                    console.log("Cancel:", order.id);
                  },
                  onDelete: () => {
                    console.log("Delete:", order.id);
                  },
                },
              );

              return (
                <Card
                  key={order.id}
                  className="rounded-none border-x-0 border-b-0 shadow-none bg-transparent hover:bg-gray-100"
                >
                  <CardContent className="p-4 flex flex-col gap-3">
                    <button
                      onClick={() =>
                        router.push(
                          `/warehouse/${warehouseSlug}/purchase-orders/${order.sequence_number}/details`,
                        )
                      }
                      className="flex flex-col gap-2 text-left hover:cursor-pointer"
                    >
                      {/* Title and Status Badge */}
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-base font-medium text-gray-700">
                            {partnerName}
                          </p>
                          <SalesStatusBadge
                            status={displayStatusData.status}
                            text={displayStatusData.text}
                          />
                        </div>

                        {/* Subtexts spanning full width */}
                        <p className="text-sm text-gray-500 mt-1">
                          {productSummary}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-500">
                            PO-{order.sequence_number}
                            {order.delivery_due_date &&
                              ` • Due on ${formatAbsoluteDate(order.delivery_due_date)}`}
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
                    <CardActions items={actionItems} maxVisibleActions={2} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {selectedOrder && (
        <>
          {/* Approval Dialog */}
          <ApprovalDialog
            open={showApprovalDialog}
            onOpenChange={(isOpen) => {
              setShowApprovalDialog(isOpen);
              if (!isOpen) {
                setSelectedOrder(null);
              }
            }}
            orderNumber={selectedOrder.sequence_number}
            orderType="PO"
            onConfirm={handleConfirmApprove}
            loading={updatePurchaseOrder.isPending}
          />

          {/* Complete Dialog */}
          <CompleteDialog
            open={showCompleteDialog}
            title="Mark order as complete"
            description="This will mark the purchase order as completed. You can optionally add completion notes."
            onOpenChange={(isOpen) => {
              setShowCompleteDialog(isOpen);
              if (!isOpen) {
                setSelectedOrder(null);
              }
            }}
            onComplete={handleConfirmComplete}
            hasNotes={true}
            loading={completePurchaseOrder.isPending}
          />

          {/* Invoice Dialog */}
          <GoodsInwardSelectionDialog
            open={showInvoiceDialog}
            onOpenChange={(isOpen) => {
              setShowInvoiceDialog(isOpen);
              if (!isOpen) {
                setSelectedOrder(null);
              }
            }}
            orderNumber={selectedOrder.sequence_number.toString()}
            onInvoiceFromMovements={handleInvoiceFromMovements}
            onInvoiceFullOrder={handleInvoiceFullOrder}
          />
        </>
      )}
    </>
  );
}
