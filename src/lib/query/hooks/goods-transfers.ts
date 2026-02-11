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
  getGoodsTransfers,
  getGoodsTransferByNumber,
  createGoodsTransferWithItems,
  updateGoodsTransferWithItems,
  updateGoodsTransfer,
  completeGoodsTransfer,
  cancelGoodsTransfer,
  deleteGoodsTransfer,
  type TransferFilters,
  type CreateTransferData,
  type UpdateTransferData,
} from "@/lib/queries/goods-transfers";

/**
 * Fetch goods transfers for a warehouse
 */
export function useGoodsTransfers(
  warehouseId: string,
  filters?: TransferFilters,
  page: number = 1,
  pageSize: number = 25,
) {
  return useQuery({
    queryKey: queryKeys.stockFlow.transfers(warehouseId, filters, page),
    queryFn: () => getGoodsTransfers(warehouseId, filters, page, pageSize),
    ...getQueryOptions(STALE_TIME.STOCK_FLOW, GC_TIME.TRANSACTIONAL),
    placeholderData: keepPreviousData,
  });
}

/**
 * Fetch single goods transfer by sequence number
 */
export function useGoodsTransferBySequenceNumber(
  sequenceNumber: string | null,
) {
  return useQuery({
    queryKey: queryKeys.stockFlow.transferDetail(sequenceNumber || ""),
    queryFn: () => getGoodsTransferByNumber(sequenceNumber!),
    ...getQueryOptions(STALE_TIME.STOCK_FLOW, GC_TIME.TRANSACTIONAL),
    enabled: !!sequenceNumber,
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Hook to get goods transfer mutations (create, update, complete, cancel, delete)
 */
export function useGoodsTransferMutations(warehouseId: string) {
  const queryClient = useQueryClient();

  const createTransferWithItems = useMutation({
    mutationFn: ({
      transferData,
      stockUnitIds,
    }: {
      transferData: CreateTransferData;
      stockUnitIds: string[];
    }) => createGoodsTransferWithItems(transferData, stockUnitIds),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.stockFlow.transfers(warehouseId),
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

  const updateTransferWithItems = useMutation({
    mutationFn: ({
      transferId,
      transferData,
      stockUnitIds,
    }: {
      transferId: string;
      transferData: CreateTransferData;
      stockUnitIds: string[];
    }) => updateGoodsTransferWithItems(transferId, transferData, stockUnitIds),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["stock-flow", "transfers"],
      });
      queryClient.invalidateQueries({
        queryKey: ["stock-flow", "transfer", "detail"],
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

  const updateTransfer = useMutation({
    mutationFn: ({
      transferId,
      updateData,
    }: {
      transferId: string;
      updateData: UpdateTransferData;
    }) => updateGoodsTransfer(transferId, updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["stock-flow", "transfers"],
      });
      queryClient.invalidateQueries({
        queryKey: ["stock-flow", "transfer", "detail"],
      });
    },
  });

  const completeTransfer = useMutation({
    mutationFn: (transferId: string) => completeGoodsTransfer(transferId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["stock-flow", "transfers"],
      });
      queryClient.invalidateQueries({
        queryKey: ["stock-flow", "transfer", "detail"],
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

  const cancelTransfer = useMutation({
    mutationFn: ({
      transferId,
      cancellationReason,
    }: {
      transferId: string;
      cancellationReason: string;
    }) => cancelGoodsTransfer(transferId, cancellationReason),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["stock-flow", "transfers"],
      });
      queryClient.invalidateQueries({
        queryKey: ["stock-flow", "transfer", "detail"],
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

  const deleteTransfer = useMutation({
    mutationFn: (transferId: string) => deleteGoodsTransfer(transferId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["stock-flow", "transfers"],
      });
    },
  });

  return {
    createTransferWithItems,
    updateTransferWithItems,
    updateTransfer,
    completeTransfer,
    cancelTransfer,
    deleteTransfer,
  };
}
