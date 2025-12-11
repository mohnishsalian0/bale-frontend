"use client";

import { useState, useMemo, Fragment } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatRelativeDate } from "@/lib/utils/date";
import { formatStockUnitNumber } from "@/lib/utils/product";
import type { StockType } from "@/types/database/enums";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useSession } from "@/contexts/session-context";
import { useStockUnitsWithInward } from "@/lib/query/hooks/stock-units";
import { StockUnitWithProductListView } from "@/types/stock-units.types";
import { InwardWithPartnerListView } from "@/types/stock-flow.types";
import { LoadingState } from "@/components/layouts/loading-state";

interface GoodsInward extends InwardWithPartnerListView {
  stock_units: StockUnitWithProductListView[];
}

interface QRStockUnitSelectionStepProps {
  productId: string;
  selectedStockUnitIds: string[];
  onSelectionChange: (stockUnitIds: string[]) => void;
}

export function QRStockUnitSelectionStep({
  productId,
  selectedStockUnitIds,
  onSelectionChange,
}: QRStockUnitSelectionStepProps) {
  const { warehouse } = useSession();

  // Fetch stock units using TanStack Query
  const { data: stockUnitsResponse, isLoading: loading } =
    useStockUnitsWithInward(warehouse.id, {
      product_id: productId,
      status: ["full", "partial"],
    });

  const stockUnitsData = stockUnitsResponse?.data || [];

  // Group stock units by goods inward
  const goodsInwards: GoodsInward[] = useMemo(() => {
    // Group stock units by goods inward
    const inwardMap = new Map<string | null, StockUnitWithProductListView[]>();
    stockUnitsData.forEach((unit) => {
      const inwardId = unit.created_from_inward_id;
      if (!inwardMap.has(inwardId)) {
        inwardMap.set(inwardId, []);
      }
      inwardMap.get(inwardId)!.push(unit);
    });

    // Get unique inward data from stock units
    const inwardDataMap = new Map<string, InwardWithPartnerListView>();
    stockUnitsData.forEach((unit) => {
      if (unit.created_from_inward_id && unit.goods_inward) {
        inwardDataMap.set(unit.created_from_inward_id, unit.goods_inward);
      }
    });

    // Combine goods inwards with their stock units
    const groupedInwards: GoodsInward[] = [];
    Array.from(inwardMap.keys()).forEach((inwardId) => {
      if (inwardId === null) return; // Handle orphans separately
      const inwardData = inwardDataMap.get(inwardId);
      if (inwardData) {
        groupedInwards.push({
          ...inwardData,
          stock_units: inwardMap.get(inwardId) || [],
        });
      }
    });

    // Handle units without goods inward (if any)
    const orphanedUnits = inwardMap.get(null) || [];
    if (orphanedUnits.length > 0) {
      groupedInwards.push({
        id: "orphaned",
        sequence_number: 0,
        stock_units: orphanedUnits,
      } as GoodsInward);
    }

    return groupedInwards;
  }, [stockUnitsData]);

  // Auto-expand first inward
  const [expandedInwards, setExpandedInwards] = useState<Set<string>>(() =>
    goodsInwards.length > 0 ? new Set([goodsInwards[0].id]) : new Set(),
  );

  const toggleInward = (inwardId: string) => {
    setExpandedInwards((prev) => {
      const next = new Set(prev);
      if (next.has(inwardId)) {
        next.delete(inwardId);
      } else {
        next.add(inwardId);
      }
      return next;
    });
  };

  const handleInwardCheckboxChange = (
    inward: GoodsInward,
    checked: boolean,
  ) => {
    const inwardUnitIds = inward.stock_units.map((u) => u.id);
    if (checked) {
      // Add all units from this inward
      onSelectionChange([
        ...new Set([...selectedStockUnitIds, ...inwardUnitIds]),
      ]);
    } else {
      // Remove all units from this inward
      onSelectionChange(
        selectedStockUnitIds.filter((id) => !inwardUnitIds.includes(id)),
      );
    }
  };

  const handleUnitCheckboxChange = (unitId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedStockUnitIds, unitId]);
    } else {
      onSelectionChange(selectedStockUnitIds.filter((id) => id !== unitId));
    }
  };

  const getInwardSelectionState = (
    inward: GoodsInward,
  ): "all" | "some" | "none" => {
    const inwardUnitIds = inward.stock_units.map((u) => u.id);
    const selectedCount = inwardUnitIds.filter((id) =>
      selectedStockUnitIds.includes(id),
    ).length;
    if (selectedCount === 0) return "none";
    if (selectedCount === inwardUnitIds.length) return "all";
    return "some";
  };

  const getQRStatus = (unit: StockUnitWithProductListView): string => {
    if (unit.qr_generated_at) {
      return `QR made ${formatRelativeDate(unit.qr_generated_at)}`;
    }
    return "QR pending";
  };

  const totalSelected = selectedStockUnitIds.length;

  // Loading state
  if (loading) {
    return <LoadingState message="Loading stock units..." />;
  }

  if (goodsInwards.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-gray-500">
          No stock units available for this product
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 shrink-0 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Select stock units
        </h3>
        <p className="text-sm text-gray-500">
          {totalSelected} {totalSelected === 1 ? "unit" : "units"} selected
        </p>
      </div>

      {/* Goods Inward List - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {goodsInwards.map((inward) => {
          const isExpanded = expandedInwards.has(inward.id);
          const selectionState = getInwardSelectionState(inward);
          const selectedInwardCount = inward.stock_units.filter((u) =>
            selectedStockUnitIds.includes(u.id),
          ).length;

          return (
            <Collapsible
              key={inward.id}
              open={isExpanded}
              onOpenChange={() => toggleInward(inward.id)}
              className="border-b border-gray-200 px-4 py-3"
            >
              <div
                className={`flex gap-3 items-center ${isExpanded ? "mb-3" : "mb-0"}`}
              >
                <Checkbox
                  checked={selectionState === "all"}
                  onCheckedChange={(checked) =>
                    handleInwardCheckboxChange(inward, checked === true)
                  }
                  className={
                    selectionState === "some"
                      ? "data-[state=checked]:bg-gray-400"
                      : ""
                  }
                />
                <CollapsibleTrigger className="flex items-center justify-between w-full">
                  <span className="flex-1 text-sm font-semibold text-gray-700 text-start">
                    GI-{inward.sequence_number} ({selectedInwardCount}/
                    {inward.stock_units.length} selected)
                  </span>
                  <IconChevronDown
                    className={`size-5 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : "rotate-0"}`}
                  />
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent key={inward.id}>
                {/* Stock Units List */}
                <div className="flex flex-col">
                  {inward.stock_units.map((unit) => (
                    <div key={unit.id} className="flex gap-3 py-3">
                      <Checkbox
                        checked={selectedStockUnitIds.includes(unit.id)}
                        onCheckedChange={(checked) =>
                          handleUnitCheckboxChange(unit.id, checked === true)
                        }
                        className="mt-1"
                      />
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700">
                            {formatStockUnitNumber(
                              unit.sequence_number,
                              unit.product?.stock_type as StockType,
                            )}
                          </p>
                          <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            {unit.manufacturing_date && (
                              <Fragment>
                                <span>
                                  Made on{" "}
                                  {new Date(
                                    unit.manufacturing_date,
                                  ).toLocaleDateString()}
                                </span>
                                <span>•</span>
                              </Fragment>
                            )}
                            <span>
                              {unit.initial_quantity}{" "}
                              {unit.product?.measuring_unit || "units"}
                            </span>
                          </div>
                        </div>
                        <Badge
                          color={unit.qr_generated_at ? "gray" : "green"}
                          variant="secondary"
                          className="text-xs"
                        >
                          {getQRStatus(unit)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
