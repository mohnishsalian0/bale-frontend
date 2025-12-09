"use client";

import { use, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconDotsVertical, IconDownload, IconShare } from "@tabler/icons-react";
import {
  useSalesOrderByNumber,
  useSalesOrderMutations,
} from "@/lib/query/hooks/sales-orders";
import { CancelOrderDialog } from "./CancelOrderDialog";
import { CompleteOrderDialog } from "./CompleteOrderDialog";
import { toast } from "sonner";
import { useCompany } from "@/lib/query/hooks/company";
import { OrderConfirmationPDF } from "@/components/pdf/OrderConfirmationPDF";
import { pdf } from "@react-pdf/renderer";

interface LayoutParams {
  params: Promise<{
    warehouse_slug: string;
    order_number: string;
  }>;
  children: React.ReactNode;
}

export default function SalesOrderDetailLayout({
  params,
  children,
}: LayoutParams) {
  const router = useRouter();
  const pathname = usePathname();
  const { warehouse_slug, order_number } = use(params);
  const { warehouse } = useSession();
  const [downloading, setDownloading] = useState(false);

  // Dialog states
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

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
  } = useSalesOrderByNumber(order_number);

  // Sales order mutations
  const { cancel: cancelOrder, complete: completeOrder } =
    useSalesOrderMutations(warehouse?.id || null);

  // Calculate completion percentage using utility
  const completionPercentage = useMemo(() => {
    if (!order) return 0;
    return calculateCompletionPercentage(order.sales_order_items);
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

  // Tab logic
  const basePath = `/warehouse/${warehouse_slug}/sales-orders/${order_number}`;
  const getActiveTab = () => {
    if (pathname.endsWith("/outwards")) return "outwards";
    return "details";
  };
  const handleTabChange = (tab: string) => {
    router.push(`${basePath}/${tab}`);
  };

  // Handler functions
  const handleApprove = () => {
    if (!order) return;
    router.push(
      `/warehouse/${warehouse.slug}/sales-orders/${order.sequence_number}/approve`,
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
        <Button onClick={handleApprove} className="flex-1">
          Approve order
        </Button>
      );
    }

    if (order.status === "in_progress") {
      return (
        <Button
          onClick={() =>
            router.push(
              `/warehouse/${warehouse.slug}/goods-outward/create?order=${order.sequence_number}`,
            )
          }
          className="flex-1"
        >
          Create outward
        </Button>
      );
    }

    return null;
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
              <h1 className="text-2xl font-bold text-gray-900">
                SO-{order.sequence_number}
              </h1>
              <SalesStatusBadge status={displayStatus} />
            </div>
            <p className="text-sm text-gray-500">
              Sales order on {formatAbsoluteDate(order.order_date)}
            </p>
          </div>

          {/* Progress Bar */}
          {displayStatus !== "approval_pending" && (
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
        <div className="sticky bottom-0 p-4 bg-background border-t border-border flex gap-3 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-sm">
                <IconDotsVertical className="size-5" />
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
              <DropdownMenuItem
                onClick={handleDownloadPDF}
                disabled={downloading}
              >
                {downloading ? (
                  <>
                    <IconDownload className="animate-pulse" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <IconDownload />
                    Download PDF
                  </>
                )}
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
          <Button size="sm" variant="outline" disabled className="flex-1">
            Make invoice
          </Button>
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
