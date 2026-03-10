"use client";

import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconMinus, IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { InputWrapper } from "@/components/ui/input-wrapper";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  stockUnitAdjustmentSchema,
  type StockUnitAdjustmentFormData,
} from "@/lib/validations/stock-unit-adjustment";
import type { StockUnitWithProductDetailView } from "@/types/stock-units.types";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import type { MeasuringUnit } from "@/types/database/enums";

interface StockUnitAdjustmentFormProps {
  stockUnit: StockUnitWithProductDetailView;
  onCancel: () => void;
  onSave: (data: StockUnitAdjustmentFormData) => void;
}

export function StockUnitAdjustmentForm({
  stockUnit,
  onCancel,
  onSave,
}: StockUnitAdjustmentFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    setValue,
  } = useForm<StockUnitAdjustmentFormData>({
    resolver: zodResolver(stockUnitAdjustmentSchema),
    defaultValues: {
      quantity_adjusted: 0,
      adjustment_date: new Date(),
      reason: "",
    },
  });

  const quantity = useWatch({ control, name: "quantity_adjusted" });

  const product = stockUnit.product;
  const unitAbbr = product?.measuring_unit
    ? getMeasuringUnitAbbreviation(product.measuring_unit as MeasuringUnit)
    : "units";

  const isRoll = product?.stock_type === "roll";
  const step = isRoll ? "0.1" : "1";

  const handleIncrement = () => {
    setValue("quantity_adjusted", quantity + 1);
  };

  const handleDecrement = () => {
    setValue("quantity_adjusted", quantity - 1);
  };

  const onSubmit = (data: StockUnitAdjustmentFormData) => {
    onSave(data);
  };

  // Validation for wastage
  const maxWastage = stockUnit.remaining_quantity;
  const isInvalidWastage = quantity < 0 && Math.abs(quantity) > maxWastage;
  console.log(isInvalidWastage);

  return (
    <>
      {/* Content */}
      <form
        id="stock-unit-adjustment-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-6 overflow-y-auto"
      >
        <h2 className="text-lg font-semibold">Create adjustment</h2>

        {/* Quantity Input */}
        <div className="flex gap-4">
          <div className="flex flex-1 items-center gap-2 shrink-0">
            <InputWrapper
              type="number"
              label="Adjustment Quantity"
              rightText={unitAbbr}
              step={step}
              placeholder={isRoll ? "0.0" : "0"}
              helpText={`Current: ${stockUnit.remaining_quantity} ${unitAbbr}`}
              {...register("quantity_adjusted", { valueAsNumber: true })}
              className="flex-1"
              isError={!!errors.quantity_adjusted?.message || isInvalidWastage}
              errorText={
                errors.quantity_adjusted?.message ||
                (isInvalidWastage
                  ? `Cannot waste more than ${maxWastage} ${unitAbbr}`
                  : undefined)
              }
              onFocus={(e) => e.target.select()}
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

        {/* Adjustment Date */}
        <Controller
          name="adjustment_date"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Adjustment Date"
              placeholder="Select date"
              value={field.value ?? undefined}
              onChange={field.onChange}
            />
          )}
        />

        {/* Reason */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            Reason <span className="text-red-600">*</span>
          </label>
          <Textarea
            placeholder="Enter reason for adjustment..."
            {...register("reason")}
            className="min-h-24"
          />
          {errors.reason && (
            <p className="text-sm text-red-600">{errors.reason.message}</p>
          )}
        </div>
      </form>

      {/* Action Buttons */}
      <div className="flex gap-3 w-full py-4 md:pb-0">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form="stock-unit-adjustment-form"
          disabled={quantity === 0 || isInvalidWastage}
          className="flex-1"
        >
          Save Adjustment
        </Button>
      </div>
    </>
  );
}
