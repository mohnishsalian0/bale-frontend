import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { JobWorkStatus } from "@/types/database/enums";

interface JobWorkStatusBadgeProps {
  status: JobWorkStatus | "overdue";
  text?: string;
  className?: string;
}

interface JobWorkStatusConfig {
  color: "blue" | "green" | "orange" | "red" | "gray" | "yellow";
  variant: "default" | "secondary" | "outline";
}

export function getJobWorkStatusConfig(
  status: JobWorkStatus | "overdue",
): JobWorkStatusConfig {
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

function getDefaultLabel(status: JobWorkStatus | "overdue"): string {
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
 * Status badge for job work
 */
export function JobWorkStatusBadge({
  status,
  text,
  className,
}: JobWorkStatusBadgeProps) {
  const config = getJobWorkStatusConfig(status);
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
