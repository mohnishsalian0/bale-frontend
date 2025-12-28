import type { PaymentAllocationListView } from "@/types/payments.types";
import { formatCurrency } from "@/lib/utils/currency";

export function getPaymentAllocationSummary(allocations: PaymentAllocationListView[]): string {
  if (!allocations || allocations.length === 0) {
    return "";
  }

  const againstRefAllocations = allocations.filter(
    (allocation) => allocation.allocation_type === "against_ref" && allocation.invoice
  );

  if (againstRefAllocations.length === 0) {
    return ""; // No 'against_ref' allocations with invoices
  }

  const summaryParts = againstRefAllocations.map((allocation) => {
    const invoiceNumber = allocation.invoice?.invoice_number || "Unknown Invoice";
    const allocatedAmount = formatCurrency(allocation.amount_applied);
    return `${invoiceNumber} (${allocatedAmount})`;
  });

  return summaryParts.join(", ");
}