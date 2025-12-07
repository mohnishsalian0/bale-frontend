"use client";

import { useState } from "react";
import { IconMinus, IconPlus, IconPhoto } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ImageWrapper from "@/components/ui/image-wrapper";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import { formatStockUnitNumber } from "@/lib/utils/product";
import type { MeasuringUnit, StockType } from "@/types/database/enums";
import { StockUnitWithProductDetailView } from "@/types/stock-units.types";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

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
    <div className="flex flex-col gap-4 p-4 md:px-0 overflow-x-hidden">
      <div className="flex gap-4">
        {/* Product Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <ImageWrapper
            size="md"
            shape="square"
            imageUrl={stockUnit.product?.product_images?.[0]}
            alt={stockUnit.product?.name || "Product Image"}
            placeholderIcon={IconPhoto}
          />
          <div className="flex-1 min-w-0">
            <p
              title={stockUnit.product?.name}
              className="text-base font-medium text-gray-700 truncate"
            >
              {stockUnit.product?.name}
            </p>
            <p
              title={formatStockUnitNumber(
                stockUnit.sequence_number,
                stockType,
              )}
              className="text-xs text-gray-500 truncate"
            >
              {formatStockUnitNumber(stockUnit.sequence_number, stockType)}
            </p>
          </div>
        </div>

        <div className="shrink-0">
          {/* Quantity Input */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleDecrement}
              disabled={quantity <= 0}
            >
              <IconMinus />
            </Button>
            <div className="relative">
              <Input
                type="number"
                value={quantity}
                onFocus={(e) => e.target.select()}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="text-center text-lg font-medium max-w-25 pr-10"
                min="0"
                max={maxQuantity}
                step={stockType === "roll" ? "0.1" : "1"}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                {unitAbbreviation}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleIncrement}
              disabled={quantity >= maxQuantity}
            >
              <IconPlus />
            </Button>
          </div>

          {/* Available Quantity Display */}
          <p className="text-sm text-gray-500 text-center mt-1">
            {maxQuantity} {unitAbbreviation} avail.
          </p>
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
      footer={footerButtons}
    >
      {formContent}
    </ResponsiveDialog>
  );
}
