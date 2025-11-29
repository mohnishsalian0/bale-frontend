"use client";

import { use, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SalesStatusBadge } from "@/components/ui/sales-status-badge";
import { Progress } from "@/components/ui/progress";
import { LoadingState } from "@/components/layouts/loading-state";
import { ErrorState } from "@/components/layouts/error-state";
import { useSession } from "@/contexts/session-context";
import { calculateOrderFinancials } from "@/lib/utils/financial";
import { formatAbsoluteDate } from "@/lib/utils/date";
import {
  calculateCompletionPercentage,
  getOrderDisplayStatus,
  type DisplayStatus,
} from "@/lib/utils/sales-order";
import type { DiscountType, SalesOrderStatus } from "@/types/database/enums";
import { NotesEditSheet } from "./NotesEditSheet";
import { CustomerEditSheet } from "./CustomerEditSheet";
import { AgentEditSheet } from "./AgentEditSheet";
import { WarehouseEditSheet } from "./WarehouseEditSheet";
import { PaymentTermsEditSheet } from "./PaymentTermsEditSheet";
import { TransportEditSheet } from "./TransportEditSheet";
import { OrderDetailsTab } from "./OrderDetailsTab";
import { OutwardsTab } from "./OutwardsTab";
import { TabUnderline } from "@/components/ui/tab-underline";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconDotsVertical } from "@tabler/icons-react";
import { useSalesOrder } from "@/lib/query/hooks/sales-orders";

interface PageParams {
  params: Promise<{
    warehouse_slug: string;
    order_number: string;
  }>;
}

export default function SalesOrderDetailPage({ params }: PageParams) {
  const router = useRouter();
  const { order_number } = use(params);
  const { warehouse } = useSession();
  const [activeTab, setActiveTab] = useState<"details" | "outwards">("details");

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
    isLoading: loading,
    isError: error,
  } = useSalesOrder(order_number);

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

  // Primary CTA logic
  const getPrimaryCTA = () => {
    if (!order) return null;

    if (order.status === "approval_pending") {
      return (
        <Button onClick={() => console.log("Approve")} className="flex-1">
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
    <div className="flex flex-col flex-1 overflow-y-auto">
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
              <Progress
                color={displayStatus === "overdue" ? "yellow" : "blue"}
                value={completionPercentage}
              />
            </div>
          )}
        </div>

        {/* Tabs */}
        <TabUnderline
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as "details" | "outwards")}
          tabs={[
            { value: "details", label: "Order details" },
            { value: "outwards", label: "Outwards" },
          ]}
        />

        {/* Tab Content */}
        <div className="flex-1">
          {activeTab === "details" ? (
            <OrderDetailsTab
              order={order}
              financials={financials}
              displayStatus={displayStatus}
              onEditLineItems={() => {}} // TODO: Handle line item edit
              onEditCustomer={() => setShowCustomerEdit(true)}
              onEditAgent={() => setShowAgentEdit(true)}
              onEditPaymentTerms={() => setShowPaymentTermsEdit(true)}
              onEditWarehouse={() => setShowWarehouseEdit(true)}
              onEditNotes={() => setShowNotesEdit(true)}
            />
          ) : (
            <OutwardsTab
              orderId={order.id}
              warehouseSlug={warehouse?.slug || ""}
            />
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="sticky bottom-0 p-4 bg-background border-t border-border flex gap-3 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <IconDotsVertical className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {(order.status === "in_progress" ||
                displayStatus === "overdue") && (
                <>
                  <DropdownMenuItem
                    onClick={() => console.log("Mark as complete")}
                  >
                    Mark as complete
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => console.log("Share")}>
                Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => console.log("Download")}>
                Download
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => console.log("Cancel order")}
              >
                Cancel order
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" disabled className="flex-1">
            Make invoice
          </Button>
          {getPrimaryCTA()}
        </div>

        {/* Edit Sheets */}
        {order && (
          <>
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
        )}
      </div>
    </div>
  );
}
