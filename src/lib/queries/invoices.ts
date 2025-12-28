import { createClient } from "@/lib/supabase/browser";
import type { TablesUpdate } from "@/types/database/supabase";
import type {
  InvoiceListView,
  InvoiceDetailView,
  InvoiceFilters,
  CreateInvoiceData,
} from "@/types/invoices.types";

// Re-export types for convenience
export type {
  InvoiceListView,
  InvoiceDetailView,
  InvoiceFilters,
  CreateInvoiceData,
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Fetch invoices with optional filters and pagination
 * RLS automatically filters by company_id and warehouse access
 *
 * Examples:
 * - All invoices: getInvoices()
 * - Sales only: getInvoices({ invoice_type: 'sales' })
 * - Search: getInvoices({ search: 'customer name' })
 */
export async function getInvoices(
  filters?: InvoiceFilters,
  page: number = 1,
  pageSize: number = 25,
): Promise<{ data: InvoiceListView[]; totalCount: number }> {
  const supabase = createClient();

  // Calculate pagination range
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("invoices")
    .select(
      `
        id,
        invoice_number,
        sequence_number,
				slug,
        invoice_type,
        invoice_date,
        due_date,
        status,
        total_amount,
        outstanding_amount,
        party_name,
        party_display_name,
        warehouse_id,
        has_payment,
        exported_to_tally_at,
        invoice_items!inner(
          *,
          product:product_id(
            id, name, stock_type, measuring_unit, product_images, sequence_number
          )
        )
      `,
      { count: "exact" },
    )
    .is("deleted_at", null);

  // Apply invoice type filter
  if (filters?.invoice_type) {
    query = query.eq("invoice_type", filters.invoice_type);
  }

  // Apply status filter
  if (filters?.status) {
    query = query.eq("status", filters.status);
  }

  // Apply party filter
  if (filters?.party_id) {
    query = query.eq("party_ledger_id", filters.party_id);
  }

  // Apply warehouse filter
  if (filters?.warehouse_id) {
    query = query.eq("warehouse_id", filters.warehouse_id);
  }

  // Apply date filter (single date)
  if (filters?.date) {
    query = query.eq("invoice_date", filters.date);
  }

  // Apply date range filter
  if (filters?.date_from) {
    query = query.gte("invoice_date", filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte("invoice_date", filters.date_to);
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
    .order("invoice_date", { ascending: false })
    .order("sequence_number", { ascending: false });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, count, error } = await query;

  if (error) {
    throw error;
  }

  return {
    data: data as InvoiceListView[],
    totalCount: count || 0,
  };
}

/**
 * Fetch a single invoice by invoice slug
 * Returns complete invoice with items, party ledger, and warehouse
 */
export async function getInvoiceBySlug(
  invoiceSlug: string,
): Promise<InvoiceDetailView> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("invoices")
    .select(
      `
        *,
        invoice_items!inner(
          *,
          product:product_id(
            id, name, stock_type, measuring_unit, product_images, sequence_number
          )
        ),
        party_ledger:party_ledger_id(id, name, partner_id),
        warehouse:warehouse_id(id, name)
      `,
    )
    .eq("slug", invoiceSlug)
    .is("deleted_at", null)
    .single<InvoiceDetailView>();

  if (error) throw error;
  if (!data) throw new Error("Invoice not found");

  return data;
}

/**
 * Fetch invoices for a specific party (customer/vendor)
 * Used in partner detail page to show invoice history
 */
export async function getInvoicesByParty(
  partyLedgerId: string,
  page: number = 1,
  pageSize: number = 25,
): Promise<{ data: InvoiceListView[]; totalCount: number }> {
  return getInvoices({ party_id: partyLedgerId }, page, pageSize);
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new invoice (sales or purchase) with items
 * Uses RPC function for atomic transaction
 * Returns the created invoice ID
 */
export async function createInvoice(
  invoiceData: CreateInvoiceData,
): Promise<string> {
  const supabase = createClient();

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { data: invoiceId, error } = await supabase.rpc(
    "create_invoice_with_items",
    {
      p_invoice_type: invoiceData.invoice_type,
      p_party_ledger_id: invoiceData.party_ledger_id,
      p_counter_ledger_id: invoiceData.counter_ledger_id,
      p_warehouse_id: invoiceData.warehouse_id,
      p_invoice_date: invoiceData.invoice_date,
      p_payment_terms: invoiceData.payment_terms,
      p_due_date: invoiceData.due_date,
      p_tax_type: invoiceData.tax_type,
      p_discount_type: invoiceData.discount_type,
      p_discount_value: invoiceData.discount_value,
      p_supplier_invoice_number: invoiceData.supplier_invoice_number || null,
      p_supplier_invoice_date: invoiceData.supplier_invoice_date || null,
      p_notes: invoiceData.notes,
      p_attachments: null, // Attachments not implemented yet
      p_items: invoiceData.items,
      p_goods_movement_ids: null, // Goods movements not linked yet
      p_company_id: undefined, // Set by RPC from JWT
    },
  );

  if (error) throw error;
  if (!invoiceId) throw new Error("No invoice ID returned");

  return invoiceId as string;
}

/**
 * Update invoice fields (generic update for any fields)
 * Note: Cannot update invoices with payments or exported to Tally
 */
export async function updateInvoice(
  invoiceId: string,
  data: Partial<TablesUpdate<"invoices">>,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("invoices")
    .update(data)
    .eq("id", invoiceId);

  if (error) throw error;
}

/**
 * Update invoice with items (complete update)
 * Uses RPC function for atomic transaction
 * Validates business rules: cannot update if cancelled, exported, has payments, or adjustments
 */
export async function updateInvoiceWithItems(
  invoiceId: string,
  invoiceData: CreateInvoiceData,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc("update_invoice_with_items", {
    p_invoice_id: invoiceId,
    p_party_ledger_id: invoiceData.party_ledger_id,
    p_counter_ledger_id: invoiceData.counter_ledger_id,
    p_warehouse_id: invoiceData.warehouse_id,
    p_invoice_date: invoiceData.invoice_date,
    p_payment_terms: invoiceData.payment_terms,
    p_due_date: invoiceData.due_date,
    p_tax_type: invoiceData.tax_type,
    p_discount_type: invoiceData.discount_type,
    p_discount_value: invoiceData.discount_value,
    p_supplier_invoice_number: invoiceData.supplier_invoice_number || null,
    p_supplier_invoice_date: invoiceData.supplier_invoice_date || null,
    p_notes: invoiceData.notes,
    p_attachments: null, // Attachments not implemented yet
    p_items: invoiceData.items,
  });

  if (error) throw error;
}

/**
 * Cancel an invoice
 * Sets is_cancelled = true and status = 'cancelled'
 * Can only cancel if:
 * - No payments allocated (has_payment = false)
 * - No adjustments allocated (has_adjustment = false)
 * - Not already cancelled
 * Requires a cancellation reason
 */
export async function cancelInvoice(
  invoiceId: string,
  cancellationReason: string,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("invoices")
    .update({
      is_cancelled: true,
      cancellation_reason: cancellationReason,
    })
    .eq("id", invoiceId);

  if (error) {
    throw error;
  }
}

/**
 * Delete an invoice (soft delete)
 * Can only delete if:
 * - No payments allocated (has_payment = false)
 * - No adjustments allocated (has_adjustment = false)
 * - Not exported to Tally (exported_to_tally_at IS NULL)
 */
export async function deleteInvoice(invoiceId: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("invoices")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", invoiceId);

  if (error) {
    throw error;
  }
}
