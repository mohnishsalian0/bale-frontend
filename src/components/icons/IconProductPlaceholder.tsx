import { ComponentType } from "react";
import { StockType } from "@/types/database/enums";
import { IconCylinder, IconPackage, IconShirt } from "@tabler/icons-react";

export function getProductIcon(
  stock_type: StockType | null | undefined,
): ComponentType<{ className?: string }> {
  if (stock_type === "roll") return IconCylinder;
  if (stock_type === "batch") return IconPackage;
  if (stock_type === "piece") return IconShirt;
  return IconPackage; // default
}

export default function IconProductPlaceholder({
  stock_type,
  className,
}: {
  stock_type: StockType;
  className?: string;
}) {
  if (stock_type === "roll") {
    return <IconCylinder className={className} />;
  } else if (stock_type === "batch") {
    return <IconPackage className={className} />;
  } else if (stock_type === "piece") {
    return <IconShirt className={className} />;
  }
}
