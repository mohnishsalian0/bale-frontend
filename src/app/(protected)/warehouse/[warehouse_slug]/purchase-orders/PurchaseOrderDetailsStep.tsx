"use client";

import { useState, useEffect } from "react";
import {
  IconChevronDown,
  IconCurrencyRupee,
  IconPhoto,
  IconPercentage,
} from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
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
import { createClient } from "@/lib/supabase/browser";
import type { Tables } from "@/types/database/supabase";
import { DatePicker } from "@/components/ui/date-picker";
import { dateToISOString } from "@/lib/utils/date";

interface OrderFormData {
  warehouseId: string;
  supplierId: string;
  agentId: string;
  orderDate: string;
  deliveryDate: string;
  advanceAmount: string;
  discount: string;
  paymentTerms: string;
  supplierInvoiceNumber: string;
  notes: string;
  files: File[];
}

interface PurchaseOrderDetailsStepProps {
  formData: OrderFormData;
  setFormData: (data: Partial<OrderFormData>) => void;
}

export function PurchaseOrderDetailsStep({
  formData,
  setFormData,
}: PurchaseOrderDetailsStepProps) {
  const [warehouses, setWarehouses] = useState<Tables<"warehouses">[]>([]);
  const [agents, setAgents] = useState<Tables<"partners">[]>([]);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);

  // Load warehouses and agents on mount
  useEffect(() => {
    loadWarehouses();
    loadAgents();
  }, []);

  const loadWarehouses = async () => {
    try {
      const supabase = createClient();

      // Fetch warehouses - RLS automatically filters based on user's warehouse access
      const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .order("created_at");

      if (error) throw error;

      setWarehouses(data || []);
    } catch (error) {
      console.error("Error loading warehouses:", error);
    }
  };

  const loadAgents = async () => {
    try {
      const supabase = createClient();

      // Load agents
      const { data: agentsData, error: agentsError } = await supabase
        .from("partners")
        .select("*")
        .eq("partner_type", "agent")
        .order("first_name", { ascending: true });

      if (agentsError) throw agentsError;
      setAgents(agentsData || []);
    } catch (error) {
      console.error("Error loading agents:", error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    // Filter for images and PDFs only
    const validFiles = files.filter((file) => {
      const isImage = file.type.startsWith("image/");
      const isPDF = file.type === "application/pdf";
      return isImage || isPDF;
    });
    setFormData({ files: [...formData.files, ...validFiles] });
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Main Fields */}
      <div className="flex flex-col gap-5 px-4 py-6">
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
                orderDate: date ? dateToISOString(date) : "",
              })
            }
            required
            className="flex-1"
          />

          {/* Delivery Date */}
          <DatePicker
            label="Expected delivery"
            placeholder="Pick a date"
            value={
              formData.deliveryDate
                ? new Date(formData.deliveryDate)
                : undefined
            }
            onChange={(date) =>
              setFormData({
                deliveryDate: date ? dateToISOString(date) : "",
              })
            }
            required
            className="flex-1"
          />
        </div>

        {/* Supplier Invoice Number */}
        <Input
          type="text"
          placeholder="Supplier invoice number (Optional)"
          value={formData.supplierInvoiceNumber}
          onChange={(e) =>
            setFormData({ supplierInvoiceNumber: e.target.value })
          }
        />
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
              onValueChange={(value) => setFormData({ paymentTerms: value })}
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
              onChange={(e) => setFormData({ advanceAmount: e.target.value })}
              icon={<IconCurrencyRupee />}
              min="0"
              step="0.01"
            />

            {/* Discount */}
            <InputWithIcon
              type="number"
              placeholder="Discount percent"
              value={formData.discount}
              onChange={(e) => setFormData({ discount: e.target.value })}
              icon={<IconPercentage />}
              min="0"
              step="0.01"
            />

            {/* Notes */}
            <Textarea
              placeholder="Enter instructions, special requirements, order source, etc..."
              value={formData.notes}
              onChange={(e) => setFormData({ notes: e.target.value })}
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
                        setFormData({ files: newFiles });
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
