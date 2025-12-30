"use client";

import { useState } from "react";
import { IconCheck, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { formatDateDisplay } from "@/lib/utils/date";
import {
  getInwardProductsSummary,
  getMovementNumber,
} from "@/lib/utils/stock-flow";
import { useGoodsInwardsByPurchaseOrder } from "@/lib/query/hooks/stock-flow";

interface GoodsInwardSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: string;
  onInvoiceFromMovements: (selectedIds: string[]) => void;
  onInvoiceFullOrder: () => void;
}

export function GoodsInwardSelectionDialog({
  open,
  onOpenChange,
  orderNumber,
  onInvoiceFromMovements,
  onInvoiceFullOrder,
}: GoodsInwardSelectionDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Fetch goods inwards for this purchase order
  const { data: inwardsData } = useGoodsInwardsByPurchaseOrder(orderNumber);
  const movements = inwardsData?.data || [];

  const handleToggleMovement = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((itemId) => itemId !== id)
        : [...prev, id],
    );
  };

  const handleInvoiceFromMovements = () => {
    onInvoiceFromMovements(selectedIds);
    setSelectedIds([]);
    onOpenChange(false);
  };

  const handleInvoiceFullOrder = () => {
    onInvoiceFullOrder();
    setSelectedIds([]);
    onOpenChange(false);
  };

  const canContinueWithMovements = selectedIds.length > 0;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create Invoice from Purchase Order"
      description={`Select inward movements to include in the invoice for PO-${orderNumber}`}
      footer={
        <div className="flex items-center gap-2 w-full">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="shrink-0"
          >
            <IconX className="size-4" />
          </Button>
          <Button
            variant="outline"
            onClick={handleInvoiceFullOrder}
            className="flex-1"
          >
            Invoice Full Order
          </Button>
          <Button
            onClick={handleInvoiceFromMovements}
            disabled={!canContinueWithMovements}
            className="flex-1"
          >
            Continue ({selectedIds.length})
          </Button>
        </div>
      }
    >
      {/* Movements List */}
      {movements.length > 0 ? (
        <div className="flex flex-col gap-3">
          {movements.map((movement) => {
            const isSelected = selectedIds.includes(movement.id);
            const movementNumber = getMovementNumber(
              "inward",
              movement.sequence_number,
            );
            const movementDate = formatDateDisplay(
              new Date(movement.inward_date),
            );
            const productsSummary = getInwardProductsSummary(movement);

            return (
              <button
                key={movement.id}
                onClick={() => handleToggleMovement(movement.id)}
                className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                {/* Movement Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-medium text-gray-700">
                      {movementNumber}
                    </p>
                    {movement.has_invoice && (
                      <Badge variant="secondary" className="text-xs">
                        Invoiced
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{productsSummary}</p>
                  <p className="text-xs text-gray-500">{movementDate}</p>
                </div>

                {/* Selection Checkmark */}
                {isSelected && (
                  <div className="flex items-center justify-center size-6 rounded-full bg-primary-500 shrink-0">
                    <IconCheck className="size-4 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center py-12">
          <div className="text-center text-gray-500">
            <p className="text-sm">No inward movements found for this order.</p>
            <p className="text-xs mt-1">
              You can still invoice the full order using order items.
            </p>
          </div>
        </div>
      )}
    </ResponsiveDialog>
  );
}
