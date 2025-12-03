"use client";

import { useState } from "react";
import { IconChevronDown, IconHash, IconUpload } from "@tabler/icons-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DatePicker } from "@/components/ui/date-picker";
import { dateToISOString } from "@/lib/utils/date";
import { InputWithIcon } from "@/components/ui/input-with-icon";

interface DetailsFormData {
  inwardDate: string;
  invoiceNumber: string;
  notes: string;
  documentFile: File | null;
}

interface DetailsStepProps {
  formData: DetailsFormData;
  onChange: (data: Partial<DetailsFormData>) => void;
}

export function InwardDetailsStep({ formData, onChange }: DetailsStepProps) {
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange({ documentFile: file });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-5 py-4">
      <div className="flex flex-col gap-2 px-4">
        {/* Inward Date */}
        <DatePicker
          placeholder="Inward date"
          value={
            formData.inwardDate ? new Date(formData.inwardDate) : undefined
          }
          onChange={(date) =>
            onChange({
              inwardDate: date ? dateToISOString(date) : "",
            })
          }
        />
      </div>

      {/* Additional Details Section */}
      <Collapsible
        open={showAdditionalDetails}
        onOpenChange={setShowAdditionalDetails}
        className="border-t border-gray-200 px-4"
      >
        <CollapsibleTrigger
          className={`flex items-center justify-between w-full py-3 ${showAdditionalDetails ? "pb-3" : "pb-0"}`}
        >
          <h3 className="text-lg font-medium text-gray-900">
            Additional Details
          </h3>
          <IconChevronDown
            className={`size-6 text-gray-500 transition-transform ${showAdditionalDetails ? "rotate-180" : "rotate-0"}`}
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="flex flex-col gap-4 pt-4">
          {/* Invoice Number */}
          <InputWithIcon
            type="text"
            placeholder="Invoice number"
            value={formData.invoiceNumber}
            onChange={(e) => onChange({ invoiceNumber: e.target.value })}
            className="flex-1"
            icon={<IconHash />}
          />

          {/* Notes */}
          <Textarea
            placeholder="Enter a note..."
            value={formData.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            className="min-h-32"
          />

          {/* File Upload */}
          <div>
            <label
              htmlFor="document-upload"
              className="flex items-center justify-center gap-2 h-11 px-4 border border-input rounded-md cursor-pointer hover:bg-accent transition-colors"
            >
              <IconUpload className="size-4" />
              <span className="text-sm">
                {formData.documentFile
                  ? formData.documentFile.name
                  : "Upload document"}
              </span>
            </label>
            <input
              id="document-upload"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileSelect}
              className="sr-only"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
