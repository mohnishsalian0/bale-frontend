import type { Tables } from "./database/supabase";
import type { QueryData } from "@supabase/supabase-js";
import type {
  VoucherType,
  PaymentMode,
  AllocationType,
} from "./database/enums";
import {
  buildPaymentsQuery,
  buildPaymentBySlugQuery,
  buildOutstandingInvoicesQuery,
  buildCounterLedgersQuery,
} from "@/lib/queries/payments";

// Base types from database (still needed for non-query uses)
export type Payment = Tables<"payments">;
export type PaymentAllocation = Tables<"payment_allocations">;

// ============================================================================
// FILTERS
// ============================================================================

export interface PaymentFilters extends Record<string, unknown> {
  voucher_type?: VoucherType; // Filter by payment or receipt
  party_ledger_id?: string; // Filter by party
  counter_ledger_id?: string; // Filter by bank/cash account
  invoice_id?: string; // Filter by invoice (via payment_allocations)
  payment_date?: string; // Single date filter (YYYY-MM-DD)
  date_from?: string; // Date range start
  date_to?: string; // Date range end
  payment_mode?: PaymentMode; // Filter by payment mode
  search?: string; // Search term for payment_number, party_name, reference_number
}

// =====================================================
// LIST VIEW TYPES (for payment list pages)
// =====================================================

/**
 * Payment with minimal details for list views
 * Type inferred from buildPaymentsQuery
 * Used in: payment list page, partner detail page
 */
export type PaymentListView = QueryData<
  ReturnType<typeof buildPaymentsQuery>
>[number];

/**
 * Payment allocation with minimal details for list views
 * Extracted from PaymentListView nested array
 */
export type PaymentAllocationListView =
  PaymentListView["payment_allocations"][number];

// =====================================================
// DETAIL VIEW TYPES (for payment detail page)
// =====================================================

/**
 * Payment with complete details
 * Type inferred from buildPaymentBySlugQuery
 * Used in: payment detail page
 */
export type PaymentDetailView = QueryData<
  ReturnType<typeof buildPaymentBySlugQuery>
>;

/**
 * Payment allocation with invoice details (for detail view)
 * Extracted from PaymentDetailView nested array
 */
export type PaymentAllocationDetailView =
  PaymentDetailView["payment_allocations"][number];

// =====================================================
// OUTSTANDING INVOICES (for allocation step)
// =====================================================

/**
 * Invoice with outstanding amount for payment allocation
 * Type inferred from buildOutstandingInvoicesQuery
 * Used in: payment creation flow allocation step
 */
export type OutstandingInvoiceView = QueryData<
  ReturnType<typeof buildOutstandingInvoicesQuery>
>[number];

// =====================================================
// COUNTER LEDGERS (for counter ledger selection)
// =====================================================

/**
 * Bank/Cash ledger for counter ledger selection
 * Type inferred from buildCounterLedgersQuery
 * Used in: payment creation flow details step
 */
export type CounterLedgerView = QueryData<
  ReturnType<typeof buildCounterLedgersQuery>
>[number];

// =====================================================
// CREATE/UPDATE TYPES (for mutations)
// =====================================================

/**
 * Allocation data for creating a payment
 * Used in: create payment flow
 */
export interface CreatePaymentAllocation {
  allocation_type: AllocationType; // 'against_ref' or 'advance'
  invoice_id?: string | null; // Required for against_ref, null for advance
  amount_applied: number; // Must be > 0
}

/**
 * Data for creating a new payment
 * Used in: create payment flow
 */
export interface CreatePaymentData {
  voucher_type: VoucherType; // 'payment' or 'receipt'
  party_ledger_id: string;
  counter_ledger_id: string;
  payment_date: string; // ISO format (YYYY-MM-DD)
  payment_mode: PaymentMode;
  total_amount: number;
  tds_applicable: boolean;
  allocations: CreatePaymentAllocation[];
  reference_number?: string;
  reference_date?: string; // ISO format (YYYY-MM-DD)
  tds_rate?: number; // Required if tds_applicable = true
  tds_ledger_id?: string; // Required if tds_applicable = true
  notes?: string;
  attachments?: string[]; // Array of file URLs
}
