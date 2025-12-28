import type { Tables } from "@/types/database/supabase";

export type StockUnit = Tables<"stock_units">;
type GoodsInward = Tables<"goods_inwards">;
type Partner = Tables<"partners">;
type Warehouse = Tables<"warehouses">;

// ============================================================================
// FILTERS
// ============================================================================

export interface StockUnitFilters extends Record<string, unknown> {
  product_id?: string;
  status?: StockUnitStatus | StockUnitStatus[];
  qr_generated_at?: "null" | "not_null";
  created_from_inward_id?: string | null;
}

// ============================================================================
// STOCK UNIT VIEW TYPES
// ============================================================================

import { ProductDetailView, ProductListView } from "./products.types";
import { StockUnitStatus } from "./database/enums";

/**
 * Minimal inward view for list items
 * Used in: stock unit inward details
 */
export type InwardListView = Pick<
  GoodsInward,
  "id" | "sequence_number" | "inward_date" | "inward_type"
>;

/**
 * Inward with partner details for list views
 * Used in: stock unit with inward details
 */
export interface InwardWithPartnerListView extends InwardListView {
  partner: Pick<
    Partner,
    "id" | "first_name" | "last_name" | "company_name" | "display_name"
  > | null;
  from_warehouse: Pick<Warehouse, "id" | "name"> | null;
}

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
  | "qr_generated_at"
  | "created_at"
  | "created_from_inward_id"
  | "supplier_number"
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

/**
 * Stock unit with inward details for list views
 * Used in: product detail page showing stock flow history
 */
export interface StockUnitWithInwardListView extends StockUnitListView {
  product: ProductListView | null;
  goods_inward: InwardWithPartnerListView | null;
}
