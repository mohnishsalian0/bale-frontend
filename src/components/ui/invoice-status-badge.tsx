import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InvoiceDisplayStatus } from "@/lib/utils/invoice";

interface InvoiceStatusBadgeProps {
  status: InvoiceDisplayStatus;
  className?: string;
}

interface InvoiceStatusConfig {
  color: "blue" | "green" | "orange" | "red" | "gray" | "yellow";
  variant: "default" | "secondary" | "outline";
  label: string;
}

export function getInvoiceStatusConfig(
  status: InvoiceDisplayStatus,
): InvoiceStatusConfig {
  switch (status) {
    case "open":
      return { color: "blue", variant: "default", label: "Open" };
    case "partially_paid":
      return { color: "orange", variant: "secondary", label: "Partially Paid" };
    case "settled":
      return { color: "green", variant: "secondary", label: "Settled" };
    case "overdue":
      return { color: "yellow", variant: "secondary", label: "Overdue" };
    case "cancelled":
      return { color: "gray", variant: "secondary", label: "Cancelled" };
    default:
      return { color: "gray", variant: "secondary", label: status };
  }
}

/**
 * Status badge for invoices
 * Displays open, partially_paid, or settled status with appropriate colors
 */
export function InvoiceStatusBadge({
  status,
  className,
}: InvoiceStatusBadgeProps) {
  const config = getInvoiceStatusConfig(status);

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
