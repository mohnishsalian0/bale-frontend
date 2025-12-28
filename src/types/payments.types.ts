import type { Tables } from "./database/supabase";
import type {
  VoucherType,
  PaymentMode,
  AllocationType,
} from "./database/enums";

// Base types from database
export type Payment = Tables<"payments">;
export type PaymentAllocation = Tables<"payment_allocations">;
type Ledger = Tables<"ledgers">;
type Invoice = Tables<"invoices">;
type ParentGroup = Tables<"parent_groups">;

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
 * Payment allocation with minimal details for list views
 */
export interface PaymentAllocationListView {
  id: string;
  allocation_type: AllocationType;
  amount_applied: number;
  invoice: Pick<Invoice, "id" | "invoice_number"> | null;
}

/**
 * Payment with minimal details for list views
 * Used in: payment list page, partner detail page
 * Note: party and counter ledger info fetched via JOIN, not snapshots
 */
export interface PaymentListView extends Pick<
  Payment,
  | "id"
  | "payment_number"
  | "sequence_number"
  | "slug"
  | "voucher_type"
  | "payment_date"
  | "payment_mode"
  | "total_amount"
  | "tds_amount"
  | "net_amount"
  | "reference_number"
  | "exported_to_tally_at"
> {
  party_ledger: Pick<Ledger, "id" | "name"> | null;
  counter_ledger: Pick<Ledger, "id" | "name"> | null;
  payment_allocations: PaymentAllocationListView[];
  reference_date: string | null;
}

// =====================================================
// DETAIL VIEW TYPES (for payment detail page)
// =====================================================

/**
 * Payment allocation with invoice details (for detail view)
 */
export interface PaymentAllocationDetailView extends PaymentAllocation {
  invoice: Pick<
    Invoice,
    | "id"
    | "slug"
    | "invoice_number"
    | "invoice_date"
    | "invoice_type"
    | "total_amount"
    | "outstanding_amount"
  > | null;
}

/**
 * Payment with complete details (for payment detail page)
 * Includes party ledger, counter ledger, TDS ledger, and allocations
 */
export interface PaymentDetailView extends Payment {
  party_ledger: Pick<Ledger, "id" | "name" | "partner_id"> | null;
  counter_ledger: Pick<Ledger, "id" | "name"> | null;
  tds_ledger: Pick<Ledger, "id" | "name"> | null;
  payment_allocations: PaymentAllocationDetailView[];
}

// =====================================================
// OUTSTANDING INVOICES (for allocation step)
// =====================================================

/**
 * Invoice with outstanding amount for payment allocation
 * Used in: payment creation flow allocation step
 */
export type OutstandingInvoiceView = Pick<
  Invoice,
  | "id"
  | "invoice_number"
  | "invoice_date"
  | "due_date"
  | "invoice_type"
  | "total_amount"
  | "outstanding_amount"
  | "status"
>;

// =====================================================
// COUNTER LEDGERS (for counter ledger selection)
// =====================================================

/**
 * Bank/Cash ledger for counter ledger selection
 * Used in: payment creation flow details step
 */
export interface CounterLedgerView extends Pick<
  Ledger,
  "id" | "name" | "ledger_type"
> {
  parent_group: Pick<ParentGroup, "name"> | null;
}

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
  reference_number: string | null;
  reference_date: string | null; // ISO format (YYYY-MM-DD)
  total_amount: number;
  tds_applicable: boolean;
  tds_rate: number | null; // Required if tds_applicable = true
  tds_ledger_id: string | null; // Required if tds_applicable = true
  notes: string | null;
  attachments: string[] | null; // Array of file URLs
  allocations: CreatePaymentAllocation[];
}
