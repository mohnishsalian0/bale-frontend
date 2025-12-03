import type { SalesOrderStatus } from "@/types/database/enums";
import { SalesOrderItemListView } from "@/types/sales-orders.types";

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
 * Determine display status for a sales order
 * Adds 'overdue' status when order is in_progress past expected delivery date
 */
export function getOrderDisplayStatus(
  status: SalesOrderStatus,
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
 * Summarizes the list of products within a sales order
 * Example: Designer Silk Fabric x22, Cotton Denim x11, 3 more
 */
export function getProductSummary(
  products: Array<{ name: string; quantity: number }>,
): string {
  if (products.length === 0) return "No products";
  if (products.length === 1)
    return `${products[0].name} x${products[0].quantity}`;
  if (products.length === 2) {
    return `${products[0].name} x${products[0].quantity}, ${products[1].name} x${products[1].quantity}`;
  }
  const remaining = products.length - 2;
  return `${products[0].name} x${products[0].quantity}, ${products[1].name} x${products[1].quantity}, ${remaining} more`;
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
