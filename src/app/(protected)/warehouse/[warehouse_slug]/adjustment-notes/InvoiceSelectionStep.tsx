"use client";

import { useState, useMemo } from "react";
import { IconSearch } from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { useInvoices } from "@/lib/query/hooks/invoices";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { formatCurrency } from "@/lib/utils/currency";
import { getInvoiceItemSummary } from "@/lib/utils/invoice";
import type { AdjustmentType } from "@/types/database/enums";

interface InvoiceSelectionStepProps {
  adjustmentType: AdjustmentType;
  selectedPartyLedgerId: string | null;
  warehouseId: string;
  onSelectInvoice: (invoiceNumber: string) => void;
}

export function InvoiceSelectionStep({
  adjustmentType,
  selectedPartyLedgerId,
  warehouseId,
  onSelectInvoice,
}: InvoiceSelectionStepProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const isCreditNote = adjustmentType === "credit";
  const invoiceType = isCreditNote ? "sales" : "purchase";

  // Fetch invoices filtered by invoice type, partner, and warehouse
  // Exclude cancelled invoices
  const { data: invoicesResponse, isLoading } = useInvoices({
    filters: {
      invoice_type: invoiceType,
      warehouse_id: warehouseId,
      party_ledger_id: selectedPartyLedgerId || undefined,
      status: ["open", "partially_paid", "settled"], // Exclude cancelled invoices
    },
    page: 1,
    pageSize: 50,
  });

  const invoices = invoicesResponse?.data || [];

  // Filter invoices based on adjustment type and search query
  const filteredInvoices = useMemo(() => {
    let filtered = invoices;

    // For credit notes, only show invoices with outstanding amount > 0
    if (isCreditNote) {
      filtered = filtered.filter(
        (inv) => inv.outstanding_amount && inv.outstanding_amount > 0,
      );
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((inv) =>
        inv.invoice_number.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [invoices, isCreditNote, searchQuery]);

  const labels = {
    title: isCreditNote ? "Select sales invoice" : "Select purchase invoice",
    searchPlaceholder: "Search by invoice number...",
    loading: "Loading invoices...",
    empty: isCreditNote
      ? "No sales invoices with outstanding amount found"
      : "No purchase invoices found",
  };

  return (
    <>
      {/* Header Section */}
      <div className="flex flex-col gap-3 p-4 shrink-0 border-b border-border">
        <h3 className="text-lg font-semibold text-gray-900">{labels.title}</h3>

        {/* Search */}
        <div className="relative">
          <Input
            placeholder={labels.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
          <IconSearch className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-gray-700 pointer-events-none" />
        </div>
      </div>

      {/* Invoice List - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">{labels.loading}</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500">{labels.empty}</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {filteredInvoices.map((invoice) => (
              <button
                key={invoice.id}
                onClick={() => onSelectInvoice(invoice.invoice_number)}
                className="flex flex-col gap-1 p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors text-left"
              >
                {/* Invoice Number and Amount */}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-base font-medium text-gray-700">
                    {invoice.invoice_number}
                  </p>
                  <p className="text-sm font-semibold text-gray-700">
                    {formatCurrency(invoice.total_amount)}
                  </p>
                </div>

                {/* Product Summary */}
                <p className="text-sm text-gray-500 text-left">
                  {getInvoiceItemSummary(invoice.invoice_items)}
                </p>

                {/* Partner Name, Date, and Outstanding */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {invoice.party_name || invoice.party_display_name} •{" "}
                    {formatAbsoluteDate(invoice.invoice_date)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Outstanding:{" "}
                    {formatCurrency(invoice.outstanding_amount || 0)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
