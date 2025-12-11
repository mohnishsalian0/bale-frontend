"use client";

import { useState } from "react";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ImageWrapper from "@/components/ui/image-wrapper";
import { getProductIcon, getProductInfo } from "@/lib/utils/product";
import {
  getMeasuringUnitAbbreviation,
  pluralizeMeasuringUnitAbbreviation,
} from "@/lib/utils/measuring-units";
import type { ProductListView } from "@/types/products.types";
import type { MeasuringUnit, StockType } from "@/types/database/enums";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

interface PieceQuantitySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductListView | null;
  initialQuantity?: number;
  availableQuantity?: number; // Available stock quantity for outward
  onConfirm: (quantity: number) => void;
}

export function PieceQuantitySheet({
  open,
  onOpenChange,
  product,
  initialQuantity = 0,
  availableQuantity,
  onConfirm,
}: PieceQuantitySheetProps) {
  const availableQtyRounded = Math.floor(availableQuantity || 0);

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
    setQuantity((prev) => {
      const newValue = prev + 1;
      // Validate against available quantity
      if (availableQtyRounded !== undefined && newValue > availableQtyRounded) {
        return availableQtyRounded;
      }
      return newValue;
    });
  };

  const handleDecrement = () => {
    setQuantity((prev) => Math.max(0, prev - 1));
  };

  const handlePresetAdd = (amount: number) => {
    setQuantity((prev) => {
      const newValue = prev + amount;
      // Validate against available quantity
      if (availableQtyRounded !== undefined && newValue > availableQtyRounded) {
        return availableQtyRounded;
      }
      return newValue;
    });
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
  const productInfoText = getProductInfo(product);

  const formContent = (
    <div className="flex flex-col gap-4 p-4 md:px-0 overflow-x-hidden">
      <div className="flex gap-4">
        {/* Product Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <ImageWrapper
            size="md"
            shape="square"
            imageUrl={product.product_images?.[0]}
            alt={product.name}
            placeholderIcon={getProductIcon(product.stock_type as StockType)}
          />
          <div className="flex-1 min-w-0">
            <p
              title={product.name}
              className="text-base font-medium text-gray-700 truncate"
            >
              {product.name}
            </p>
            <p
              title={productInfoText}
              className="text-sm text-gray-500 truncate"
            >
              {productInfoText}
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
            >
              <IconMinus />
            </Button>
            <div className="relative">
              <Input
                type="number"
                value={quantity}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const value = Math.max(
                    0,
                    Math.round(parseFloat(e.target.value) || 0),
                  );
                  setQuantity(value);
                }}
                className="text-center text-lg font-medium max-w-25 pr-10"
                min="0"
                step="1"
                max={availableQtyRounded}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none">
                {pluralizedUnit}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleIncrement}
            >
              <IconPlus />
            </Button>
          </div>

          {/* Available Quantity Display */}
          {availableQtyRounded !== undefined && (
            <div className="text-center">
              <p className="text-sm text-gray-500">
                {availableQtyRounded}{" "}
                {pluralizeMeasuringUnitAbbreviation(
                  availableQtyRounded,
                  unitAbbreviation,
                )}{" "}
                available
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
      footer={footerButtons}
    >
      {formContent}
    </ResponsiveDialog>
  );
}
