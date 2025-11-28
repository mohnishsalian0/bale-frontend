"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../keys";
import { STALE_TIME, GC_TIME, getQueryOptions } from "../config";
import {
  getQRBatches,
  getQRBatchById,
  getQRBatchItems,
  createQRBatch,
  type QRBatchFilters,
  type CreateQRBatchParams,
} from "@/lib/queries/qr-batches";

/**
 * Fetch all QR batches for a warehouse
 */
export function useQRBatches(warehouseId: string, filters?: QRBatchFilters) {
  return useQuery({
    queryKey: queryKeys.qrBatches.all(warehouseId, filters),
    queryFn: () => getQRBatches(warehouseId, filters),
    ...getQueryOptions(STALE_TIME.QR_BATCHES, GC_TIME.DEFAULT),
  });
}

/**
 * Fetch single QR batch with full details (for PDF generation)
 */
export function useQRBatch(batchId: string | null) {
  return useQuery({
    queryKey: queryKeys.qrBatches.detail(batchId || ""),
    queryFn: () => getQRBatchById(batchId!),
    ...getQueryOptions(STALE_TIME.QR_BATCHES, GC_TIME.DEFAULT),
    enabled: !!batchId,
  });
}

/**
 * Fetch QR batch items
 */
export function useQRBatchItems(batchId: string | null) {
  return useQuery({
    queryKey: queryKeys.qrBatches.items(batchId || ""),
    queryFn: () => getQRBatchItems(batchId!),
    ...getQueryOptions(STALE_TIME.QR_BATCHES, GC_TIME.DEFAULT),
    enabled: !!batchId,
  });
}

/**
 * QR batch mutations (create)
 */
export function useQRBatchMutations(warehouseId: string) {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (params: CreateQRBatchParams) => createQRBatch(params),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.qrBatches.all(warehouseId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.stockUnits.all(warehouseId),
      }); // QR status changed
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.all(warehouseId),
      }); // Dashboard stats changed
    },
  });

  return {
    create,
  };
}
