import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PurchaseOrderStatus } from "@/types/database/enums";

interface PurchaseStatusBadgeProps {
  status: PurchaseOrderStatus | "overdue";
  className?: string;
}

interface PurchaseStatusConfig {
  color: "blue" | "green" | "orange" | "red" | "gray" | "yellow";
  variant: "default" | "secondary" | "outline";
  label: string;
}

export function getStatusConfig(
  status: PurchaseOrderStatus | "overdue",
): PurchaseStatusConfig {
  switch (status) {
    case "approval_pending":
      return { color: "blue", variant: "default", label: "Approval Pending" };
    case "in_progress":
      return { color: "blue", variant: "secondary", label: "In Progress" };
    case "overdue":
      return { color: "yellow", variant: "secondary", label: "Overdue" };
    case "completed":
      return { color: "green", variant: "secondary", label: "Completed" };
    case "cancelled":
      return { color: "gray", variant: "secondary", label: "Cancelled" };
    default:
      return { color: "blue", variant: "secondary", label: status };
  }
}

/**
 * Status badge for purchase order
 */
export function PurchaseStatusBadge({
  status,
  className,
}: PurchaseStatusBadgeProps) {
  const config = getStatusConfig(status);

  return (
    <Badge
      color={config.color}
      variant={config.variant}
      className={cn("rounded-2xl text-nowrap", className)}
    >
      {config.label}
    </Badge>
  );
}
