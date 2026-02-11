"use client";

import { useState } from "react";
import { IconChevronDown, IconHash } from "@tabler/icons-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DatePicker } from "@/components/ui/date-picker";
import { dateToISOString } from "@/lib/utils/date";
import { InputWrapper } from "@/components/ui/input-wrapper";
import { Label } from "@/components/ui/label";
import MultipleSelector from "@/components/ui/multiple-selector";
import { useAttributes } from "@/lib/query/hooks/attributes";

interface ConvertDetailsFormData {
  serviceType: string;
  startDate: string;
  referenceNumber: string;
  notes: string;
}

interface ConvertDetailsStepProps {
  formData: ConvertDetailsFormData;
  onChange: (data: Partial<ConvertDetailsFormData>) => void;
}

export function ConvertDetailsStep({
  formData,
  onChange,
}: ConvertDetailsStepProps) {
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);

  // Fetch service type attributes
  const { data: serviceTypes = [] } = useAttributes("service_type");

  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-6 py-4">
      <div className="flex flex-col gap-6 px-4 py-2">
        {/* Start Date */}
        <DatePicker
          label="Start date"
          placeholder="Pick a date"
          value={formData.startDate ? new Date(formData.startDate) : undefined}
          onChange={(date) =>
            onChange({
              startDate: date ? dateToISOString(date) : "",
            })
          }
          required
        />

        {/* Service Type */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-gray-700">
            Service type <span className="text-red-500">*</span>
          </Label>
          <MultipleSelector
            value={
              formData.serviceType
                ? [
                    {
                      value: formData.serviceType,
                      label: formData.serviceType,
                    },
                  ]
                : []
            }
            onChange={(options) => {
              onChange({
                serviceType: options[0]?.value || "",
              });
            }}
            options={serviceTypes.map((st) => ({
              value: st.name,
              label: st.name,
            }))}
            placeholder="Select service type"
            maxSelected={1}
            creatable
            triggerSearchOnFocus
            hidePlaceholderWhenSelected
            emptyIndicator={
              <p className="text-center text-sm text-gray-500">
                No service types found
              </p>
            }
          />
        </div>

        {/* Reference Number */}
        <InputWrapper
          type="text"
          placeholder="Reference number (Form GST ITC-04, challan, etc.)"
          value={formData.referenceNumber}
          onChange={(e) => onChange({ referenceNumber: e.target.value })}
          icon={<IconHash />}
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
          {/* Notes */}
          <Textarea
            placeholder="Enter a note..."
            value={formData.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            className="min-h-32"
          />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
