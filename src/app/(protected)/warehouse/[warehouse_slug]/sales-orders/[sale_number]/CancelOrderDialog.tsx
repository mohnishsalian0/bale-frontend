"use client";

import { useState } from "react";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface CancelOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  loading?: boolean;
}

export function CancelOrderDialog({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}: CancelOrderDialogProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason.trim());
      setReason(""); // Reset after confirmation
    }
  };

  const handleCancel = () => {
    setReason(""); // Reset on cancel
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Cancel sales order"
      description="Please provide a reason for cancelling this order. This action cannot be undone."
      footer={
        <>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Keep order
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!reason.trim() || loading}
          >
            {loading ? "Cancelling..." : "Cancel order"}
          </Button>
        </>
      }
    >
      <Textarea
        placeholder="Enter cancellation reason..."
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="min-h-32"
        disabled={loading}
      />
    </ResponsiveDialog>
  );
}
