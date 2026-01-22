import type { Tables } from "./database/supabase";
import type { QueryData } from "@supabase/supabase-js";
import type { AdjustmentType } from "./database/enums";
import {
  buildAdjustmentNotesQuery,
  buildAdjustmentNoteBySlugQuery,
  buildInvoiceForAdjustmentQuery,
} from "@/lib/queries/adjustment-notes";

// Base types from database (still needed for non-query uses)
export type AdjustmentNote = Tables<"adjustment_notes">;
export type AdjustmentNoteItem = Tables<"adjustment_note_items">;

// ============================================================================
// FILTERS
// ============================================================================

export interface AdjustmentNoteFilters extends Record<string, unknown> {
  adjustment_type?: AdjustmentType | AdjustmentType[];
  invoice_id?: string;
  warehouse_id?: string;
  party_ledger_id?: string;
  date?: string; // Specific date filter (YYYY-MM-DD)
  date_from?: string; // Date range start (YYYY-MM-DD)
  date_to?: string; // Date range end (YYYY-MM-DD)
  search_term?: string;
  exported_to_tally?: boolean; // Filter by export status
}

// ============================================================================
// LIST VIEW
// ============================================================================

/**
 * Adjustment note with minimal details for list views
 * Type inferred from buildAdjustmentNotesQuery
 * Used in: adjustment notes list page, invoice adjustments tab
 */
export type AdjustmentNoteListView = QueryData<
  ReturnType<typeof buildAdjustmentNotesQuery>
>[number];

/**
 * Adjustment note item with minimal details for list views
 * Extracted from AdjustmentNoteListView nested array
 */
export type AdjustmentNoteItemListView =
  AdjustmentNoteListView["adjustment_note_items"][number];

// ============================================================================
// DETAIL VIEW
// ============================================================================

/**
 * Complete adjustment note with all nested relations
 * Type inferred from buildAdjustmentNoteBySlugQuery
 * Used in: adjustment note detail page
 */
export type AdjustmentNoteDetailView = QueryData<
  ReturnType<typeof buildAdjustmentNoteBySlugQuery>
>;

/**
 * Adjustment note item with product details for detail view
 * Extracted from AdjustmentNoteDetailView nested array
 */
export type AdjustmentNoteItemDetailView =
  AdjustmentNoteDetailView["adjustment_note_items"][number];

// ============================================================================
// INVOICE FOR ADJUSTMENT
// ============================================================================

/**
 * Invoice data needed for adjustment note creation
 * Type inferred from buildInvoiceForAdjustmentQuery
 * Includes items with original tax rates
 */
export type InvoiceForAdjustment = QueryData<
  ReturnType<typeof buildInvoiceForAdjustmentQuery>
>;

/**
 * Invoice item with original tax rate for adjustment note creation
 * Extracted from InvoiceForAdjustment nested array
 * Used in: product selection step to enforce quantity limits and preserve tax rates
 */
export type InvoiceItemForAdjustment =
  InvoiceForAdjustment["invoice_items"][number];

// ============================================================================
// CREATE/UPDATE TYPES
// ============================================================================

/**
 * Data structure for creating an adjustment note item
 * Used in: adjustment note creation forms
 */
export interface CreateAdjustmentNoteItem {
  product_id: string;
  quantity: number;
  rate: number;
  gst_rate: number; // CRITICAL: Must use rate from original invoice item (tax rate versioning)
}

/**
 * Data structure for creating an adjustment note
 * Used in: adjustment note creation forms
 */
export interface CreateAdjustmentNoteData {
  invoice_id: string;
  warehouse_id: string;
  counter_ledger_id: string; // Sales Return/Purchase Return ledger for double-entry
  adjustment_type: AdjustmentType;
  adjustment_date: string; // ISO date string
  reason: string; // Mandatory for audit trail
  notes?: string;
  attachments?: string[];
  items: CreateAdjustmentNoteItem[];
}
