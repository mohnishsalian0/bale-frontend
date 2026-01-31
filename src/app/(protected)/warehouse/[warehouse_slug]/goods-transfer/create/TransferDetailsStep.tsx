"use client";

import { useState } from "react";
import {
  IconChevronDown,
  IconHash,
  IconTruck,
  IconTrain,
  IconPlane,
  IconShip,
  IconPackage,
} from "@tabler/icons-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DatePicker } from "@/components/ui/date-picker";
import { dateToISOString } from "@/lib/utils/date";
import { InputWrapper } from "@/components/ui/input-wrapper";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group-pills";
import { Label } from "@/components/ui/label";
import type { TransportType } from "@/types/database/enums";

interface TransferDetailsFormData {
  transferDate: string;
  expectedDeliveryDate: string;
  transportType: TransportType | null;
  transportReferenceNumber: string;
  notes: string;
}

interface TransferDetailsStepProps {
  formData: TransferDetailsFormData;
  onChange: (data: Partial<TransferDetailsFormData>) => void;
}

export function TransferDetailsStep({
  formData,
  onChange,
}: TransferDetailsStepProps) {
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);

  const getTransportIcon = (type: TransportType | null) => {
    switch (type) {
      case "road":
        return <IconTruck className="size-4" />;
      case "rail":
        return <IconTrain className="size-4" />;
      case "air":
        return <IconPlane className="size-4" />;
      case "sea":
        return <IconShip className="size-4" />;
      case "courier":
        return <IconPackage className="size-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-6 py-4">
      <div className="flex flex-col gap-6 px-4 py-2">
        <div className="flex gap-3">
          {/* Transfer Date */}
          <DatePicker
            label="Transfer date"
            placeholder="Pick a date"
            value={
              formData.transferDate ? new Date(formData.transferDate) : undefined
            }
            onChange={(date) =>
              onChange({
                transferDate: date ? dateToISOString(date) : "",
              })
            }
            required
            className="flex-1"
          />

          {/* Expected Delivery Date */}
          <DatePicker
            label="Expected delivery date"
            placeholder="Pick a date"
            value={
              formData.expectedDeliveryDate
                ? new Date(formData.expectedDeliveryDate)
                : undefined
            }
            onChange={(date) =>
              onChange({
                expectedDeliveryDate: date ? dateToISOString(date) : "",
              })
            }
            className="flex-1"
          />
        </div>

        {/* Transport Type */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-gray-700">
            Transport type
          </Label>
          <RadioGroup
            value={formData.transportType || ""}
            onValueChange={(value) =>
              onChange({
                transportType: value ? (value as TransportType) : null,
              })
            }
            name="transport-type"
            className="flex-wrap"
          >
            <RadioGroupItem value="road">
              {getTransportIcon("road")}
              Road
            </RadioGroupItem>
            <RadioGroupItem value="rail">
              {getTransportIcon("rail")}
              Rail
            </RadioGroupItem>
            <RadioGroupItem value="air">
              {getTransportIcon("air")}
              Air
            </RadioGroupItem>
            <RadioGroupItem value="sea">
              {getTransportIcon("sea")}
              Sea
            </RadioGroupItem>
            <RadioGroupItem value="courier">
              {getTransportIcon("courier")}
              Courier
            </RadioGroupItem>
          </RadioGroup>
        </div>

        {/* Transport Reference Number */}
        <InputWrapper
          type="text"
          placeholder="Transport reference number"
          value={formData.transportReferenceNumber}
          onChange={(e) =>
            onChange({ transportReferenceNumber: e.target.value })
          }
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
