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
  OutwardLinkToType,
} from "@/types/database/enums";
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
}

export function OutwardLinkToStep({
  selectedPartnerId,
  linkToData,
  onLinkToChange,
}: OutwardLinkToStepProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all sales orders for the warehouse
  const { data: salesOrdersResponse, isLoading: salesOrdersLoading } =
    useSalesOrders({
      filters: {
        customerId: selectedPartnerId || undefined,
        status: ["in_progress"],
      },
    });

  const salesOrders = salesOrdersResponse?.data || [];

  // Filter sales orders by selected partner and search query
  const filteredSalesOrders = salesOrders.filter((order) => {
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const customerName = order.customer
        ? getPartnerName(order.customer).toLowerCase()
        : "";
      const sequenceNumber = `SO-${order.sequence_number}`.toLowerCase();
      return customerName.includes(query) || sequenceNumber.includes(query);
    }

    return true;
  });

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
      {/* Header with Radio Pills */}
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

      {/* Content based on selection */}
      <div className="flex-1 overflow-y-auto">
        {linkToData.linkToType === "sales_order" && (
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
                  <p className="text-sm text-gray-500">
                    {selectedPartnerId
                      ? "No sales orders found for selected customer"
                      : "No sales orders found"}
                  </p>
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

        {linkToData.linkToType === "purchase_return" && (
          <div className="p-4">
            <Label htmlFor="po_number" className="mb-2 block">
              Purchase order number
            </Label>
            <Input
              id="po_number"
              placeholder="Enter PO number for return"
              value={linkToData.purchase_order_id || ""}
              onChange={(e) =>
                handleValueChange("purchase_order_id", e.target.value || null)
              }
              required
            />
          </div>
        )}

        {linkToData.linkToType === "other" && (
          <div className="p-4">
            <Label htmlFor="other_reason" className="mb-2 block">
              Reason for outward
            </Label>
            <Textarea
              id="other_reason"
              placeholder="Enter reason for dispatching goods"
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
