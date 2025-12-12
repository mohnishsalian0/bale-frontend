"use client";

import { useState } from "react";
import {
  IconChevronDown,
  IconCurrencyRupee,
  IconPercentage,
  IconTruck,
  IconUpload,
} from "@tabler/icons-react";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DatePicker } from "@/components/ui/date-picker";
import { dateToISOString } from "@/lib/utils/date";
import { usePartners } from "@/lib/query/hooks/partners";

export interface QuickOrderFormData {
  orderDate: string; // Same as outward date
  deliveryDate: string; // Same for both order and outward
  agentId: string;
  paymentTerms: string;
  advanceAmount: string;
  discount: string;
  transportDetails: string;
  notes: string;
  documentFile: File | null;
}

interface QuickOrderDetailsStepProps {
  formData: QuickOrderFormData;
  onChange: (data: Partial<QuickOrderFormData>) => void;
}

export function QuickOrderDetailsStep({
  formData,
  onChange,
}: QuickOrderDetailsStepProps) {
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const { data: agents = [] } = usePartners({ partner_type: "agent" });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange({ documentFile: file });
    }
  };

  // Disable delivery dates before order date
  const isDeliveryDateDisabled = (date: Date) => {
    // Disable dates before order date if order date is selected
    if (formData.orderDate) {
      const orderDate = new Date(formData.orderDate);
      orderDate.setHours(0, 0, 0, 0);
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      return checkDate < orderDate;
    }
    return false;
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Main Fields */}
      <div className="flex flex-col gap-5 px-4 py-6">
        {/* Date Fields */}
        <div className="flex gap-3">
          {/* Order Date */}
          <DatePicker
            label="Order date"
            placeholder="Pick a date"
            value={
              formData.orderDate ? new Date(formData.orderDate) : undefined
            }
            onChange={(date) =>
              onChange({
                orderDate: date ? dateToISOString(date) : "",
              })
            }
            required
            className="flex-1"
          />

          {/* Delivery Date */}
          <DatePicker
            label="Delivery date"
            placeholder="Pick a date"
            value={
              formData.deliveryDate
                ? new Date(formData.deliveryDate)
                : undefined
            }
            onChange={(date) =>
              onChange({
                deliveryDate: date ? dateToISOString(date) : "",
              })
            }
            disabled={isDeliveryDateDisabled}
            required
            className="flex-1"
          />
        </div>

        {/* Agent Dropdown */}
        <Select
          value={formData.agentId || undefined}
          onValueChange={(value) => onChange({ agentId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Agent (Optional)" />
          </SelectTrigger>
          <SelectContent>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.first_name} {agent.last_name}
                {agent.company_name && ` - ${agent.company_name}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          <div className="flex flex-col gap-5">
            {/* Payment Terms */}
            <Select
              value={formData.paymentTerms || undefined}
              onValueChange={(value) => onChange({ paymentTerms: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Payment terms (Optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash on delivery">
                  Cash on delivery
                </SelectItem>
                <SelectItem value="15 days net">NET 15</SelectItem>
                <SelectItem value="30 days net">NET 30</SelectItem>
                <SelectItem value="45 days net">NET 45</SelectItem>
                <SelectItem value="60 days net">NET 60</SelectItem>
                <SelectItem value="90 days net">NET 90</SelectItem>
              </SelectContent>
            </Select>

            {/* Advance Amount */}
            <InputWithIcon
              type="number"
              placeholder="Advance amount"
              value={formData.advanceAmount}
              onChange={(e) => onChange({ advanceAmount: e.target.value })}
              icon={<IconCurrencyRupee />}
              min="0"
              step="0.01"
            />

            {/* Discount */}
            <InputWithIcon
              type="number"
              placeholder="Discount percent"
              value={formData.discount}
              onChange={(e) => onChange({ discount: e.target.value })}
              icon={<IconPercentage />}
              min="0"
              step="0.01"
            />

            {/* Transport Details */}
            <InputWithIcon
              type="text"
              placeholder="Transport details"
              value={formData.transportDetails}
              onChange={(e) => onChange({ transportDetails: e.target.value })}
              icon={<IconTruck />}
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
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
