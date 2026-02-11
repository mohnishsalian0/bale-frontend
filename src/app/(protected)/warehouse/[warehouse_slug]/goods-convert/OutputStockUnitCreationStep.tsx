"use client";

import {
  IconMinus,
  IconPlus,
  IconTrash,
  IconPackage,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StockUnitSpec } from "../goods-inward/ProductSelectionStep";
import type { ProductListView } from "@/types/products.types";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import type { MeasuringUnit } from "@/types/database/enums";

interface OutputStockUnitCreationStepProps {
  outputProduct: Pick<
    ProductListView,
    "name" | "measuring_unit" | "stock_type"
  >;
  outputUnits: StockUnitSpec[];
  onIncrementUnit: (unitId: string) => void;
  onDecrementUnit: (unitId: string) => void;
  onUpdateUnitCount: (unitId: string, count: number) => void;
  onDeleteUnit: (unitId: string) => void;
  onAddNewUnit: () => void;
  onEditUnit: (unitId: string) => void;
}

export function OutputStockUnitCreationStep({
  outputProduct,
  outputUnits,
  onIncrementUnit,
  onDecrementUnit,
  onUpdateUnitCount,
  onDeleteUnit,
  onAddNewUnit,
  onEditUnit,
}: OutputStockUnitCreationStepProps) {
  const unitAbbr = getMeasuringUnitAbbreviation(
    outputProduct.measuring_unit as MeasuringUnit,
  );

  // Format date as DD/MM/YY
  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  const today = formatDate(new Date());

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Add output stock units
          </h3>
          <p className="text-sm text-gray-500">{outputProduct.name}</p>
        </div>
        <Button type="button" variant="outline" onClick={onAddNewUnit}>
          <IconPlus />
          Add new {outputProduct.stock_type}
        </Button>
      </div>

      {/* Units List - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {outputUnits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <IconPackage className="size-12 text-gray-500 mb-3" />
            <h3 className="text-lg font-medium text-gray-700 mb-1">
              No output units added
            </h3>
            <p className="text-sm text-gray-500 text-center">
              Add output stock units to complete the conversion
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {outputUnits.map((unit) => {
              // Build details line
              const details: string[] = [];
              if (unit.quantity) details.push(`${unit.quantity}${unitAbbr}`);
              if (unit.grade) details.push(unit.grade);
              if (unit.lot_number) details.push(unit.lot_number);
              if (unit.stock_number) details.push(`#${unit.stock_number}`);
              if (unit.wastage_quantity && unit.wastage_quantity > 0) {
                details.push(`Wastage: ${unit.wastage_quantity}${unitAbbr}`);
              }

              return (
                <div
                  key={unit.id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-border cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => onEditUnit(unit.id)}
                >
                  {/* Unit Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 mb-0.5">
                      {details.join(" • ")}
                    </p>
                    <p className="text-xs text-gray-500">{today}</p>
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Decrement/Delete */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        unit.count === 1
                          ? onDeleteUnit(unit.id)
                          : onDecrementUnit(unit.id)
                      }
                      className={
                        unit.count === 1
                          ? "text-red-600 hover:text-red-700 hover:bg-red-50"
                          : ""
                      }
                    >
                      {unit.count === 1 ? <IconTrash /> : <IconMinus />}
                    </Button>

                    {/* Count */}
                    <Input
                      type="number"
                      value={unit.count}
                      onChange={(e) =>
                        onUpdateUnitCount(
                          unit.id,
                          Math.max(1, parseInt(e.target.value) || 1),
                        )
                      }
                      className="text-center h-9 w-16"
                      min="1"
                    />

                    {/* Increment */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onIncrementUnit(unit.id)}
                    >
                      <IconPlus />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
