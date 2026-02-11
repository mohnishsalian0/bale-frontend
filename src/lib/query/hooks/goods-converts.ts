"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getGoodsConverts,
  getGoodsConvertByNumber,
  getGoodsConvertById,
  createGoodsConvertWithItems,
  updateGoodsConvertWithItems,
  completeGoodsConvert,
  cancelGoodsConvert,
  deleteGoodsConvert,
  type ConvertFilters,
} from "@/lib/queries/goods-converts";
import type {
  CreateConvertData,
  CreateConvertInputItem,
  CreateConvertOutputUnit,
  UpdateConvertData,
} from "@/types/goods-converts.types";

/**
 * Fetch goods converts for a warehouse
 */
export function useGoodsConverts(
  warehouseId: string,
  filters?: ConvertFilters,
  page: number = 1,
  pageSize: number = 25,
) {
  return useQuery({
    queryKey: queryKeys.stockFlow.converts(warehouseId, filters, page),
    queryFn: () => getGoodsConverts(warehouseId, filters, page, pageSize),
    ...getQueryOptions(STALE_TIME.STOCK_FLOW, GC_TIME.TRANSACTIONAL),
    placeholderData: keepPreviousData,
  });
}

/**
 * Fetch single goods convert by sequence number
 */
export function useGoodsConvertBySequenceNumber(sequenceNumber: string | null) {
  return useQuery({
    queryKey: queryKeys.stockFlow.convertDetail(sequenceNumber || ""),
    queryFn: () => getGoodsConvertByNumber(sequenceNumber!),
    ...getQueryOptions(STALE_TIME.STOCK_FLOW, GC_TIME.TRANSACTIONAL),
    enabled: !!sequenceNumber,
  });
}

/**
 * Fetch single goods convert by ID (for edit)
 */
export function useGoodsConvertById(convertId: string | null) {
  return useQuery({
    queryKey: queryKeys.stockFlow.convertById(convertId || ""),
    queryFn: () => getGoodsConvertById(convertId!),
    ...getQueryOptions(STALE_TIME.STOCK_FLOW, GC_TIME.TRANSACTIONAL),
    enabled: !!convertId,
  });
}

/**
 * Goods convert mutations (create, update, complete, cancel, delete)
 */
export function useGoodsConvertMutations(warehouseId: string) {
  const queryClient = useQueryClient();

  const createConvertWithItems = useMutation({
    mutationFn: ({
      convertData,
      inputItems,
    }: {
      convertData: CreateConvertData;
      inputItems: CreateConvertInputItem[];
    }) => createGoodsConvertWithItems(convertData, inputItems),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.stockFlow.converts(warehouseId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.stockUnits.all(warehouseId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.withInventoryAndOrders(warehouseId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.all(warehouseId),
      });
    },
  });

  const updateConvertWithItems = useMutation({
    mutationFn: ({
      convertId,
      convertData,
      inputItems,
    }: {
      convertId: string;
      convertData: UpdateConvertData;
      inputItems: CreateConvertInputItem[];
    }) => updateGoodsConvertWithItems(convertId, convertData, inputItems),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["stock-flow", "converts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["stock-flow", "convert", "detail"],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.stockUnits.all(warehouseId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.withInventoryAndOrders(warehouseId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.all(warehouseId),
      });
    },
  });

  const completeConvert = useMutation({
    mutationFn: ({
      convertId,
      completionDate,
      outputUnits,
    }: {
      convertId: string;
      completionDate: string;
      outputUnits: CreateConvertOutputUnit[];
    }) => completeGoodsConvert(convertId, completionDate, outputUnits),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["stock-flow", "converts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["stock-flow", "convert", "detail"],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.stockUnits.all(warehouseId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.withInventoryAndOrders(warehouseId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.all(warehouseId),
      });
    },
  });

  const cancelConvert = useMutation({
    mutationFn: ({
      convertId,
      cancellationReason,
    }: {
      convertId: string;
      cancellationReason: string;
    }) => cancelGoodsConvert(convertId, cancellationReason),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["stock-flow", "converts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["stock-flow", "convert", "detail"],
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.stockUnits.all(warehouseId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.withInventoryAndOrders(warehouseId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.all(warehouseId),
      });
    },
  });

  const deleteConvert = useMutation({
    mutationFn: (convertId: string) => deleteGoodsConvert(convertId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["stock-flow", "converts"],
      });
    },
  });

  return {
    createConvertWithItems,
    updateConvertWithItems,
    completeConvert,
    cancelConvert,
    deleteConvert,
  };
}
