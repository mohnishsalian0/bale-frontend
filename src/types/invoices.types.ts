import type { Tables } from "./database/supabase";
import type { QueryData } from "@supabase/supabase-js";
import type { InvoiceStatus, InvoiceTaxType } from "./database/enums";
import {
  buildInvoicesQuery,
  buildInvoiceBySlugQuery,
} from "@/lib/queries/invoices";

// Base types from database (still needed for non-query uses)
export type Invoice = Tables<"invoices">;
export type InvoiceItem = Tables<"invoice_items">;

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
  source_sales_order_id?: string; // Filter by source sales order
  source_purchase_order_id?: string; // Filter by source purchase order
}

// =====================================================
// LIST VIEW TYPES (for invoice list pages)
// =====================================================

/**
 * Invoice with minimal details for list views
 * Type inferred from buildInvoicesQuery
 * Used in: invoice list page, partner detail page
 */
export type InvoiceListView = QueryData<
  ReturnType<typeof buildInvoicesQuery>
>[number];

/**
 * Invoice item for list views
 * Extracted from InvoiceListView nested array
 * Used in: invoice list page, partner detail page
 */
export type InvoiceItemListView = InvoiceListView["invoice_items"][number];

// =====================================================
// DETAIL VIEW TYPES (for invoice detail page)
// =====================================================

/**
 * Invoice with complete details
 * Type inferred from buildInvoiceBySlugQuery
 * Used in: invoice detail page
 */
export type InvoiceDetailView = QueryData<
  ReturnType<typeof buildInvoiceBySlugQuery>
>;

/**
 * Invoice item with full product details
 * Extracted from InvoiceDetailView nested array
 * Used in: invoice detail page
 */
export type InvoiceItemDetailView = InvoiceDetailView["invoice_items"][number];

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
  tax_type: InvoiceTaxType; // Invoice-level: 'no_tax', 'gst', or 'igst'
  discount_type: "none" | "percentage" | "flat_amount";
  items: CreateInvoiceItem[];
  payment_terms?: string;
  due_date?: string; // ISO format (YYYY-MM-DD)
  discount_value?: number;
  supplier_invoice_number?: string; // Purchase only
  supplier_invoice_date?: string; // Purchase only
  notes?: string;
}
