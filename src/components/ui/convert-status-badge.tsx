import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ConvertStatus } from "@/types/database/enums";

interface ConvertStatusBadgeProps {
  status: "in_progress" | "completed" | "cancelled";
  className?: string;
}

interface ConvertStatusConfig {
  color: "blue" | "green" | "orange" | "red" | "gray";
  variant: "default" | "secondary";
  label: string;
}

function getStatusConfig(status: ConvertStatus): ConvertStatusConfig {
  switch (status) {
    case "in_progress":
      return { color: "blue", variant: "default", label: "In Progress" };
    case "completed":
      return { color: "green", variant: "secondary", label: "Completed" };
    case "cancelled":
      return { color: "gray", variant: "secondary", label: "Cancelled" };
    default:
      return { color: "gray", variant: "secondary", label: status };
  }
}

/**
 * Status badge for goods convert
 */
export function ConvertStatusBadge({
  status,
  className,
}: ConvertStatusBadgeProps) {
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
