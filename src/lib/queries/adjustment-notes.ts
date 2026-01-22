import { createClient } from "@/lib/supabase/browser";
import type { Database, Json } from "@/types/database/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AdjustmentNoteFilters,
  AdjustmentNoteListView,
  AdjustmentNoteDetailView,
  InvoiceForAdjustment,
  CreateAdjustmentNoteData,
} from "@/types/adjustment-notes.types";

// Re-export types for convenience
export type {
  AdjustmentNoteFilters,
  AdjustmentNoteListView,
  AdjustmentNoteDetailView,
  InvoiceForAdjustment,
  CreateAdjustmentNoteData,
};

// ============================================================================
// QUERY BUILDERS
// ============================================================================

/**
 * Query builder for fetching adjustment notes with optional filters and pagination
 */
export const buildAdjustmentNotesQuery = (
  supabase: SupabaseClient<Database>,
  filters?: AdjustmentNoteFilters,
  page: number = 1,
  pageSize: number = 25,
) => {
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("adjustment_notes")
    .select(
      `
        *,
        invoice:invoices!invoice_id(
          id,
          invoice_number,
          invoice_type,
          total_amount,
          outstanding_amount
        ),
        warehouse:warehouses!warehouse_id(
          id,
          name
        ),
        adjustment_note_items!inner(
          id,
          product_id,
          quantity,
          rate,
          product:products!product_id(
            id,
            name,
            stock_type,
            measuring_unit,
            product_images,
            sequence_number
          )
        )
      `,
      { count: "exact" },
    )
    .is("deleted_at", null);

  // Apply adjustment type filter (supports single or array)
  if (filters?.adjustment_type) {
    if (Array.isArray(filters.adjustment_type)) {
      query = query.in("adjustment_type", filters.adjustment_type);
    } else {
      query = query.eq("adjustment_type", filters.adjustment_type);
    }
  }

  // Apply invoice filter
  if (filters?.invoice_id) {
    query = query.eq("invoice_id", filters.invoice_id);
  }

  // Apply warehouse filter
  if (filters?.warehouse_id) {
    query = query.eq("warehouse_id", filters.warehouse_id);
  }

  // Apply party ledger filter
  if (filters?.party_ledger_id) {
    query = query.eq("party_ledger_id", filters.party_ledger_id);
  }

  // Apply specific date filter
  if (filters?.date) {
    query = query.eq("adjustment_date", filters.date);
  }

  // Apply date range filters
  if (filters?.date_from) {
    query = query.gte("adjustment_date", filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte("adjustment_date", filters.date_to);
  }

  // Apply export status filter
  if (filters?.exported_to_tally !== undefined) {
    if (filters.exported_to_tally) {
      query = query.not("exported_to_tally_at", "is", null);
    } else {
      query = query.is("exported_to_tally_at", null);
    }
  }

  // Apply search filter (search_vector full-text search)
  if (filters?.search_term && filters.search_term.trim() !== "") {
    query = query.textSearch("search_vector", filters.search_term.trim(), {
      type: "websearch",
      config: "english",
    });
  }

  // Order by adjustment date descending (newest first)
  query = query.order("adjustment_date", { ascending: false });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  return query;
};

/**
 * Query builder for fetching a single adjustment note by slug
 */
export const buildAdjustmentNoteBySlugQuery = (
  supabase: SupabaseClient<Database>,
  adjustmentSlug: string,
) => {
  return supabase
    .from("adjustment_notes")
    .select(
      `
        *,
        invoice:invoices!invoice_id(
          id,
          invoice_number,
					slug,
          invoice_type,
          invoice_date,
          tax_type,
          total_amount,
          outstanding_amount
        ),
        warehouse:warehouses!warehouse_id(
          id,
          name
        ),
        party_ledger:ledgers!party_ledger_id(
          id,
          name,
          partner_id
        ),
        adjustment_note_items!inner(
					*,
          product:products!product_id(
            id,
            name,
            stock_type,
            measuring_unit,
            product_images,
            sequence_number
          )
        )
      `,
    )
    .eq("slug", adjustmentSlug)
    .is("deleted_at", null)
    .single();
};

/**
 * Query builder for fetching invoice with items for adjustment note creation
 */
export const buildInvoiceForAdjustmentQuery = (
  supabase: SupabaseClient<Database>,
  invoiceNumber: string,
) => {
  return supabase
    .from("invoices")
    .select(
      `
        id,
        invoice_number,
        invoice_type,
        invoice_date,
        tax_type,
        total_amount,
        outstanding_amount,
        party_ledger_id,
        warehouse_id,
        party_name,
        party_display_name,
        warehouse:warehouses!warehouse_id(
          id,
          name
        ),
        invoice_items!inner(
          id,
          product_id,
          quantity,
          rate,
          taxable_amount,
          gst_rate,
          product_name,
          product_hsn_code,
          product:products!product_id(
            id,
            name,
            stock_type,
            measuring_unit,
            product_images,
            sequence_number
          )
        )
      `,
    )
    .eq("invoice_number", invoiceNumber)
    .is("deleted_at", null)
    .single();
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Fetch adjustment notes with optional filters and pagination
 * Used in: adjustment notes list page
 */
export async function getAdjustmentNotes(
  filters?: AdjustmentNoteFilters,
  page: number = 1,
  pageSize: number = 25,
): Promise<{ data: AdjustmentNoteListView[]; totalCount: number }> {
  const supabase = createClient();
  const { data, error, count } = await buildAdjustmentNotesQuery(
    supabase,
    filters,
    page,
    pageSize,
  );

  if (error) throw error;

  return {
    data: data || [],
    totalCount: count || 0,
  };
}

/**
 * Fetch a single adjustment note by adjustment slug
 * Used in: adjustment note detail page
 */
export async function getAdjustmentNoteBySlug(
  adjustmentSlug: string,
): Promise<AdjustmentNoteDetailView> {
  const supabase = createClient();
  const { data, error } = await buildAdjustmentNoteBySlugQuery(
    supabase,
    adjustmentSlug,
  );

  if (error) throw error;
  if (!data) throw new Error("Adjustment note not found");

  return data;
}

/**
 * Fetch adjustment notes for a specific invoice
 * Used in: invoice detail page adjustments tab
 */
export async function getAdjustmentNotesByInvoice(
  invoiceId: string,
  page: number = 1,
  pageSize: number = 25,
): Promise<{ data: AdjustmentNoteListView[]; totalCount: number }> {
  return getAdjustmentNotes({ invoice_id: invoiceId }, page, pageSize);
}

/**
 * Fetch invoice with items for adjustment note creation
 * Includes original tax rates from invoice items (tax rate versioning)
 * Used in: adjustment note creation flow
 */
export async function getInvoiceForAdjustment(
  invoiceNumber: string,
): Promise<InvoiceForAdjustment> {
  const supabase = createClient();
  const { data, error } = await buildInvoiceForAdjustmentQuery(
    supabase,
    invoiceNumber,
  );

  if (error) throw error;
  if (!data) throw new Error("Invoice not found");

  return data;
}

/**
 * Create adjustment note with items
 * Calls RPC function for atomic transaction
 */
export async function createAdjustmentNote(
  data: CreateAdjustmentNoteData,
): Promise<string> {
  const supabase = createClient();

  const { data: adjustmentNumber, error } = await supabase.rpc(
    "create_adjustment_note_with_items",
    {
      p_invoice_id: data.invoice_id,
      p_warehouse_id: data.warehouse_id,
      p_counter_ledger_id: data.counter_ledger_id,
      p_adjustment_type: data.adjustment_type,
      p_adjustment_date: data.adjustment_date,
      p_reason: data.reason,
      p_notes: data.notes,
      p_attachments: data.attachments,
      p_items: data.items as unknown as Json,
    },
  );

  if (error) throw error;
  if (!adjustmentNumber) throw new Error("No adjustment number returned");

  return adjustmentNumber as string;
}

/**
 * Update adjustment note (non-critical fields only)
 * Cannot update if has_payment or exported_to_tally
 */
export async function updateAdjustmentNote(
  id: string,
  data: Partial<{
    reason: string;
    notes?: string;
    attachments?: string[];
  }>,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("adjustment_notes")
    .update(data)
    .eq("id", id);

  if (error) throw error;
}

/**
 * Update adjustment note with items (complete update)
 * Uses RPC function for atomic transaction
 * Validates business rules: cannot update if cancelled or exported to Tally
 */
export async function updateAdjustmentNoteWithItems(
  adjustmentNoteId: string,
  data: CreateAdjustmentNoteData,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc("update_adjustment_note_with_items", {
    p_adjustment_note_id: adjustmentNoteId,
    p_invoice_id: data.invoice_id,
    p_warehouse_id: data.warehouse_id,
    p_counter_ledger_id: data.counter_ledger_id,
    p_adjustment_date: data.adjustment_date,
    p_reason: data.reason,
    p_notes: data.notes,
    p_attachments: data.attachments || undefined,
    p_items: data.items as unknown as Json,
  });

  if (error) throw error;
}

/**
 * Cancel an adjustment note
 * Sets is_cancelled = true
 * Can only cancel if:
 * - Not already cancelled
 * Requires a cancellation reason
 */
export async function cancelAdjustmentNote(
  id: string,
  cancellationReason: string,
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("adjustment_notes")
    .update({
      is_cancelled: true,
      cancellation_reason: cancellationReason,
    })
    .eq("id", id);

  if (error) throw error;
}

/**
 * Soft delete adjustment note
 * Cannot delete if exported_to_tally
 */
export async function deleteAdjustmentNote(id: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("adjustment_notes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}
