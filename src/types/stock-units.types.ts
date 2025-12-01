import type { Tables } from "@/types/database/supabase";

type StockUnit = Tables<"stock_units">;

// ============================================================================
// FILTERS
// ============================================================================

export interface StockUnitFilters extends Record<string, unknown> {
  product_id?: string;
  status?: string;
  qr_generated_at?: "null" | "not_null";
  created_from_inward_id?: string | null;
}

// ============================================================================
// STOCK UNIT VIEW TYPES
// ============================================================================

import { ProductDetailView, ProductListView } from "./products.types";
import { InwardWithPartnerListView } from "./stock-flow.types";

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
