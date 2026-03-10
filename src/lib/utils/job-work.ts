import type { MeasuringUnit, JobWorkStatus } from "@/types/database/enums";
import { JobWorkItemListView } from "@/types/job-works.types";
import { getPartnerName, PartnerNameFields } from "./partner";
import { getMeasuringUnitAbbreviation } from "./measuring-units";
import { getDueTimeForStatus } from "./date";

export type DisplayStatus = JobWorkStatus | "overdue";

interface OrderItem {
  expected_quantity: number;
  received_quantity: number | null;
}

/**
 * Calculate completion percentage for a job work
 * Based on expected vs received quantities across all items
 */
export function calculateCompletionPercentage(items: OrderItem[]): number {
  const totalExpected = items.reduce(
    (sum, item) => sum + item.expected_quantity,
    0,
  );
  const totalReceived = items.reduce(
    (sum, item) => sum + (item.received_quantity || 0),
    0,
  );

  return totalExpected > 0
    ? Math.round((totalReceived / totalExpected) * 100)
    : 0;
}

/**
 * Determine display status and text for a job work
 * Returns status type and formatted text (e.g., "Due in 3 days", "In Progress")
 */
export function getJobWorkDisplayStatus(
  status: JobWorkStatus,
  dueDate?: string | null,
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

  if (status === "in_progress" && dueDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const isOverdue = due < today;
    const dueTime = getDueTimeForStatus(dueDate);

    if (dueTime) {
      return {
        status: isOverdue ? "overdue" : "in_progress",
        text: dueTime,
      };
    }
  }

  return { status: "in_progress", text: "In Progress" };
}

/**
 * Summarizes the list of products within a job work
 * Example: Designer Silk Fabric (22 m), Cotton Denim (11 metre)
 */
export function getProductSummary(orderItems: JobWorkItemListView[]): string {
  if (orderItems.length === 0) return "No products";
  let productsSummary: string[] = [];
  orderItems.map((oi) => {
    const productInfo = oi.product;
    const unit = oi.product?.measuring_unit as MeasuringUnit;
    const unitAbbreviation = getMeasuringUnitAbbreviation(unit);
    productsSummary.push(
      `${productInfo?.name || "Unknown product"} (${oi.expected_quantity} ${unitAbbreviation})`,
    );
  });

  return productsSummary.join(", ");
}

/**
 * Summarizes the list of products within a job work with pending quantities
 * Example: Designer Silk Fabric (22 m), Cotton Denim (11 units)
 */
export function getPendingProductSummary(
  orderItems: JobWorkItemListView[],
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
 * Get formatted name for a vendor if present, else "No vendor assigned"
 */
export function getVendorName(vendor: PartnerNameFields | null): string {
  if (!vendor) return "No vendor assigned";
  return getPartnerName(vendor);
}
