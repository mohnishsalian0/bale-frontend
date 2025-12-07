"use client";

import { useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  createStockUnitSchema,
  StockUnitFormData,
} from "@/lib/validations/stock-unit";

interface StockUnitFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductListView | null;
  initialUnit?: Partial<StockUnitSpec>;
  onConfirm: (unit: Omit<StockUnitSpec, "id">) => void;
}

export function StockUnitFormSheet({
  open,
  onOpenChange,
  product,
  initialUnit,
  onConfirm,
}: StockUnitFormSheetProps) {
  // Create validation schema based on product stock type
  const stockUnitSchema = createStockUnitSchema(
    (product?.stock_type as StockType) || "roll",
  );

  // Initialize form with React Hook Form
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    control,
  } = useForm({
    resolver: zodResolver(stockUnitSchema),
    defaultValues: {
      quantity: initialUnit?.quantity || 0,
      supplier_number: initialUnit?.supplier_number || "",
      grade: initialUnit?.grade || "",
      manufactured_on: undefined,
      location: initialUnit?.location || "",
      notes: initialUnit?.notes || "",
    },
  });

  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const quantity = useWatch({ control, name: "quantity" });

  // Early return after hooks
  if (!product) return null;

  const handleCancel = () => {
    // Reset form
    reset();
    setShowAdditionalDetails(false);
    onOpenChange(false);
  };

  const onSubmit = (data: StockUnitFormData) => {
    onConfirm({
      quantity: data.quantity,
      grade: data.grade || undefined,
      supplier_number: data.supplier_number || undefined,
      manufactured_on: data.manufactured_on || undefined,
      location: data.location || undefined,
      notes: data.notes || undefined,
      count: initialUnit?.count || 1,
    });
    handleCancel();
  };

  const handleIncrement = () => {
    setValue("quantity", quantity + 1);
  };

  const handleDecrement = () => {
    setValue("quantity", Math.max(0, quantity - 1));
  };

  const handlePresetAdd = (amount: number) => {
    setValue("quantity", quantity + amount);
  };

  const presetAmounts = [5, 10, 25, 50, 100, 250];

  const unitAbbreviation = getMeasuringUnitAbbreviation(
    product.measuring_unit as MeasuringUnit | null,
  );

  const productInfoText = getProductInfo(product);

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Stock unit"
      footer={
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
            type="submit"
            form="stock-unit-form"
            disabled={quantity <= 0}
            className="flex-1"
          >
            Add
          </Button>
        </div>
      }
    >
      <form
        id="stock-unit-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-8 p-4 md:px-0 overflow-x-hidden"
      >
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            {/* Product Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <ImageWrapper
                size="md"
                shape="square"
                imageUrl={product.product_images?.[0]}
                alt={product.name}
                placeholderIcon={getProductIcon(
                  product.stock_type as StockType,
                )}
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
                  {...register("quantity", { valueAsNumber: true })}
                  className="text-center font-medium max-w-25 pr-10"
                  min="0"
                  step={product.stock_type === "roll" ? "0.1" : "1"}
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

          {/* Quantity validation error */}
          {errors.quantity && (
            <p className="text-sm text-red-600">{errors.quantity.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {/* Supplier Number - Full Width */}
          <InputWithIcon
            type="text"
            placeholder="Supplier number"
            {...register("supplier_number")}
            icon={<IconHash />}
          />

          <div className="flex gap-4">
            {/* Quality - Input with Icon */}
            <InputWithIcon
              type="text"
              placeholder="Quality"
              {...register("grade")}
              className="flex-1"
              icon={<IconRubberStamp />}
            />

            {/* Manufactured On - DatePicker */}
            <Controller
              name="manufactured_on"
              control={control}
              render={({ field }) => (
                <DatePicker
                  placeholder="Manufactured on"
                  value={field.value ?? undefined}
                  onChange={field.onChange}
                  className="flex-1"
                />
              )}
            />
          </div>

          {/* Location - Full Width */}
          <InputWithIcon
            type="text"
            placeholder="Location"
            {...register("location")}
            icon={<IconTruckLoading />}
          />
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
              {...register("notes")}
              className="min-h-32"
            />
          </CollapsibleContent>
        </Collapsible>
      </form>
    </ResponsiveDialog>
  );
}
