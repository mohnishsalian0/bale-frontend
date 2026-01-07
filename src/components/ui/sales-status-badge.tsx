import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DisplayStatus } from "@/lib/utils/sales-order";

interface SalesStatusBadgeProps {
  status: DisplayStatus;
  text?: string;
  className?: string;
}

interface SalesStatusConfig {
  color: "blue" | "green" | "orange" | "red" | "gray" | "yellow";
  variant: "default" | "secondary" | "outline";
}

export function getStatusConfig(status: DisplayStatus): SalesStatusConfig {
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

function getDefaultLabel(status: DisplayStatus): string {
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
 * Status badge for sales order
 */
export function SalesStatusBadge({
  status,
  text,
  className,
}: SalesStatusBadgeProps) {
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
