import type { Tables, TablesUpdate } from "./database/supabase";
import type { QueryData } from "@supabase/supabase-js";
import { DisplayStatus } from "@/lib/utils/sales-order";
import {
  buildSalesOrdersQuery,
  buildSalesOrderByNumberQuery,
} from "@/lib/queries/sales-orders";

// Base types from database (still needed for non-query uses)
export type SalesOrder = Tables<"sales_orders">;
export type SalesOrderUpdate = TablesUpdate<"sales_orders">;
export type SalesOrderItem = Tables<"sales_order_items">;

// ============================================================================
// FILTERS
// ============================================================================

export interface SalesOrderFilters extends Record<string, unknown> {
  warehouseId?: string;
  status?: DisplayStatus | DisplayStatus[]; // Support single or array for IN queries
  customerId?: string;
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
// LIST VIEW TYPES (for sales order list pages)
// =====================================================

/**
 * Sales order with minimal details for list views
 * Type inferred from buildSalesOrdersQuery
 * Used in: sales order list page, partner detail page
 */
export type SalesOrderListView = QueryData<
  ReturnType<typeof buildSalesOrdersQuery>
>[number];

/**
 * Sales order item for list views
 * Extracted from SalesOrderListView nested array
 */
export type SalesOrderItemListView =
  SalesOrderListView["sales_order_items"][number];

// =====================================================
// DETAIL VIEW TYPES (for sales order detail page)
// =====================================================

/**
 * Sales order with complete details
 * Type inferred from buildSalesOrderByNumberQuery (same structure as ById)
 * Used in: sales order detail page
 */
export type SalesOrderDetailView = QueryData<
  ReturnType<typeof buildSalesOrderByNumberQuery>
>;

/**
 * Sales order item with full product details (for order detail page)
 * Extracted from SalesOrderDetailView nested array
 */
export type SalesOrderItemDetailView =
  SalesOrderDetailView["sales_order_items"][number];

// =====================================================
// CREATE/UPDATE TYPES (for mutations)
// =====================================================

/**
 * Data for creating a new sales order
 * Used in: create sales order flow
 */
export interface CreateSalesOrderData {
  warehouse_id: string;
  customer_id: string;
  agent_id: string | null;
  order_date: string;
  delivery_due_date: string | null;
  advance_amount: number;
  discount_type: string;
  discount_value: number;
  payment_terms: string | null;
  tax_type: string;
  notes: string | null;
  attachments: string[];
  status: string;
}

/**
 * Line item data for creating a sales order
 * Used in: create sales order flow
 */
export interface CreateSalesOrderLineItem {
  product_id: string;
  required_quantity: number;
  unit_rate: number;
}

/**
 * Data for updating/approving a sales order
 * Used in: approve sales order flow
 */
export interface UpdateSalesOrderData {
  warehouse_id: string;
  customer_id: string;
  agent_id: string | null;
  order_date: string;
  delivery_due_date: string | null;
  advance_amount: number;
  discount_type: string;
  discount_value: number;
  payment_terms: string | null;
  tax_type: string;
  notes: string | null;
  attachments: string[];
  status: string;
}

/**
 * Data for cancelling a sales order
 * Used in: cancel sales order flow
 */
export interface CancelSalesOrderData {
  reason: string;
}

/**
 * Data for completing a sales order
 * Used in: complete sales order flow
 */
export interface CompleteSalesOrderData {
  notes?: string | null;
}
