import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SalesOrderStatus } from "@/types/database/enums";

interface SalesStatusBadgeProps {
  status: SalesOrderStatus | "overdue";
  className?: string;
}

interface SalesStatusConfig {
  color: "blue" | "green" | "orange" | "red" | "gray";
  variant: "default" | "secondary" | "outline";
  label: string;
}

export function getStatusConfig(
  status: SalesOrderStatus | "overdue",
): SalesStatusConfig {
  switch (status) {
    case "approval_pending":
      return { color: "blue", variant: "default", label: "Approval Pending" };
    case "in_progress":
      return { color: "blue", variant: "secondary", label: "In Progress" };
    case "overdue":
      return { color: "orange", variant: "secondary", label: "Overdue" };
    case "completed":
      return { color: "green", variant: "secondary", label: "Completed" };
    case "cancelled":
      return { color: "gray", variant: "secondary", label: "Cancelled" };
    default:
      return { color: "blue", variant: "secondary", label: status };
  }
}

/**
 * Status badge for sales order
 */
export function SalesStatusBadge({ status, className }: SalesStatusBadgeProps) {
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
