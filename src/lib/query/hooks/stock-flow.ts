"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getGoodsInwards,
  getGoodsOutwards,
  getGoodsInwardBySequenceNumber,
  getGoodsOutwardBySequenceNumber,
  createGoodsInward,
  createGoodsOutward,
  type GoodsInwardFilters,
  type GoodsOutwardFilters,
} from "@/lib/queries/stock-flow";
import type { TablesInsert } from "@/types/database/supabase";

/**
 * Fetch goods inwards for a warehouse
 */
export function useGoodsInwards(
  warehouseId: string,
  filters?: GoodsInwardFilters,
) {
  return useQuery({
    queryKey: queryKeys.stockFlow.inwards(warehouseId, filters),
    queryFn: () => getGoodsInwards(warehouseId, filters),
    ...getQueryOptions(STALE_TIME.STOCK_FLOW, GC_TIME.TRANSACTIONAL),
  });
}

/**
 * Fetch goods outwards for a warehouse
 */
export function useGoodsOutwards(
  warehouseId: string,
  filters?: GoodsOutwardFilters,
) {
  return useQuery({
    queryKey: queryKeys.stockFlow.outwards(warehouseId, filters),
    queryFn: () => getGoodsOutwards(warehouseId, filters),
    ...getQueryOptions(STALE_TIME.STOCK_FLOW, GC_TIME.TRANSACTIONAL),
  });
}

/**
 * Fetch single goods inward by sequence number
 */
export function useGoodsInwardBySequenceNumber(sequenceNumber: string | null) {
  return useQuery({
    queryKey: queryKeys.stockFlow.inwardDetail(sequenceNumber || ""),
    queryFn: () => getGoodsInwardBySequenceNumber(sequenceNumber!),
    ...getQueryOptions(STALE_TIME.STOCK_FLOW, GC_TIME.TRANSACTIONAL),
    enabled: !!sequenceNumber,
  });
}

/**
 * Fetch single goods outward by sequence number
 */
export function useGoodsOutwardBySequenceNumber(sequenceNumber: string | null) {
  return useQuery({
    queryKey: queryKeys.stockFlow.outwardDetail(sequenceNumber || ""),
    queryFn: () => getGoodsOutwardBySequenceNumber(sequenceNumber!),
    ...getQueryOptions(STALE_TIME.STOCK_FLOW, GC_TIME.TRANSACTIONAL),
    enabled: !!sequenceNumber,
  });
}

/**
 * Stock flow mutations (create inward/outward)
 */
export function useStockFlowMutations(warehouseId: string) {
  const queryClient = useQueryClient();

  const createInward = useMutation({
    mutationFn: (data: TablesInsert<"goods_inwards">) =>
      createGoodsInward(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.stockFlow.inwards(warehouseId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.stockUnits.all(warehouseId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.withInventory(warehouseId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.all(warehouseId),
      });
    },
  });

  const createOutward = useMutation({
    mutationFn: (data: TablesInsert<"goods_outwards">) =>
      createGoodsOutward(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.stockFlow.outwards(warehouseId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.stockUnits.all(warehouseId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.withInventory(warehouseId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.all(warehouseId),
      });
    },
  });

  return {
    createInward,
    createOutward,
  };
}
