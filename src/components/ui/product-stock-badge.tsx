import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type ProductStockStatus } from "@/types/database/enums";

interface ProductStatusBadgeProps {
  status: ProductStockStatus;
  className?: string;
}

interface ProductStatusConfig {
  color: "blue" | "green" | "orange" | "red" | "gray";
  variant: "default" | "secondary" | "outline";
  label: string;
}

function getProductStatusConfig(
  status: ProductStockStatus,
): ProductStatusConfig {
  switch (status) {
    case "in_stock":
      return { color: "green", variant: "secondary", label: "In stock" };
    case "low_stock":
      return { color: "orange", variant: "secondary", label: "Low stock" };
    default:
      return { color: "red", variant: "secondary", label: "Out of stock" };
  }
}

export function ProductStockStatusBadge({
  status,
  className,
}: ProductStatusBadgeProps) {
  const config = getProductStatusConfig(status);

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
