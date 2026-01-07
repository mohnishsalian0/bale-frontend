"use client";

import { useState } from "react";
import { IconCurrencyRupee, IconMinus, IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import type { MeasuringUnit, StockType } from "@/types/database/enums";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { InputWrapper } from "@/components/ui/input-wrapper";

interface AdjustmentProductQuantitySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id: string;
    name: string;
    stock_type: StockType | null;
    measuring_unit: MeasuringUnit | null;
  };
  invoiceQuantity: number; // Quantity in the original invoice
  gstRate: number; // Original invoice GST rate
  initialQuantity?: number;
  initialRate?: number;
  onConfirm: (data: { quantity: number; rate: number }) => void;
}

export function AdjustmentProductQuantitySheet({
  open,
  onOpenChange,
  product,
  invoiceQuantity,
  gstRate,
  initialQuantity = 0,
  initialRate = 0,
  onConfirm,
}: AdjustmentProductQuantitySheetProps) {
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
    if (quantity > 0 && quantity <= invoiceQuantity && rate > 0) {
      onConfirm({ quantity, rate });
      onOpenChange(false);
    }
  };

  const handleIncrement = () => {
    setQuantity((prev) => Math.min(prev + 1, invoiceQuantity));
  };

  const handleDecrement = () => {
    setQuantity((prev) => Math.max(0, prev - 1));
  };

  const handlePresetAdd = (amount: number) => {
    setQuantity((prev) => Math.min(prev + amount, invoiceQuantity));
  };

  const handleQuantityChange = (value: string) => {
    let newQuantity = parseFloat(value) || 0;
    if (product?.stock_type === "roll") {
      newQuantity = Math.round(newQuantity * 100) / 100;
    } else {
      newQuantity = Math.round(newQuantity);
    }
    // Enforce max quantity limit
    setQuantity(Math.max(0, Math.min(newQuantity, invoiceQuantity)));
  };

  const handleRateChange = (value: string) => {
    const newRate = parseFloat(value) || 0;
    setRate(Math.max(0, Math.round(newRate * 100) / 100));
  };

  const unitAbbreviation = getMeasuringUnitAbbreviation(
    product.measuring_unit as MeasuringUnit | null,
  );

  // Calculate line total and tax
  const lineTotal = quantity * rate;
  const taxAmount = (lineTotal * gstRate) / 100;
  const grandTotal = lineTotal + taxAmount;

  const presetAmounts = [5, 10, 25, 50, 100, 250];

  const formContent = (
    <div className="flex flex-col gap-6 md:px-0 overflow-x-hidden">
      {/* Quantity Input */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-1 items-end gap-2">
          <InputWrapper
            type="number"
            value={quantity}
            label={`Quantity (${invoiceQuantity} ${unitAbbreviation} in invoice)`}
            rightText={unitAbbreviation}
            min="0"
            max={invoiceQuantity}
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
            disabled={quantity >= invoiceQuantity}
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
              disabled={quantity + amount > invoiceQuantity}
            >
              <IconPlus />
              {amount}
            </Button>
          ))}
        </div>

        {/* Validation message */}
        {quantity > invoiceQuantity && (
          <p className="text-xs text-red-600">
            Quantity cannot exceed invoice quantity of {invoiceQuantity}{" "}
            {unitAbbreviation}
          </p>
        )}
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
          {gstRate > 0 && (
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
        disabled={quantity <= 0 || quantity > invoiceQuantity || rate <= 0}
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
      title="Adjust quantity"
      description={product.name}
      footer={footerButtons}
    >
      {formContent}
    </ResponsiveDialog>
  );
}
