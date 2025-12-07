import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/types/database/supabase";

export type Product = Tables<"products">;
type ProductMaterialRaw = Tables<"product_materials">;
type ProductColorRaw = Tables<"product_colors">;
type ProductTagRaw = Tables<"product_tags">;

export type ProductInventory = Tables<"product_inventory_aggregates">;

// Mutation types
export type ProductInsert = TablesInsert<"products">;
export type ProductUpdate = TablesUpdate<"products">;

// Product data for forms (omits auto-generated fields)
export type ProductUpsertData = Omit<
  ProductInsert,
  "sequence_number" | "created_by" | "modified_by"
>;

// Attribute view types (for all views)
export type ProductMaterial = Pick<
  ProductMaterialRaw,
  "id" | "name" | "color_hex"
>;
export type ProductColor = Pick<ProductColorRaw, "id" | "name" | "color_hex">;
export type ProductTag = Pick<ProductTagRaw, "id" | "name" | "color_hex">;

// Common structure for attribute assignments
export type ProductAttributeAssignmentsRaw = {
  product_material_assignments: Array<{
    material: ProductMaterial | null;
  }>;
  product_color_assignments: Array<{
    color: ProductColor | null;
  }>;
  product_tag_assignments: Array<{
    tag: ProductTag | null;
  }>;
};

// ============================================================================
// FILTERS
// ============================================================================

export interface ProductFilters extends Record<string, unknown> {
  is_active?: boolean;
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
  | "name"
  | "show_on_catalog"
  | "is_active"
  | "stock_type"
  | "measuring_unit"
  | "product_images"
  | "min_stock_alert"
  | "min_stock_threshold"
> {
  materials: ProductMaterial[];
  colors: ProductColor[];
  tags: ProductTag[];
}

/**
 * Product with all details for detail views
 * Used in: product detail page, product edit forms
 */
export interface ProductDetailView extends Product {
  materials: ProductMaterial[];
  colors: ProductColor[];
  tags: ProductTag[];
}

/**
 * Product with inventory aggregates for list views
 * Used in: warehouse inventory list
 */
export interface ProductWithInventoryListView extends ProductListView {
  inventory: Pick<
    ProductInventory,
    "in_stock_units" | "in_stock_quantity" | "in_stock_value"
  >;
}

/**
 * Product with full inventory details for detail views
 * Used in: product inventory detail page
 */
export interface ProductWithInventoryDetailView extends ProductDetailView {
  inventory: ProductInventory;
}
