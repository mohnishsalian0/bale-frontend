"use client";

import { Button } from "@/components/ui/button";
import { useOutstandingInvoices } from "@/lib/query/hooks/payments";
import { formatCurrency } from "@/lib/utils/currency";
import { IconTrash, IconPlus } from "@tabler/icons-react";
import type { OutstandingInvoiceView } from "@/types/payments.types";
import { getInvoiceInfo } from "@/lib/utils/invoice";

interface InvoiceSelectionListProps {
  invoices: OutstandingInvoiceView[];
  allocations: Array<{ invoiceId: string; amount: number }>;
  onSelectInvoice: (invoice: OutstandingInvoiceView) => void;
  onRemoveAllocation: (invoiceId: string) => void;
  partyLedgerId: string;
  invoiceType: "sales" | "purchase";
}

export function InvoiceSelectionList({
  allocations,
  onSelectInvoice,
  onRemoveAllocation,
  partyLedgerId,
  invoiceType,
}: InvoiceSelectionListProps) {
  const { data: invoices = [], isLoading } = useOutstandingInvoices({
    partyLedgerId,
    invoiceType,
  });

  const getAllocatedAmount = (invoiceId: string) => {
    return allocations.find((a) => a.invoiceId === invoiceId)?.amount || 0;
  };

  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex justify-between p-4 shrink-0 border-b border-border">
        <h3 className="text-lg font-semibold text-gray-900">
          Outstanding Invoices
        </h3>
        {allocations.length > 0 && (
          <p className="text-sm text-gray-500">
            Total Allocated: {formatCurrency(totalAllocated)}
          </p>
        )}
      </div>

      {/* Invoice List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">No outstanding invoices</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {invoices.map((invoice) => {
              const allocatedAmount = getAllocatedAmount(invoice.id);
              const isAllocated = allocatedAmount > 0;
              const invoiceInfo = getInvoiceInfo(invoice);

              return (
                <div
                  key={invoice.id}
                  className="flex items-center gap-3 p-4 border-b border-gray-200"
                >
                  {/* Invoice Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-gray-700">
                      {invoice.invoice_number}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{invoiceInfo}</p>
                  </div>

                  {/* Action Buttons */}
                  {isAllocated ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => onSelectInvoice(invoice)}
                      >
                        {formatCurrency(allocatedAmount)}
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        onClick={() => onRemoveAllocation(invoice.id)}
                      >
                        <IconTrash />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectInvoice(invoice)}
                    >
                      <IconPlus />
                      Allocate
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
