"use client";

import { useState } from "react";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWarehouses } from "@/lib/query/hooks/warehouses";
import type { SalesOrderUpdate } from "@/types/sales-orders.types";
import type { PurchaseOrderUpdate } from "@/types/purchase-orders.types";

interface WarehouseEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    data: Partial<SalesOrderUpdate> | Partial<PurchaseOrderUpdate>,
    onSuccessCallback?: () => void,
  ) => void;
  isPending: boolean;
  currentWarehouseId: string;
  hasStockFlow: boolean; // hasOutward for sales, hasInward for purchase
  stockFlowLabel: string; // "outward" or "inward"
}

export function WarehouseEditSheet({
  open,
  onOpenChange,
  onSave,
  isPending,
  currentWarehouseId,
  hasStockFlow,
  stockFlowLabel,
}: WarehouseEditSheetProps) {
  const [selectedWarehouseId, setSelectedWarehouseId] =
    useState(currentWarehouseId);

  const { data: warehouses = [] } = useWarehouses();

  const handleSave = () => {
    onSave({ warehouse_id: selectedWarehouseId }, () => onOpenChange(false));
  };

  const formContent = hasStockFlow ? (
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
      <p className="text-sm text-orange-800">
        Cannot change warehouse as this order has {stockFlowLabel} records
        associated with it.
      </p>
    </div>
  ) : (
    <div className="space-y-2">
      <Label htmlFor="warehouse">Warehouse</Label>
      <Select
        value={selectedWarehouseId}
        onValueChange={setSelectedWarehouseId}
        disabled={isPending}
      >
        <SelectTrigger id="warehouse">
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
    </div>
  );

  const footerButtons = hasStockFlow ? (
    <Button variant="outline" onClick={() => onOpenChange(false)}>
      Close
    </Button>
  ) : (
    <>
      <Button
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={isPending}
      >
        Cancel
      </Button>
      <Button onClick={handleSave} disabled={isPending || !selectedWarehouseId}>
        {isPending ? "Saving..." : "Save changes"}
      </Button>
    </>
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Warehouse"
      description={
        hasStockFlow
          ? `Warehouse cannot be changed for orders with ${stockFlowLabel} records`
          : "Update the warehouse for this order"
      }
      footer={footerButtons}
    >
      {formContent}
    </ResponsiveDialog>
  );
}
