import { useState } from "react";

import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "../ui/textarea";
import { DatePicker } from "../ui/date-picker";

export interface CompleteDialogData {
  notes?: string;
  completionDate?: Date;
}

interface CompleteDialogProps {
  open: boolean;
  title: string;
  description: string;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: CompleteDialogData) => void;
  hasNotes?: boolean;
  hasDate?: boolean;
  loading?: boolean;
}

export function CompleteDialog({
  open,
  title,
  description,
  onOpenChange,
  onComplete,
  hasNotes = false,
  hasDate = false,
  loading = false,
}: CompleteDialogProps) {
  const [notes, setNotes] = useState("");
  const [completionDate, setCompletionDate] = useState<Date | undefined>(
    new Date(),
  );

  const handleComplete = () => {
    onComplete({
      notes: notes.trim() || undefined,
      completionDate: hasDate ? completionDate : undefined,
    });
    setNotes(""); // Reset after confirmation
    setCompletionDate(new Date());
  };

  const handleCancel = () => {
    setNotes(""); // Reset on cancel
    setCompletionDate(new Date());
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
          <Button
            onClick={handleComplete}
            disabled={loading || (hasDate && !completionDate)}
          >
            {loading ? "Completing..." : "Mark as complete"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {hasDate && (
          <DatePicker
            label="Completion date"
            value={completionDate}
            onChange={setCompletionDate}
            required
          />
        )}
        {hasNotes && (
          <Textarea
            placeholder="Add completion notes (optional)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-32"
            disabled={loading}
          />
        )}
      </div>
    </ResponsiveDialog>
  );
}
