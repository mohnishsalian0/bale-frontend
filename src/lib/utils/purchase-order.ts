import type { PurchaseOrderStatus } from "@/types/database/enums";
import { PurchaseOrderItemListView } from "@/types/purchase-orders.types";
import { getPartnerName, PartnerNameFields } from "./partner";
import { getMeasuringUnit } from "./measuring-units";

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
 * Determine display status for a purchase order
 * Adds 'overdue' status when order is in_progress past expected delivery date
 */
export function getOrderDisplayStatus(
  status: PurchaseOrderStatus,
  expectedDeliveryDate?: string | null,
): DisplayStatus {
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  if (status === "approval_pending") return "approval_pending";

  if (status === "in_progress" && expectedDeliveryDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(expectedDeliveryDate);
    dueDate.setHours(0, 0, 0, 0);

    return dueDate < today ? "overdue" : "in_progress";
  }

  return "in_progress";
}

/**
 * Summarizes the list of products within a purchase order
 * Example: Designer Silk Fabric (22 metre), Cotton Denim (11 metre), 3 more
 */
export function getProductSummary(
  orderItems: PurchaseOrderItemListView[],
): string {
  if (orderItems.length === 0) return "No products";
  let productsSummary: string[] = [];
  orderItems.map((oi) => {
    const productInfo = oi.product;
    const measuringUnit = getMeasuringUnit(productInfo);
    productsSummary.push(
      `${productInfo?.name || "Unknown product"} (${oi.required_quantity} ${measuringUnit})`,
    );
  });

  return productsSummary.join(", ");
}

/**
 * Comma separated products along with their quantities
 * Example: Designer Silk Fabric x22, Cotton Denim x11
 */
export function getFullProductInfo(items: PurchaseOrderItemListView[]): string {
  return items
    .map((item) => `${item.product?.name} x${item.required_quantity}`)
    .join(", ");
}

/**
 * Get formatted name for an agent if present, else "No agent assigned"
 */
export function getAgentName(agent: PartnerNameFields | null): string {
  if (!agent) return "No agent assigned";
  return getPartnerName(agent);
}
