"use client";

import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group-pills";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/hooks/use-debounce";
import { SalesOrderInfiniteList } from "@/components/layouts/sales-order-infinite-list";
import { PurchaseOrderInfiniteList } from "@/components/layouts/purchase-order-infinite-list";
import type { InwardLinkToType } from "@/types/database/enums";
import type { GoodsInward } from "@/types/stock-flow.types";

export interface InwardLinkToData extends Pick<
  GoodsInward,
  "sales_order_id" | "purchase_order_id" | "other_reason" | "job_work_id"
> {
  linkToType: InwardLinkToType;
}

interface InwardLinkToStepProps {
  partnerId: string | null;
  linkToData: InwardLinkToData;
  onLinkToChange: (data: InwardLinkToData) => void;
}

export function InwardLinkToStep({
  partnerId,
  linkToData,
  onLinkToChange,
}: InwardLinkToStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const handleTypeChange = (type: InwardLinkToType) => {
    // Reset all link fields when type changes
    onLinkToChange({
      linkToType: type,
      sales_order_id: null,
      purchase_order_id: null,
      other_reason: null,
      job_work_id: null,
    });
  };

  const handleValueChange = (
    field: keyof Omit<InwardLinkToData, "linkToType">,
    value: string | null,
  ) => {
    onLinkToChange({
      ...linkToData,
      [field]: value,
    });
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header with Radio Pills */}
      <div className="p-4 border-b border-border shrink-0">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Link to (required)
        </h3>

        {/* Radio Pills */}
        <RadioGroup
          value={linkToData.linkToType}
          onValueChange={(value) =>
            handleTypeChange(value as InwardLinkToType)
          }
          name="link-to-type"
          className="flex-wrap"
        >
          <RadioGroupItem value="purchase_order">
            Purchase order
          </RadioGroupItem>
          <RadioGroupItem value="sales_return">Sales return</RadioGroupItem>
          <RadioGroupItem value="other">Other</RadioGroupItem>
        </RadioGroup>
      </div>

      {/* Content based on selection */}
      <div className="flex-1 overflow-y-auto">
        {linkToData.linkToType === "purchase_order" && (
          <PurchaseOrderInfiniteList
            partnerId={partnerId}
            statusFilter="in_progress"
            searchQuery={debouncedSearchQuery}
            onSearchChange={setSearchQuery}
            selectedOrderId={linkToData.purchase_order_id}
            onSelectOrder={(orderId) =>
              handleValueChange("purchase_order_id", orderId)
            }
          />
        )}

        {linkToData.linkToType === "sales_return" && (
          <SalesOrderInfiniteList
            partnerId={partnerId}
            statusFilter="in_progress"
            searchQuery={debouncedSearchQuery}
            onSearchChange={setSearchQuery}
            selectedOrderId={linkToData.sales_order_id}
            onSelectOrder={(orderId) =>
              handleValueChange("sales_order_id", orderId)
            }
          />
        )}

        {linkToData.linkToType === "other" && (
          <div className="p-4">
            <Label htmlFor="other_reason" className="mb-2 block">
              Reason for inward
            </Label>
            <Textarea
              id="other_reason"
              placeholder="Enter reason for receiving goods"
              value={linkToData.other_reason || ""}
              onChange={(e) =>
                handleValueChange("other_reason", e.target.value || null)
              }
              rows={4}
              required
            />
          </div>
        )}
      </div>
    </div>
  );
}
