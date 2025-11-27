"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { StockStatusBadge } from "@/components/ui/stock-status-badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatStockUnitNumber } from "@/lib/utils/stock-unit";
import {
  StockUnitDetailsContent,
  type StockUnitWithProduct,
} from "./stock-unit-details-content";
import type { StockType, StockUnitStatus } from "@/types/database/enums";

// Re-export for backward compatibility
export type { StockUnitWithProduct };

interface StockUnitDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockUnit: StockUnitWithProduct | null;
}

export function StockUnitDetailsModal({
  open,
  onOpenChange,
  stockUnit,
}: StockUnitDetailsModalProps) {
  const isMobile = useIsMobile();

  if (!stockUnit) return null;

  const product = stockUnit.product;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {formatStockUnitNumber(
                stockUnit.sequence_number,
                product?.stock_type as StockType,
              )}
              <StockStatusBadge status={stockUnit.status as StockUnitStatus} />
            </DrawerTitle>
          </DrawerHeader>
          <StockUnitDetailsContent stockUnit={stockUnit} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {formatStockUnitNumber(
              stockUnit.sequence_number,
              product?.stock_type as StockType,
            )}
            <StockStatusBadge status={stockUnit.status as StockUnitStatus} />
          </DialogTitle>
        </DialogHeader>
        <StockUnitDetailsContent stockUnit={stockUnit} />
      </DialogContent>
    </Dialog>
  );
}
