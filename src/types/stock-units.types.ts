import type { Tables } from "@/types/database/supabase";
import type { QueryData } from "@supabase/supabase-js";
import {
  buildStockUnitsQuery,
  buildStockUnitsWithInwardQuery,
  buildStockUnitWithProductDetailQuery,
  buildStockUnitActivityQuery,
} from "@/lib/queries/stock-units";
import { ProductDetailView, ProductListView } from "./products.types";
import { StockUnitStatus } from "./database/enums";
import { Warehouse } from "./warehouses.types";

export type StockUnit = Tables<"stock_units">;
type GoodsInward = Tables<"goods_inwards">;
type Partner = Tables<"partners">;

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
// RAW TYPES (QueryData inferred from query builders)
// ============================================================================

/**
 * Raw type inferred from buildStockUnitsQuery
 * Used as bridge between Supabase response and StockUnitWithProductListView
 */
export type StockUnitWithProductListViewRaw = QueryData<
  ReturnType<typeof buildStockUnitsQuery>
>[number];

/**
 * Raw type inferred from buildStockUnitsWithInwardQuery
 * Used as bridge between Supabase response and StockUnitWithInwardListView
 */
export type StockUnitWithInwardListViewRaw = QueryData<
  ReturnType<typeof buildStockUnitsWithInwardQuery>
>[number];

/**
 * Raw type inferred from buildStockUnitWithProductDetailQuery
 * Used as bridge between Supabase response and StockUnitWithProductDetailView
 */
export type StockUnitWithProductDetailViewRaw = QueryData<
  ReturnType<typeof buildStockUnitWithProductDetailQuery>
>;

// ============================================================================
// STOCK UNIT VIEW TYPES
// ============================================================================

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
  >;
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
  warehouse: Pick<Warehouse, "id" | "name">;
  product: ProductListView | null;
}

/**
 * Stock unit with full product details for detail views
 * Used in: stock unit detail page with complete product info
 */
export interface StockUnitWithProductDetailView extends StockUnitDetailView {
  warehouse: Pick<Warehouse, "id" | "name">;
  product: ProductDetailView | null;
}

/**
 * Stock unit with inward details for list views
 * Used in: product detail page showing stock flow history
 */
export interface StockUnitWithInwardListView extends StockUnitListView {
  warehouse: Pick<Warehouse, "id" | "name">;
  product: ProductListView | null;
  goods_inward: InwardWithPartnerListView | null;
}

// ============================================================================
// STOCK UNIT ACTIVITY TYPES
// ============================================================================

/**
 * Single activity event in a stock unit's history
 * Type is automatically inferred from the get_stock_unit_activity RPC function
 * Used in: stock unit activity timeline/list
 */
export type StockUnitActivity = QueryData<
  ReturnType<typeof buildStockUnitActivityQuery>
>[number];
