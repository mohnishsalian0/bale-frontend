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
import { InputWrapper } from "@/components/ui/input-wrapper";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DatePicker } from "@/components/ui/date-picker";
import MultipleSelector from "@/components/ui/multiple-selector";
import type { ProductListView } from "@/types/products.types";
import type { MeasuringUnit, StockType } from "@/types/database/enums";
import type { StockUnitSpec } from "@/app/(protected)/warehouse/[warehouse_slug]/goods-inward/ProductSelectionStep";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import {
  createStockUnitSchema,
  StockUnitFormData,
} from "@/lib/validations/stock-unit";
import { useAttributes } from "@/lib/query/hooks/attributes";

interface StockUnitFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Pick<
    ProductListView,
    "name" | "measuring_unit" | "stock_type"
  > | null;
  initialUnit?: Partial<StockUnitSpec>;
  onConfirm: (unit: Omit<StockUnitSpec, "id">) => void;
  enableWastage?: boolean; // Show wastage fields (for convert output)
}

export function StockUnitFormSheet({
  open,
  onOpenChange,
  product,
  initialUnit,
  onConfirm,
  enableWastage = false,
}: StockUnitFormSheetProps) {
  // Fetch lot numbers
  const { data: lotNumbers = [] } = useAttributes("lot_number");

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
      stock_number: initialUnit?.stock_number || "",
      lot_number: initialUnit?.lot_number || "",
      grade: initialUnit?.grade || "",
      manufactured_on: undefined,
      location: initialUnit?.location || "",
      notes: initialUnit?.notes || "",
      wastage_quantity: initialUnit?.wastage_quantity || 0,
      wastage_reason: initialUnit?.wastage_reason || "",
    },
  });

  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [showWastage, setShowWastage] = useState(false);
  const quantity = useWatch({ control, name: "quantity" });

  // Early return after hooks
  if (!product) return null;

  const handleCancel = () => {
    // Reset form
    reset();
    setShowAdditionalDetails(false);
    setShowWastage(false);
    onOpenChange(false);
  };

  const onSubmit = (data: StockUnitFormData) => {
    onConfirm({
      quantity: data.quantity,
      grade: data.grade || undefined,
      stock_number: data.stock_number || undefined,
      lot_number: data.lot_number || undefined,
      manufactured_on: data.manufactured_on || undefined,
      location: data.location || undefined,
      notes: data.notes || undefined,
      wastage_quantity: enableWastage ? data.wastage_quantity : undefined,
      wastage_reason: enableWastage ? data.wastage_reason : undefined,
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

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add stock unit"
      description={product.name}
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
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col gap-4">
          <div className="flex gap-4">
            {/* Quantity Input */}
            <div className="flex flex-1 items-end gap-2 shrink-0">
              <InputWrapper
                type="number"
                label="Quantity"
                rightText={unitAbbreviation}
                min="0"
                step={product.stock_type === "roll" ? "0.1" : "1"}
                placeholder={product.stock_type === "roll" ? "0.0" : "0"}
                value={quantity}
                className="flex-1"
                {...register("quantity", { valueAsNumber: true })}
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
          {/* Stock Number - Full Width */}
          <InputWrapper
            type="text"
            placeholder="Stock number"
            {...register("stock_number")}
            icon={<IconHash />}
          />

          {/* Lot Number - Full Width */}
          <div className="flex flex-col gap-2">
            <Controller
              name="lot_number"
              control={control}
              render={({ field }) => (
                <MultipleSelector
                  value={
                    field.value
                      ? [{ value: field.value, label: field.value }]
                      : []
                  }
                  onChange={(options) => {
                    field.onChange(options[0]?.value || "");
                  }}
                  options={lotNumbers.map((lot) => ({
                    value: lot.name,
                    label: lot.name,
                  }))}
                  placeholder="Lot number"
                  maxSelected={1}
                  creatable
                  triggerSearchOnFocus
                  hidePlaceholderWhenSelected
                  emptyIndicator={
                    <p className="text-center text-sm text-gray-500">
                      No lot numbers found
                    </p>
                  }
                />
              )}
            />
          </div>

          <div className="flex gap-4">
            {/* Quality - Input with Icon */}
            <InputWrapper
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
          <InputWrapper
            type="text"
            placeholder="Location"
            {...register("location")}
            icon={<IconTruckLoading />}
          />
        </div>

        {/* Wastage Section - Only shown when enableWastage is true */}
        {enableWastage && (
          <Collapsible open={showWastage} onOpenChange={setShowWastage}>
            <CollapsibleTrigger
              className={`flex items-center justify-between w-full ${showWastage ? "pb-3" : "pb-0"}`}
            >
              <h3 className="font-medium text-gray-900">Wastage</h3>
              <IconChevronDown
                className={`size-5 text-gray-500 transition-transform ${showWastage ? "rotate-180" : "rotate-0"}`}
              />
            </CollapsibleTrigger>

            <CollapsibleContent className="flex flex-col gap-4">
              <InputWrapper
                type="number"
                rightText={unitAbbreviation}
                min="0"
                step={product.stock_type === "roll" ? "0.1" : "1"}
                placeholder={
                  product.stock_type === "roll" ? "0.0 wastage" : "0 wastage"
                }
                {...register("wastage_quantity", { valueAsNumber: true })}
              />
              <Textarea
                placeholder="Wastage reason"
                {...register("wastage_reason")}
                className="min-h-24"
              />
            </CollapsibleContent>
          </Collapsible>
        )}

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
