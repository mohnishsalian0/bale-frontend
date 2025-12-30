import type { Tables } from "./database/supabase";
import type { AdjustmentType } from "./database/enums";

// Base types from database
export type AdjustmentNote = Tables<"adjustment_notes">;
export type AdjustmentNoteItem = Tables<"adjustment_note_items">;
type Invoice = Tables<"invoices">;
type Ledger = Tables<"ledgers">;
type Warehouse = Tables<"warehouses">;
type Product = Tables<"products">;

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
 * Adjustment note item with minimal details for list views
 */
export interface AdjustmentNoteItemListView {
  id: string;
  product_id: string;
  quantity: number;
  rate: number;
  product: Pick<
    Product,
    | "id"
    | "name"
    | "stock_type"
    | "measuring_unit"
    | "product_images"
    | "sequence_number"
  > | null;
}

/**
 * Adjustment note with minimal details for list views
 * Used in: adjustment notes list page, invoice adjustments tab
 */
export interface AdjustmentNoteListView extends AdjustmentNote {
  invoice: Pick<
    Invoice,
    | "id"
    | "invoice_number"
    | "invoice_type"
    | "total_amount"
    | "outstanding_amount"
  > | null;
  warehouse: Pick<Warehouse, "id" | "name"> | null;
  adjustment_note_items: AdjustmentNoteItemListView[];
}

// ============================================================================
// DETAIL VIEW
// ============================================================================

/**
 * Adjustment note item with product details for detail view
 * Used in: adjustment note detail page
 */
export interface AdjustmentNoteItemDetailView extends AdjustmentNoteItem {
  product: Pick<
    Product,
    | "id"
    | "name"
    | "stock_type"
    | "measuring_unit"
    | "product_images"
    | "sequence_number"
  > | null;
}

/**
 * Complete adjustment note with all nested relations
 * Used in: adjustment note detail page
 */
export interface AdjustmentNoteDetailView extends AdjustmentNote {
  invoice: Pick<
    Invoice,
    | "id"
    | "invoice_number"
    | "slug"
    | "invoice_type"
    | "invoice_date"
    | "tax_type"
    | "total_amount"
    | "outstanding_amount"
  > | null;
  warehouse: Pick<Warehouse, "id" | "name"> | null;
  party_ledger: Pick<Ledger, "id" | "name" | "partner_id"> | null;
  adjustment_note_items: AdjustmentNoteItemDetailView[];
}

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
  notes: string | null;
  attachments: string[] | null;
  items: CreateAdjustmentNoteItem[];
}

/**
 * Invoice item with original tax rate for adjustment note creation
 * Used in: product selection step to enforce quantity limits and preserve tax rates
 */
export interface InvoiceItemForAdjustment extends Pick<
  Tables<"invoice_items">,
  | "id"
  | "product_id"
  | "quantity"
  | "rate"
  | "taxable_amount"
  | "gst_rate"
  | "product_name"
  | "product_hsn_code"
> {
  product: Pick<
    Product,
    | "id"
    | "name"
    | "stock_type"
    | "measuring_unit"
    | "product_images"
    | "sequence_number"
  > | null;
}

/**
 * Invoice data needed for adjustment note creation
 * Includes items with original tax rates
 */
export interface InvoiceForAdjustment extends Pick<
  Invoice,
  | "id"
  | "invoice_number"
  | "invoice_type"
  | "invoice_date"
  | "tax_type"
  | "total_amount"
  | "outstanding_amount"
  | "party_ledger_id"
  | "warehouse_id"
  | "party_name"
  | "party_display_name"
> {
  invoice_items: InvoiceItemForAdjustment[];
  warehouse: Pick<Warehouse, "id" | "name"> | null;
}
