"use client";

import { useState } from "react";
import {
  IconChevronDown,
  IconCurrencyRupee,
  IconPhoto,
  IconPercentage,
} from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
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
import { useWarehouses } from "@/lib/query/hooks/warehouses";
import type { DiscountType, InvoiceTaxType } from "@/types/database/enums";

interface InvoiceFormData {
  warehouseId: string;
  partyLedgerId: string;
  invoiceDate: string;
  dueDate: string;
  paymentTerms: string;
  taxType: InvoiceTaxType;
  discountType: DiscountType;
  discount: string;
  supplierInvoiceNumber?: string; // Purchase only
  supplierInvoiceDate?: string; // Purchase only
  notes: string;
  files: File[];
}

interface InvoiceDetailsStepProps {
  formData: InvoiceFormData;
  setFormData: (data: InvoiceFormData) => void;
  invoiceType: "sales" | "purchase";
  subtotal: number;
}

export function InvoiceDetailsStep({
  formData,
  setFormData,
  invoiceType,
  subtotal,
}: InvoiceDetailsStepProps) {
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const { data: warehouses = [] } = useWarehouses();

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
      <div className="flex flex-col gap-6 px-4 py-6">
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
          {/* Invoice Date */}
          <DatePicker
            label="Invoice date"
            placeholder="Pick a date"
            value={
              formData.invoiceDate ? new Date(formData.invoiceDate) : undefined
            }
            onChange={(date) =>
              setFormData({
                ...formData,
                invoiceDate: date ? dateToISOString(date) : "",
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
                ...formData,
                dueDate: date ? dateToISOString(date) : "",
              })
            }
            className="flex-1"
          />
        </div>

        {/* Tax Type */}
        <div className="space-y-2">
          <Label>Tax Type</Label>
          <RadioGroup
            value={formData.taxType}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                taxType: value as InvoiceTaxType,
              })
            }
            name="tax-type"
          >
            <RadioGroupItem value="no_tax">No Tax</RadioGroupItem>
            <RadioGroupItem value="gst">GST (CGST + SGST)</RadioGroupItem>
            <RadioGroupItem value="igst">IGST</RadioGroupItem>
          </RadioGroup>
        </div>

        {/* Supplier Invoice Fields (Purchase Only) */}
        {invoiceType === "purchase" && (
          <div className="flex gap-3">
            <Input
              type="text"
              placeholder="Supplier invoice number (Optional)"
              value={formData.supplierInvoiceNumber || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  supplierInvoiceNumber: e.target.value,
                })
              }
              className="flex-1"
            />
            <DatePicker
              label="Supplier invoice date"
              placeholder="Pick a date"
              value={
                formData.supplierInvoiceDate
                  ? new Date(formData.supplierInvoiceDate)
                  : undefined
              }
              onChange={(date) =>
                setFormData({
                  ...formData,
                  supplierInvoiceDate: date ? dateToISOString(date) : "",
                })
              }
              className="flex-1"
            />
          </div>
        )}

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
          <InputWrapper
            type="number"
            placeholder={
              formData.discountType === "percentage"
                ? "Discount percent"
                : "Discount amount"
            }
            value={formData.discount}
            onChange={(e) => {
              let value = parseFloat(e.target.value);
              if (isNaN(value)) {
                value = 0;
              }

              if (formData.discountType === "percentage") {
                value = Math.max(0, Math.min(100, value));
              } else if (formData.discountType === "flat_amount") {
                value = Math.max(0, Math.min(subtotal, value));
              }
              setFormData({ ...formData, discount: value.toString() });
            }}
            icon={
              formData.discountType === "percentage" ? (
                <IconPercentage />
              ) : (
                <IconCurrencyRupee />
              )
            }
            min="0"
            max={
              formData.discountType === "percentage"
                ? "100"
                : subtotal.toString()
            }
            step={formData.discountType === "percentage" ? "1" : "0.01"}
          />
        )}
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
            {/* Payment Terms */}
            <Input
              type="text"
              placeholder="Payment terms (Optional)"
              value={formData.paymentTerms}
              onChange={(e) =>
                setFormData({ ...formData, paymentTerms: e.target.value })
              }
            />

            {/* Notes */}
            <Textarea
              placeholder="Enter notes, special instructions, etc..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="min-h-32"
            />

            {/* Add Files */}
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
