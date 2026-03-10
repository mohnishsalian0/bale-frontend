import { StockType } from "@/types/database/enums";
import { IconCylinder, IconPackage } from "@tabler/icons-react";

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
  }
}
