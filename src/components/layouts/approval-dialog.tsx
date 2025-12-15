import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";

interface ApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: string;
  orderType: "SO" | "PO";
  onConfirm: () => void;
  loading?: boolean;
}

export function ApprovalDialog({
  open,
  onOpenChange,
  orderNumber,
  orderType,
  onConfirm,
  loading = false,
}: ApprovalDialogProps) {
  const actionContext = orderType === "SO" ? "dispatch" : "receiving goods";

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Approve ${orderType}-${orderNumber}`}
      footer={
        <>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={loading}>
            {loading ? "Approving..." : "Confirm & Approve"}
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-700">
        Approving this order will lock it from further edits and make it ready
        for {actionContext}. This action cannot be undone.
      </p>
      <p className="text-sm text-gray-700 mt-2">
        Are you sure you want to proceed?
      </p>
    </ResponsiveDialog>
  );
}
