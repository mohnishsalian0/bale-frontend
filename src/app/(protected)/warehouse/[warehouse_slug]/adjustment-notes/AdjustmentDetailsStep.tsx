"use client";

import { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DatePicker } from "@/components/ui/date-picker";
import { dateToISOString } from "@/lib/utils/date";
import type { InvoiceTaxType } from "@/types/database/enums";

interface AdjustmentDetailsStepProps {
  adjustmentDate: string;
  reason: string;
  notes: string;
  taxType: InvoiceTaxType; // Inherited from invoice (read-only display)
  onAdjustmentDateChange: (date: string) => void;
  onReasonChange: (reason: string) => void;
  onNotesChange: (notes: string) => void;
}

export function AdjustmentDetailsStep({
  adjustmentDate,
  reason,
  notes,
  taxType,
  onAdjustmentDateChange,
  onReasonChange,
  onNotesChange,
}: AdjustmentDetailsStepProps) {
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);

  // Tax type label mapping
  const taxTypeLabels: Record<InvoiceTaxType, string> = {
    no_tax: "No Tax",
    gst: "GST (CGST + SGST)",
    igst: "IGST",
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Main Fields */}
      <div className="flex flex-col gap-6 px-4 py-6">
        {/* Adjustment Date */}
        <DatePicker
          label="Adjustment date"
          placeholder="Pick a date"
          value={adjustmentDate ? new Date(adjustmentDate) : undefined}
          onChange={(date) =>
            onAdjustmentDateChange(date ? dateToISOString(date) : "")
          }
          required
        />

        {/* Tax Type Display (Read-only) */}
        <div className="space-y-2">
          <Label>Tax Type (from invoice)</Label>
          <div className="px-3 py-2 border border-gray-200 rounded-md bg-gray-50">
            <p className="text-sm text-gray-700">{taxTypeLabels[taxType]}</p>
          </div>
          <p className="text-xs text-gray-500">
            Tax calculation inherited from original invoice
          </p>
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <Label required htmlFor="reason">
            Reason
          </Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Enter the reason for this adjustment..."
            rows={3}
            maxLength={500}
            required
          />
          <p className="text-xs text-gray-500">
            {reason.length}/500 characters
          </p>
        </div>
      </div>

      {/* Additional Details Section */}
      <Collapsible
        open={showAdditionalDetails}
        onOpenChange={setShowAdditionalDetails}
        className="border-t border-gray-200 px-4 py-5"
      >
        <CollapsibleTrigger
          className={`flex items-center justify-between w-full ${showAdditionalDetails ? "mb-5" : "mb-0"}`}
        >
          <h3 className="text-lg font-medium text-gray-900">
            Additional Details
          </h3>
          <IconChevronDown
            className={`size-6 text-gray-500 transition-transform ${showAdditionalDetails ? "rotate-180" : "rotate-0"}`}
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="flex flex-col gap-6">
            {/* Notes */}
            <Textarea
              placeholder="Enter notes, special instructions, etc..."
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              className="min-h-32"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
