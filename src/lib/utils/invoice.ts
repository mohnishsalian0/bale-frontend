import type {
  InvoiceListView,
  InvoiceItemListView,
} from "@/types/invoices.types";
import type { InvoiceStatus, MeasuringUnit } from "@/types/database/enums";
import { getMeasuringUnitAbbreviation } from "./measuring-units";
import { formatDueDate } from "./date";

export type InvoiceDisplayStatus = InvoiceStatus | "overdue";

/**
 * Determine display status and text for an invoice
 * Returns status type and formatted text (e.g., "Due in 3 days", "Open")
 */
export function getInvoiceDisplayStatus(
  invoice: Pick<InvoiceListView, "status" | "due_date" | "outstanding_amount">,
): { status: InvoiceDisplayStatus; text: string } {
  if (invoice.status === "settled") {
    return { status: "settled", text: "Settled" };
  }

  if (invoice.status === "cancelled") {
    return { status: "cancelled", text: "Cancelled" };
  }

  // Check for due date formatting if there's an outstanding amount and a due date
  if (
    invoice.outstanding_amount &&
    invoice.outstanding_amount > 0 &&
    invoice.due_date
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(invoice.due_date);
    dueDate.setHours(0, 0, 0, 0);

    const formattedDueDate = formatDueDate(invoice.due_date);

    // If we have a formatted due date (within 14 days or overdue), use it
    if (formattedDueDate) {
      const isOverdue = dueDate < today;
      return {
        status: (isOverdue
          ? "overdue"
          : invoice.status) as InvoiceDisplayStatus,
        text: formattedDueDate,
      };
    }
  }

  // Default: return current status as text (open or partially_paid)
  return {
    status: invoice.status as InvoiceDisplayStatus,
    text: invoice.status === "open" ? "Open" : "Partially Paid",
  };
}

export function getInvoiceItemSummary(items: InvoiceItemListView[]): string {
  if (!items || items.length === 0) {
    return "No items";
  }

  const summaryParts = items.map((item) => {
    const productName = item.product?.name || "Unknown Product";
    const quantity = item.quantity;
    const unit = item.product?.measuring_unit as MeasuringUnit;

    const unitAbbreviation = getMeasuringUnitAbbreviation(unit);

    return `${productName} (${quantity} ${unitAbbreviation})`;
  });

  return summaryParts.join(", ");
}
