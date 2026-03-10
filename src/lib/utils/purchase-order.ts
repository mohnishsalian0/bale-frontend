import type {
  MeasuringUnit,
  PurchaseOrderStatus,
} from "@/types/database/enums";
import { PurchaseOrderItemListView } from "@/types/purchase-orders.types";
import { getPartnerName, PartnerNameFields } from "./partner";
import { getMeasuringUnitAbbreviation } from "./measuring-units";
import { getDueTimeForStatus } from "./date";

export type DisplayStatus = PurchaseOrderStatus | "overdue";

interface OrderItem {
  required_quantity: number;
  received_quantity: number | null;
}

/**
 * Calculate completion percentage for a purchase order
 * Based on required vs received quantities across all items
 */
export function calculateCompletionPercentage(items: OrderItem[]): number {
  const totalRequired = items.reduce(
    (sum, item) => sum + item.required_quantity,
    0,
  );
  const totalReceived = items.reduce(
    (sum, item) => sum + (item.received_quantity || 0),
    0,
  );

  return totalRequired > 0
    ? Math.round((totalReceived / totalRequired) * 100)
    : 0;
}

/**
 * Determine display status and text for a purchase order
 * Returns status type and formatted text (e.g., "Due in 3 days", "In Progress")
 */
export function getOrderDisplayStatus(
  status: PurchaseOrderStatus,
  expectedDeliveryDate?: string | null,
): { status: DisplayStatus; text: string } {
  if (status === "completed") {
    return { status: "completed", text: "Completed" };
  }
  if (status === "cancelled") {
    return { status: "cancelled", text: "Cancelled" };
  }
  if (status === "approval_pending") {
    return { status: "approval_pending", text: "Approval Pending" };
  }

  if (status === "in_progress" && expectedDeliveryDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(expectedDeliveryDate);
    dueDate.setHours(0, 0, 0, 0);

    const isOverdue = dueDate < today;
    const dueTime = getDueTimeForStatus(expectedDeliveryDate);

    // If we have a formatted due date (within 14 days or overdue), use it
    if (dueTime) {
      return {
        status: isOverdue ? "overdue" : "in_progress",
        text: dueTime,
      };
    }
  }

  // Default: in_progress without due date or more than 14 days away
  return { status: "in_progress", text: "In Progress" };
}

/**
 * Summarizes the list of products within a purchase order
 * Example: Designer Silk Fabric (22 m), Cotton Denim (11 metre), 3 more
 */
export function getProductSummary(
  orderItems: PurchaseOrderItemListView[],
): string {
  if (orderItems.length === 0) return "No products";
  let productsSummary: string[] = [];
  orderItems.map((oi) => {
    const productInfo = oi.product;
    const unit = oi.product?.measuring_unit as MeasuringUnit;
    const unitAbbreviation = getMeasuringUnitAbbreviation(unit);
    productsSummary.push(
      `${productInfo?.name || "Unknown product"} (${oi.required_quantity} ${unitAbbreviation})`,
    );
  });

  return productsSummary.join(", ");
}

/**
 * Summarizes the list of products within a purchase order
 * Example: Designer Silk Fabric (22 m), Cotton Denim (11 units), 3 more
 */
export function getPendingProductSummary(
  orderItems: PurchaseOrderItemListView[],
): string {
  if (orderItems.length === 0) return "No products";
  let productsSummary: string[] = [];
  orderItems.map((oi) => {
    const productInfo = oi.product;
    const unit = oi.product?.measuring_unit as MeasuringUnit;
    const unitAbbreviation = getMeasuringUnitAbbreviation(unit);
    productsSummary.push(
      `${productInfo?.name || "Unknown product"} (${oi.pending_quantity} ${unitAbbreviation})`,
    );
  });

  return productsSummary.join(", ");
}

/**
 * Get formatted name for an agent if present, else "No agent assigned"
 */
export function getAgentName(agent: PartnerNameFields | null): string {
  if (!agent) return "No agent assigned";
  return getPartnerName(agent);
}
