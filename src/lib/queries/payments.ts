import { createClient } from "@/lib/supabase/browser";
import type { TablesUpdate, Database, Json } from "@/types/database/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PaymentFilters,
  PaymentListView,
  PaymentDetailView,
  OutstandingInvoiceView,
  CounterLedgerView,
  CreatePaymentData,
} from "@/types/payments.types";

// Re-export types for convenience
export type {
  PaymentFilters,
  PaymentListView,
  PaymentDetailView,
  OutstandingInvoiceView,
  CounterLedgerView,
  CreatePaymentData,
};

// ============================================================================
// QUERY BUILDERS
// ============================================================================

/**
 * Query builder for fetching payments with optional filters and pagination
 */
export const buildPaymentsQuery = (
  supabase: SupabaseClient<Database>,
  filters?: PaymentFilters,
  page: number = 1,
  pageSize: number = 25,
) => {
  // Calculate pagination range
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("payments")
    .select(
      `
        id,
        payment_number,
        sequence_number,
				slug,
        voucher_type,
        payment_date,
        payment_mode,
        total_amount,
        tds_amount,
        net_amount,
        reference_number,
        reference_date,
        exported_to_tally_at,
        party_ledger:ledgers!party_ledger_id(id, name),
        counter_ledger:ledgers!counter_ledger_id(id, name),
        payment_allocations!inner(
          id,
          allocation_type,
          amount_applied,
          invoice:invoices!invoice_id(
            id,
            invoice_number
          )
        )
      `,
      { count: "exact" },
    )
    .is("deleted_at", null);

  // Apply voucher type filter
  if (filters?.voucher_type) {
    query = query.eq("voucher_type", filters.voucher_type);
  }

  // Apply party filter
  if (filters?.party_ledger_id) {
    query = query.eq("party_ledger_id", filters.party_ledger_id);
  }

  // Apply counter ledger filter
  if (filters?.counter_ledger_id) {
    query = query.eq("counter_ledger_id", filters.counter_ledger_id);
  }

  // Apply invoice filter (filter on payment_allocations)
  if (filters?.invoice_id) {
    query = query.eq("payment_allocations.invoice_id", filters.invoice_id);
  }

  // Apply payment mode filter
  if (filters?.payment_mode) {
    query = query.eq("payment_mode", filters.payment_mode);
  }

  // Apply date filter (single date)
  if (filters?.payment_date) {
    query = query.eq("payment_date", filters.payment_date);
  }

  // Apply date range filter
  if (filters?.date_from) {
    query = query.gte("payment_date", filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte("payment_date", filters.date_to);
  }

  // Apply full-text search filter
  if (filters?.search) {
    query = query.textSearch("search_vector", filters.search, {
      type: "websearch",
      config: "english",
    });
  }

  // Default ordering: most recent first
  query = query
    .order("payment_date", { ascending: false })
    .order("sequence_number", { ascending: false });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  return query;
};

/**
 * Query builder for fetching a single payment by slug
 */
export const buildPaymentBySlugQuery = (
  supabase: SupabaseClient<Database>,
  paymentSlug: string,
) => {
  return supabase
    .from("payments")
    .select(
      `
        *,
        party_ledger:ledgers!party_ledger_id(id, name, partner_id),
        counter_ledger:ledgers!counter_ledger_id(id, name),
        tds_ledger:ledgers!tds_ledger_id(id, name),
        payment_allocations!inner(
          *,
          invoice:invoices!invoice_id(
            id,
            slug,
            invoice_number,
            invoice_date,
            invoice_type,
            total_amount,
            outstanding_amount
          )
        )
      `,
    )
    .eq("slug", paymentSlug)
    .is("deleted_at", null)
    .single();
};

/**
 * Query builder for fetching outstanding invoices for a party
 */
export const buildOutstandingInvoicesQuery = (
  supabase: SupabaseClient<Database>,
  partyLedgerId: string,
  invoiceType: "sales" | "purchase",
) => {
  return supabase
    .from("invoices")
    .select(
      `
        id,
        invoice_number,
				slug,
        invoice_date,
        due_date,
        invoice_type,
        total_amount,
        outstanding_amount,
        status
      `,
    )
    .eq("party_ledger_id", partyLedgerId)
    .eq("invoice_type", invoiceType)
    .in("status", ["open", "partially_paid"])
    .gt("outstanding_amount", 0)
    .is("deleted_at", null)
    .order("due_date", { ascending: true });
};

/**
 * Query builder for fetching counter ledgers (bank/cash accounts)
 */
export const buildCounterLedgersQuery = (
  supabase: SupabaseClient<Database>,
) => {
  return supabase
    .from("ledgers")
    .select(
      `
        id,
        name,
        ledger_type,
        parent_group:parent_groups!parent_group_id(name)
      `,
    )
    .in("ledger_type", ["bank", "cash"])
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("name", { ascending: true });
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Fetch payments with optional filters and pagination
 * RLS automatically filters by company_id
 *
 * Examples:
 * - All payments: getPayments()
 * - Payments only: getPayments({ voucher_type: 'payment' })
 * - Search: getPayments({ search: 'PMT/2024-25/0001' })
 */
export async function getPayments(
  filters?: PaymentFilters,
  page: number = 1,
  pageSize: number = 25,
): Promise<{ data: PaymentListView[]; totalCount: number }> {
  const supabase = createClient();
  const { data, count, error } = await buildPaymentsQuery(
    supabase,
    filters,
    page,
    pageSize,
  );

  if (error) {
    throw error;
  }

  return {
    data: data || [],
    totalCount: count || 0,
  };
}

/**
 * Fetch a single payment by payment number
 * Returns complete payment with allocations, ledgers
 */
export async function getPaymentBySlug(
  paymentSlug: string,
): Promise<PaymentDetailView> {
  const supabase = createClient();
  const { data, error } = await buildPaymentBySlugQuery(supabase, paymentSlug);

  if (error) throw error;
  if (!data) throw new Error("Payment not found");

  return data;
}

/**
 * Fetch payments for a specific party (customer/vendor)
 * Used in partner detail page to show payment history
 */
export async function getPaymentsByParty(
  partyLedgerId: string,
  page: number = 1,
  pageSize: number = 25,
): Promise<{ data: PaymentListView[]; totalCount: number }> {
  return getPayments({ party_ledger_id: partyLedgerId }, page, pageSize);
}

/**
 * Fetch all payments for a specific invoice
 * Used in invoice detail page to show payment history
 * No pagination - fetches all payments (limit 100)
 */
export async function getPaymentsByInvoice(
  invoiceId: string,
): Promise<PaymentListView[]> {
  const result = await getPayments({ invoice_id: invoiceId }, 1, 100);
  return result.data;
}

/**
 * Fetch outstanding invoices for a party
 * Used in payment allocation step
 *
 * For payments: fetch purchase invoices (from suppliers)
 * For receipts: fetch sales invoices (from customers)
 */
export async function getOutstandingInvoices(
  partyLedgerId: string,
  invoiceType: "sales" | "purchase",
): Promise<OutstandingInvoiceView[]> {
  const supabase = createClient();
  const { data, error } = await buildOutstandingInvoicesQuery(
    supabase,
    partyLedgerId,
    invoiceType,
  );

  if (error) throw error;

  return data || [];
}

/**
 * Fetch counter ledgers (bank/cash accounts) for dropdown
 * Used in payment details step
 */
export async function getCounterLedgers(): Promise<CounterLedgerView[]> {
  const supabase = createClient();
  const { data, error } = await buildCounterLedgersQuery(supabase);

  if (error) throw error;

  return data || [];
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new payment (payment or receipt) with allocations
 * Uses RPC function for atomic transaction
 * Returns the created payment ID
 */
export async function createPayment(
  paymentData: CreatePaymentData,
): Promise<string> {
  const supabase = createClient();

  const { data: paymentId, error } = await supabase.rpc(
    "create_payment_with_allocations",
    {
      p_voucher_type: paymentData.voucher_type,
      p_party_ledger_id: paymentData.party_ledger_id,
      p_counter_ledger_id: paymentData.counter_ledger_id,
      p_payment_date: paymentData.payment_date,
      p_payment_mode: paymentData.payment_mode,
      p_reference_number: paymentData.reference_number,
      p_reference_date: paymentData.reference_date,
      p_total_amount: paymentData.total_amount,
      p_tds_applicable: paymentData.tds_applicable,
      p_tds_rate: paymentData.tds_rate,
      p_tds_ledger_id: paymentData.tds_ledger_id,
      p_notes: paymentData.notes,
      p_attachments: paymentData.attachments,
      p_allocations: paymentData.allocations as unknown as Json,
      p_company_id: undefined, // Set by RPC from JWT
    },
  );

  if (error) throw error;
  if (!paymentId) throw new Error("No payment ID returned");

  return paymentId as string;
}

/**
 * Update payment fields (generic update for any fields)
 * Note: Cannot update payments exported to Tally
 */
export async function updatePayment(
  paymentId: string,
  data: Partial<TablesUpdate<"payments">>,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("payments")
    .update(data)
    .eq("id", paymentId);

  if (error) throw error;
}

/**
 * Update payment with allocations (complete update)
 * Uses RPC function for atomic transaction
 * Validates business rules: cannot update if cancelled or exported to Tally
 */
export async function updatePaymentWithAllocations(
  paymentId: string,
  paymentData: CreatePaymentData,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc("update_payment_with_allocations", {
    p_payment_id: paymentId,
    p_party_ledger_id: paymentData.party_ledger_id,
    p_counter_ledger_id: paymentData.counter_ledger_id,
    p_payment_date: paymentData.payment_date,
    p_payment_mode: paymentData.payment_mode,
    p_reference_number: paymentData.reference_number,
    p_reference_date: paymentData.reference_date,
    p_total_amount: paymentData.total_amount,
    p_tds_applicable: paymentData.tds_applicable,
    p_tds_rate: paymentData.tds_rate,
    p_tds_ledger_id: paymentData.tds_ledger_id,
    p_notes: paymentData.notes,
    p_attachments: paymentData.attachments,
    p_allocations: paymentData.allocations as unknown as Json,
  });

  if (error) throw error;
}

/**
 * Delete a payment (soft delete)
 * Can only delete if not exported to Tally
 */
/**
 * Cancel a payment
 * Sets is_cancelled = true
 * Can only cancel if:
 * - Not already cancelled
 * Requires a cancellation reason
 */
export async function cancelPayment(
  paymentId: string,
  cancellationReason: string,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("payments")
    .update({
      is_cancelled: true,
      cancellation_reason: cancellationReason,
    })
    .eq("id", paymentId);

  if (error) {
    throw error;
  }
}

export async function deletePayment(paymentId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("payments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", paymentId)
    .is("exported_to_tally_at", null);

  if (error) {
    throw error;
  }
}
