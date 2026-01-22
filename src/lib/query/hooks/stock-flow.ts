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
  getGoodsInwards,
  getGoodsOutwards,
  getGoodsInwardByNumber,
  getGoodsOutwardByNumber,
  getOutwardItemsByProduct,
  createGoodsInwardWithUnits,
  createGoodsOutwardWithItems,
  updateGoodsInward,
  cancelGoodsInward,
  deleteGoodsInward,
  updateGoodsOutward,
  cancelGoodsOutward,
  deleteGoodsOutward,
  type InwardFilters,
  type OutwardFilters,
  getGoodsOutwardsBySalesOrder,
  getGoodsInwardsByPurchaseOrder,
} from "@/lib/queries/stock-flow";
import type { TablesInsert } from "@/types/database/supabase";
import type {
  UpdateInwardData,
  UpdateOutwardData,
} from "@/types/stock-flow.types";

/**
 * Fetch goods inwards for a warehouse
 */
export function useGoodsInwards(
  warehouseId: string,
  filters?: InwardFilters,
  page: number = 1,
  pageSize: number = 25,
) {
  return useQuery({
    queryKey: queryKeys.stockFlow.inwards(warehouseId, filters, page),
    queryFn: () => getGoodsInwards(warehouseId, filters, page, pageSize),
    ...getQueryOptions(STALE_TIME.STOCK_FLOW, GC_TIME.TRANSACTIONAL),
    placeholderData: keepPreviousData,
  });
}

/**
 * Fetch goods outwards for a warehouse
 */
export function useGoodsOutwards(
  warehouseId: string,
  filters?: OutwardFilters,
  page: number = 1,
  pageSize: number = 25,
) {
  return useQuery({
    queryKey: queryKeys.stockFlow.outwards(warehouseId, filters, page),
    queryFn: () => getGoodsOutwards(warehouseId, filters, page, pageSize),
    ...getQueryOptions(STALE_TIME.STOCK_FLOW, GC_TIME.TRANSACTIONAL),
    placeholderData: keepPreviousData,
  });
}

/**
 * Fetch goods inwards for a purchase order
 */
export function useGoodsInwardsByPurchaseOrder(
  orderNumber: string | null,
  page: number = 1,
  pageSize: number = 25,
) {
  return useQuery({
    queryKey: queryKeys.stockFlow.inwardsByPurchaseOrder(
      orderNumber || "",
      page,
    ),
    queryFn: () => getGoodsInwardsByPurchaseOrder(orderNumber!, page, pageSize),
    ...getQueryOptions(STALE_TIME.STOCK_FLOW, GC_TIME.TRANSACTIONAL),
    placeholderData: keepPreviousData,
    enabled: !!orderNumber,
  });
}

/**
 * Fetch goods outwards for a sales order
 */
export function useGoodsOutwardsBySalesOrder(
  orderNumber: string | null,
  page: number = 1,
  pageSize: number = 25,
) {
  return useQuery({
    queryKey: queryKeys.stockFlow.outwardsBySalesOrder(orderNumber || "", page),
    queryFn: () => getGoodsOutwardsBySalesOrder(orderNumber!, page, pageSize),
    ...getQueryOptions(STALE_TIME.STOCK_FLOW, GC_TIME.TRANSACTIONAL),
    placeholderData: keepPreviousData,
    enabled: !!orderNumber,
  });
}

/**
 * Fetch single goods inward by sequence number
 */
export function useGoodsInwardBySequenceNumber(sequenceNumber: string | null) {
  return useQuery({
    queryKey: queryKeys.stockFlow.inwardDetail(sequenceNumber || ""),
    queryFn: () => getGoodsInwardByNumber(sequenceNumber!),
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
    queryFn: () => getGoodsOutwardByNumber(sequenceNumber!),
    ...getQueryOptions(STALE_TIME.STOCK_FLOW, GC_TIME.TRANSACTIONAL),
    enabled: !!sequenceNumber,
  });
}

/**
 * Fetch outward items for a specific product
 * Useful for product detail page to show outward flow history
 */
export function useOutwardItemsByProduct(
  productId: string | null,
  page: number = 1,
  pageSize: number = 20,
) {
  return useQuery({
    queryKey: queryKeys.stockFlow.outwardItemsByProduct(productId || "", page),
    queryFn: () => getOutwardItemsByProduct(productId!, page, pageSize),
    ...getQueryOptions(STALE_TIME.STOCK_FLOW, GC_TIME.TRANSACTIONAL),
    placeholderData: keepPreviousData,
    enabled: !!productId,
  });
}

/**
 * Stock flow mutations (create inward/outward)
 */
