"use client";

import { useState } from "react";
import {
  IconMinus,
  IconPlus,
  IconChevronDown,
  IconRubberStamp,
  IconTruckLoading,
  IconHash,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DatePicker } from "@/components/ui/date-picker";
import ImageWrapper from "@/components/ui/image-wrapper";
import { getProductIcon, getProductInfo } from "@/lib/utils/product";
import type { ProductListView } from "@/types/products.types";
import type { MeasuringUnit, StockType } from "@/types/database/enums";
import type { StockUnitSpec } from "./ProductSelectionStep";
import { Input } from "@/components/ui/input";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";

interface StockUnitFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductListView | null;
  initialUnit?: Partial<StockUnitSpec>;
  onConfirm: (unit: Omit<StockUnitSpec, "id">) => void;
}

interface StockUnitFormData {
  quantity: number;
  manufacturedOn: Date | undefined;
  quality: string;
  supplierNumber: string;
  location: string;
  notes: string;
}

export function StockUnitFormSheet({
  open,
  onOpenChange,
  product,
  initialUnit,
  onConfirm,
}: StockUnitFormSheetProps) {
  const [formData, setFormData] = useState<StockUnitFormData>({
    quantity: initialUnit?.quantity || 0,
    manufacturedOn: undefined,
    quality: initialUnit?.grade || "",
    supplierNumber: initialUnit?.supplier_number || "",
    location: initialUnit?.location || "",
    notes: initialUnit?.notes || "",
  });

  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);

  const handleCancel = () => {
    // Reset form
    setFormData({
      quantity: 0,
      manufacturedOn: undefined,
      quality: "",
      supplierNumber: "",
      location: "",
      notes: "",
    });
    setShowAdditionalDetails(false);
    onOpenChange(false);
  };

  const handleConfirm = () => {
    if (formData.quantity > 0) {
      onConfirm({
        quantity: formData.quantity,
        grade: formData.quality,
        supplier_number: formData.supplierNumber || undefined,
        location: formData.location || undefined,
        notes: formData.notes || undefined,
        count: initialUnit?.count || 1,
      });
      handleCancel();
    }
  };

  const handleIncrement = () => {
    setFormData((prev) => ({ ...prev, quantity: prev.quantity + 1 }));
  };

  const handleDecrement = () => {
    setFormData((prev) => ({
      ...prev,
      quantity: Math.max(0, prev.quantity - 1),
    }));
  };

  const handlePresetAdd = (amount: number) => {
    setFormData((prev) => ({ ...prev, quantity: prev.quantity + amount }));
  };

  const presetAmounts = [5, 10, 25, 50, 100, 250];

  if (!product) return null;

  const unitAbbreviation = getMeasuringUnitAbbreviation(
    product.measuring_unit as MeasuringUnit | null,
  );

  const productInfoText = getProductInfo(product);

  const formContent = (
    <div className="flex flex-col gap-8 p-4 md:px-0 overflow-x-hidden">
      <div className="flex flex-col gap-4">
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
                className="text-xs text-gray-500 truncate"
              >
                {productInfoText}
              </p>
            </div>
          </div>

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
                value={formData.quantity}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    quantity: Math.max(0, parseFloat(e.target.value) || 0),
                  }))
                }
                className="text-center text-lg font-medium max-w-25 pr-10"
                min="0"
                step="0.01"
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
            >
              <IconPlus />
            </Button>
          </div>
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

      <div className="flex flex-col gap-4">
        <div className="flex gap-4">
          {/* Supplier Number - Input with Icon */}
          <InputWithIcon
            type="text"
            placeholder="Supplier number"
            value={formData.supplierNumber}
            className="flex-1"
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                supplierNumber: e.target.value,
              }))
            }
            icon={<IconHash />}
          />

          {/* Manufactured On - DatePicker */}
          <DatePicker
            placeholder="Manufactured on"
            value={formData.manufacturedOn}
            className="flex-1"
            onChange={(date) =>
              setFormData((prev) => ({ ...prev, manufacturedOn: date }))
            }
          />
        </div>

        <div className="flex gap-4">
          {/* Quality - Input with Icon */}
          <InputWithIcon
            type="text"
            placeholder="Quality"
            value={formData.quality}
            className="flex-1"
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, quality: e.target.value }))
            }
            icon={<IconRubberStamp />}
          />

          {/* Location - Input with Icon */}
          <InputWithIcon
            type="text"
            placeholder="Location"
            value={formData.location}
            className="flex-1"
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, location: e.target.value }))
            }
            icon={<IconTruckLoading />}
          />
        </div>
      </div>

      {/* Additional Details */}
      <Collapsible
        open={showAdditionalDetails}
        onOpenChange={setShowAdditionalDetails}
      >
        <CollapsibleTrigger
          className={`flex items-center justify-between w-full ${showAdditionalDetails ? "pb-3" : "pb-0"}`}
        >
          <h3 className="font-medium text-gray-900">Additional Details</h3>
          <IconChevronDown
            className={`size-5 text-gray-500 transition-transform ${showAdditionalDetails ? "rotate-180" : "rotate-0"}`}
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <Textarea
            placeholder="Enter a note..."
            value={formData.notes}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, notes: e.target.value }))
            }
            className="min-h-32"
          />
        </CollapsibleContent>
      </Collapsible>
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
        disabled={formData.quantity <= 0}
        className="flex-1"
      >
        Add
      </Button>
    </div>
  );

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Stock unit"
      footer={footerButtons}
    >
      {formContent}
    </ResponsiveDialog>
  );
}
