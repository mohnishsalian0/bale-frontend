"use client";

import { useState } from "react";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import type { SalesOrderUpdate } from "@/types/sales-orders.types";
import type { PurchaseOrderUpdate } from "@/types/purchase-orders.types";

interface TransportEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    data: Partial<SalesOrderUpdate> | Partial<PurchaseOrderUpdate>,
    onSuccessCallback?: () => void,
  ) => void;
  isPending: boolean;
  currentExpectedDeliveryDate: string | null;
}

export function TransportEditSheet({
  open,
  onOpenChange,
  onSave,
  isPending,
  currentExpectedDeliveryDate,
}: TransportEditSheetProps) {
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<
    Date | undefined
  >(
    currentExpectedDeliveryDate
      ? new Date(currentExpectedDeliveryDate)
      : undefined,
  );

  const handleSave = () => {
    onSave(
      {
        delivery_due_date: expectedDeliveryDate
          ? expectedDeliveryDate.toISOString()
          : null,
      },
      () => onOpenChange(false),
    );
  };

  const formContent = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="expected-delivery-date">Expected Delivery Date</Label>
        <DatePicker
          value={expectedDeliveryDate}
          onChange={setExpectedDeliveryDate}
        />
      </div>

      {expectedDeliveryDate && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpectedDeliveryDate(undefined)}
          disabled={isPending}
          type="button"
        >
          Clear date
        </Button>
      )}
    </div>
  );

  const footerButtons = (
    <>
      <Button
        variant="outline"
        onClick={() => onOpenChange(false)}
        disabled={isPending}
      >
        Cancel
      </Button>
      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving..." : "Save changes"}
      </Button>
    </>
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Transport Details"
      description="Update the expected delivery date for this order"
      footer={footerButtons}
    >
      {formContent}
    </ResponsiveDialog>
  );
}
