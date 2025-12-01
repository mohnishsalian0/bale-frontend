import type {
  Tables,
  TablesInsert,
  TablesUpdate,
} from "@/types/database/supabase";

type Product = Tables<"products">;
type ProductMaterialRaw = Tables<"product_materials">;
type ProductColorRaw = Tables<"product_colors">;
type ProductTagRaw = Tables<"product_tags">;
export type ProductInventory = Tables<"product_inventory_aggregates">;
type StockUnit = Tables<"stock_units">;

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
  | "stock_type"
  | "measuring_unit"
  | "product_images"
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
  in_stock: Pick<ProductInventory, "in_stock_units" | "in_stock_quantity">;
}

/**
 * Product with full inventory details for detail views
 * Used in: product inventory detail page
 */
export interface ProductWithInventoryDetailView extends ProductDetailView {
  inventory: ProductInventory;
}

// ============================================================================
// STOCK UNIT VIEW TYPES
// ============================================================================

/**
 * Stock unit with minimal details for list views
 * Used in: inventory list page
 */
export type StockUnitListView = Pick<
  StockUnit,
  | "id"
  | "sequence_number"
  | "initial_quantity"
  | "remaining_quantity"
  | "quality_grade"
  | "warehouse_location"
  | "manufacturing_date"
  | "status"
>;

/**
 * Stock unit with all details for detail views
 * Used in: stock unit detail page, inventory detail page
 */
export type StockUnitDetailView = StockUnit;

/**
 * Stock unit with product details for list views
 * Used in: inventory list page with product info
 */
export interface StockUnitWithProductListView extends StockUnitListView {
  product: ProductListView | null;
}

/**
 * Stock unit with full product details for detail views
 * Used in: stock unit detail page with complete product info
 */
export interface StockUnitWithProductDetailView extends StockUnitDetailView {
  product: ProductDetailView | null;
}

// ============================================================================
// LEGACY TYPES - TODO: Migrate to new View types above
// ============================================================================

// // Extended product type with materials, colors, and tags
// export interface ProductWithAttributes extends Product {
//   materials: ProductMaterial[];
//   colors: ProductColor[];
//   tags: ProductTag[];
// }
//
// /**
//  * Product with inventory aggregates for a specific warehouse
//  */
// export interface ProductWithInventory extends ProductWithAttributes {
//   in_stock_units: number;
//   in_stock_quantity: number;
// }
