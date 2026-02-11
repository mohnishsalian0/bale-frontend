"use client";

import { useMemo } from "react";
import {
  IconBox,
  IconPlus,
  IconTrash,
  IconTransferIn,
  IconTransform,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { StockStatusBadge } from "@/components/ui/stock-status-badge";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { getStockUnitInfo } from "@/lib/utils/product";
import {
  getMeasuringUnitAbbreviation,
  pluralizeMeasuringUnitAbbreviation,
} from "@/lib/utils/measuring-units";
import { getMovementNumber } from "@/lib/utils/stock-flow";
import { getConvertNumber } from "@/lib/utils/goods-convert";
import { useStockUnitsWithOrigin } from "@/lib/query/hooks/stock-units";
import type { ProductListView } from "@/types/products.types";
import type {
  MeasuringUnit,
  StockType,
  StockUnitStatus,
} from "@/types/database/enums";
import type {
  StockUnitWithOriginListView,
  ScannedStockUnit,
} from "@/types/stock-units.types";

interface StockUnitListStepProps {
  product: ProductListView;
  warehouseId: string;
  scannedUnits: ScannedStockUnit[];
  onStockUnitSelect: (stockUnitId: string) => void;
  onRemoveUnit: (stockUnitId: string) => void;
  fullQuantity?: boolean;
}

export function StockUnitListStep({
  product,
  warehouseId,
  scannedUnits,
  onStockUnitSelect,
  onRemoveUnit,
  fullQuantity = false,
}: StockUnitListStepProps) {
  // Fetch stock units for this product (available status only)
  const { data: stockUnitsResponse, isLoading } = useStockUnitsWithOrigin(
    warehouseId,
    { product_id: product.id, status: "available", non_empty: true },
    1,
    100, // Fetch up to 100 units
  );

  const stockUnits = stockUnitsResponse?.data || [];

  const unitAbbr = getMeasuringUnitAbbreviation(
    product.measuring_unit as MeasuringUnit,
  );

  // Group by origin (goods inward or goods convert), sorted by date
  const groupedUnits = useMemo(() => {
    const groups: Array<{
      id: string;
      type: "inward" | "convert";
      sequence_number: number;
      date: string;
      units: StockUnitWithOriginListView[];
    }> = [];
    const groupMap = new Map<
      string,
      {
        id: string;
        type: "inward" | "convert";
        sequence_number: number;
        date: string;
        units: StockUnitWithOriginListView[];
      }
    >();

    stockUnits.forEach((unit) => {
      if (unit.origin_type === "inward" && unit.goods_inward) {
        const key = `inward-${unit.origin_inward_id}`;
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            id: key,
            type: "inward",
            sequence_number: unit.goods_inward.sequence_number,
            date: unit.goods_inward.inward_date,
            units: [],
          });
        }
        groupMap.get(key)!.units.push(unit);
      } else if (unit.origin_type === "convert" && unit.goods_convert) {
        const key = `convert-${unit.origin_convert_id}`;
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            id: key,
            type: "convert",
            sequence_number: unit.goods_convert.sequence_number,
            date:
              unit.goods_convert.completion_date ||
              unit.goods_convert.start_date,
            units: [],
          });
        }
        groupMap.get(key)!.units.push(unit);
      }
    });

    // Convert to array and sort by date (newest first)
    groups.push(...Array.from(groupMap.values()));
    groups.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return groups;
  }, [stockUnits]);

  // Helper to find selected quantity for a stock unit
  const getSelectedQuantity = (stockUnitId: string): number | null => {
    const found = scannedUnits.find((su) => su.stockUnit.id === stockUnitId);
    return found ? found.quantity : null;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 shrink-0">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              Select stock unit
            </h3>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-gray-500">Loading stock units...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 shrink-0">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            Select stock unit
          </h3>
          <p className="text-sm text-gray-500 truncate">{product.name}</p>
        </div>
      </div>

      {/* Stock Units List */}
      <div className="flex-1 overflow-y-auto border-b border-border">
        {groupedUnits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <IconBox className="size-12 text-gray-500 mb-3" />
            <h3 className="text-lg font-medium text-gray-700 mb-1">
              No stock units found
            </h3>
            <p className="text-sm text-gray-500 text-center">
              No stock units available for this product
            </p>
          </div>
        ) : (
          groupedUnits.map((group) => {
            const groupLabel =
              group.type === "inward"
                ? getMovementNumber("inward", group.sequence_number)
                : getConvertNumber(group.sequence_number);

            const Icon =
              group.type === "inward" ? IconTransferIn : IconTransform;

            return (
              <div key={group.id} className="border-t border-gray-200">
                {/* Origin Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 bg-gray-100">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-700">
                      {groupLabel}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatAbsoluteDate(group.date)}
                  </span>
                </div>

                {/* Stock Units */}
                {group.units.map((unit) => {
                  let selectedQuantity = getSelectedQuantity(unit.id);
                  let maxQuantity = unit.remaining_quantity;
                  const stockType = product.stock_type as StockType;
                  if (stockType !== "roll" && selectedQuantity !== null) {
                    selectedQuantity = Math.floor(selectedQuantity);
                    maxQuantity = Math.floor(maxQuantity);
                  }

                  const pluralizedUnit = pluralizeMeasuringUnitAbbreviation(
                    selectedQuantity || maxQuantity,
                    unitAbbr,
                  );

                  return (
                    <div
                      className="p-4 border-t border-dashed border-gray-200"
                      key={unit.id}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-base font-medium text-gray-700">
                            <span>{unit.stock_number}</span>
                            <StockStatusBadge
                              status={unit.status as StockUnitStatus}
                            />
                          </div>

                          {/* Current Warehouse */}
                          <p className="text-sm text-gray-500 mt-1">
                            {unit.warehouse.name}
                          </p>
                        </div>

                        <div className="shrink-0 flex flex-col items-end gap-2">
                          {selectedQuantity !== null ? (
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => onStockUnitSelect(unit.id)}
                                disabled={fullQuantity}
                              >
                                {selectedQuantity} / {maxQuantity}{" "}
                                {pluralizedUnit}
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon-sm"
                                onClick={() => onRemoveUnit(unit.id)}
                              >
                                <IconTrash />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onStockUnitSelect(unit.id)}
                            >
                              <IconPlus />
                              Add
                            </Button>
                          )}
                          <span className="text-sm text-gray-500">
                            {maxQuantity} {unitAbbr}
                          </span>
                        </div>
                      </div>

                      {/* Additional Details */}
                      <p className="text-xs text-gray-500">
                        {getStockUnitInfo(unit)}
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
