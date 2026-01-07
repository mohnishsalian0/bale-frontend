"use client";

import { useState } from "react";
import { InvoiceSelectionList } from "./InvoiceSelectionList";
import { InvoiceAllocationModal } from "./InvoiceAllocationModal";
import type { OutstandingInvoiceView } from "@/types/payments.types";

interface InvoiceAllocationStepProps {
  invoiceAllocations: Array<{ invoiceId: string; amount: number }>;
  onAddInvoiceAllocation: (invoiceId: string, amount: number) => void;
  onRemoveInvoiceAllocation: (invoiceId: string) => void;
  partyLedgerId: string;
  invoiceType: "sales" | "purchase";
}

export function InvoiceAllocationStep({
  invoiceAllocations,
  onAddInvoiceAllocation,
  onRemoveInvoiceAllocation,
  partyLedgerId,
  invoiceType,
}: InvoiceAllocationStepProps) {
  const [selectedInvoice, setSelectedInvoice] =
    useState<OutstandingInvoiceView | null>(null);
  const [showAllocationModal, setShowAllocationModal] = useState(false);

  const handleSelectInvoice = (invoice: OutstandingInvoiceView) => {
    setSelectedInvoice(invoice);
    setShowAllocationModal(true);
  };

  const handleAllocate = (amount: number) => {
    if (selectedInvoice) {
      onAddInvoiceAllocation(selectedInvoice.id, amount);
    }
  };

  return (
    <>
      <InvoiceSelectionList
        invoices={[]}
        allocations={invoiceAllocations}
        onSelectInvoice={handleSelectInvoice}
        onRemoveAllocation={onRemoveInvoiceAllocation}
        partyLedgerId={partyLedgerId}
        invoiceType={invoiceType}
      />

      {/* Allocation Modal */}
      <InvoiceAllocationModal
        open={showAllocationModal}
        onOpenChange={setShowAllocationModal}
        invoice={selectedInvoice}
        onAllocate={handleAllocate}
      />
    </>
  );
}
