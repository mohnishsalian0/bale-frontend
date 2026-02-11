import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StockUnitStatus } from "@/types/database/enums";

interface StockStatusBadgeProps {
  status: StockUnitStatus;
  className?: string;
}

interface StockStatusConfig {
  color: "blue" | "green" | "orange" | "red" | "gray" | "yellow";
  variant: "default" | "secondary" | "outline";
  label: string;
}

function getStatusConfig(status: StockUnitStatus): StockStatusConfig {
  switch (status) {
    case "available":
      return { color: "blue", variant: "secondary", label: "Available" };
    case "in_transit":
      return { color: "yellow", variant: "secondary", label: "In transit" };
    case "processing":
      return { color: "orange", variant: "secondary", label: "Processing" };
    default:
      return { color: "gray", variant: "secondary", label: status };
  }
}

export function StockStatusBadge({ status, className }: StockStatusBadgeProps) {
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
