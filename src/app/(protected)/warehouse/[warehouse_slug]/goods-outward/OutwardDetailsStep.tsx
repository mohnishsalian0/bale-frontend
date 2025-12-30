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

interface DetailsFormData {
  outwardDate: string;
  dueDate: string;
  transportType: TransportType | null;
  transportReferenceNumber: string;
  notes: string;
  documentFile: File | null;
}

interface OutwardDetailsStepProps {
  formData: DetailsFormData;
  onChange: (data: Partial<DetailsFormData>) => void;
}

export function OutwardDetailsStep({
  formData,
  onChange,
}: OutwardDetailsStepProps) {
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);

  // const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = e.target.files?.[0];
  //   if (file) {
  //     onChange({ documentFile: file });
  //   }
  // };

  // Disable delivery dates before outward date
  const isDeliveryDateDisabled = (date: Date) => {
    // Disable dates before outward date if outward date is selected
    if (formData.outwardDate) {
      const outwardDate = new Date(formData.outwardDate);
      outwardDate.setHours(0, 0, 0, 0);
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      return checkDate < outwardDate;
    }
    return false;
  };

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
      {/* Date Fields & Transport Details */}
      <div className="flex flex-col gap-6 px-4 py-2">
        <div className="flex gap-3">
          {/* Outward Date */}
          <DatePicker
            label="Outward date"
            placeholder="Pick a date"
            value={
              formData.outwardDate ? new Date(formData.outwardDate) : undefined
            }
            onChange={(date) =>
              onChange({
                outwardDate: date ? dateToISOString(date) : "",
              })
            }
            required
            className="flex-1"
          />

          {/* Delivery Date */}
          <DatePicker
            label="Delivery date"
            placeholder="Pick a date"
            value={formData.dueDate ? new Date(formData.dueDate) : undefined}
            onChange={(date) =>
              onChange({
                dueDate: date ? dateToISOString(date) : "",
              })
            }
            disabled={isDeliveryDateDisabled}
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

          {/* File Upload - Commented out until we support it */}
          {/* <div>
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
          </div> */}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
