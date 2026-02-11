"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconRubberStamp,
  IconTruckLoading,
  IconHash,
  IconChevronDown,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { InputWrapper } from "@/components/ui/input-wrapper";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import MultipleSelector from "@/components/ui/multiple-selector";
import {
  updateStockUnitSchema,
  type StockUnitUpdateFormData,
} from "@/lib/validations/stock-unit";
import type { StockUnitWithProductDetailView } from "@/types/stock-units.types";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import type { MeasuringUnit } from "@/types/database/enums";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import { useAttributes } from "@/lib/query/hooks/attributes";

interface StockUnitEditFormProps {
  stockUnit: StockUnitWithProductDetailView;
  onCancel: () => void;
  onSave: (data: StockUnitUpdateFormData) => void;
}

export function StockUnitEditForm({
  stockUnit,
  onCancel,
  onSave,
}: StockUnitEditFormProps) {
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);

  // Fetch lot numbers
  const { data: lotNumbers = [] } = useAttributes("lot_number");

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm({
    resolver: zodResolver(updateStockUnitSchema),
    defaultValues: {
      stock_number: stockUnit.stock_number || "",
      lot_number: stockUnit.lot_number?.name || "",
      grade: stockUnit.quality_grade || "",
      manufactured_on: stockUnit.manufacturing_date
        ? new Date(stockUnit.manufacturing_date)
        : undefined,
      location: stockUnit.warehouse_location || "",
      notes: stockUnit.notes || "",
    },
  });

  const product = stockUnit.product;
  const unitAbbr = product?.measuring_unit
    ? getMeasuringUnitAbbreviation(product.measuring_unit as MeasuringUnit)
    : "units";

  const onSubmit = (data: StockUnitUpdateFormData) => {
    onSave(data);
  };

  return (
    <>
      {/* Content */}
      <form
        id="stock-unit-edit-form"
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-6 overflow-y-auto"
      >
        <h2 className="text-lg font-semibold">Edit stock unit</h2>

        {/* Read-only Quantity Display */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            Quantity (Read-only)
          </label>
          <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
            <span className="text-sm text-gray-500">
              {stockUnit.remaining_quantity} / {stockUnit.initial_quantity}{" "}
              {unitAbbr}
            </span>
            {stockUnit.has_outward && (
              <span className="text-xs text-gray-400">
                (Has outward history)
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            Use adjustments to modify quantity after creation
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Stock Number - Full Width */}
          <InputWrapper
            type="text"
            placeholder="Stock number"
            {...register("stock_number")}
            icon={<IconHash />}
            isError={!!errors.stock_number?.message}
            errorText={errors.stock_number?.message}
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
                  defaultOptions={lotNumbers.map((lot) => ({
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
              isError={!!errors.grade?.message}
              errorText={errors.grade?.message}
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
            isError={!!errors.location?.message}
            errorText={errors.location?.message}
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
        <Button type="submit" form="stock-unit-edit-form" className="flex-1">
          Save
        </Button>
      </div>
    </>
  );
}
