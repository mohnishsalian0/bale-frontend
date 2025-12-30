"use client";

import { useState } from "react";
import { IconCurrencyRupee } from "@tabler/icons-react";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { InputWrapper } from "@/components/ui/input-wrapper";
import { formatCurrency } from "@/lib/utils/currency";
import type { OutstandingInvoiceView } from "@/types/payments.types";

interface InvoiceAllocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: OutstandingInvoiceView | null;
  onAllocate: (amount: number) => void;
}

export function InvoiceAllocationModal({
  open,
  onOpenChange,
  invoice,
  onAllocate,
}: InvoiceAllocationModalProps) {
  const [amount, setAmount] = useState<string>("");

  if (!invoice) return null;

  const outstandingAmount = invoice.outstanding_amount || 0;

  // Calculate preset amounts
  const presets = [
    { label: "25%", value: outstandingAmount * 0.25 },
    { label: "50%", value: outstandingAmount * 0.5 },
    { label: "75%", value: outstandingAmount * 0.75 },
    { label: "Full", value: outstandingAmount },
  ];

  const handlePresetClick = (value: number) => {
    setAmount(value.toFixed(2));
  };

  const handleSubmit = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0 || numAmount > outstandingAmount) {
      return;
    }
    onAllocate(numAmount);
    setAmount("");
    onOpenChange(false);
  };

  const handleCancel = () => {
    setAmount("");
    onOpenChange(false);
  };

  const isValid =
    amount &&
    !isNaN(parseFloat(amount)) &&
    parseFloat(amount) > 0 &&
    parseFloat(amount) <= outstandingAmount;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(open) => {
        if (!open) handleCancel();
        onOpenChange(open);
      }}
      title="Allocate Amount"
      description={invoice.invoice_number}
      footer={
        <div className="flex gap-3 w-full">
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid} className="flex-1">
            Allocate
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Amount Input */}
        <InputWrapper
          label="Allocation Amount"
          type="number"
          step="0.01"
          min="0"
          max={outstandingAmount || undefined}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          icon={<IconCurrencyRupee />}
          helpText={`Outstanding: ${formatCurrency(outstandingAmount || 0)}`}
        />

        {/* Smart Presets */}
        <div className="grid grid-cols-4 gap-2">
          {presets.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              onClick={() => handlePresetClick(preset.value)}
              className="border-border shadow-gray-sm text-foreground"
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>
    </ResponsiveDialog>
  );
}
