"use client";

import { useState } from "react";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import type { MeasuringUnit, StockType } from "@/types/database/enums";
import { StockUnitWithProductDetailView } from "@/types/stock-units.types";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { InputWrapper } from "@/components/ui/input-wrapper";

interface StockUnitQuantitySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockUnit: StockUnitWithProductDetailView | null;
  initialQuantity?: number;
  onConfirm: (quantity: number) => void;
}

export function StockUnitQuantitySheet({
  open,
  onOpenChange,
  stockUnit,
  initialQuantity = 0,
  onConfirm,
}: StockUnitQuantitySheetProps) {
  const [quantity, setQuantity] = useState(initialQuantity);

  if (!stockUnit) return null;

  let maxQuantity = stockUnit.remaining_quantity;
  const unitAbbreviation = getMeasuringUnitAbbreviation(
    stockUnit.product?.measuring_unit as MeasuringUnit | null,
  );
  const stockType = stockUnit.product?.stock_type as StockType;
  if (stockType !== "roll") {
    maxQuantity = Math.floor(maxQuantity);
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenChange(false);
  };

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (quantity > 0 && quantity <= maxQuantity) {
      onConfirm(quantity);
      onOpenChange(false);
    }
  };

  const handleIncrement = () => {
    setQuantity((prev) => Math.min(maxQuantity, prev + 1));
  };

  const handleDecrement = () => {
    setQuantity((prev) => Math.max(0, prev - 1));
  };

  const handlePresetAdd = (amount: number) => {
    setQuantity((prev) => Math.min(maxQuantity, prev + amount));
  };

  const handleFullQuantity = () => {
    setQuantity(maxQuantity);
  };

  const handleQuantityChange = (value: string) => {
    let quantity = parseFloat(value) || 0;
    if (stockUnit.product?.stock_type === "roll") {
      quantity = Math.round(quantity * 100) / 100;
    } else {
      quantity = Math.round(quantity);
    }
    setQuantity(Math.max(0, quantity));
  };

  const presetAmounts = [5, 10, 25, 50, 100, 250];

  const formContent = (
    <div className="flex flex-col gap-4 pb-1 md:px-0 overflow-x-hidden">
      <div className="flex gap-4">
        {/* Quantity Input */}
        <div className="flex flex-1 items-center gap-2 shrink-0">
          <InputWrapper
            type="number"
            label={`Quantity`}
            rightText={unitAbbreviation}
            helpText={`${maxQuantity} ${unitAbbreviation} available`}
            min="0"
            max={maxQuantity}
            step={stockType === "roll" ? "0.1" : "1"}
            placeholder={stockType === "roll" ? "0.0" : "0"}
            value={quantity}
            className="flex-1"
            onFocus={(e) => e.target.select()}
            onChange={(e) => handleQuantityChange(e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mb-1"
            onClick={handleDecrement}
            disabled={quantity <= 0}
          >
            <IconMinus />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mb-1"
            onClick={handleIncrement}
            disabled={quantity >= maxQuantity}
          >
            <IconPlus />
          </Button>
        </div>
      </div>

      {/* Preset options (only for roll type) */}
      <div className="flex flex-wrap items-center gap-2 flex-2">
        {presetAmounts.map((amount) => (
          <Button
            key={amount}
            type="button"
            variant="outline"
            size="sm"
            className="border-border shadow-gray-sm text-foreground"
            onClick={() => handlePresetAdd(amount)}
            disabled={quantity >= maxQuantity}
          >
            <IconPlus />
            {amount}
          </Button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-border shadow-gray-sm text-foreground"
          onClick={handleFullQuantity}
          disabled={quantity >= maxQuantity}
        >
          Full
        </Button>
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
        disabled={quantity <= 0 || quantity > maxQuantity}
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
      title="Set dispatch quantity"
      description={stockUnit.product?.name}
      footer={footerButtons}
    >
      {formContent}
    </ResponsiveDialog>
  );
}
