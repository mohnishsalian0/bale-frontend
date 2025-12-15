"use client";

import { useState } from "react";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CompleteOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (notes?: string) => void;
  loading?: boolean;
}

export function CompleteOrderDialog({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}: CompleteOrderDialogProps) {
  const [notes, setNotes] = useState("");

  const handleConfirm = () => {
    onConfirm(notes.trim() || undefined);
    setNotes(""); // Reset after confirmation
  };

  const handleCancel = () => {
    setNotes(""); // Reset on cancel
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Mark order as complete"
      description="This will mark the purchase order as completed. You can optionally add completion notes."
      footer={
        <>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? "Completing..." : "Mark as complete"}
          </Button>
        </>
      }
    >
      <Textarea
        placeholder="Add completion notes (optional)..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="min-h-32"
        disabled={loading}
      />
    </ResponsiveDialog>
  );
}
