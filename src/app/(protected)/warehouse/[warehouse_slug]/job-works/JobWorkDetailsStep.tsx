"use client";

import { useState } from "react";
import {
  IconChevronDown,
  IconCurrencyRupee,
  IconPercentage,
} from "@tabler/icons-react";
import { InputWrapper } from "@/components/ui/input-wrapper";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import MultipleSelector from "@/components/ui/multiple-selector";
import { usePartners } from "@/lib/query/hooks/partners";
import { useWarehouses } from "@/lib/query/hooks/warehouses";
import { useAttributes } from "@/lib/query/hooks/attributes";
import type { DiscountType, TaxType } from "@/types/database/enums";

export interface JobWorkFormData {
  warehouseId: string;
  vendorId: string;
  agentId: string;
  serviceTypeAttributeId: string;
  startDate: string;
  dueDate: string;
  taxType: TaxType;
  advanceAmount: string;
  discountType: DiscountType;
  discount: string;
  notes: string;
}

interface JobWorkDetailsStepProps {
  formData: JobWorkFormData;
  setFormData: (data: Partial<JobWorkFormData>) => void;
}

export function JobWorkDetailsStep({
  formData,
  setFormData,
}: JobWorkDetailsStepProps) {
  const [showFinancialDetails, setShowFinancialDetails] = useState(true);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const { data: warehouses = [] } = useWarehouses();
  const { data: agents = [] } = usePartners({ partner_type: "agent" });
  const { data: serviceTypes = [] } = useAttributes("service_type");

  // Find the selected service type name for display
  const selectedServiceType = serviceTypes.find(
    (st) => st.id === formData.serviceTypeAttributeId,
  );

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Main Fields */}
      <div className="flex flex-col gap-6 px-4 py-6">
        {/* Warehouse Dropdown */}
        <Select
          value={formData.warehouseId}
          onValueChange={(value) => setFormData({ warehouseId: value })}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Warehouse" />
          </SelectTrigger>
          <SelectContent>
            {warehouses.map((warehouse) => (
              <SelectItem key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Service Type */}
        <div className="flex flex-col gap-2">
          <Label className="text-sm font-medium text-gray-700">
            Service type <span className="text-red-500">*</span>
          </Label>
          <MultipleSelector
            value={
              selectedServiceType
                ? [
                    {
                      value: selectedServiceType.id,
                      label: selectedServiceType.name,
                    },
                  ]
                : []
            }
            onChange={(options) => {
              setFormData({
                serviceTypeAttributeId: options[0]?.value || "",
              });
            }}
            options={serviceTypes.map((st) => ({
              value: st.id,
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

        {/* Date Fields */}
        <div className="flex gap-3">
          {/* Start Date */}
          <DatePicker
            label="Start date"
            placeholder="Pick a date"
            value={
              formData.startDate ? new Date(formData.startDate) : undefined
            }
            onChange={(date) =>
              setFormData({
                startDate: date ? dateToISOString(date) : "",
              })
            }
            required
            className="flex-1"
          />

          {/* Due Date */}
          <DatePicker
            label="Due date"
            placeholder="Pick a date"
            value={formData.dueDate ? new Date(formData.dueDate) : undefined}
            onChange={(date) =>
              setFormData({
                dueDate: date ? dateToISOString(date) : "",
              })
            }
            className="flex-1"
          />
        </div>

        {/* Agent Dropdown */}
        <Select
          value={formData.agentId || undefined}
          onValueChange={(value) => setFormData({ agentId: value })}
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
                  setFormData({ taxType: value as TaxType })
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
              onChange={(e) => setFormData({ advanceAmount: e.target.value })}
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
                  setFormData({ discountType: value as DiscountType })
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
                onChange={(e) => setFormData({ discount: e.target.value })}
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
            {/* Notes */}
            <Textarea
              placeholder="Enter instructions, special requirements, etc..."
              value={formData.notes}
              onChange={(e) => setFormData({ notes: e.target.value })}
              className="min-h-32"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
