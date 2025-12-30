import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { InvoiceDisplayStatus } from "@/lib/utils/invoice";

interface InvoiceStatusBadgeProps {
  status: InvoiceDisplayStatus;
  text?: string;
  className?: string;
}

interface InvoiceStatusConfig {
  color: "blue" | "green" | "orange" | "red" | "gray" | "yellow";
  variant: "default" | "secondary" | "outline";
}

export function getInvoiceStatusConfig(
  status: InvoiceDisplayStatus,
): InvoiceStatusConfig {
  switch (status) {
    case "open":
      return { color: "blue", variant: "default" };
    case "partially_paid":
      return { color: "orange", variant: "secondary" };
    case "settled":
      return { color: "green", variant: "secondary" };
    case "overdue":
      return { color: "yellow", variant: "secondary" };
    case "cancelled":
      return { color: "gray", variant: "secondary" };
    default:
      return { color: "gray", variant: "secondary" };
  }
}

function getDefaultLabel(status: InvoiceDisplayStatus): string {
  switch (status) {
    case "open":
      return "Open";
    case "partially_paid":
      return "Partially Paid";
    case "settled":
      return "Settled";
    case "overdue":
      return "Overdue";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

/**
 * Status badge for invoices
 * Displays open, partially_paid, or settled status with appropriate colors
 */
export function InvoiceStatusBadge({
  status,
  text,
  className,
}: InvoiceStatusBadgeProps) {
  const config = getInvoiceStatusConfig(status);
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
