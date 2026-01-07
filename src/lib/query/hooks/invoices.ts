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
  getInvoices,
  getInvoiceBySlug,
  getInvoicesByParty,
  createInvoice,
  updateInvoice,
  updateInvoiceWithItems,
  cancelInvoice,
  deleteInvoice,
  type InvoiceFilters,
  type CreateInvoiceData,
} from "@/lib/queries/invoices";
import type { TablesUpdate } from "@/types/database/supabase";

/**
 * Fetch invoices with optional filters and pagination
 *
 * Examples:
 * - All invoices: useInvoices()
 * - Sales only: useInvoices({ filters: { invoice_type: 'sales' } })
 * - Search: useInvoices({ filters: { search: 'customer name' } })
 * - Paginated: useInvoices({ filters, page, pageSize })
 */
export function useInvoices({
  filters,
  page = 1,
  pageSize = 25,
  enabled = true,
}: {
  filters?: InvoiceFilters;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.invoices.all(filters, page),
    queryFn: () => getInvoices(filters, page, pageSize),
    ...getQueryOptions(STALE_TIME.INVOICES, GC_TIME.TRANSACTIONAL),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/**
 * Fetch single invoice by invoice slug
 */
export function useInvoiceBySlug(invoiceSlug: string | null) {
  return useQuery({
    queryKey: queryKeys.invoices.detail(invoiceSlug || ""),
    queryFn: () => getInvoiceBySlug(invoiceSlug!),
    ...getQueryOptions(STALE_TIME.INVOICES, GC_TIME.TRANSACTIONAL),
    enabled: !!invoiceSlug,
  });
}

/**
 * Fetch invoices for a specific party (customer/vendor)
 * Used in partner detail page to show invoice history
 */
export function useInvoicesByParty({
  partyLedgerId,
  page = 1,
  pageSize = 25,
  enabled = true,
}: {
  partyLedgerId: string | null;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.invoices.byParty(partyLedgerId || "", page),
    queryFn: () => getInvoicesByParty(partyLedgerId!, page, pageSize),
    ...getQueryOptions(STALE_TIME.INVOICES, GC_TIME.TRANSACTIONAL),
    placeholderData: keepPreviousData,
    enabled: enabled && !!partyLedgerId,
  });
}

/**
 * Invoice mutations (create, update, delete)
 */
export function useInvoiceMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (invoiceData: CreateInvoiceData) => createInvoice(invoiceData),
    onSuccess: () => {
      // Invalidate all invoice queries
      queryClient.invalidateQueries({
        queryKey: ["invoices"],
      });
      // Invalidate party ledger queries (outstanding amounts updated)
      queryClient.invalidateQueries({
        queryKey: ["partners"],
      });
      // Invalidate dashboard (statistics updated)
      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });
    },
  });

  const update = useMutation({
    mutationFn: ({
      invoiceId,
      data,
    }: {
      invoiceId: string;
      data: Partial<TablesUpdate<"invoices">>;
    }) => updateInvoice(invoiceId, data),
    onSuccess: () => {
      // Invalidate all invoice queries
      queryClient.invalidateQueries({
        queryKey: ["invoices"],
      });
    },
  });

  const updateWithItems = useMutation({
    mutationFn: ({
      invoiceId,
      data,
    }: {
      invoiceId: string;
      data: CreateInvoiceData;
    }) => updateInvoiceWithItems(invoiceId, data),
    onSuccess: () => {
      // Invalidate all invoice queries
      queryClient.invalidateQueries({
        queryKey: ["invoices"],
      });
      // Invalidate party ledger queries (outstanding amounts may change)
      queryClient.invalidateQueries({
        queryKey: ["partners"],
      });
      // Invalidate dashboard (statistics updated)
      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });
    },
  });

  const cancel = useMutation({
    mutationFn: ({
      invoiceId,
      reason,
    }: {
      invoiceId: string;
      reason: string;
    }) => cancelInvoice(invoiceId, reason),
    onSuccess: () => {
      // Invalidate all invoice queries
      queryClient.invalidateQueries({
        queryKey: ["invoices"],
      });
      // Invalidate party ledger queries (outstanding amounts updated)
      queryClient.invalidateQueries({
        queryKey: ["partners"],
      });
      // Invalidate dashboard (statistics updated)
      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });
    },
  });

  const deleteInvoice_ = useMutation({
    mutationFn: (invoiceId: string) => deleteInvoice(invoiceId),
    onSuccess: () => {
      // Invalidate all invoice queries
      queryClient.invalidateQueries({
        queryKey: ["invoices"],
      });
      // Invalidate party ledger queries (outstanding amounts updated)
      queryClient.invalidateQueries({
        queryKey: ["partners"],
      });
      // Invalidate dashboard (statistics updated)
      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });
    },
  });

  return {
    create,
    update,
    updateWithItems,
    cancel,
    delete: deleteInvoice_,
  };
}
