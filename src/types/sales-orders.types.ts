import {
  ProductColor,
  ProductMaterial,
  ProductTag,
} from "@/types/products.types";
import type { Tables } from "./database/supabase";
import { SalesOrderStatus } from "./database/enums";

type SalesOrder = Tables<"sales_orders">;
type SalesOrderItem = Tables<"sales_order_items">;
type Partner = Tables<"partners">;
type Warehouse = Tables<"warehouses">;
type Product = Tables<"products">;

// ============================================================================
// FILTERS
// ============================================================================

export interface SalesOrderFilters extends Record<string, unknown> {
  warehouseId?: string;
  status?: SalesOrderStatus | SalesOrderStatus[]; // Support single or array for IN queries
  customerId?: string;
  agentId?: string;
  limit?: number;
  order_by?: "order_date" | "expected_delivery_date" | "created_at";
  ascending?: boolean;
}

// =====================================================
// LIST VIEW TYPES (for sales order list pages)
// =====================================================

/**
 * Sales order item for list views
 * Minimal product info for quick loading
 * Used in: sales order list page, partner detail page
 */
export interface SalesOrderItemListView extends SalesOrderItem {
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
 * Sales order with minimal details for list views
 * Used in: sales order list page, partner detail page
 */
export interface SalesOrderListView extends SalesOrder {
  customer: Pick<
    Partner,
    "id" | "first_name" | "last_name" | "company_name"
  > | null;
  agent: Pick<
    Partner,
    "id" | "first_name" | "last_name" | "company_name"
  > | null;
  sales_order_items: SalesOrderItemListView[];
}

// =====================================================
// DETAIL VIEW TYPES (for sales order detail page)
// =====================================================

/**
 * Sales order item with full product details (for order detail page)
 * Includes materials, colors, and tags
 */
export interface SalesOrderItemDetailView extends SalesOrderItem {
  product:
    | (Pick<
        Product,
        | "id"
        | "name"
        | "stock_type"
        | "measuring_unit"
        | "product_images"
        | "sequence_number"
        | "stock_type"
      > & {
        materials: Array<{ material: ProductMaterial }>;
        colors: Array<{ color: ProductColor }>;
        tags: Array<{ tag: ProductTag }>;
      })
    | null;
}

/**
 * Sales order with complete details (for order detail page)
 * Includes customer address, agent, warehouse, and full product details
 */
export interface SalesOrderDetailView extends SalesOrder {
  customer: Partner | null;
  agent: Partner | null;
  warehouse: Warehouse | null;
  sales_order_items: SalesOrderItemDetailView[];
}

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
  expected_delivery_date: string | null;
  advance_amount: number;
  discount_type: string;
  discount_value: number;
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
  expected_delivery_date: string | null;
  advance_amount: number;
  discount_type: string;
  discount_value: number;
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
