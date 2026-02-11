import type { Tables } from "@/types/database/supabase";
import type { QueryData } from "@supabase/supabase-js";
import {
  buildStockUnitsQuery,
  buildStockUnitsWithOriginQuery,
  buildStockUnitWithProductDetailQuery,
  buildStockUnitActivityQuery,
} from "@/lib/queries/stock-units";
import { ProductDetailView, ProductListView } from "./products.types";
import { StockUnitStatus } from "./database/enums";
import { Warehouse } from "./warehouses.types";

export type StockUnit = Tables<"stock_units">;
type GoodsInward = Tables<"goods_inwards">;
type GoodsConvert = Tables<"goods_converts">;
type Partner = Tables<"partners">;

// ============================================================================
// FILTERS
// ============================================================================

export interface StockUnitFilters extends Record<string, unknown> {
  product_id?: string;
  status?: StockUnitStatus | StockUnitStatus[];
  qr_generated_at?: "null" | "not_null";
  origin_inward_id?: string | null;
  origin_convert_id?: string | null;
  non_empty?: boolean;
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
 * Raw type inferred from buildStockUnitsWithOriginQuery
 * Used as bridge between Supabase response and StockUnitWithOriginListView
 */
export type StockUnitWithOriginListViewRaw = QueryData<
  ReturnType<typeof buildStockUnitsWithOriginQuery>
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
  > | null;
}

/**
 * Minimal convert view for list items
 * Used in: stock unit convert details
 */
export type ConvertListView = Pick<
  GoodsConvert,
  "id" | "sequence_number" | "start_date" | "completion_date" | "status"
>;

/**
 * Convert with vendor details for list views
 * Used in: stock unit with convert details
 */
export interface ConvertWithVendorListView extends ConvertListView {
  vendor: Pick<
    Partner,
    "id" | "first_name" | "last_name" | "company_name" | "display_name"
  > | null;
}

/**
 * Stock unit with minimal details for list views
 * Used in: inventory list page
 */
export type StockUnitListView = Pick<
  StockUnitWithProductListViewRaw,
  | "id"
  | "sequence_number"
  | "stock_number"
  | "lot_number"
  | "initial_quantity"
  | "remaining_quantity"
  | "quality_grade"
  | "warehouse_location"
  | "manufacturing_date"
  | "status"
  | "qr_generated_at"
  | "created_at"
  | "origin_inward_id"
>;

/**
 * Stock unit with all details for detail views
 * Used in: stock unit detail page, inventory detail page
 */
export type StockUnitDetailView = StockUnitWithProductDetailViewRaw;

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
export interface StockUnitWithProductDetailView extends Omit<
  StockUnitDetailView,
  "product"
> {
  warehouse: Pick<Warehouse, "id" | "name">;
  product: ProductDetailView | null;
}

/**
 * Stock unit with origin details (inward or convert) for list views
 * Used in: product detail page showing stock flow history, QR code generation
 */
export interface StockUnitWithOriginListView extends StockUnitListView {
  warehouse: Pick<Warehouse, "id" | "name">;
  product: ProductListView | null;
  origin_type: string;
  origin_inward_id: string | null;
  origin_convert_id: string | null;
  goods_inward: InwardWithPartnerListView | null;
  goods_convert: ConvertWithVendorListView | null;
}

// ============================================================================
// STOCK UNIT ACTIVITY TYPES
// ============================================================================

/**
 * All possible event_type values returned by get_stock_unit_activity RPC.
 * Mirrors the naming convention used by ProductActivityEventType so both
 * can share a single ActivityEventConfig shape in utils/stock-units.ts.
 */
export type StockUnitActivityEventType =
  | "inward"
  | "convert_in"
  | "transfer"
  | "outward"
  | "adjustment"
  | "convert_out";

/**
 * Single activity event in a stock unit's history
 * Type is automatically inferred from the get_stock_unit_activity RPC function
 * Used in: stock unit activity timeline/list
 */
export type StockUnitActivity = QueryData<
  ReturnType<typeof buildStockUnitActivityQuery>
>[number];

// ============================================================================
// SCANNER TYPES
// ============================================================================

/**
 * Scanned stock unit with quantity for scanner flows
 * Used in: goods outward scanner, goods transfer scanner
 * Only includes fields actually used by components
 */
export interface ScannedStockUnit {
  stockUnit: {
    id: string;
    product_id: string;
    remaining_quantity: number;
    stock_number: string;
    product: {
      id: string;
      name: string;
      stock_type: string;
      measuring_unit: string;
      product_images: string[] | null;
      selling_price_per_unit: number | null;
    };
  };
  quantity: number;
}
