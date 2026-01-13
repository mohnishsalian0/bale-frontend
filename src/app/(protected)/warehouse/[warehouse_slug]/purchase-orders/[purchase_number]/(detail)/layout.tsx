"use client";

import { use, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  getStatusConfig,
  PurchaseStatusBadge,
} from "@/components/ui/purchase-status-badge";
import { Progress } from "@/components/ui/progress";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { useSession } from "@/contexts/session-context";
import { formatAbsoluteDate } from "@/lib/utils/date";
import {
  calculateCompletionPercentage,
  getOrderDisplayStatus,
  type DisplayStatus,
} from "@/lib/utils/purchase-order";
import type { PurchaseOrderStatus } from "@/types/database/enums";
import { TabUnderline } from "@/components/ui/tab-underline";
import {
  usePurchaseOrderByNumber,
  usePurchaseOrderMutations,
} from "@/lib/query/hooks/purchase-orders";
import { CancelDialog } from "@/components/layouts/cancel-dialog";
import { CompleteOrderDialog } from "./CompleteOrderDialog";
import { toast } from "sonner";
import { ActionsFooter } from "@/components/layouts/actions-footer";
import { getPurchaseOrderActions } from "@/lib/utils/action-menu";
import { ApprovalDialog } from "@/components/layouts/approval-dialog";
import { DeleteDialog } from "@/components/layouts/delete-dialog";
import { GoodsInwardSelectionDialog } from "../GoodsInwardSelectionDialog";

interface LayoutParams {
  params: Promise<{
    warehouse_slug: string;
    purchase_number: string;
  }>;
  children: React.ReactNode;
}

export default function PurchaseOrderDetailLayout({
  params,
  children,
}: LayoutParams) {
  const router = useRouter();
  const pathname = usePathname();
  const { warehouse_slug, purchase_number } = use(params);
  const { warehouse } = useSession();

  // Dialog states
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);

  // Fetch purchase order using TanStack Query hooks
  const {
    data: order,
    isLoading: loading,
    isError: error,
  } = usePurchaseOrderByNumber(purchase_number);

  // Purchase order mutations
  const {
    cancel: cancelOrder,
    complete: completeOrder,
    update: updateOrder,
    delete: deleteOrder,
  } = usePurchaseOrderMutations(warehouse?.id || null);

  // Calculate completion percentage using utility
  const completionPercentage = useMemo(() => {
    if (!order) return 0;
    return calculateCompletionPercentage(order.purchase_order_items);
  }, [order]);

  // Compute display status (includes 'overdue' logic) using utility
  const displayStatusData: { status: DisplayStatus; text: string } =
    useMemo(() => {
      if (!order)
        return { status: "in_progress" as DisplayStatus, text: "In Progress" };
      return getOrderDisplayStatus(
        order.status as PurchaseOrderStatus,
        order.delivery_due_date,
      );
    }, [order]);
  const progressBarColor = getStatusConfig(displayStatusData.status).color;

  // Tab logic
  const basePath = `/warehouse/${warehouse_slug}/purchase-orders/${purchase_number}`;
  const getActiveTab = () => {
    if (pathname.endsWith("/inwards")) return "inwards";
    return "details";
  };
  const handleTabChange = (tab: string) => {
    router.push(`${basePath}/${tab}`);
  };

  // Handler functions
  const handleApprove = () => {
    setShowApproveDialog(true);
  };

  const handleEdit = () => {
    router.push(`${basePath}/edit`);
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
      `/warehouse/${warehouse.slug}/invoices/create/purchase?${params.toString()}`,
    );
  };

  const handleInvoiceFullOrder = () => {
    if (!order) return;

    const params = new URLSearchParams({
      order: order.sequence_number.toString(),
      full_order: "true",
    });

    router.push(
      `/warehouse/${warehouse.slug}/invoices/create/purchase?${params.toString()}`,
    );
  };

  // Loading state
  if (loading) {
    return <LoadingState message="Loading order..." />;
  }

  // Error state
  if (error || !order) {
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
      <div className="relative flex flex-col flex-1">
        {/* Header */}
        <div className="p-4">
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

        {/* Tabs */}
        <TabUnderline
          activeTab={getActiveTab()}
          onTabChange={handleTabChange}
          tabs={[
            { value: "details", label: "Order details" },
            { value: "inwards", label: "Inwards" },
          ]}
        />

        {/* Tab Content */}
        <div className="flex-1">{children}</div>

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
                  `/warehouse/${warehouse.slug}/goods-inward/create?order=${order.id}`,
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

            <CompleteOrderDialog
              open={showCompleteDialog}
              onOpenChange={setShowCompleteDialog}
              onConfirm={handleComplete}
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
    </div>
  );
}
