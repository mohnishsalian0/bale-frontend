"use client";

import { useState } from "react";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface CancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  title?: string;
  message?: string;
  loading?: boolean;
}

export function CancelDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Cancel item",
  message = "Are you sure you want to cancel this item? This action cannot be undone.",
  loading = false,
}: CancelDialogProps) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason.trim());
    }
  };

  const handleCancel = () => {
    setReason("");
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason("");
    }
    onOpenChange(newOpen);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Close
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || !reason.trim()}
          >
            {loading ? "Cancelling..." : "Cancel"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-500">{message}</p>

        <div className="space-y-2">
          <Label htmlFor="cancellation-reason" className="text-sm font-medium">
            Reason for cancellation <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="cancellation-reason"
            placeholder="Enter reason for cancellation..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={loading}
            rows={4}
            className="resize-none"
          />
          {!reason.trim() && (
            <p className="text-xs text-gray-500">
              Cancellation reason is required
            </p>
          )}
        </div>
      </div>
    </ResponsiveDialog>
  );
}
