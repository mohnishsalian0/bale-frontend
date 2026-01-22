import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/types/database/supabase";
import type { AttributeGroup } from "@/types/database/enums";
import type { QueryData } from "@supabase/supabase-js";
import {
  buildProductsQuery,
  buildProductByIdQuery,
  buildProductsWithInventoryQuery,
  buildProductWithInventoryByIdQuery,
  buildProductsWithInventoryAndOrdersQuery,
  buildProductWithInventoryAndOrdersByNumberQuery,
} from "@/lib/queries/products";

export type Product = Tables<"products">;
type ProductAttributeRaw = Tables<"product_attributes">;

export type ProductInventory = Tables<"product_inventory_aggregates">;
export type ProductSalesOrderAggregate =
  Tables<"product_sales_order_aggregates">;
export type ProductPurchaseOrderAggregate =
  Tables<"product_purchase_order_aggregates">;

// Mutation types
export type ProductInsert = TablesInsert<"products">;
export type ProductUpdate = TablesUpdate<"products">;

// Product data for forms (omits auto-generated fields)
export type ProductUpsertData = Omit<
  ProductInsert,
  "sequence_number" | "created_by" | "modified_by"
>;

// Attribute type (consolidated materials, colors, and tags)
export type ProductAttribute = Pick<
  ProductAttributeRaw,
  "id" | "name" | "group_name" | "color_hex"
>;

// ============================================================================
// FILTERS
// ============================================================================

export interface AttributeFilter {
  group: AttributeGroup;
  id: string; // attribute ID
}

export interface ProductFilters extends Record<string, unknown> {
  is_active?: boolean;
  search_term?: string;
  attributes?: AttributeFilter[]; // Filter by multiple attributes
  order_by?: "name" | "created_at" | "sequence_number";
  order_direction?: "asc" | "desc";
  has_inventory?: boolean; // Filter products with in_stock_quantity > 0
  has_pending_qr?: boolean; // Filter products with pending_qr_units > 0
  is_low_stock?: boolean; // Filter products with is_low_stock = TRUE
}

// ============================================================================
// RAW TYPES (QueryData inferred from query builders)
// ============================================================================

/**
 * Raw type inferred from buildProductsQuery
 * Used as bridge between Supabase response and ProductListView
 */
export type ProductListViewRaw = QueryData<
  ReturnType<typeof buildProductsQuery>
>[number];

/**
 * Raw type inferred from buildProductByIdQuery
 * Used as bridge between Supabase response and ProductDetailView
 */
export type ProductDetailViewRaw = QueryData<
  ReturnType<typeof buildProductByIdQuery>
>;

/**
 * Raw type inferred from buildProductsWithInventoryQuery
 * Used as bridge between Supabase response and ProductWithInventoryListView
 */
export type ProductWithInventoryListViewRaw = QueryData<
  ReturnType<typeof buildProductsWithInventoryQuery>
>[number];

/**
 * Raw type inferred from buildProductWithInventoryByIdQuery
 * Used as bridge between Supabase response and ProductWithInventoryDetailView
 */
export type ProductWithInventoryDetailViewRaw = QueryData<
  ReturnType<typeof buildProductWithInventoryByIdQuery>
>;

/**
 * Raw type inferred from buildProductWithInventoryAndOrdersByNumberQuery
 * Used as bridge between Supabase response and ProductInventoryDetailView
 */
export type ProductInventoryDetailViewRaw = QueryData<
  ReturnType<typeof buildProductWithInventoryAndOrdersByNumberQuery>
>;

/**
 * Raw type inferred from buildProductsWithInventoryAndOrdersQuery
 * Used as bridge between Supabase response and ProductInventoryView
 */
export type ProductInventoryViewRaw = QueryData<
  ReturnType<typeof buildProductsWithInventoryAndOrdersQuery>
>[number];

// ============================================================================
// MAIN TYPES
// ============================================================================

/**
 * Product with minimal details for list views
 * Used in: product list page, sales order item selection
 */
export interface ProductListView extends Pick<
  Product,
  | "id"
  | "sequence_number"
  | "product_code"
  | "name"
  | "show_on_catalog"
  | "is_active"
  | "stock_type"
  | "measuring_unit"
  | "cost_price_per_unit"
  | "selling_price_per_unit"
  | "product_images"
  | "min_stock_alert"
  | "min_stock_threshold"
  | "tax_type"
  | "gst_rate"
> {
  materials: ProductAttribute[];
  colors: ProductAttribute[];
  tags: ProductAttribute[];
}

/**
 * Product with all details for detail views
 * Used in: product detail page, product edit forms
 */
export interface ProductDetailView extends Product {
  materials: ProductAttribute[];
  colors: ProductAttribute[];
  tags: ProductAttribute[];
}

/**
 * Product with inventory aggregates for list views
 * Used in: warehouse inventory list
 */
export interface ProductWithInventoryListView extends ProductListView {
  inventory: Pick<
    ProductInventory,
    | "in_stock_units"
    | "in_stock_quantity"
    | "in_stock_value"
    | "pending_qr_units"
  >;
}

/**
 * Product with full inventory details for detail views
 * Used in: product inventory detail page
 */
export interface ProductWithInventoryDetailView extends ProductDetailView {
  inventory: ProductInventory;
}

/**
 * Product with full inventory and order details for detail views
 * Used in: product detail page with inventory and orders
 */
export interface ProductInventoryDetailView extends ProductDetailView {
  inventory: ProductInventory;
  sales_orders: Pick<
    ProductSalesOrderAggregate,
    | "active_pending_quantity"
    | "active_required_quantity"
    | "active_pending_value"
    | "active_required_value"
  > | null;
  purchase_orders: Pick<
    ProductPurchaseOrderAggregate,
    | "active_pending_quantity"
    | "active_required_quantity"
    | "active_pending_value"
    | "active_required_value"
  > | null;
}

/**
 * Product with inventory and order aggregates (unified view)
 * Used in: both products page and inventory page
 * Products page: shows all products with order data (ignores inventory display)
 * Inventory page: shows products with stock > 0, displays inventory + orders
 */
export interface ProductInventoryView extends ProductListView {
  inventory: Pick<
    ProductInventory,
    | "in_stock_units"
    | "in_stock_quantity"
    | "in_stock_value"
    | "pending_qr_units"
  >;
  sales_orders: Pick<
    ProductSalesOrderAggregate,
    | "active_pending_quantity"
    | "active_required_quantity"
    | "active_pending_value"
    | "active_required_value"
  > | null;
  purchase_orders: Pick<
    ProductPurchaseOrderAggregate,
    | "active_pending_quantity"
    | "active_required_quantity"
    | "active_pending_value"
    | "active_required_value"
  > | null;
}
