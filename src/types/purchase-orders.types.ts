import type { Tables, TablesUpdate } from "./database/supabase";
import type { QueryData } from "@supabase/supabase-js";
import { DisplayStatus } from "@/lib/utils/purchase-order";
import {
  buildPurchaseOrdersQuery,
  buildPurchaseOrderByNumberQuery,
} from "@/lib/queries/purchase-orders";

// Base types from database (still needed for non-query uses)
export type PurchaseOrder = Tables<"purchase_orders">;
export type PurchaseOrderUpdate = TablesUpdate<"purchase_orders">;
export type PurchaseOrderItem = Tables<"purchase_order_items">;

// ============================================================================
// FILTERS
// ============================================================================

export interface PurchaseOrderFilters extends Record<string, unknown> {
  warehouseId?: string;
  status?: DisplayStatus | DisplayStatus[]; // Support single or array for IN queries
  supplierId?: string;
  agentId?: string;
  productId?: string;
  limit?: number;
  order_by?: "order_date" | "delivery_due_date" | "created_at";
  ascending?: boolean;
  search_term?: string;
  date_from?: string;
  date_to?: string;
}

// =====================================================
// LIST VIEW TYPES (for purchase order list pages)
// =====================================================

/**
 * Purchase order with minimal details for list views
 * Type inferred from buildPurchaseOrdersQuery
 * Used in: purchase order list page, partner detail page
 */
export type PurchaseOrderListView = QueryData<
  ReturnType<typeof buildPurchaseOrdersQuery>
>[number];

/**
 * Purchase order item for list views
 * Extracted from PurchaseOrderListView nested array
 */
export type PurchaseOrderItemListView =
  PurchaseOrderListView["purchase_order_items"][number];

// =====================================================
// DETAIL VIEW TYPES (for purchase order detail page)
// =====================================================

/**
 * Purchase order with complete details
 * Type inferred from buildPurchaseOrderByNumberQuery
 * Used in: purchase order detail page
 */
export type PurchaseOrderDetailView = QueryData<
  ReturnType<typeof buildPurchaseOrderByNumberQuery>
>;

/**
 * Purchase order item with full product details
 * Extracted from PurchaseOrderDetailView nested array
 */
export type PurchaseOrderItemDetailView =
  PurchaseOrderDetailView["purchase_order_items"][number];

// =====================================================
// CREATE/UPDATE TYPES (for mutations)
// =====================================================

/**
 * Data for creating a new purchase order
 * Used in: create purchase order flow
 */
export interface CreatePurchaseOrderData {
  warehouse_id: string;
  supplier_id: string;
  agent_id: string | null;
  order_date: string;
  delivery_due_date: string | null;
  advance_amount: number;
  discount_type: string;
  discount_value: number;
  payment_terms: string | null;
  tax_type: string;
  supplier_invoice_number: string | null;
  supplier_invoice_date: string | null;
  notes: string | null;
  attachments: string[];
  status: string;
}

/**
 * Line item data for creating a purchase order
 * Used in: create purchase order flow
 */
export interface CreatePurchaseOrderLineItem {
  product_id: string;
  required_quantity: number;
  unit_rate: number;
}

/**
 * Data for updating/approving a purchase order
 * Used in: approve purchase order flow
 */
export interface UpdatePurchaseOrderData {
  warehouse_id: string;
  supplier_id: string;
  agent_id: string | null;
  order_date: string;
  delivery_due_date: string | null;
  advance_amount: number;
  discount_type: string;
  discount_value: number;
  payment_terms: string | null;
  tax_type: string;
  supplier_invoice_number: string | null;
  supplier_invoice_date: string | null;
  notes: string | null;
  attachments: string[];
  status: string;
}

/**
 * Data for cancelling a purchase order
 * Used in: cancel purchase order flow
 */
export interface CancelPurchaseOrderData {
  reason: string;
}

/**
 * Data for completing a purchase order
 * Used in: complete purchase order flow
 */
export interface CompletePurchaseOrderData {
  notes?: string | null;
}
