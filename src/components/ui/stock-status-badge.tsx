import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StockUnitStatus } from "@/types/database/enums";

interface StockStatusBadgeProps {
  status: StockUnitStatus;
  className?: string;
}

interface StockStatusConfig {
  color: "blue" | "green" | "orange" | "red" | "gray";
  variant: "default" | "secondary" | "outline";
  label: string;
}

function getStatusConfig(status: StockUnitStatus): StockStatusConfig {
  switch (status) {
    case "full":
      return { color: "blue", variant: "default", label: "Full" };
    case "partial":
      return { color: "blue", variant: "secondary", label: "Partial" };
    case "empty":
      return { color: "orange", variant: "secondary", label: "Empty" };
    case "removed":
      return { color: "gray", variant: "secondary", label: "Removed" };
    default:
      return { color: "blue", variant: "secondary", label: status };
  }
}

export function StockStatusBadge({ status, className }: StockStatusBadgeProps) {
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
