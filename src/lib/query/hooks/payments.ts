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
  getPayments,
  getPaymentBySlug,
  getPaymentsByParty,
  getPaymentsByInvoice,
  getOutstandingInvoices,
  getCounterLedgers,
  createPayment,
  updatePayment,
  updatePaymentWithAllocations,
  cancelPayment,
  deletePayment,
  type PaymentFilters,
  type CreatePaymentData,
} from "@/lib/queries/payments";
import type { TablesUpdate } from "@/types/database/supabase";

/**
 * Fetch payments with optional filters and pagination
 *
 * Examples:
 * - All payments: usePayments()
 * - Payments only: usePayments({ filters: { voucher_type: 'payment' } })
 * - Search: usePayments({ filters: { search: 'PMT/2024-25/0001' } })
 * - Paginated: usePayments({ filters, page, pageSize })
 */
export function usePayments({
  filters,
  page = 1,
  pageSize = 25,
  enabled = true,
}: {
  filters?: PaymentFilters;
  page?: number;
  pageSize?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.payments.all(filters, page),
    queryFn: () => getPayments(filters, page, pageSize),
    ...getQueryOptions(STALE_TIME.PAYMENTS, GC_TIME.TRANSACTIONAL),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/**
 * Fetch single payment by payment slug
 */
export function usePaymentBySlug(paymentSlug: string | null) {
  return useQuery({
    queryKey: queryKeys.payments.detail(paymentSlug || ""),
    queryFn: () => getPaymentBySlug(paymentSlug!),
    ...getQueryOptions(STALE_TIME.PAYMENTS, GC_TIME.TRANSACTIONAL),
    enabled: !!paymentSlug,
  });
}

/**
 * Fetch payments for a specific party (customer/vendor)
 * Used in partner detail page to show payment history
 */
export function usePaymentsByParty({
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
    queryKey: queryKeys.payments.byParty(partyLedgerId || "", page),
    queryFn: () => getPaymentsByParty(partyLedgerId!, page, pageSize),
    ...getQueryOptions(STALE_TIME.PAYMENTS, GC_TIME.TRANSACTIONAL),
    placeholderData: keepPreviousData,
    enabled: enabled && !!partyLedgerId,
  });
}

/**
 * Fetch all payments for a specific invoice
 * Used in invoice detail page to show payment history
 * No pagination - fetches all payments (limit 100)
 */
export function usePaymentsByInvoice(invoiceId: string | null) {
  return useQuery({
    queryKey: queryKeys.payments.byInvoice(invoiceId || ""),
    queryFn: () => getPaymentsByInvoice(invoiceId!),
    ...getQueryOptions(STALE_TIME.PAYMENTS, GC_TIME.TRANSACTIONAL),
    enabled: !!invoiceId,
  });
}

/**
 * Fetch outstanding invoices for a party
 * Used in payment allocation step
 *
 * For payments: fetch purchase invoices (from suppliers)
 * For receipts: fetch sales invoices (from customers)
 */
export function useOutstandingInvoices({
  partyLedgerId,
  invoiceType,
  enabled = true,
}: {
  partyLedgerId: string | null;
  invoiceType: "sales" | "purchase";
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.payments.outstandingInvoices(
      partyLedgerId || "",
      invoiceType,
    ),
    queryFn: () => getOutstandingInvoices(partyLedgerId!, invoiceType),
    ...getQueryOptions(STALE_TIME.INVOICES, GC_TIME.TRANSACTIONAL),
    enabled: enabled && !!partyLedgerId,
  });
}

/**
 * Fetch counter ledgers (bank/cash accounts) for dropdown
 * Used in payment details step
 * Cached aggressively since these rarely change
 */
export function useCounterLedgers() {
  return useQuery({
    queryKey: queryKeys.payments.counterLedgers(),
    queryFn: () => getCounterLedgers(),
    ...getQueryOptions(STALE_TIME.LEDGERS, GC_TIME.MASTER_DATA), // Ledgers are master data
  });
}

/**
 * Payment mutations (create, update, delete)
 */
export function usePaymentMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (paymentData: CreatePaymentData) => createPayment(paymentData),
    onSuccess: () => {
      // Invalidate all payment queries
      queryClient.invalidateQueries({
        queryKey: ["payments"],
      });
      // Invalidate invoice queries (outstanding amounts updated)
      queryClient.invalidateQueries({
        queryKey: ["invoices"],
      });
      // Invalidate party ledger queries (balances updated)
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
      paymentId,
      data,
    }: {
      paymentId: string;
      data: Partial<TablesUpdate<"payments">>;
    }) => updatePayment(paymentId, data),
    onSuccess: () => {
      // Invalidate all payment queries
      queryClient.invalidateQueries({
        queryKey: ["payments"],
      });
    },
  });

  const updateWithAllocations = useMutation({
    mutationFn: ({
      paymentId,
      paymentData,
    }: {
      paymentId: string;
      paymentData: CreatePaymentData;
    }) => updatePaymentWithAllocations(paymentId, paymentData),
    onSuccess: () => {
      // Invalidate all payment queries
      queryClient.invalidateQueries({
        queryKey: ["payments"],
      });
      // Invalidate invoice queries (outstanding amounts updated)
      queryClient.invalidateQueries({
        queryKey: ["invoices"],
      });
      // Invalidate party ledger queries (balances updated)
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
      paymentId,
      reason,
    }: {
      paymentId: string;
      reason: string;
    }) => cancelPayment(paymentId, reason),
    onSuccess: () => {
      // Invalidate all payment queries
      queryClient.invalidateQueries({
        queryKey: ["payments"],
      });
      // Invalidate invoice queries (outstanding amounts may be affected)
      queryClient.invalidateQueries({
        queryKey: ["invoices"],
      });
      // Invalidate party ledger queries (balances updated)
      queryClient.invalidateQueries({
        queryKey: ["partners"],
      });
      // Invalidate dashboard (statistics updated)
      queryClient.invalidateQueries({
        queryKey: ["dashboard"],
      });
    },
  });

  const deletePayment_ = useMutation({
    mutationFn: (paymentId: string) => deletePayment(paymentId),
    onSuccess: () => {
      // Invalidate all payment queries
      queryClient.invalidateQueries({
        queryKey: ["payments"],
      });
      // Invalidate invoice queries (outstanding amounts updated)
      queryClient.invalidateQueries({
        queryKey: ["invoices"],
      });
      // Invalidate party ledger queries (balances updated)
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
    updateWithAllocations,
    cancel,
    delete: deletePayment_,
  };
}
