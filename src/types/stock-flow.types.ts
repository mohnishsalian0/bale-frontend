import type { Tables } from "./database/supabase";
import { StockUnitWithProductDetailView } from "./stock-units.types";
import type { ProductListView } from "./products.types";

export type GoodsInward = Tables<"goods_inwards">;
export type GoodsOutward = Tables<"goods_outwards">;
type GoodsOutwardItem = Tables<"goods_outward_items">;
type Partner = Tables<"partners">;
type Warehouse = Tables<"warehouses">;
type SalesOrder = Tables<"sales_orders">;
type JobWork = Tables<"job_works">;

// =====================================================
// FILTERS
// =====================================================

export interface InwardFilters extends Record<string, unknown> {
  partner_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface OutwardFilters extends Record<string, unknown> {
  partner_id?: string;
  date_from?: string;
  date_to?: string;
}

// =====================================================
// LIST VIEW TYPES (for list pages)
// =====================================================

/**
 * Inward with partner details for stock unit list views
 * Used in: stock units tab showing inward source information
 */
export interface InwardWithPartnerListView extends Pick<
  GoodsInward,
  "id" | "sequence_number" | "inward_date" | "inward_type"
> {
  partner: Pick<
    Partner,
    "id" | "first_name" | "last_name" | "company_name"
  > | null;
  from_warehouse: Pick<Warehouse, "id" | "name"> | null;
}

/**
 * Goods inward with stock units for list views
 * Used in: inward list page
 */
export interface InwardWithStockUnitListView extends GoodsInward {
  partner: Pick<Partner, "first_name" | "last_name" | "company_name"> | null;
  from_warehouse: Pick<Warehouse, "id" | "name"> | null;
  stock_units: Array<{
    initial_quantity: number;
    product: ProductListView | null;
  }>;
}

/**
 * Goods outward with outward items for list views
 * Used in: outward list page
 */
export interface OutwardWithOutwardItemListView extends GoodsOutward {
  partner: Pick<Partner, "first_name" | "last_name" | "company_name"> | null;
  to_warehouse: Pick<Warehouse, "id" | "name"> | null;
  goods_outward_items: Array<{
    quantity_dispatched: number;
    stock_unit: {
      product: ProductListView | null;
    } | null;
  }>;
}

/**
 * Goods inward with all related data needed for detail views
 * This is the canonical type used by both queries and components
 *
 * Note: Uses Pick<> to ensure type safety - only fields actually fetched from the query
 */
export interface InwardDetailView extends GoodsInward {
  partner: Pick<
    Partner,
    | "first_name"
    | "last_name"
    | "company_name"
    | "address_line1"
    | "address_line2"
    | "city"
    | "state"
    | "pin_code"
    | "country"
  > | null;
  agent: Pick<Partner, "first_name" | "last_name" | "company_name"> | null;
  warehouse: Pick<
    Warehouse,
    | "name"
    | "address_line1"
    | "address_line2"
    | "city"
    | "state"
    | "pin_code"
    | "country"
  > | null;
  from_warehouse: Pick<
    Warehouse,
    | "name"
    | "address_line1"
    | "address_line2"
    | "city"
    | "state"
    | "pin_code"
    | "country"
  > | null;
  sales_order: Pick<SalesOrder, "sequence_number"> | null;
  job_work: Pick<JobWork, "sequence_number"> | null;
  stock_units: StockUnitWithProductDetailView[];
}

/**
 * Goods outward item with detailed stock unit and product information
 */
export interface OutwardItemWithStockUnitDetailView extends GoodsOutwardItem {
  stock_unit: StockUnitWithProductDetailView | null;
}

/**
 * Goods outward with all related data needed for detail views
 * This is the canonical type used by both queries and components
 *
 * Note: Uses Pick<> to ensure type safety - only fields actually fetched from the query
 */
export interface OutwardDetailView extends GoodsOutward {
  partner: Pick<
    Partner,
    | "first_name"
    | "last_name"
    | "company_name"
    | "address_line1"
    | "address_line2"
    | "city"
    | "state"
    | "pin_code"
    | "country"
  > | null;
  agent: Pick<Partner, "first_name" | "last_name" | "company_name"> | null;
  warehouse: Pick<
    Warehouse,
    | "name"
    | "address_line1"
    | "address_line2"
    | "city"
    | "state"
    | "pin_code"
    | "country"
  > | null;
  to_warehouse: Pick<
    Warehouse,
    | "name"
    | "address_line1"
    | "address_line2"
    | "city"
    | "state"
    | "pin_code"
    | "country"
  > | null;
  sales_order: Pick<SalesOrder, "sequence_number"> | null;
  job_work: Pick<JobWork, "sequence_number"> | null;
  goods_outward_items: OutwardItemWithStockUnitDetailView[];
}

/**
 * Outward item with details for product detail page
 * Shows outward flow history for a specific product
 */
export interface OutwardItemWithOutwardDetailView extends GoodsOutwardItem {
  outward:
    | (Pick<
        GoodsOutward,
        "id" | "sequence_number" | "outward_date" | "outward_type"
      > & {
        partner: Pick<
          Partner,
          "id" | "first_name" | "last_name" | "company_name"
        > | null;
        to_warehouse: Pick<Warehouse, "id" | "name"> | null;
      })
    | null;
}
