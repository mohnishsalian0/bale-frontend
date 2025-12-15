"use client";

import { useState } from "react";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SalesOrderUpdate } from "@/types/sales-orders.types";
import type { PurchaseOrderUpdate } from "@/types/purchase-orders.types";

interface NotesEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    data: Partial<SalesOrderUpdate> | Partial<PurchaseOrderUpdate>,
    onSuccessCallback?: () => void,
  ) => void;
  isPending: boolean;
  initialNotes: string | null;
}

export function NotesEditSheet({
  open,
  onOpenChange,
  onSave,
  isPending,
  initialNotes,
}: NotesEditSheetProps) {
  const [notes, setNotes] = useState(initialNotes || "");

  const handleSave = () => {
    onSave({ notes: notes.trim() || null }, () => onOpenChange(false));
  };

  const formContent = (
    <div className="space-y-2">
      <Label htmlFor="notes">Order Notes</Label>
      <Textarea
        id="notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add notes about this order..."
        className="min-h-32"
        disabled={isPending}
      />
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
      title="Edit Notes"
      description="Update the notes for this order"
      footer={footerButtons}
    >
      {formContent}
    </ResponsiveDialog>
  );
}
