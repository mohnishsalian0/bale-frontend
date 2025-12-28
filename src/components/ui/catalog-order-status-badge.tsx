import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SalesOrderStatus } from "@/types/database/enums";

interface CatalogOrderStatusBadgeProps {
  status: SalesOrderStatus | "overdue";
  className?: string;
}

interface CatalogOrderStatusConfig {
  color: "blue" | "green" | "orange" | "red" | "gray";
  variant: "default" | "secondary" | "outline";
  label: string;
}

function getStatusConfig(
  status: SalesOrderStatus | "overdue",
): CatalogOrderStatusConfig {
  switch (status) {
    case "approval_pending":
      return {
        color: "orange",
        variant: "secondary",
        label: "Waiting for Confirmation",
      };
    case "in_progress":
      return { color: "blue", variant: "secondary", label: "Order accepted" };
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
export function CatalogOrderStatusBadge({
  status,
  className,
}: CatalogOrderStatusBadgeProps) {
  const config = getStatusConfig(status);

  return (
    <Badge
      color={config.color}
      variant={config.variant}
      className={cn("text-nowrap", className)}
    >
      {config.label}
    </Badge>
  );
}
