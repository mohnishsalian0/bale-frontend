"use client";

import { StockStatusBadge } from "@/components/ui/stock-status-badge";
import { formatStockUnitNumber } from "@/lib/utils/product";
import {
  StockUnitDetailsContent,
  type StockUnitWithProduct,
} from "./stock-unit-details-content";
import type { StockType, StockUnitStatus } from "@/types/database/enums";
import { StockUnitWithProductDetailView } from "@/types/stock-units.types";
import { ResponsiveDialog } from "../ui/responsive-dialog";

// Re-export for backward compatibility
export type { StockUnitWithProduct };

interface StockUnitDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockUnit: StockUnitWithProductDetailView | null;
}

export function StockUnitDetailsModal({
  open,
  onOpenChange,
  stockUnit,
}: StockUnitDetailsModalProps) {
  if (!stockUnit) return null;

  const product = stockUnit.product;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <>
          {formatStockUnitNumber(
            stockUnit.sequence_number,
            product?.stock_type as StockType,
          )}
          <StockStatusBadge status={stockUnit.status as StockUnitStatus} />
        </>
      }
    >
      <StockUnitDetailsContent stockUnit={stockUnit} />
    </ResponsiveDialog>
  );
}
