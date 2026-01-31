import { useState } from "react";

import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "../ui/textarea";

interface CompleteDialogProps {
  open: boolean;
  title: string;
  description: string;
  onOpenChange: (open: boolean) => void;
  onComplete: (notes?: string) => void;
  hasNotes?: boolean;
  loading?: boolean;
}

export function CompleteDialog({
  open,
  title,
  description,
  onOpenChange,
  onComplete,
  hasNotes = false,
  loading = false,
}: CompleteDialogProps) {
  const [notes, setNotes] = useState("");

  const handleComplete = () => {
    onComplete(notes.trim() || undefined);
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
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={handleCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleComplete} disabled={loading}>
            {loading ? "Completing..." : "Mark as complete"}
          </Button>
        </>
      }
    >
      {hasNotes && (
        <Textarea
          placeholder="Add completion notes (optional)..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-32"
          disabled={loading}
        />
      )}
    </ResponsiveDialog>
  );
}
