"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { DatePicker } from "@/components/ui/date-picker";
import { useIsMobile } from "@/hooks/use-mobile";
import { createClient } from "@/lib/supabase/browser";
import { toast } from "sonner";

interface TransportEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  currentExpectedDeliveryDate: string | null;
}

export function TransportEditSheet({
  open,
  onOpenChange,
  orderId,
  currentExpectedDeliveryDate,
}: TransportEditSheetProps) {
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<
    Date | undefined
  >(undefined);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open) {
      setExpectedDeliveryDate(
        currentExpectedDeliveryDate
          ? new Date(currentExpectedDeliveryDate)
          : undefined,
      );
    }
  }, [open, currentExpectedDeliveryDate]);

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error } = await supabase
        .from("sales_orders")
        .update({
          expected_delivery_date: expectedDeliveryDate
            ? expectedDeliveryDate.toISOString().split("T")[0]
            : null,
        })
        .eq("id", orderId);

      if (error) throw error;

      toast.success("Expected delivery date updated");
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating delivery date:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update delivery date",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClearDate = () => {
    setExpectedDeliveryDate(undefined);
  };

  const formContent = (
    <div className="flex flex-col gap-6 p-4 md:px-0">
      <div className="flex flex-col gap-2">
        <Label htmlFor="expected-delivery">Expected delivery date</Label>
        <DatePicker
          placeholder="Select date"
          value={expectedDeliveryDate}
          onChange={(date) => setExpectedDeliveryDate(date)}
        />
        {expectedDeliveryDate && (
          <Button
            type="button"
            variant="outline"
            onClick={handleClearDate}
            className="w-full"
          >
            Clear date
          </Button>
        )}
      </div>
    </div>
  );

  const footerButtons = (
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
        disabled={loading}
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
            <DrawerTitle>Expected delivery</DrawerTitle>
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
          <DialogTitle>Expected delivery</DialogTitle>
        </DialogHeader>
        {formContent}
        <DialogFooter>{footerButtons}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
