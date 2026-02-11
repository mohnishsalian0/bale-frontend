"use client";

import { DatePicker } from "@/components/ui/date-picker";
import { dateToISOString } from "@/lib/utils/date";

interface CompletionDetailsFormData {
  completionDate: string;
}

interface CompletionDetailsStepProps {
  formData: CompletionDetailsFormData;
  onChange: (data: Partial<CompletionDetailsFormData>) => void;
}

export function CompletionDetailsStep({
  formData,
  onChange,
}: CompletionDetailsStepProps) {
  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-6 py-4">
      <div className="flex flex-col gap-6 px-4 py-2">
        {/* Completion Date */}
        <DatePicker
          label="Completion date"
          placeholder="Pick a date"
          value={
            formData.completionDate
              ? new Date(formData.completionDate)
              : undefined
          }
          onChange={(date) =>
            onChange({
              completionDate: date ? dateToISOString(date) : "",
            })
          }
          required
        />
      </div>
    </div>
  );
}
