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
  getAdjustmentNotes,
  getAdjustmentNoteBySlug,
  getAdjustmentNotesByInvoice,
  getInvoiceForAdjustment,
  createAdjustmentNote,
  updateAdjustmentNote,
  updateAdjustmentNoteWithItems,
  cancelAdjustmentNote,
  deleteAdjustmentNote,
  type AdjustmentNoteFilters,
  type CreateAdjustmentNoteData,
} from "@/lib/queries/adjustment-notes";

/**
 * Fetch adjustment notes with optional filters and pagination
 * Used in: adjustment notes list page
 */
export function useAdjustmentNotes({
  filters,
  page = 1,
  pageSize = 25,
  enabled = true,
}: {
  filters?: AdjustmentNoteFilters;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.adjustmentNotes.all(filters, page),
    queryFn: () => getAdjustmentNotes(filters, page, pageSize),
    ...getQueryOptions(STALE_TIME.ADJUSTMENT_NOTES, GC_TIME.TRANSACTIONAL),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/**
 * Fetch single adjustment note by adjustment slug
 * Used in: adjustment note detail page
 */
export function useAdjustmentNoteBySlug(adjustmentSlug: string) {
  return useQuery({
    queryKey: queryKeys.adjustmentNotes.detail(adjustmentSlug),
    queryFn: () => getAdjustmentNoteBySlug(adjustmentSlug),
    ...getQueryOptions(STALE_TIME.ADJUSTMENT_NOTES, GC_TIME.TRANSACTIONAL),
    enabled: !!adjustmentSlug,
  });
}

/**
 * Fetch adjustment notes for a specific invoice
 * Used in: invoice detail page adjustments tab
 */
export function useAdjustmentNotesByInvoice(
  invoiceId: string | null,
  page: number = 1,
  pageSize: number = 25,
) {
  return useQuery({
    queryKey: queryKeys.adjustmentNotes.byInvoice(invoiceId || "", page),
    queryFn: () => getAdjustmentNotesByInvoice(invoiceId!, page, pageSize),
    ...getQueryOptions(STALE_TIME.ADJUSTMENT_NOTES, GC_TIME.TRANSACTIONAL),
    enabled: !!invoiceId,
  });
}

/**
 * Fetch invoice with items for adjustment note creation
 * Includes original tax rates (tax rate versioning)
 * Used in: adjustment note creation flow
 */
export function useInvoiceForAdjustment(invoiceNumber: string) {
  return useQuery({
    queryKey: [...queryKeys.invoices.detail(invoiceNumber), "for-adjustment"],
    queryFn: () => getInvoiceForAdjustment(invoiceNumber),
    ...getQueryOptions(STALE_TIME.INVOICES, GC_TIME.TRANSACTIONAL),
    enabled: !!invoiceNumber,
  });
}

/**
 * Mutations for adjustment notes (create, update, delete)
 * Automatically invalidates relevant caches
 */
export function useAdjustmentNoteMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (data: CreateAdjustmentNoteData) => createAdjustmentNote(data),
    onSuccess: () => {
      // Invalidate adjustment notes cache
      queryClient.invalidateQueries({
        queryKey: ["adjustment-notes"],
      });
      // Invalidate invoices cache (outstanding amounts changed)
      queryClient.invalidateQueries({
        queryKey: ["invoices"],
      });
      // Invalidate ledgers cache (party ledger balances changed)
      queryClient.invalidateQueries({
        queryKey: ["ledgers"],
      });
    },
  });

  const update = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{
        reason: string;
        notes?: string;
        attachments?: string[];
      }>;
    }) => updateAdjustmentNote(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["adjustment-notes"],
      });
    },
  });

  const updateWithItems = useMutation({
    mutationFn: ({
      adjustmentNoteId,
      data,
    }: {
      adjustmentNoteId: string;
      data: CreateAdjustmentNoteData;
    }) => updateAdjustmentNoteWithItems(adjustmentNoteId, data),
    onSuccess: () => {
      // Invalidate adjustment notes cache
      queryClient.invalidateQueries({
        queryKey: ["adjustment-notes"],
      });
      // Invalidate invoices cache (outstanding amounts changed)
      queryClient.invalidateQueries({
        queryKey: ["invoices"],
      });
      // Invalidate ledgers cache (party ledger balances changed)
      queryClient.invalidateQueries({
        queryKey: ["ledgers"],
      });
    },
  });

  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      cancelAdjustmentNote(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["adjustment-notes"],
      });
      queryClient.invalidateQueries({
        queryKey: ["invoices"],
      });
      queryClient.invalidateQueries({
        queryKey: ["ledgers"],
      });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteAdjustmentNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["adjustment-notes"],
      });
      queryClient.invalidateQueries({
        queryKey: ["invoices"],
      });
      queryClient.invalidateQueries({
        queryKey: ["ledgers"],
      });
    },
  });

  return {
    create,
    update,
    updateWithItems,
    cancel,
    remove,
  };
}
