import type { MeasuringUnit, SalesOrderStatus } from "@/types/database/enums";
import { SalesOrderItemListView } from "@/types/sales-orders.types";
import { getPartnerName, PartnerNameFields } from "./partner";
import { getMeasuringUnitAbbreviation } from "./measuring-units";
import { formatDueDate } from "./date";

export type DisplayStatus = SalesOrderStatus | "overdue";

interface OrderItem {
  required_quantity: number;
  dispatched_quantity: number | null;
}

/**
 * Calculate completion percentage for a sales order
 * Based on required vs dispatched quantities across all items
 */
export function calculateCompletionPercentage(items: OrderItem[]): number {
  const totalRequired = items.reduce(
    (sum, item) => sum + item.required_quantity,
    0,
  );
  const totalDispatched = items.reduce(
    (sum, item) => sum + (item.dispatched_quantity || 0),
    0,
  );

  return totalRequired > 0
    ? Math.round((totalDispatched / totalRequired) * 100)
    : 0;
}

/**
 * Determine display status and text for a sales order
 * Returns status type and formatted text (e.g., "Due in 3 days", "In Progress")
 */
export function getOrderDisplayStatus(
  status: SalesOrderStatus,
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
    const formattedDueDate = formatDueDate(expectedDeliveryDate);

    // If we have a formatted due date (within 14 days or overdue), use it
    if (formattedDueDate) {
      return {
        status: isOverdue ? "overdue" : "in_progress",
        text: formattedDueDate,
      };
    }
  }

  // Default: in_progress without due date or more than 14 days away
  return { status: "in_progress", text: "In Progress" };
}

/**
 * Summarizes the list of products within a sales order
 * Example: Designer Silk Fabric x22, Cotton Denim x11, 3 more
 */
export function getProductSummary(
  orderItems: SalesOrderItemListView[],
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
 * Comma separated products along with their quantities
 * Example: Designer Silk Fabric x22, Cotton Denim x11
 */
export function getFullProductInfo(items: SalesOrderItemListView[]): string {
  return items
    .map((item) => `${item.product?.name} x${item.required_quantity}`)
    .join(", ");
}

/**
 * Get formatted name for a agent if present, else "No agent assigned"
 */
export function getAgentName(agent: PartnerNameFields | null): string {
  if (!agent) return "No agent assigned";
  return getPartnerName(agent);
}
