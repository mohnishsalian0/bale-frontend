"use client";

import { useState } from "react";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  getMeasuringUnitAbbreviation,
  pluralizeMeasuringUnitAbbreviation,
} from "@/lib/utils/measuring-units";
import type { ProductListView } from "@/types/products.types";
import type { MeasuringUnit } from "@/types/database/enums";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { InputWrapper } from "@/components/ui/input-wrapper";

interface PieceQuantitySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductListView | null;
  initialQuantity?: number;
  currentInventory?: number; // Current stock quantity if exists
  onConfirm: (quantity: number) => void;
}

export function PieceQuantitySheet({
  open,
  onOpenChange,
  product,
  initialQuantity = 0,
  currentInventory,
  onConfirm,
}: PieceQuantitySheetProps) {
  const [quantity, setQuantity] = useState(initialQuantity);

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenChange(false);
  };

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (quantity > 0) {
      onConfirm(quantity);
      onOpenChange(false);
    }
  };

  const handleIncrement = () => {
    setQuantity((prev) => prev + 1);
  };

  const handleDecrement = () => {
    setQuantity((prev) => Math.max(0, prev - 1));
  };

  const handlePresetAdd = (amount: number) => {
    setQuantity((prev) => prev + amount);
  };

  const presetAmounts = [5, 10, 25, 50, 100, 250];

  if (!product) return null;

  const unitAbbreviation = getMeasuringUnitAbbreviation(
    product.measuring_unit as MeasuringUnit | null,
  );
  const pluralizedUnit = pluralizeMeasuringUnitAbbreviation(
    quantity,
    unitAbbreviation,
  );

  const formContent = (
    <div className="flex flex-col gap-4 pb-1 md:px-0 overflow-x-hidden">
      <div className="flex gap-4">
        <div className="flex-1">
          {/* Quantity Input */}
          <div className="flex items-end gap-2 shrink-0">
            <InputWrapper
              type="number"
              label="Quantity"
              rightText={pluralizedUnit}
              min="0"
              step="1"
              placeholder="0"
              value={quantity}
              className="flex-1"
              onChange={(e) =>
                setQuantity(
                  Math.max(0, Math.round(parseFloat(e.target.value) || 0)),
                )
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mb-1"
              onClick={handleDecrement}
            >
              <IconMinus />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mb-1"
              onClick={handleIncrement}
            >
              <IconPlus />
            </Button>
          </div>

          {/* Current Inventory Display */}
          {currentInventory !== undefined && (
            <div className="text-center">
              <p className="text-sm text-gray-500">
                {currentInventory}{" "}
                {pluralizeMeasuringUnitAbbreviation(
                  currentInventory,
                  unitAbbreviation,
                )}{" "}
                avail.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Preset size options */}
      <div className="flex flex-wrap items-center gap-2 flex-2">
        {presetAmounts.map((amount) => (
          <Button
            key={amount}
            type="button"
            variant="outline"
            size="sm"
            className="border-border shadow-gray-sm text-foreground"
            onClick={() => handlePresetAdd(amount)}
          >
            <IconPlus />
            {amount}
          </Button>
        ))}
      </div>
    </div>
  );

  const footerButtons = (
    <div className="flex gap-3 w-full">
      <Button
        type="button"
        variant="outline"
        onClick={handleCancel}
        className="flex-1"
      >
        Cancel
      </Button>
      <Button
        type="button"
        onClick={handleConfirm}
        disabled={quantity <= 0}
        className="flex-1"
      >
        Confirm
      </Button>
    </div>
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add quantity"
      description={product.name}
      footer={footerButtons}
    >
      {formContent}
    </ResponsiveDialog>
  );
}
