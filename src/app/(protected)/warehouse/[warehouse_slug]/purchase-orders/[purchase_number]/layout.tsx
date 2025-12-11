"use client";

import { use, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconDotsVertical, IconShare } from "@tabler/icons-react";
import {
  usePurchaseOrderByNumber,
  usePurchaseOrderMutations,
} from "@/lib/query/hooks/purchase-orders";
import { CancelOrderDialog } from "./CancelOrderDialog";
import { CompleteOrderDialog } from "./CompleteOrderDialog";
import { toast } from "sonner";

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

  // Fetch purchase order using TanStack Query hooks
  const {
    data: order,
    isLoading: loading,
    isError: error,
  } = usePurchaseOrderByNumber(purchase_number);

  // Purchase order mutations
  const { cancel: cancelOrder, complete: completeOrder } =
    usePurchaseOrderMutations(warehouse?.id || null);

  // Calculate completion percentage using utility
  const completionPercentage = useMemo(() => {
    if (!order) return 0;
    return calculateCompletionPercentage(order.purchase_order_items);
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
    if (!order) return;
    router.push(
      `/warehouse/${warehouse.slug}/purchase-orders/${order.sequence_number}/approve`,
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

  // Primary CTA logic
  const getPrimaryCTA = () => {
    if (!order) return null;

    if (order.status === "approval_pending") {
      return (
        <Button size="sm" onClick={handleApprove} className="flex-1">
          Approve order
        </Button>
      );
    }

    if (order.status === "in_progress") {
      return (
        <Button
          onClick={() =>
            router.push(
              `/warehouse/${warehouse.slug}/goods-inward/create?order=${order.sequence_number}`,
            )
          }
          className="flex-1"
        >
          Create inward
        </Button>
      );
    }

    return null;
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
              <h1 className="text-2xl font-bold text-gray-900">
                PO-{order.sequence_number}
              </h1>
              <PurchaseStatusBadge status={displayStatus} />
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
          {displayStatus !== "approval_pending" && (
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
        <div className="sticky bottom-0 p-4 bg-background border-t border-border flex gap-3 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-sm">
                <IconDotsVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {(order.status === "in_progress" ||
                displayStatus === "overdue") && (
                <>
                  <DropdownMenuItem onClick={() => setShowCompleteDialog(true)}>
                    Mark as complete
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={handleShare}>
                <IconShare />
                Share
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setShowCancelDialog(true)}
                disabled={order.status === "cancelled"}
              >
                Cancel order
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {getPrimaryCTA()}
        </div>

        {/* Cancel/Complete Dialogs */}
        {order && (
          <>
            <CancelOrderDialog
              open={showCancelDialog}
              onOpenChange={setShowCancelDialog}
              onConfirm={handleCancel}
              loading={cancelOrder.isPending}
            />

            <CompleteOrderDialog
              open={showCompleteDialog}
              onOpenChange={setShowCompleteDialog}
              onConfirm={handleComplete}
              loading={completeOrder.isPending}
            />
          </>
        )}
      </div>
    </div>
  );
}
