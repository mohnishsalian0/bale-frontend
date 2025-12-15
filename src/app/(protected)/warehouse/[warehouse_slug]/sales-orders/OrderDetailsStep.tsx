"use client";

import { useState } from "react";
import {
  IconChevronDown,
  IconCurrencyRupee,
  IconPhoto,
  IconPercentage,
} from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { InputWithIcon } from "@/components/ui/input-with-icon";
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
import { useWarehouses } from "@/lib/query/hooks/warehouses";
import type { DiscountType } from "@/types/database/enums";
import { PAYMENT_TERMS } from "@/types/database/enums";

interface OrderFormData {
  warehouseId: string;
  customerId: string;
  agentId: string;
  orderDate: string;
  deliveryDate: string;
  advanceAmount: string;
  discountType: DiscountType;
  discount: string;
  paymentTerms: string;
  notes: string;
  files: File[];
}

interface OrderDetailsStepProps {
  formData: OrderFormData;
  setFormData: (data: OrderFormData) => void;
}

export function OrderDetailsStep({
  formData,
  setFormData,
}: OrderDetailsStepProps) {
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const { data: warehouses = [] } = useWarehouses();
  const { data: agents = [] } = usePartners({ partner_type: "agent" });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    // Filter for images and PDFs only
    const validFiles = files.filter((file) => {
      const isImage = file.type.startsWith("image/");
      const isPDF = file.type === "application/pdf";
      return isImage || isPDF;
    });
    setFormData({ ...formData, files: [...formData.files, ...validFiles] });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Main Fields */}
      <div className="flex flex-col gap-5 px-4 py-6">
        {/* Warehouse Dropdown */}
        <Select
          value={formData.warehouseId}
          onValueChange={(value) =>
            setFormData({ ...formData, warehouseId: value })
          }
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
              setFormData({
                ...formData,
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
              setFormData({
                ...formData,
                deliveryDate: date ? dateToISOString(date) : "",
              })
            }
            required
            className="flex-1"
          />
        </div>

        {/* Agent Dropdown */}
        <Select
          value={formData.agentId || undefined}
          onValueChange={(value) =>
            setFormData({ ...formData, agentId: value })
          }
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
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Payment terms (Optional)"
                value={formData.paymentTerms}
                onChange={(e) =>
                  setFormData({ ...formData, paymentTerms: e.target.value })
                }
              />
              <div className="flex flex-wrap gap-2">
                {PAYMENT_TERMS.map((term) => (
                  <Badge
                    key={term}
                    variant="secondary"
                    color="gray"
                    onClick={() =>
                      setFormData({ ...formData, paymentTerms: term })
                    }
                    className="cursor-pointer hover:bg-gray-200"
                  >
                    {term}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Advance Amount */}
            <InputWithIcon
              type="number"
              placeholder="Advance amount"
              value={formData.advanceAmount}
              onChange={(e) =>
                setFormData({ ...formData, advanceAmount: e.target.value })
              }
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
                  setFormData({
                    ...formData,
                    discountType: value as DiscountType,
                  })
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
              <InputWithIcon
                type="number"
                placeholder={
                  formData.discountType === "percentage"
                    ? "Discount percent"
                    : "Discount amount"
                }
                value={formData.discount}
                onChange={(e) =>
                  setFormData({ ...formData, discount: e.target.value })
                }
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

            {/* Notes */}
            <Textarea
              placeholder="Enter instructions, special requirements, custom measurements, order source, etc..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="min-h-32"
            />

            {/* Add Files */}
            {/* TODO: Update this component */}
            <label className="border border-primary-700 rounded-lg h-11 flex items-center justify-center gap-3 cursor-pointer text-primary-700 hover:bg-primary-50 transition-colors shadow-gray-sm">
              <IconPhoto className="size-4" />
              <span className="text-sm font-normal">Add files</span>
              <input
                type="file"
                accept="image/*,.pdf"
                multiple
                onChange={handleFileSelect}
                className="sr-only"
              />
            </label>

            {/* File List */}
            {formData.files.length > 0 && (
              <div className="flex flex-col gap-2">
                {formData.files.map((file, index) => (
                  <div
                    key={index}
                    className="text-sm text-gray-700 flex items-center justify-between"
                  >
                    <span title={file.name} className="truncate">
                      {file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newFiles = formData.files.filter(
                          (_, i) => i !== index,
                        );
                        setFormData({ ...formData, files: newFiles });
                      }}
                      className="text-red-600 hover:text-red-700 ml-2"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
