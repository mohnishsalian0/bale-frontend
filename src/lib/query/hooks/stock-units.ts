"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getStockUnits,
  getStockUnitsWithInward,
  getStockUnitWithProductDetail,
  updateStockUnit,
  updateStockUnits,
} from "@/lib/queries/stock-units";
import type { StockUnitFilters } from "@/types/stock-units.types";
import type { TablesUpdate } from "@/types/database/supabase";

/**
 * Fetch stock units for a warehouse with optional filters
 *
 * Examples:
 * - All stock units: useStockUnits(warehouseId)
 * - By product: useStockUnits(warehouseId, { product_id: productId, status: "in_stock" })
 * - Pending QR: useStockUnits(warehouseId, { status: "in_stock", qr_generated_at: "null" })
 */
export function useStockUnits(warehouseId: string, filters?: StockUnitFilters) {
  return useQuery({
    queryKey: queryKeys.stockUnits.all(warehouseId, filters),
    queryFn: () => getStockUnits(warehouseId, filters),
    ...getQueryOptions(STALE_TIME.STOCK_UNITS, GC_TIME.TRANSACTIONAL),
  });
}

/**
 * Fetch stock units for a product with full inward details
 * Useful for product detail page to show stock flow history
 */
export function useStockUnitsWithInward(
  warehouseId: string,
  filters?: StockUnitFilters,
) {
  return useQuery({
    queryKey: queryKeys.stockUnits.all(warehouseId, filters),
    queryFn: () => getStockUnitsWithInward(warehouseId, filters),
    ...getQueryOptions(STALE_TIME.STOCK_UNITS, GC_TIME.TRANSACTIONAL),
  });
}

/**
 * Fetch a single stock unit by ID with full product details
 * Used for: stock unit detail modal, detail pages
 */
export function useStockUnitWithProductDetail(stockUnitId: string | null) {
  return useQuery({
    queryKey: queryKeys.stockUnits.byId(stockUnitId || ""),
    queryFn: () => getStockUnitWithProductDetail(stockUnitId!),
    ...getQueryOptions(STALE_TIME.STOCK_UNITS, GC_TIME.TRANSACTIONAL),
    enabled: !!stockUnitId,
  });
}

/**
 * Stock unit mutations (update)
 */
export function useStockUnitMutations(_warehouseId: string) {
  const queryClient = useQueryClient();

  const update = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: TablesUpdate<"stock_units">;
    }) => updateStockUnit(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-units"] });
      queryClient.invalidateQueries({ queryKey: ["products"] }); // Inventory counts may change
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }); // Dashboard stats may change
    },
  });

  const batchUpdate = useMutation({
    mutationFn: (
      updates: Array<{ id: string; data: TablesUpdate<"stock_units"> }>,
    ) => updateStockUnits(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-units"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return {
    update,
    batchUpdate,
  };
}
