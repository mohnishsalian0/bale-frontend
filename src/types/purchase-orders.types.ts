import { ProductAttribute } from "@/types/products.types";
import type { Tables, TablesUpdate } from "./database/supabase";
import { DisplayStatus } from "@/lib/utils/purchase-order";

export type PurchaseOrder = Tables<"purchase_orders">;
export type PurchaseOrderUpdate = TablesUpdate<"purchase_orders">;
export type PurchaseOrderItem = Tables<"purchase_order_items">;
type Partner = Tables<"partners">;
type Warehouse = Tables<"warehouses">;
type Product = Tables<"products">;

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
 * Purchase order item for list views
 * Minimal product info for quick loading
 * Used in: purchase order list page, partner detail page
 */
export interface PurchaseOrderItemListView extends PurchaseOrderItem {
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
 * Purchase order with minimal details for list views
 * Used in: purchase order list page, partner detail page
 */
export interface PurchaseOrderListView extends PurchaseOrder {
  supplier: Pick<
    Partner,
    "id" | "first_name" | "last_name" | "company_name" | "display_name"
  > | null;
  agent: Pick<
    Partner,
    "id" | "first_name" | "last_name" | "company_name" | "display_name"
  > | null;
  purchase_order_items: PurchaseOrderItemListView[];
}

// =====================================================
// DETAIL VIEW TYPES (for purchase order detail page)
// =====================================================

/**
 * Purchase order item with full product details (for order detail page)
 * Includes materials, colors, and tags
 */
export interface PurchaseOrderItemDetailView extends PurchaseOrderItem {
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
        materials: ProductAttribute[];
        colors: ProductAttribute[];
        tags: ProductAttribute[];
      })
    | null;
}

/**
 * Purchase order with complete details (for order detail page)
 * Includes supplier address, agent (minimal fields), warehouse, and full product details
 */
export interface PurchaseOrderDetailView extends PurchaseOrder {
  supplier: (Partner & {
    ledger: Pick<Tables<"ledgers">, "id" | "name">[];
  }) | null;
  agent: Pick<
    Partner,
    "id" | "first_name" | "last_name" | "company_name" | "display_name"
  > | null;
  warehouse: Warehouse | null;
  purchase_order_items: PurchaseOrderItemDetailView[];
}

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
