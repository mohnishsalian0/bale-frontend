"use client";

import { use, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { IconShoppingCart, IconClockHour8 } from "@tabler/icons-react";
import ImageWrapper from "@/components/ui/image-wrapper";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { TabUnderline } from "@/components/ui/tab-underline";
import { SalesStatusBadge } from "@/components/ui/sales-status-badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useSession } from "@/contexts/session-context";
import { formatCurrency } from "@/lib/utils/financial";
import { getPartnerName, getPartnerTypeLabel } from "@/lib/utils/partner";
import { getInitials } from "@/lib/utils/initials";
import {
  calculateCompletionPercentage,
  getOrderDisplayStatus,
  getProductSummary,
} from "@/lib/utils/sales-order";
import { PartnerFormSheet } from "../PartnerFormSheet";
import type { PartnerType, SalesOrderStatus } from "@/types/database/enums";
import {
  usePartnerWithOrderStats,
  usePartnerMutations,
} from "@/lib/query/hooks/partners";
import { useSalesOrders } from "@/lib/query/hooks/sales-orders";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { toast } from "sonner";
import { ActionsFooter } from "@/components/layouts/actions-footer";
import { getPartnerActions } from "@/lib/utils/action-menu";

interface LayoutParams {
  params: Promise<{
    warehouse_slug: string;
    partner_id: string;
  }>;
  children: React.ReactNode;
}

export default function PartnerDetailLayout({
  params,
  children,
}: LayoutParams) {
  const router = useRouter();
  const pathname = usePathname();
  const { partner_id, warehouse_slug } = use(params);
  const { warehouse } = useSession();
  const [showEditPartner, setShowEditPartner] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Initialize mutations
  const { deletePartner, updateActiveStatus } = usePartnerMutations();

  // Fetch partner with order stats using TanStack Query
  const {
    data: partner,
    isLoading: partnerLoading,
    isError: partnerError,
  } = usePartnerWithOrderStats(partner_id);

  // Get aggregates from partner data based on partner type
  const order_stats =
    partner?.partner_type === "customer"
      ? partner?.sales_aggregates
      : partner?.purchase_aggregates;
  const totalOrders = order_stats?.total_orders || 0;
  const totalOrderValue = order_stats?.lifetime_order_value || 0;
  const pendingOrdersCount =
    (order_stats?.approval_pending_count || 0) +
    (order_stats?.in_progress_count || 0);

  // Fetch pending sales orders only when there are pending orders to display
  const { data: ordersResponse, isLoading: ordersLoading } = useSalesOrders({
    filters: {
      customerId: partner?.partner_type === "customer" ? partner_id : undefined,
    },
  });

  const orders = ordersResponse?.data || [];
  const loading = partnerLoading || ordersLoading;

  // Tab logic
  const basePath = `/warehouse/${warehouse_slug}/partners/${partner_id}`;
  const getActiveTab = () => {
    if (pathname.endsWith("/orders")) return "orders";
    return "summary";
  };
  const handleTabChange = (tab: string) => {
    router.push(`${basePath}/${tab}`);
  };

  // Handler for mark inactive action
  const handleMarkInactive = () => {
    if (!partner) return;

    updateActiveStatus.mutate(
      { partnerId: partner.id, value: false },
      {
        onSuccess: () => {
          toast.success("Partner marked as inactive");
          setShowDeleteDialog(false);
          router.push(`/warehouse/${warehouse.slug}/partners`);
        },
        onError: (error: Error) => {
          console.log("Failed to mark partner as inactive", error.message);
          toast.error(`Failed to mark partner as inactive`);
        },
      },
    );
  };

  // Handler for delete action
  const handleDeleteConfirm = () => {
    if (!partner) return;

    deletePartner.mutate(partner.id, {
      onSuccess: () => {
        toast.success("Partner deleted successfully");
        setShowDeleteDialog(false);
        router.push(`/warehouse/${warehouse.slug}/partners`);
      },
      onError: (error: Error) => {
        console.log("Failed to delete partner", error.message);
        toast.error(`Failed to delete partner`);
      },
    });
  };

  // Loading state
  if (loading) {
    return <LoadingState message="Loading partner details..." />;
  }

  // Error state
  if (partnerError || !partner) {
    return (
      <ErrorState
        title="Partner not found"
        message="This partner does not exist or has been deleted"
        onRetry={() => router.back()}
        actionText="Go back"
      />
    );
  }

  // Determine if partner has orders
  const hasOrders = (order_stats?.total_orders ?? 0) > 0;

  const partnerName = getPartnerName(partner);
  const partnerType = partner.partner_type as PartnerType;
  const isCustomer = partnerType === "customer";
  const isSupplier = partnerType === "supplier";

  // Get pending order for display
  const pendingOrder = orders.find(
    (order) =>
      order.status === "in_progress" || order.status === "approval_pending",
  );

  return (
    <div className="flex flex-col grow">
      <div className="relative flex flex-col flex-1">
        {/* Header */}
        <div className="p-4 pb-6">
          <div className="flex items-center gap-4">
            {/* Partner Image */}
            <ImageWrapper
              size="xl"
              shape="circle"
              imageUrl={partner.image_url || undefined}
              alt={partnerName}
              placeholderInitials={getInitials(partnerName)}
            />

            <div className="flex-1 min-w-0">
              <h1
                className="text-2xl font-bold text-gray-900"
                title={partnerName}
              >
                {partnerName}
              </h1>
              <p className="text-sm text-gray-500">
                {getPartnerTypeLabel(partnerType)}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 px-4 pb-4">
          {/* Total Orders Card */}
          <div className="col-span-2 sm:col-span-1 border border-border rounded-lg p-4">
            <div className="flex gap-2 mb-2">
              <IconShoppingCart className="size-4 text-gray-500" />
              <span className="text-xs text-gray-500">Total orders</span>
            </div>
            <p className="text-base font-bold text-gray-700">
              {totalOrders} orders • ₹{formatCurrency(totalOrderValue)}
            </p>
          </div>

          {/* Pending Orders Section */}
          {pendingOrdersCount > 0 &&
            pendingOrder &&
            (() => {
              const displayStatusData = getOrderDisplayStatus(
                pendingOrder.status as SalesOrderStatus,
                pendingOrder.delivery_due_date,
              );
              const completionPercentage = calculateCompletionPercentage(
                pendingOrder.sales_order_items,
              );
              const showProgressBar =
                displayStatusData.status === "in_progress" ||
                displayStatusData.status === "overdue";
              const progressColor =
                displayStatusData.status === "overdue" ? "yellow" : "blue";

              return (
                <button
                  onClick={() =>
                    router.push(
                      `/warehouse/${warehouse.slug}/sales-orders/${pendingOrder.sequence_number}`,
                    )
                  }
                  className="col-span-2 border border-border rounded-lg p-4 hover:bg-gray-50 hover:cursor-pointer transition-colors text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex gap-2">
                      <IconClockHour8 className="size-4 text-gray-500" />
                      <span className="text-xs text-gray-500">
                        {pendingOrdersCount} pending{" "}
                        {pendingOrdersCount === 1 ? "order" : "orders"}
                      </span>
                    </div>
                    <SalesStatusBadge
                      status={displayStatusData.status}
                      text={displayStatusData.text}
                    />
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    {getProductSummary(pendingOrder.sales_order_items)}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      SO-{pendingOrder.sequence_number}
                    </p>
                    {displayStatusData.status !== "approval_pending" && (
                      <p className="text-xs text-gray-500">
                        {completionPercentage}% completed
                      </p>
                    )}
                  </div>
                  {showProgressBar && (
                    <Progress
                      color={progressColor}
                      value={completionPercentage}
                      className="mt-2"
                    />
                  )}
                </button>
              );
            })()}
        </div>

        {/* Tabs */}
        <TabUnderline
          activeTab={getActiveTab()}
          onTabChange={handleTabChange}
          tabs={[
            { value: "summary", label: "Summary" },
            { value: "orders", label: "Orders" },
          ]}
        />

        {/* Tab Content */}
        <div className="relative flex-1">{children}</div>

        {/* Bottom Action Bar */}
        <ActionsFooter
          items={getPartnerActions(
            { partner_type: partner.partner_type as PartnerType },
            {
              onDelete: () => setShowDeleteDialog(true),
              onEdit: () => setShowEditPartner(true),
              onCreateSalesOrder: isCustomer
                ? () =>
                    router.push(
                      `/warehouse/${warehouse.slug}/sales-orders/create`,
                    )
                : undefined,
              onCreatePurchaseOrder: isSupplier
                ? () =>
                    router.push(
                      `/warehouse/${warehouse.slug}/goods-inward/create`,
                    )
                : undefined,
            },
          )}
          dropdownSide="top"
        />

        {/* Edit Partner Sheet */}
        {showEditPartner && partner && (
          <PartnerFormSheet
            key={partner.id}
            open={showEditPartner}
            onOpenChange={setShowEditPartner}
            partnerToEdit={partner}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <ResponsiveDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title={hasOrders ? "Cannot delete partner" : "Delete partner"}
          description={
            hasOrders
              ? "This partner has order history and cannot be deleted. You can mark them as inactive to hide them from active lists."
              : "Are you sure you want to delete this partner? This action cannot be undone."
          }
          footer={
            <div className="flex gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={hasOrders ? handleMarkInactive : handleDeleteConfirm}
                className="flex-1"
              >
                {hasOrders ? "Mark as inactive" : "Confirm delete"}
              </Button>
            </div>
          }
        >
          {hasOrders && (
            <p className="text-sm text-gray-500">
              Total orders: <b>{order_stats?.total_orders || 0}</b>
            </p>
          )}
        </ResponsiveDialog>
      </div>
    </div>
  );
}
