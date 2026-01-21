import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PaymentMode } from "@/types/database/enums";

interface PaymentModeBadgeProps {
  mode: PaymentMode;
  className?: string;
}

interface PaymentModeConfig {
  color: "blue" | "green" | "orange" | "red" | "gray" | "yellow";
  variant: "default" | "secondary" | "outline";
  label: string;
}

export function getPaymentModeConfig(mode: PaymentMode): PaymentModeConfig {
  switch (mode) {
    case "cash":
      return { color: "green", variant: "secondary", label: "Cash" };
    case "cheque":
      return { color: "blue", variant: "secondary", label: "Cheque" };
    case "demand_draft":
      return { color: "blue", variant: "secondary", label: "Demand Draft" };
    case "neft":
      return { color: "blue", variant: "secondary", label: "NEFT" };
    case "rtgs":
      return { color: "blue", variant: "secondary", label: "RTGS" };
    case "imps":
      return { color: "blue", variant: "secondary", label: "IMPS" };
    case "upi":
      return { color: "green", variant: "secondary", label: "UPI" };
    case "card":
      return { color: "blue", variant: "secondary", label: "Card" };
    default:
      return { color: "gray", variant: "secondary", label: mode };
  }
}

/**
 * Badge for payment modes
 * Displays payment method with appropriate colors
 */
export function PaymentModeBadge({ mode, className }: PaymentModeBadgeProps) {
  const config = getPaymentModeConfig(mode);

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
