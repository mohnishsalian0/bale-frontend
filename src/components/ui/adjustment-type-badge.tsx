import { Badge } from "./badge";
import type { AdjustmentType } from "@/types/database/enums";

interface AdjustmentTypeBadgeProps {
  type: AdjustmentType;
}

export function AdjustmentTypeBadge({ type }: AdjustmentTypeBadgeProps) {
  const config = {
    credit: {
      label: "Credit Note",
      color: "green" as const,
    },
    debit: {
      label: "Debit Note",
      color: "orange" as const,
    },
  };

  const { label, color } = config[type];

  return (
    <Badge variant="outline" color={color}>
      {label}
    </Badge>
  );
}
