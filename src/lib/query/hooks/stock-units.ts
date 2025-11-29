"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getStockUnits,
  getStockUnitsByProduct,
  getStockUnitsWithInwardDetails,
  getPendingQRStockUnits,
  updateStockUnit,
  updateStockUnits,
  type StockUnitFilters,
} from "@/lib/queries/stock-units";
import type { TablesUpdate } from "@/types/database/supabase";

/**
 * Fetch stock units for a warehouse with optional filters
 */
export function useStockUnits(warehouseId: string, filters?: StockUnitFilters) {
  return useQuery({
    queryKey: queryKeys.stockUnits.all(warehouseId, filters),
    queryFn: () => getStockUnits(warehouseId, filters),
    ...getQueryOptions(STALE_TIME.STOCK_UNITS, GC_TIME.TRANSACTIONAL),
  });
}

/**
 * Fetch stock units for a specific product
 */
export function useStockUnitsByProduct(productId: string, warehouseId: string) {
  return useQuery({
    queryKey: queryKeys.stockUnits.byProduct(productId, warehouseId),
    queryFn: () => getStockUnitsByProduct(productId, warehouseId),
    ...getQueryOptions(STALE_TIME.STOCK_UNITS, GC_TIME.TRANSACTIONAL),
  });
}

/**
 * Fetch stock units for a product with full inward details
 * Useful for product detail page to show stock flow history
 */
export function useStockUnitsWithInwardDetails(
  productId: string | null,
  warehouseId: string,
) {
  return useQuery({
    queryKey: queryKeys.stockUnits.withInwardDetails(
      productId || "",
      warehouseId,
    ),
    queryFn: () => getStockUnitsWithInwardDetails(productId!, warehouseId),
    ...getQueryOptions(STALE_TIME.STOCK_UNITS, GC_TIME.TRANSACTIONAL),
    enabled: !!productId,
  });
}

/**
 * Fetch stock units that need QR codes
 */
export function usePendingQRStockUnits(warehouseId: string) {
  return useQuery({
    queryKey: queryKeys.stockUnits.pendingQR(warehouseId),
    queryFn: () => getPendingQRStockUnits(warehouseId),
    ...getQueryOptions(STALE_TIME.STOCK_UNITS, GC_TIME.TRANSACTIONAL),
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
