import type { InvoiceListView, InvoiceItemListView } from "@/types/invoices.types";
import type { InvoiceStatus, MeasuringUnit } from "@/types/database/enums";
import { isPast } from "date-fns";
import { getMeasuringUnitAbbreviation } from "./measuring-units";

export type InvoiceDisplayStatus = InvoiceStatus | "overdue";

export function getInvoiceDisplayStatus(
  invoice: Pick<InvoiceListView, "status" | "due_date" | "outstanding_amount">,
): InvoiceDisplayStatus {
  if (invoice.status === "settled") {
    return "settled";
  }

  // Check for overdue status if there's an outstanding amount and a due date
  if (
    invoice.outstanding_amount &&
    invoice.outstanding_amount > 0 &&
    invoice.due_date
  ) {
    const dueDate = new Date(invoice.due_date);
    if (isPast(dueDate)) {
      return "overdue";
    }
  }

  return invoice.status as InvoiceDisplayStatus; // 'open' or 'partially_paid'
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