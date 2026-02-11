"use client";

import {
  StockUnitDetailsContent,
  type StockUnitWithProduct,
} from "./stock-unit-details-content";
import { ResponsiveDialog } from "../ui/responsive-dialog";

// Re-export for backward compatibility
export type { StockUnitWithProduct };

interface StockUnitDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockUnitId: string | null;
}

export function StockUnitDetailsModal({
  open,
  onOpenChange,
  stockUnitId,
}: StockUnitDetailsModalProps) {
  if (!stockUnitId) return null;

  const handleModalClose = (isOpen: boolean) => {
    onOpenChange(isOpen);
  };

  const handleDeleted = () => {
    onOpenChange(false);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={handleModalClose}
      title="Stock unit"
    >
      <StockUnitDetailsContent
        stockUnitId={stockUnitId}
        onDeleted={handleDeleted}
      />
    </ResponsiveDialog>
  );
}
