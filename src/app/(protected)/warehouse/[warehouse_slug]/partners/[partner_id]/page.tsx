"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconPlus,
  IconShoppingCart,
  IconClockHour8,
  IconTrash,
} from "@tabler/icons-react";
import ImageWrapper from "@/components/ui/image-wrapper";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { TabUnderline } from "@/components/ui/tab-underline";
import { SalesStatusBadge } from "@/components/ui/sales-status-badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "@/contexts/session-context";
import { formatCurrency } from "@/lib/utils/financial";
import { getPartnerName } from "@/lib/utils/partner";
import { getInitials } from "@/lib/utils/initials";
import {
  calculateCompletionPercentage,
  getOrderDisplayStatus,
} from "@/lib/utils/sales-order";
import { SummaryTab } from "./SummaryTab";
import { OrdersTab } from "./OrdersTab";
import { PartnerFormSheet } from "../PartnerFormSheet";
import type { PartnerType, SalesOrderStatus } from "@/types/database/enums";
import { usePartnerWithOrderStats } from "@/lib/query/hooks/partners";
import { useSalesOrdersByCustomer } from "@/lib/query/hooks/sales-orders";

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    partner_id: string;
  }>;
}

function getPartnerTypeLabel(type: PartnerType): string {
  switch (type) {
    case "customer":
      return "Customer";
    case "supplier":
      return "Supplier";
    case "vendor":
      return "Vendor";
    case "agent":
      return "Agent";
    default:
      return type;
  }
}

export default function PartnerDetailPage({ params }: PageParams) {
  const router = useRouter();
  const { partner_id } = use(params);
  const { warehouse } = useSession();
  const [activeTab, setActiveTab] = useState<"summary" | "orders">("summary");
  const [showEditPartner, setShowEditPartner] = useState(false);

  // Fetch partner with order stats using TanStack Query
  const {
    data: partner,
    isLoading: partnerLoading,
    isError: partnerError,
  } = usePartnerWithOrderStats(partner_id);

  console.log(partner);

  // Get aggregates from partner data
  const order_stats = partner?.order_stats;
  const totalOrders = order_stats?.total_orders || 0;
  const totalOrderValue = order_stats?.lifetime_order_value || 0;
  const pendingOrdersCount =
    (order_stats?.approval_pending_count || 0) +
    (order_stats?.in_progress_count || 0);

  // Fetch pending sales orders only when there are pending orders to display
  const { data: orders = [], isLoading: ordersLoading } =
    useSalesOrdersByCustomer(
      partner?.partner_type === "customer" ? partner_id : null,
      pendingOrdersCount > 0,
    );

  const loading = partnerLoading || ordersLoading;

  if (loading) {
    return <LoadingState message="Loading partner details..." />;
  }

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
    <div className="flex flex-col flex-1 overflow-y-auto">
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
        <div className="grid grid-cols-2 gap-3 px-4 pb-6">
          {/* Total Orders Card */}
          <div className="col-span-2 sm:col-span-1 border border-border rounded-lg p-4">
            <div className="flex gap-2 mb-2">
              <IconShoppingCart className="size-4 text-gray-500" />
              <span className="text-xs text-gray-500">Total orders</span>
            </div>
            <p className="text-lg font-bold text-gray-700">
              {totalOrders} orders • ₹{formatCurrency(totalOrderValue)}
            </p>
          </div>

          {/* Pending Orders Section */}
          {pendingOrdersCount > 0 &&
            pendingOrder &&
            (() => {
              const displayStatus = getOrderDisplayStatus(
                pendingOrder.status as SalesOrderStatus,
                pendingOrder.expected_delivery_date,
              );
              const completionPercentage = calculateCompletionPercentage(
                pendingOrder.sales_order_items,
              );
              const showProgressBar =
                displayStatus === "in_progress" || displayStatus === "overdue";
              const progressColor =
                displayStatus === "overdue" ? "yellow" : "blue";

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
                    <SalesStatusBadge status={displayStatus} />
                  </div>
                  <p className="font-medium text-gray-900">
                    {pendingOrder.sales_order_items
                      .map((item) => item.product?.name)
                      .filter(Boolean)
                      .slice(0, 2)
                      .join(", ")}
                    {pendingOrder.sales_order_items.length > 2 &&
                      ` +${pendingOrder.sales_order_items.length - 2} more`}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      SO-{pendingOrder.sequence_number}
                    </p>
                    {displayStatus !== "approval_pending" && (
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
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as "summary" | "orders")}
          tabs={[
            { value: "summary", label: "Summary" },
            { value: "orders", label: "Orders" },
          ]}
        />

        {/* Tab Content */}
        <div className="relative flex-1 border-r border-border">
          {activeTab === "summary" && (
            <SummaryTab
              partner={partner}
              onEdit={() => setShowEditPartner(true)}
            />
          )}
          {activeTab === "orders" && (
            <OrdersTab orders={orders} warehouseSlug={warehouse.slug} />
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="sticky bottom-0 p-4 bg-background border-t border-border flex gap-3 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                •••
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" sideOffset={8}>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => console.log("Delete partner")}
              >
                <IconTrash />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            onClick={() => setShowEditPartner(true)}
            className="flex-1"
          >
            Edit
          </Button>

          {isCustomer && (
            <Button
              onClick={() =>
                router.push(`/warehouse/${warehouse.slug}/sales-orders/create`)
              }
              className="flex-2"
            >
              <IconPlus className="size-5" />
              Sales order
            </Button>
          )}

          {isSupplier && (
            <Button
              onClick={() =>
                router.push(`/warehouse/${warehouse.slug}/goods-inward/create`)
              }
              className="flex-2"
            >
              <IconPlus className="size-5" />
              Purchase order
            </Button>
          )}
        </div>

        {/* Edit Partner Sheet */}
        {showEditPartner && partner && (
          <PartnerFormSheet
            key={partner.id}
            open={showEditPartner}
            onOpenChange={setShowEditPartner}
            partnerToEdit={partner}
          />
        )}
      </div>
    </div>
  );
}
