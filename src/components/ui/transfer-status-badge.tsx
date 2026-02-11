import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TransferStatus } from "@/types/database/enums";

interface TransferStatusBadgeProps {
  status: "in_transit" | "completed" | "cancelled";
  className?: string;
}

interface TransferStatusConfig {
  color: "blue" | "green" | "orange" | "red" | "gray";
  variant: "default" | "secondary";
  label: string;
}

function getStatusConfig(status: TransferStatus): TransferStatusConfig {
  switch (status) {
    case "in_transit":
      return { color: "blue", variant: "default", label: "In Transit" };
    case "completed":
      return { color: "green", variant: "secondary", label: "Completed" };
    case "cancelled":
      return { color: "gray", variant: "secondary", label: "Cancelled" };
    default:
      return { color: "gray", variant: "secondary", label: status };
  }
}

export function TransferStatusBadge({
  status,
  className,
}: TransferStatusBadgeProps) {
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
