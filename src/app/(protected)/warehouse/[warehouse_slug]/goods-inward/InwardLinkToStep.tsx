"use client";

import { useState } from "react";
import { IconCheck } from "@tabler/icons-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group-pills";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSalesOrders } from "@/lib/query/hooks/sales-orders";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { getPartnerName } from "@/lib/utils/partner";
import { SalesStatusBadge } from "@/components/ui/sales-status-badge";
import {
  getFullProductInfo,
  getOrderDisplayStatus,
} from "@/lib/utils/sales-order";
import type {
  SalesOrderStatus,
  InwardLinkToType,
} from "@/types/database/enums";
import type { GoodsInward } from "@/types/stock-flow.types";

export interface InwardLinkToData extends Pick<
  GoodsInward,
  "sales_order_id" | "purchase_order_number" | "other_reason" | "job_work_id"
> {
  linkToType: InwardLinkToType;
}

interface InwardLinkToStepProps {
  customerId: string | null;
  linkToData: InwardLinkToData;
  onLinkToChange: (data: InwardLinkToData) => void;
}

export function InwardLinkToStep({
  customerId,
  linkToData,
  onLinkToChange,
}: InwardLinkToStepProps) {
  const [searchQuery, setSearchQuery] = useState("");
  console.log(customerId);

  // Fetch sales orders for sales return selection
  const { data: salesOrdersResponse, isLoading: salesOrdersLoading } =
    useSalesOrders({
      filters: { customerId: customerId || undefined, status: "in_progress" },
    });

  const salesOrders = salesOrdersResponse?.data || [];

  // Filter sales orders based on search
  const filteredSalesOrders = salesOrders.filter((order) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const customerName = order.customer
      ? getPartnerName(order.customer).toLowerCase()
      : "";
    const sequenceNumber = `SO-${order.sequence_number}`.toLowerCase();
    return customerName.includes(query) || sequenceNumber.includes(query);
  });

  const handleTypeChange = (type: InwardLinkToType) => {
    // Reset all link fields when type changes
    onLinkToChange({
      linkToType: type,
      sales_order_id: null,
      purchase_order_number: null,
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
          onValueChange={(value) => handleTypeChange(value as InwardLinkToType)}
          name="link-to-type"
          className="flex-wrap"
        >
          <RadioGroupItem value="purchase_order">Purchase order</RadioGroupItem>
          <RadioGroupItem value="sales_return">Sales return</RadioGroupItem>
          <RadioGroupItem value="other">Other</RadioGroupItem>
        </RadioGroup>
      </div>

      {/* Content based on selection */}
      <div className="flex-1 overflow-y-auto">
        {linkToData.linkToType === "purchase_order" && (
          <div className="p-4">
            <Label htmlFor="po_number" className="mb-2 block">
              Purchase order number
            </Label>
            <Input
              id="po_number"
              placeholder="Enter PO number from supplier/vendor"
              value={linkToData.purchase_order_number || ""}
              onChange={(e) =>
                handleValueChange(
                  "purchase_order_number",
                  e.target.value || null,
                )
              }
              required
            />
          </div>
        )}

        {linkToData.linkToType === "sales_return" && (
          <div className="flex flex-col h-full">
            {/* Search bar */}
            <div className="p-4 border-b border-border shrink-0">
              <Input
                placeholder="Search by customer or SO number"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Sales orders list */}
            <div className="flex-1 overflow-y-auto">
              {salesOrdersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-gray-500">
                    Loading sales orders...
                  </p>
                </div>
              ) : filteredSalesOrders.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-gray-500">No sales orders found</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {filteredSalesOrders.map((order) => {
                    const isSelected = order.id === linkToData.sales_order_id;
                    const customerName = order.customer
                      ? getPartnerName(order.customer)
                      : "Unknown";
                    const displayStatus = getOrderDisplayStatus(
                      order.status as SalesOrderStatus,
                      order.expected_delivery_date,
                    );

                    return (
                      <button
                        key={order.id}
                        onClick={() =>
                          handleValueChange("sales_order_id", order.id)
                        }
                        className="flex items-center gap-3 p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-base font-medium text-gray-700">
                              SO-{order.sequence_number}
                            </p>
                            <SalesStatusBadge status={displayStatus} />
                          </div>
                          <p className="text-xs text-gray-500 truncate mt-1">
                            {customerName} ·{" "}
                            {formatAbsoluteDate(order.created_at)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {getFullProductInfo(order.sales_order_items)}
                          </p>
                        </div>

                        {isSelected && (
                          <div className="flex items-center justify-center size-6 rounded-full bg-primary-500 shrink-0">
                            <IconCheck className="size-4 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
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
