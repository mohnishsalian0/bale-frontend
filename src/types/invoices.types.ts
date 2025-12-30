import type { Tables } from "./database/supabase";
import type { InvoiceStatus, InvoiceTaxType } from "./database/enums";

// Base types from database
export type Invoice = Tables<"invoices">;
export type InvoiceItem = Tables<"invoice_items">;
type Ledger = Tables<"ledgers">;
type Warehouse = Tables<"warehouses">;
type Product = Tables<"products">;

// ============================================================================
// FILTERS
// ============================================================================

export interface InvoiceFilters extends Record<string, unknown> {
  invoice_type?: "sales" | "purchase";
  status?: InvoiceStatus | InvoiceStatus[]; // Support single or array for IN queries
  party_ledger_id?: string; // Filter by party ledger ID
  warehouse_id?: string;
  date?: string; // Specific date filter (YYYY-MM-DD)
  date_from?: string; // Date range start (YYYY-MM-DD)
  date_to?: string; // Date range end (YYYY-MM-DD)
  search?: string; // Search term for search_vector
  exported_to_tally?: boolean; // Filter by export status
}

// =====================================================
// LIST VIEW TYPES (for invoice list pages)
// =====================================================

/**
 * Invoice item for list views
 * Minimal product info for quick loading
 * Used in: invoice list page, partner detail page
 */
export interface InvoiceItemListView extends InvoiceItem {
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
 * Invoice with minimal details for list views
 * Used in: invoice list page, partner detail page
 */
export interface InvoiceListView extends Pick<
  Invoice,
  | "id"
  | "invoice_number"
  | "sequence_number"
  | "slug"
  | "invoice_type"
  | "invoice_date"
  | "due_date"
  | "status"
  | "total_amount"
  | "outstanding_amount"
  | "party_ledger_id"
  | "party_name"
  | "party_display_name"
  | "warehouse_id"
  | "has_payment"
  | "exported_to_tally_at"
> {
  party_ledger: Pick<Ledger, "id" | "name" | "partner_id"> | null;
  invoice_items: InvoiceItemListView[];
}

// =====================================================
// DETAIL VIEW TYPES (for invoice detail page)
// =====================================================

/**
 * Invoice item with full product details (for invoice detail page)
 */
export interface InvoiceItemDetailView extends InvoiceItem {
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
 * Invoice with complete details (for invoice detail page)
 * Includes party ledger reference, warehouse reference, and full item details
 * Party/warehouse snapshots are already in invoice fields
 */
export interface InvoiceDetailView extends Invoice {
  party_ledger: Pick<Ledger, "id" | "name" | "partner_id"> | null;
  warehouse: Pick<Warehouse, "id" | "name"> | null;
  invoice_items: InvoiceItemDetailView[];
}

// =====================================================
// CREATE/UPDATE TYPES (for mutations)
// =====================================================

/**
 * Line item data for creating an invoice
 * Used in: create invoice flow
 * Tax type and GST rate are pulled from product record
 */
export interface CreateInvoiceItem {
  product_id: string;
  quantity: number;
  rate: number;
}

/**
 * Data for creating a new invoice
 * Used in: create invoice flow
 */
export interface CreateInvoiceData {
  invoice_type: "sales" | "purchase";
  party_ledger_id: string;
  counter_ledger_id: string; // Sales/Purchase/Sales Return/Purchase Return ledger for double-entry
  warehouse_id: string;
  invoice_date: string; // ISO format (YYYY-MM-DD)
  payment_terms: string | null;
  due_date: string | null; // ISO format (YYYY-MM-DD)
  tax_type: InvoiceTaxType; // Invoice-level: 'no_tax', 'gst', or 'igst'
  discount_type: "none" | "percentage" | "flat_amount";
  discount_value: number | null;
  supplier_invoice_number?: string | null; // Purchase only
  supplier_invoice_date?: string | null; // Purchase only
  notes: string | null;
  items: CreateInvoiceItem[];
}
