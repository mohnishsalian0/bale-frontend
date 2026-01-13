import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/types/database/supabase";
import type { AttributeGroup } from "@/types/database/enums";

export type Product = Tables<"products">;
type ProductAttributeRaw = Tables<"product_attributes">;

export type ProductInventory = Tables<"product_inventory_aggregates">;

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

// Common structure for attribute assignments
export type ProductAttributeAssignmentsRaw = {
  attributes: ProductAttribute[] | null;
};

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
}

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
