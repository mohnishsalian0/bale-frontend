"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useWarehouses } from "@/lib/query/hooks/warehouses";

interface WarehouseEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  currentWarehouseId: string;
  hasOutward: boolean;
  onSuccess: () => void;
}

export function WarehouseEditSheet({
  open,
  onOpenChange,
  orderId,
  currentWarehouseId,
  hasOutward,
  onSuccess,
}: WarehouseEditSheetProps) {
  const [selectedWarehouseId, setSelectedWarehouseId] =
    useState(currentWarehouseId);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

  // Fetch warehouses using TanStack Query
  const { data: warehouses = [], isLoading: fetchingWarehouses } = useWarehouses();

  useEffect(() => {
    if (open) {
      setSelectedWarehouseId(currentWarehouseId);
    }
  }, [open, currentWarehouseId]);

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error } = await supabase
        .from("sales_orders")
        .update({ warehouse_id: selectedWarehouseId })
        .eq("id", orderId);

      if (error) throw error;

      toast.success("Warehouse updated");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating warehouse:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update warehouse",
      );
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <div className="flex flex-col gap-4 p-4 md:px-0">
      {hasOutward ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-gray-600">
            Warehouse cannot be changed because this order has goods outward
            records.
          </p>
        </div>
      ) : fetchingWarehouses ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-gray-500">Loading warehouses...</p>
        </div>
      ) : (
        <Select
          value={selectedWarehouseId}
          onValueChange={setSelectedWarehouseId}
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
  );

  const footerButtons = hasOutward ? (
    <div className="flex w-full">
      <Button
        type="button"
        variant="outline"
        onClick={handleCancel}
        className="flex-1"
      >
        Close
      </Button>
    </div>
  ) : (
    <div className="flex gap-3 w-full">
      <Button
        type="button"
        variant="outline"
        onClick={handleCancel}
        className="flex-1"
        disabled={loading}
      >
        Cancel
      </Button>
      <Button
        type="button"
        onClick={handleConfirm}
        className="flex-1"
        disabled={loading || fetchingWarehouses || !selectedWarehouseId}
      >
        {loading ? "Saving..." : "Save"}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Warehouse</DrawerTitle>
          </DrawerHeader>
          {formContent}
          <DrawerFooter>{footerButtons}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Warehouse</DialogTitle>
        </DialogHeader>
        {formContent}
        <DialogFooter>{footerButtons}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
