"use client";

import { useMemo } from "react";
import { IconBox } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { StockStatusBadge } from "@/components/ui/stock-status-badge";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { formatStockUnitNumber } from "@/lib/utils/product";
import {
  getMeasuringUnitAbbreviation,
  pluralizeMeasuringUnitAbbreviation,
} from "@/lib/utils/measuring-units";
import { useStockUnitsWithInward } from "@/lib/query/hooks/stock-units";
import type { ProductListView } from "@/types/products.types";
import type {
  MeasuringUnit,
  StockType,
  StockUnitStatus,
} from "@/types/database/enums";
import type { StockUnitWithInwardListView } from "@/types/stock-units.types";
import type { InwardWithPartnerListView } from "@/types/stock-flow.types";
import type { ScannedStockUnit } from "./QRScannerStep";

interface StockUnitListStepProps {
  product: ProductListView;
  warehouseId: string;
  scannedUnits: ScannedStockUnit[];
  onStockUnitSelect: (stockUnitId: string) => void;
  onBack: () => void;
}

export function StockUnitListStep({
  product,
  warehouseId,
  scannedUnits,
  onStockUnitSelect,
  onBack,
}: StockUnitListStepProps) {
  // Fetch stock units for this product (no status filter)
  const { data: stockUnitsResponse, isLoading } = useStockUnitsWithInward(
    warehouseId,
    { product_id: product.id, status: ["full", "partial"] },
    1,
    100, // Fetch up to 100 units
  );

  const stockUnits = stockUnitsResponse?.data || [];

  const unitAbbr = getMeasuringUnitAbbreviation(
    product.measuring_unit as MeasuringUnit,
  );

  // Group by goods inward
  const groupedUnits = useMemo(() => {
    const groups: Map<
      string,
      {
        inward: InwardWithPartnerListView;
        units: StockUnitWithInwardListView[];
      }
    > = new Map();

    stockUnits.forEach((unit) => {
      if (!unit.goods_inward) return;

      const key = unit.created_from_inward_id || "unknown";
      if (!groups.has(key)) {
        groups.set(key, {
          inward: unit.goods_inward,
          units: [],
        });
      }
      groups.get(key)!.units.push(unit);
    });

    return Array.from(groups.values());
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

        {/* Footer */}
        <div className="px-4 py-4 border-t border-gray-200 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="w-full"
          >
            Back
          </Button>
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
      <div className="flex-1 overflow-y-auto">
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
          groupedUnits.map((group) => (
            <div key={group.inward.id} className="border-t border-gray-200">
              {/* Inward Header */}
              <div className="flex items-center justify-between px-4 py-2 bg-gray-100">
                <span className="text-sm font-semibold text-gray-700">
                  GI-{group.inward.sequence_number}
                </span>
                <span className="text-xs text-gray-500">
                  {formatAbsoluteDate(group.inward.inward_date)}
                </span>
              </div>

              {/* Stock Units */}
              {group.units.map((unit) => {
                const selectedQuantity = getSelectedQuantity(unit.id);
                let maxQuantity = unit.remaining_quantity;
                const stockType = product.stock_type as StockType;
                if (stockType !== "roll") {
                  maxQuantity = Math.floor(maxQuantity);
                }

                const pluralizedUnit = pluralizeMeasuringUnitAbbreviation(
                  selectedQuantity || maxQuantity,
                  unitAbbr,
                );

                return (
                  <div
                    key={unit.id}
                    onClick={() => onStockUnitSelect(unit.id)}
                    className="flex items-start justify-between gap-4 px-4 py-4 border-t border-dashed border-gray-200 hover:bg-gray-50 transition-colors w-full cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-base font-medium text-gray-700">
                        <span>
                          {formatStockUnitNumber(
                            unit.sequence_number,
                            stockType,
                          )}
                        </span>
                        <StockStatusBadge
                          status={unit.status as StockUnitStatus}
                        />
                      </div>

                      {/* Additional Details */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
                        {unit.quality_grade && (
                          <span>Grade: {unit.quality_grade}</span>
                        )}
                        {unit.supplier_number && (
                          <span>Supplier #: {unit.supplier_number}</span>
                        )}
                        {unit.warehouse_location && (
                          <span>Location: {unit.warehouse_location}</span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {selectedQuantity !== null ? (
                        <Button
                          type="button"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStockUnitSelect(unit.id);
                          }}
                        >
                          {selectedQuantity} / {maxQuantity} {pluralizedUnit}
                        </Button>
                      ) : (
                        <span className="text-sm font-semibold text-gray-700">
                          {maxQuantity} {unitAbbr}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-200 shrink-0">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="w-full"
        >
          Back
        </Button>
      </div>
    </div>
  );
}
