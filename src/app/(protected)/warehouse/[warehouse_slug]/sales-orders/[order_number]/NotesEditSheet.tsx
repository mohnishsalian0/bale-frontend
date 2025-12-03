"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/browser";
import { toast } from "sonner";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

interface NotesEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  initialNotes: string | null;
}

export function NotesEditSheet({
  open,
  onOpenChange,
  orderId,
  initialNotes,
}: NotesEditSheetProps) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setNotes(initialNotes || "");
    }
  }, [open, initialNotes]);

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleConfirm = async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      const { error } = await supabase
        .from("sales_orders")
        .update({ notes: notes || null })
        .eq("id", orderId);

      if (error) throw error;

      toast.success("Notes updated");
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating notes:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update noteuctions",
      );
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <div className="flex flex-col gap-4 p-4 md:px-0">
      <Textarea
        placeholder="Enter notes..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="min-h-32"
      />
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

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Notes"
      footer={footerButtons}
    >
      {formContent}
    </ResponsiveDialog>
  );
}
