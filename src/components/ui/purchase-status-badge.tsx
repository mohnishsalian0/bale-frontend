import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PurchaseOrderStatus } from "@/types/database/enums";

interface PurchaseStatusBadgeProps {
  status: PurchaseOrderStatus | "overdue";
  text?: string;
  className?: string;
}

interface PurchaseStatusConfig {
  color: "blue" | "green" | "orange" | "red" | "gray" | "yellow";
  variant: "default" | "secondary" | "outline";
}

export function getStatusConfig(
  status: PurchaseOrderStatus | "overdue",
): PurchaseStatusConfig {
  switch (status) {
    case "approval_pending":
      return { color: "blue", variant: "default" };
    case "in_progress":
      return { color: "blue", variant: "secondary" };
    case "overdue":
      return { color: "yellow", variant: "secondary" };
    case "completed":
      return { color: "green", variant: "secondary" };
    case "cancelled":
      return { color: "gray", variant: "secondary" };
    default:
      return { color: "blue", variant: "secondary" };
  }
}

function getDefaultLabel(status: PurchaseOrderStatus | "overdue"): string {
  switch (status) {
    case "approval_pending":
      return "Approval Pending";
    case "in_progress":
      return "In Progress";
    case "overdue":
      return "Overdue";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

/**
 * Status badge for purchase order
 */
export function PurchaseStatusBadge({
  status,
  text,
  className,
}: PurchaseStatusBadgeProps) {
  const config = getStatusConfig(status);
  const label = text || getDefaultLabel(status);

  return (
    <Badge
      color={config.color}
      variant={config.variant}
      className={cn("text-nowrap", className)}
    >
      {label}
    </Badge>
  );
}
