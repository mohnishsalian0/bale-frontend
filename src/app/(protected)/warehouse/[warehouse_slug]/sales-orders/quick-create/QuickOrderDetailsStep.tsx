"use client";

import { useState } from "react";
import {
  IconChevronDown,
  IconCurrencyRupee,
  IconPercentage,
  IconTruck,
  IconUpload,
} from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { InputWrapper } from "@/components/ui/input-wrapper";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group-pills";
import { DatePicker } from "@/components/ui/date-picker";
import { dateToISOString } from "@/lib/utils/date";
import { usePartners } from "@/lib/query/hooks/partners";
import { PAYMENT_TERMS } from "@/types/database/enums";
import type { DiscountType, TaxType } from "@/types/database/enums";

export interface QuickOrderFormData {
  orderDate: string; // Same as outward date
  deliveryDate: string; // Same for both order and outward
  agentId: string;
  taxType: TaxType;
  advanceAmount: string;
  discountType: DiscountType;
  discount: string;
  paymentTerms: string;
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
  const [showFinancialDetails, setShowFinancialDetails] = useState(true);
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
      <div className="flex flex-col gap-6 px-4 py-6">
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

      {/* Financial Details Section */}
      <Collapsible
        open={showFinancialDetails}
        onOpenChange={setShowFinancialDetails}
        className="border-t border-gray-200 px-4 py-5"
      >
        <CollapsibleTrigger
          className={`flex items-center justify-between w-full ${showFinancialDetails ? "mb-5" : "mb-0"}`}
        >
          <h3 className="text-lg font-medium text-gray-900">
            Financial Details
          </h3>
          <IconChevronDown
            className={`size-6 text-gray-500 transition-transform ${showFinancialDetails ? "rotate-180" : "rotate-0"}`}
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="flex flex-col gap-6">
            {/* Tax Type */}
            <div className="space-y-2">
              <Label>Tax Type</Label>
              <RadioGroup
                value={formData.taxType}
                onValueChange={(value) =>
                  onChange({ taxType: value as TaxType })
                }
                name="tax-type"
              >
                <RadioGroupItem value="no_tax">No Tax</RadioGroupItem>
                <RadioGroupItem value="gst">GST (CGST + SGST)</RadioGroupItem>
                <RadioGroupItem value="igst">IGST</RadioGroupItem>
              </RadioGroup>
            </div>

            {/* Advance Amount */}
            <InputWrapper
              type="number"
              placeholder="Advance amount"
              value={formData.advanceAmount}
              onChange={(e) => onChange({ advanceAmount: e.target.value })}
              icon={<IconCurrencyRupee />}
              min="0"
              step="0.01"
            />

            {/* Discount Type */}
            <div className="space-y-2">
              <Label>Discount Type</Label>
              <RadioGroup
                value={formData.discountType}
                onValueChange={(value) =>
                  onChange({ discountType: value as DiscountType })
                }
                name="discount-type"
              >
                <RadioGroupItem value="none">None</RadioGroupItem>
                <RadioGroupItem value="percentage">Percentage</RadioGroupItem>
                <RadioGroupItem value="flat_amount">Flat Amount</RadioGroupItem>
              </RadioGroup>
            </div>

            {/* Discount Value */}
            {formData.discountType !== "none" && (
              <InputWrapper
                type="number"
                placeholder={
                  formData.discountType === "percentage"
                    ? "Discount percent"
                    : "Discount amount"
                }
                value={formData.discount}
                onChange={(e) => onChange({ discount: e.target.value })}
                icon={
                  formData.discountType === "percentage" ? (
                    <IconPercentage />
                  ) : (
                    <IconCurrencyRupee />
                  )
                }
                min="0"
                max={formData.discountType === "percentage" ? "100" : undefined}
                step={formData.discountType === "percentage" ? "1" : "0.01"}
              />
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

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
            {/* Payment Terms */}
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Payment terms (Optional)"
                value={formData.paymentTerms}
                onChange={(e) => onChange({ paymentTerms: e.target.value })}
              />
              <div className="flex flex-wrap gap-2">
                {PAYMENT_TERMS.map((term) => (
                  <Badge
                    key={term}
                    variant="secondary"
                    color="gray"
                    onClick={() => onChange({ paymentTerms: term })}
                    className="cursor-pointer hover:bg-gray-200"
                  >
                    {term}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Transport Details */}
            <InputWrapper
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
