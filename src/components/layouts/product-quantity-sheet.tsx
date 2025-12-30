"use client";

import { useState } from "react";
import { IconCurrencyRupee, IconMinus, IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import type { ProductWithInventoryListView } from "@/types/products.types";
import type { MeasuringUnit } from "@/types/database/enums";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { InputWrapper } from "../ui/input-wrapper";

interface ProductQuantitySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductWithInventoryListView | null;
  initialQuantity?: number;
  initialRate?: number;
  onConfirm: (data: { quantity: number; rate: number }) => void;
}

export function ProductQuantitySheet({
  open,
  onOpenChange,
  product,
  initialQuantity = 0,
  initialRate = 0,
  onConfirm,
}: ProductQuantitySheetProps) {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [rate, setRate] = useState(initialRate);

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenChange(false);
  };

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (quantity > 0 && rate > 0) {
      onConfirm({ quantity, rate });
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

  const handleQuantityChange = (value: string) => {
    let quantity = parseFloat(value) || 0;
    if (product?.stock_type === "roll") {
      quantity = Math.round(quantity * 100) / 100;
    } else {
      quantity = Math.round(quantity);
    }
    setQuantity(Math.max(0, quantity));
  };

  const handleRateChange = (value: string) => {
    const rate = parseFloat(value) || 0;
    setRate(Math.max(0, Math.round(rate * 100) / 100));
  };

  const presetAmounts = [5, 10, 25, 50, 100, 250];

  if (!product) return null;

  const unitAbbreviation = getMeasuringUnitAbbreviation(
    product.measuring_unit as MeasuringUnit | null,
  );

  // Calculate line total and tax
  const lineTotal = quantity * rate;
  const hasTax = product.tax_type === "gst";
  const gstRate = product.gst_rate || 0;
  const taxAmount = hasTax ? (lineTotal * gstRate) / 100 : 0;
  const grandTotal = lineTotal + taxAmount;

  const formContent = (
    <div className="flex flex-col gap-6 md:px-0 overflow-x-hidden">
      {/* Quantity Input */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-1 items-end gap-2">
          <InputWrapper
            type="number"
            value={quantity}
            label={`Quantity (${product.inventory.in_stock_quantity} ${unitAbbreviation} avail.)`}
            rightText={unitAbbreviation}
            min="0"
            step={product.stock_type === "roll" ? "0.1" : "1"}
            placeholder={product.stock_type === "roll" ? "0.0" : "0"}
            onFocus={(e) => e.target.select()}
            onChange={(e) => handleQuantityChange(e.target.value)}
            className="flex-1"
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

        {/* Preset size options */}
        <div className="flex flex-wrap items-center gap-2">
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

      {/* Rate Input */}
      <InputWrapper
        type="number"
        value={rate}
        label={`Rate per ${unitAbbreviation}`}
        icon={<IconCurrencyRupee />}
        min="0"
        step="1"
        placeholder="0.00"
        onChange={(e) => handleRateChange(e.target.value)}
      />

      {/* Totals Summary */}
      {quantity > 0 && rate > 0 && (
        <div className="flex flex-col gap-2 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium">₹{lineTotal.toFixed(2)}</span>
          </div>
          {hasTax && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>GST ({gstRate}%)</span>
              <span className="font-medium">₹{taxAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-semibold border-t pt-2">
            <span>Total</span>
            <span>₹{grandTotal.toFixed(2)}</span>
          </div>
        </div>
      )}
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
        disabled={quantity <= 0 || rate <= 0}
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
      title="Add product"
      description={product.name}
      footer={footerButtons}
    >
      {formContent}
    </ResponsiveDialog>
  );
}
