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
import { createClient } from "@/lib/supabase/browser";
import { getPartnerName } from "@/lib/utils/partner";
import { toast } from "sonner";
import { useCustomers } from "@/lib/query/hooks/partners";

interface CustomerEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  currentCustomerId: string;
}

export function CustomerEditSheet({
  open,
  onOpenChange,
  orderId,
  currentCustomerId,
}: CustomerEditSheetProps) {
  const [selectedCustomerId, setSelectedCustomerId] =
    useState(currentCustomerId);
  const [loading, setLoading] = useState(false);
  const isMobile = useIsMobile();

  // Fetch customers using TanStack Query
  const { data: customers = [], isLoading: fetchingCustomers } = useCustomers();

  useEffect(() => {
    if (open) {
      setSelectedCustomerId(currentCustomerId);
    }
  }, [open, currentCustomerId]);

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error } = await supabase
        .from("sales_orders")
        .update({ customer_id: selectedCustomerId })
        .eq("id", orderId);

      if (error) throw error;

      toast.success("Customer updated");
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating customer:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update customer",
      );
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <div className="flex flex-col gap-4 p-4 md:px-0">
      {fetchingCustomers ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-gray-500">Loading customers...</p>
        </div>
      ) : (
        <Select
          value={selectedCustomerId}
          onValueChange={setSelectedCustomerId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select customer" />
          </SelectTrigger>
          <SelectContent>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {getPartnerName(customer)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
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
        disabled={loading || fetchingCustomers || !selectedCustomerId}
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
            <DrawerTitle>Customer</DrawerTitle>
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
          <DialogTitle>Customer</DialogTitle>
        </DialogHeader>
        {formContent}
        <DialogFooter>{footerButtons}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