export function useStockFlowMutations(warehouseId: string) {
  const queryClient = useQueryClient();

  const createInwardWithUnits = useMutation({
    mutationFn: ({
      inwardData,
      stockUnits,
    }: {
      inwardData: Omit<
        TablesInsert<"goods_inwards">,
        "created_by" | "sequence_number"
      >;
      stockUnits: Omit<
        TablesInsert<"stock_units">,
        "created_by" | "modified_by" | "sequence_number"
      >[];
    }) => createGoodsInwardWithUnits(inwardData, stockUnits),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.stockFlow.inwards(warehouseId),
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

  const createOutwardWithItems = useMutation({
    mutationFn: ({
      outwardData,
      stockUnitItems,
    }: {
      outwardData: Omit<
        TablesInsert<"goods_outwards">,
        "created_by" | "sequence_number"
      >;
      stockUnitItems: Array<{
        stock_unit_id: string;
        quantity: number;
      }>;
    }) => createGoodsOutwardWithItems(outwardData, stockUnitItems),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.stockFlow.outwards(warehouseId),
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

  return {
    createInwardWithUnits,
    createOutwardWithItems,
  };
}

/**
 * Goods inward mutations (update, cancel, delete)
 */
export function useGoodsInwardMutations(sequenceNumber: string) {
  const queryClient = useQueryClient();

  const updateInward = useMutation({
    mutationFn: ({
      inwardId,
      updateData,
    }: {
      inwardId: string;
      updateData: UpdateInwardData;
    }) => updateGoodsInward(inwardId, updateData),
    onSuccess: () => {
      // Invalidate the specific inward detail query
      queryClient.invalidateQueries({
        queryKey: queryKeys.stockFlow.inwardDetail(sequenceNumber),
      });
      // Invalidate all inward list queries (partial match)
      queryClient.invalidateQueries({
        queryKey: ["stock-flow", "inwards"],
      });
    },
  });

  const cancelInward = useMutation({
    mutationFn: ({
      inwardId,
      cancellationReason,
    }: {
      inwardId: string;
      cancellationReason: string;
    }) => cancelGoodsInward(inwardId, cancellationReason),
    onSuccess: () => {
      // Invalidate the specific inward detail query
      queryClient.invalidateQueries({
        queryKey: queryKeys.stockFlow.inwardDetail(sequenceNumber),
      });
      // Invalidate all inward list queries
      queryClient.invalidateQueries({
        queryKey: ["stock-flow", "inwards"],
      });
    },
  });

  const deleteInward = useMutation({
    mutationFn: (inwardId: string) => deleteGoodsInward(inwardId),
    onSuccess: () => {
      // Invalidate all inward list queries
      queryClient.invalidateQueries({
        queryKey: ["stock-flow", "inwards"],
      });
      // Note: No need to invalidate detail query as user will be redirected
    },
  });

  return {
    updateInward,
    cancelInward,
    deleteInward,
  };
}

/**
 * Goods outward mutations (update, cancel, delete)
 */
export function useGoodsOutwardMutations(sequenceNumber: string) {
  const queryClient = useQueryClient();

  const updateOutward = useMutation({
    mutationFn: ({
      outwardId,
      updateData,
    }: {
      outwardId: string;
      updateData: UpdateOutwardData;
    }) => updateGoodsOutward(outwardId, updateData),
    onSuccess: () => {
      // Invalidate the specific outward detail query
      queryClient.invalidateQueries({
        queryKey: queryKeys.stockFlow.outwardDetail(sequenceNumber),
      });
      // Invalidate all outward list queries (partial match)
      queryClient.invalidateQueries({
        queryKey: ["stock-flow", "outwards"],
      });
    },
  });

  const cancelOutward = useMutation({
    mutationFn: ({
      outwardId,
      cancellationReason,
    }: {
      outwardId: string;
      cancellationReason: string;
    }) => cancelGoodsOutward(outwardId, cancellationReason),
    onSuccess: () => {
      // Invalidate the specific outward detail query
      queryClient.invalidateQueries({
        queryKey: queryKeys.stockFlow.outwardDetail(sequenceNumber),
      });
      // Invalidate all outward list queries
      queryClient.invalidateQueries({
        queryKey: ["stock-flow", "outwards"],
      });
    },
  });

  const deleteOutward = useMutation({
    mutationFn: (outwardId: string) => deleteGoodsOutward(outwardId),
    onSuccess: () => {
      // Invalidate all outward list queries
      queryClient.invalidateQueries({
        queryKey: ["stock-flow", "outwards"],
      });
      // Note: No need to invalidate detail query as user will be redirected
    },
  });

  return {
    updateOutward,
    cancelOutward,
    deleteOutward,
  };
}
