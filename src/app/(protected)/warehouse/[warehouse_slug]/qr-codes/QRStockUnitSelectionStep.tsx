"use client";

import { useState, useMemo, Fragment } from "react";
import {
  IconChevronDown,
  IconTransferIn,
  IconTransform,
} from "@tabler/icons-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatRelativeDate, formatAbsoluteDate } from "@/lib/utils/date";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useSession } from "@/contexts/session-context";
import { useStockUnitsWithOrigin } from "@/lib/query/hooks/stock-units";
import {
  StockUnitWithProductListView,
  StockUnitWithOriginListView,
} from "@/types/stock-units.types";
import { getMovementNumber } from "@/lib/utils/stock-flow";
import { getConvertNumber } from "@/lib/utils/goods-convert";
import { LoadingState } from "@/components/layouts/loading-state";

interface StockUnitOriginGroup {
  id: string;
  type: "inward" | "convert";
  sequence_number: number;
  date: string; // For sorting
  stock_units: StockUnitWithOriginListView[];
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
    useStockUnitsWithOrigin(warehouse.id, {
      product_id: productId,
      status: "available",
    });

  const stockUnitsData = stockUnitsResponse?.data || [];

  // Group stock units by origin (goods inward or goods convert), sorted by date
  const originGroups: StockUnitOriginGroup[] = useMemo(() => {
    const groups: StockUnitOriginGroup[] = [];
    const groupMap = new Map<string, StockUnitOriginGroup>();

    // Group by origin
    stockUnitsData.forEach((unit) => {
      if (unit.origin_type === "inward" && unit.goods_inward) {
        const key = `inward-${unit.origin_inward_id}`;
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            id: key,
            type: "inward",
            sequence_number: unit.goods_inward.sequence_number,
            date: unit.goods_inward.inward_date,
            stock_units: [],
          });
        }
        groupMap.get(key)!.stock_units.push(unit);
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
            stock_units: [],
          });
        }
        groupMap.get(key)!.stock_units.push(unit);
      }
    });

    // Convert to array and sort by date (newest first)
    groups.push(...Array.from(groupMap.values()));
    groups.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return groups;
  }, [stockUnitsData]);

  // Auto-expand first group
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() =>
    originGroups.length > 0 ? new Set([originGroups[0].id]) : new Set(),
  );

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleGroupCheckboxChange = (
    group: StockUnitOriginGroup,
    checked: boolean,
  ) => {
    const groupUnitIds = group.stock_units.map((u) => u.id);
    if (checked) {
      // Add all units from this group
      onSelectionChange([
        ...new Set([...selectedStockUnitIds, ...groupUnitIds]),
      ]);
    } else {
      // Remove all units from this group
      onSelectionChange(
        selectedStockUnitIds.filter((id) => !groupUnitIds.includes(id)),
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

  const getGroupSelectionState = (
    group: StockUnitOriginGroup,
  ): "all" | "some" | "none" => {
    const groupUnitIds = group.stock_units.map((u) => u.id);
    const selectedCount = groupUnitIds.filter((id) =>
      selectedStockUnitIds.includes(id),
    ).length;
    if (selectedCount === 0) return "none";
    if (selectedCount === groupUnitIds.length) return "all";
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

  if (originGroups.length === 0) {
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

      {/* Origin Groups List - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {originGroups.map((group) => {
          const isExpanded = expandedGroups.has(group.id);
          const selectionState = getGroupSelectionState(group);
          const selectedCount = group.stock_units.filter((u) =>
            selectedStockUnitIds.includes(u.id),
          ).length;

          const groupLabel =
            group.type === "inward"
              ? getMovementNumber("inward", group.sequence_number)
              : getConvertNumber(group.sequence_number);

          const Icon = group.type === "inward" ? IconTransferIn : IconTransform;

          return (
            <Collapsible
              key={group.id}
              open={isExpanded}
              onOpenChange={() => toggleGroup(group.id)}
              className="border-b border-gray-200 px-4 py-3"
            >
              <div
                className={`flex gap-3 items-center ${isExpanded ? "mb-3" : "mb-0"}`}
              >
                <Checkbox
                  checked={selectionState === "all"}
                  onCheckedChange={(checked) =>
                    handleGroupCheckboxChange(group, checked === true)
                  }
                  className={
                    selectionState === "some"
                      ? "data-[state=checked]:bg-gray-400"
                      : ""
                  }
                />
                <CollapsibleTrigger className="flex items-center justify-between w-full gap-2">
                  <div className="flex items-center gap-2 flex-1 text-start">
                    <Icon className="size-4 text-gray-500 shrink-0" />
                    <span className="text-sm font-semibold text-gray-700">
                      {groupLabel}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({selectedCount}/{group.stock_units.length} selected)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-500">
                      {formatAbsoluteDate(group.date)}
                    </span>
                    <IconChevronDown
                      className={`size-5 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : "rotate-0"}`}
                    />
                  </div>
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent key={group.id}>
                {/* Stock Units List */}
                <div className="flex flex-col">
                  {group.stock_units.map((unit) => (
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
                            {unit.stock_number}
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
