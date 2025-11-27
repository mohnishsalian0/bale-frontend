"use client";

import { useState, useEffect } from "react";
import {
  IconChevronDown,
  IconUpload,
  IconHash,
  IconTruck,
} from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group-pills";
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
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database/supabase";
import { dateToISOString } from "@/lib/utils/date";
import { useSession } from "@/contexts/session-context";

interface DetailsFormData {
  dispatchToType: "partner" | "warehouse";
  dispatchToId: string;
  linkToType: "sales_order" | "job_work" | "purchase_return" | "other";
  linkToValue: string;
  outwardDate: string;
  dueDate: string;
  invoiceNumber: string;
  transportDetails: string;
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
  const { warehouse } = useSession();
  const [partners, setPartners] = useState<Tables<"partners">[]>([]);
  const [warehouses, setWarehouses] = useState<Tables<"warehouses">[]>([]);
  const [jobWorks, setJobWorks] = useState<{ id: string; name: string }[]>([]);
  const [salesOrders, setSalesOrders] = useState<
    { id: string; sequence_number: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch partners (customers and vendors)
        const { data: partnersData } = await supabase
          .from("partners")
          .select("*")
          .in("partner_type", ["customer", "vendor"])
          .order("first_name", { ascending: true });

        // Fetch warehouses
        const { data: warehousesData } = await supabase
          .from("warehouses")
          .select("*")
          .order("name", { ascending: true });

        // Fetch job works
        const { data: jobWorksData } = await supabase
          .from("job_works")
          .select("id, sequence_number")
          .eq("warehouse_id", warehouse.id)
          .order("created_at", { ascending: false });

        // Fetch sales orders
        const { data: salesOrdersData } = await supabase
          .from("sales_orders")
          .select("id, sequence_number")
          .eq("warehouse_id", warehouse.id)
          .order("created_at", { ascending: false });

        setPartners(partnersData || []);
        setWarehouses(warehousesData || []);
        setJobWorks(
          jobWorksData?.map((jw) => ({
            id: jw.id,
            name: jw.sequence_number,
          })) || [],
        );
        setSalesOrders(salesOrdersData || []);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange({ documentFile: file });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-5 py-4">
      {/* Outward To Section */}
      <div className="flex flex-col gap-2 px-4">
        <Label>Outward to</Label>
        <RadioGroup
          value={formData.dispatchToType}
          onValueChange={(value) =>
            onChange({
              dispatchToType: value as "partner" | "warehouse",
              dispatchToId: "", // Reset selection when type changes
            })
          }
          name="outward-to-type"
          className="flex-wrap mb-1"
        >
          <RadioGroupItem value="partner">Partner</RadioGroupItem>
          <RadioGroupItem value="warehouse">Warehouse</RadioGroupItem>
        </RadioGroup>

        {/* Conditional Dropdown */}
        {formData.dispatchToType === "partner" ? (
          <Select
            value={formData.dispatchToId}
            onValueChange={(value) => onChange({ dispatchToId: value })}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select partner" />
            </SelectTrigger>
            <SelectContent>
              {partners.map((partner) => (
                <SelectItem key={partner.id} value={partner.id}>
                  {partner.first_name} {partner.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Select
            value={formData.dispatchToId}
            onValueChange={(value) => onChange({ dispatchToId: value })}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select warehouse" />
            </SelectTrigger>
            <SelectContent>
              {warehouses.map((warehouse) => (
                <SelectItem key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Reason for Outward Section */}
      <div className="flex flex-col gap-2 text-nowrap px-4">
        <Label>Reason for outward</Label>
        <RadioGroup
          value={formData.linkToType}
          onValueChange={(value) =>
            onChange({
              linkToType: value as
                | "sales_order"
                | "job_work"
                | "purchase_return"
                | "other",
              linkToValue: "", // Reset value when type changes
            })
          }
          name="reason-for-outward-type"
          className="flex-wrap mb-1"
        >
          <RadioGroupItem value="sales_order">Sales order</RadioGroupItem>
          <RadioGroupItem value="job_work">Job work</RadioGroupItem>
          <RadioGroupItem value="purchase_return">
            Purchase return
          </RadioGroupItem>
          <RadioGroupItem value="other">Other</RadioGroupItem>
        </RadioGroup>

        {/* Conditional Input/Dropdown */}
        {formData.linkToType === "sales_order" && (
          <Select
            value={formData.linkToValue}
            onValueChange={(value) => onChange({ linkToValue: value })}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select sales order" />
            </SelectTrigger>
            <SelectContent>
              {salesOrders.map((so) => (
                <SelectItem key={so.id} value={so.id}>
                  SO-{so.sequence_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {formData.linkToType === "job_work" && (
          <Select
            value={formData.linkToValue}
            onValueChange={(value) => onChange({ linkToValue: value })}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select job work" />
            </SelectTrigger>
            <SelectContent>
              {jobWorks.map((jw) => (
                <SelectItem key={jw.id} value={jw.id}>
                  {jw.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {formData.linkToType === "purchase_return" && (
          <Select
            value={formData.linkToValue}
            onValueChange={(value) => onChange({ linkToValue: value })}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select sales order" />
            </SelectTrigger>
            <SelectContent>
              {salesOrders.map((so) => (
                <SelectItem key={so.id} value={so.id}>
                  SO-{so.sequence_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {formData.linkToType === "other" && (
          <Input
            type="text"
            placeholder="Other reason"
            value={formData.linkToValue}
            onChange={(e) => onChange({ linkToValue: e.target.value })}
          />
        )}
      </div>

      {/* Date Fields */}
      <div className="flex flex-col gap-2 px-4">
        <div className="grid grid-cols-2 gap-3">
          {/* Outward Date */}
          <DatePicker
            placeholder="Outward date"
            value={
              formData.outwardDate ? new Date(formData.outwardDate) : undefined
            }
            onChange={(date) =>
              onChange({
                outwardDate: date ? dateToISOString(date) : "",
              })
            }
          />

          {/* Due Date */}
          <DatePicker
            placeholder="Due date"
            value={formData.dueDate ? new Date(formData.dueDate) : undefined}
            onChange={(date) =>
              onChange({
                dueDate: date ? dateToISOString(date) : "",
              })
            }
          />
        </div>
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
          {/* Invoice Number */}
          <div className="relative">
            <IconHash className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-500" />
            <Input
              type="text"
              placeholder="Invoice number"
              value={formData.invoiceNumber}
              onChange={(e) => onChange({ invoiceNumber: e.target.value })}
              className="pl-10"
            />
          </div>

          {/* Transport Details */}
          <div className="relative">
            <IconTruck className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-500" />
            <Input
              type="text"
              placeholder="Transport details"
              value={formData.transportDetails}
              onChange={(e) => onChange({ transportDetails: e.target.value })}
              className="pl-10"
            />
          </div>

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
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
