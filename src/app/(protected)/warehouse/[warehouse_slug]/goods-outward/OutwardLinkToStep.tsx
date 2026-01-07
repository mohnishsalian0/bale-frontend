"use client";

import { useState, useEffect } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group-pills";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/hooks/use-debounce";
import { SalesOrderInfiniteList } from "@/components/layouts/sales-order-infinite-list";
import { PurchaseOrderInfiniteList } from "@/components/layouts/purchase-order-infinite-list";
import type { OutwardLinkToType } from "@/types/database/enums";
import type { GoodsOutward } from "@/types/stock-flow.types";

export interface OutwardLinkToData extends Pick<
  GoodsOutward,
  "sales_order_id" | "purchase_order_id" | "other_reason" | "job_work_id"
> {
  linkToType: OutwardLinkToType;
}

interface OutwardLinkToStepProps {
  warehouseId: string;
  selectedPartnerId: string | null;
  linkToData: OutwardLinkToData;
  onLinkToChange: (data: OutwardLinkToData) => void;
  isWarehouseTransfer: boolean;
}

export function OutwardLinkToStep({
  selectedPartnerId,
  linkToData,
  onLinkToChange,
  isWarehouseTransfer,
}: OutwardLinkToStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  // Auto-set to "other" when warehouse transfer
  useEffect(() => {
    if (isWarehouseTransfer && linkToData.linkToType !== "other") {
      onLinkToChange({
        linkToType: "other",
        sales_order_id: null,
        purchase_order_id: null,
        other_reason: null,
        job_work_id: null,
      });
    }
  }, [isWarehouseTransfer, linkToData.linkToType, onLinkToChange]);

  const handleTypeChange = (type: OutwardLinkToType) => {
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
    field: keyof Omit<OutwardLinkToData, "linkToType">,
    value: string | null,
  ) => {
    onLinkToChange({
      ...linkToData,
      [field]: value,
    });
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header with Radio Pills - Hidden for warehouse transfers */}
      {!isWarehouseTransfer && (
        <div className="p-4 border-b border-border shrink-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Link to (required)
          </h3>

          {/* Radio Pills */}
          <RadioGroup
            value={linkToData.linkToType}
            onValueChange={(value) =>
              handleTypeChange(value as OutwardLinkToType)
            }
            name="link-to-type"
            className="flex-wrap"
          >
            <RadioGroupItem value="sales_order">Sales order</RadioGroupItem>
            <RadioGroupItem value="purchase_return">
              Purchase return
            </RadioGroupItem>
            <RadioGroupItem value="other">Other</RadioGroupItem>
          </RadioGroup>
        </div>
      )}

      {/* Content based on selection */}
      <div className="flex-1 overflow-y-auto">
        {linkToData.linkToType === "sales_order" && (
          <SalesOrderInfiniteList
            partnerId={selectedPartnerId}
            statusFilter={["in_progress"]}
            searchQuery={debouncedSearchQuery}
            onSearchChange={setSearchQuery}
            selectedOrderId={linkToData.sales_order_id}
            onSelectOrder={(orderId) =>
              handleValueChange("sales_order_id", orderId)
            }
            emptyMessage={
              selectedPartnerId
                ? "No sales orders found for selected customer"
                : "No sales orders found"
            }
          />
        )}

        {linkToData.linkToType === "purchase_return" && (
          <PurchaseOrderInfiniteList
            partnerId={selectedPartnerId}
            statusFilter={["in_progress", "completed", "cancelled"]}
            searchQuery={debouncedSearchQuery}
            onSearchChange={setSearchQuery}
            selectedOrderId={linkToData.purchase_order_id}
            onSelectOrder={(orderId) =>
              handleValueChange("purchase_order_id", orderId)
            }
          />
        )}

        {linkToData.linkToType === "other" && (
          <div className="p-4">
            <Label htmlFor="other_reason" className="mb-2 block">
              {isWarehouseTransfer
                ? "Warehouse transfer notes"
                : "Reason for outward"}
            </Label>
            <Textarea
              id="other_reason"
              placeholder={
                isWarehouseTransfer
                  ? "Enter notes for this warehouse transfer"
                  : "Enter reason for dispatching goods"
              }
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
