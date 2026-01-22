"use client";

import { use, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  getStatusConfig,
  SalesStatusBadge,
} from "@/components/ui/sales-status-badge";
import { Progress } from "@/components/ui/progress";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { useSession } from "@/contexts/session-context";
import { formatAbsoluteDate } from "@/lib/utils/date";
import {
  calculateCompletionPercentage,
  getOrderDisplayStatus,
  type DisplayStatus,
} from "@/lib/utils/sales-order";
import type { SalesOrderStatus } from "@/types/database/enums";
import { TabUnderline } from "@/components/ui/tab-underline";
import {
  useSalesOrderByNumber,
  useSalesOrderMutations,
} from "@/lib/query/hooks/sales-orders";
import { CancelDialog } from "@/components/layouts/cancel-dialog";
import { CompleteOrderDialog } from "./CompleteOrderDialog";
import { toast } from "sonner";
import { useCompany } from "@/lib/query/hooks/company";
import { OrderConfirmationPDF } from "@/components/pdf/OrderConfirmationPDF";
import { pdf } from "@react-pdf/renderer";
import { ActionsFooter } from "@/components/layouts/actions-footer";
import { getSalesOrderActions } from "@/lib/utils/action-menu";
import { ApprovalDialog } from "@/components/layouts/approval-dialog";
import { DeleteDialog } from "@/components/layouts/delete-dialog";
import { GoodsOutwardSelectionDialog } from "../GoodsOutwardSelectionDialog";

interface LayoutParams {
  params: Promise<{
    warehouse_slug: string;
    sale_number: string;
  }>;
  children: React.ReactNode;
}

export default function SalesOrderDetailLayout({
  params,
  children,
}: LayoutParams) {
  const router = useRouter();
  const pathname = usePathname();
  const { warehouse_slug, sale_number } = use(params);
  const { warehouse } = useSession();
  const [downloading, setDownloading] = useState(false);

  // Dialog states
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);

  // Fetch company and sales order using TanStack Query hooks
  const {
    data: company,
    isLoading: companyLoading,
    isError: companyError,
  } = useCompany();
  const {
    data: order,
    isLoading: loading,
    isError: error,
  } = useSalesOrderByNumber(sale_number);

  // Sales order mutations
  const {
    cancel: cancelOrder,
    complete: completeOrder,
    update: updateOrder,
    delete: deleteOrder,
  } = useSalesOrderMutations(warehouse?.id || null);

  // Calculate completion percentage using utility
  const completionPercentage = useMemo(() => {
    if (!order) return 0;
    return calculateCompletionPercentage(order.sales_order_items);
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

  // Tab logic
  const basePath = `/warehouse/${warehouse_slug}/sales-orders/${sale_number}`;
  const getActiveTab = () => {
    if (pathname.endsWith("/outwards")) return "outwards";
    return "details";
  };
  const handleTabChange = (tab: string) => {
    router.push(`${basePath}/${tab}`);
  };

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
          toast.success("Sales order approved successfully.");
          setShowApproveDialog(false);
        },
        onError: (error) => {
          toast.error("Failed to approve sales order.");
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
    if (!order || !company) return null;

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

  const handleDownloadPDF = async () => {
    if (!company || !order) return;

    try {
      setDownloading(true);
      const blob = await pdf(
        <OrderConfirmationPDF company={company} order={order} />,
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `order-${order.sequence_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.error("Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = () => {
    if (!order) return;
    deleteOrder.mutate(order.id, {
      onSuccess: () => {
        toast.success("Sales order deleted successfully");
        router.push(`/warehouse/${warehouse.slug}/sales-orders`);
        setShowDeleteDialog(false);
      },
      onError: (error) => {
        console.error("Error deleting sales order:", error);
        toast.error("Failed to delete sales order");
      },
    });
  };

  const handleEdit = () => {
    router.push(`${basePath}/edit`);
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
      `/warehouse/${warehouse.slug}/invoices/quick-create/sales?${params.toString()}`,
    );
  };

  const handleInvoiceFullOrder = () => {
    if (!order) return;

    const params = new URLSearchParams({
      order: order.sequence_number.toString(),
    });

    router.push(
      `/warehouse/${warehouse.slug}/invoices/quick-create/sales?${params.toString()}`,
    );
  };

  // Loading state
  if (companyLoading || loading) {
    return <LoadingState message="Loading order..." />;
  }

  // Error state
  if (companyError || error || !order) {
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
                SO-{order.sequence_number}
              </h1>
              <SalesStatusBadge
                status={displayStatusData.status}
                text={displayStatusData.text}
              />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Sales order on {formatAbsoluteDate(order.order_date)}
            </p>
          </div>

          {/* Progress Bar */}
          {displayStatusData.status !== "approval_pending" && (
            <div className="mt-4 max-w-sm">
              <p className="text-sm text-gray-700 mb-1">
                {completionPercentage}% completed
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
            { value: "outwards", label: "Outwards" },
          ]}
        />

        {/* Tab Content */}
        <div className="flex-1">{children}</div>

        {/* Bottom Action Bar */}
        <ActionsFooter
          items={getSalesOrderActions(
            displayStatusData.status,
            order.has_outward || false,
            {
              onApprove: handleApprove,
              onEdit: handleEdit,
              onCreateOutward: () =>
                router.push(
                  `/warehouse/${warehouse.slug}/goods-outward/create?sales_order=${order.id}`,
                ),
              onCreateInvoice: handleCreateInvoice,
              onComplete: () => setShowCompleteDialog(true),
              onShare: handleShare,
              onDownload: handleDownloadPDF,
              onCancel: () => setShowCancelDialog(true),
              onDelete: () => setShowDeleteDialog(true),
            },
            { downloading },
          )}
        />

        {/* Cancel/Complete Dialogs */}
        {order && (
          <>
            <CancelDialog
              open={showCancelDialog}
              onOpenChange={setShowCancelDialog}
              onConfirm={handleCancel}
              title="Cancel sales order"
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
              orderType="SO"
              onConfirm={handleConfirmApprove}
              loading={updateOrder.isPending}
            />

            {showDeleteDialog && (
              <DeleteDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
                onConfirm={handleDelete}
                title="Delete sales order"
                message={`Are you sure you want to delete SO-${order.sequence_number}? This action cannot be undone.`}
                loading={deleteOrder.isPending}
              />
            )}

            <GoodsOutwardSelectionDialog
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
