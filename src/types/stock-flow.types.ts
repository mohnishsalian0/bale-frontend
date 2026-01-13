import type { Tables, TablesUpdate } from "./database/supabase";
import type { QueryData } from "@supabase/supabase-js";
import {
  buildGoodsInwardsQuery,
  buildGoodsOutwardsQuery,
  buildGoodsOutwardsBySalesOrderQuery,
  buildGoodsInwardsByPurchaseOrderQuery,
  buildGoodsInwardByNumberQuery,
  buildGoodsOutwardByNumberQuery,
} from "@/lib/queries/stock-flow";

// Base types from database (still needed for non-query uses)
export type GoodsInward = Tables<"goods_inwards">;
export type GoodsOutward = Tables<"goods_outwards">;

// =====================================================
// FILTERS
// =====================================================

export interface InwardFilters extends Record<string, unknown> {
  partner_id?: string;
  product_id?: string;
  date_from?: string;
  date_to?: string;
  search_term?: string;
}

export interface OutwardFilters extends Record<string, unknown> {
  partner_id?: string;
  product_id?: string;
  date_from?: string;
  date_to?: string;
  search_term?: string;
}

// =====================================================
// UPDATE TYPES
// =====================================================

/**
 * Data for updating goods inward metadata (dates, transport, notes)
 * Stock units and inward source remain locked
 */
export type UpdateInwardData = Pick<
  TablesUpdate<"goods_inwards">,
  | "inward_date"
  | "expected_delivery_date"
  | "transport_type"
  | "transport_reference_number"
  | "notes"
>;

/**
 * Data for updating goods outward metadata (dates, transport, notes)
 * Outward items and outward destination remain locked
 */
export type UpdateOutwardData = Pick<
  TablesUpdate<"goods_outwards">,
  | "outward_date"
  | "expected_delivery_date"
  | "transport_type"
  | "transport_reference_number"
  | "notes"
>;

// =====================================================
// LIST VIEW TYPES (for list pages)
// =====================================================

/**
 * Goods inward with stock units for list views
 * Type inferred from buildGoodsInwardsQuery
 * Used in: inward list page
 */
export type InwardWithStockUnitListView = QueryData<
  ReturnType<typeof buildGoodsInwardsQuery>
>[number];

/**
 * Goods outward with outward items for list views
 * Type inferred from buildGoodsOutwardsQuery
 * Used in: outward list page
 */
export type OutwardWithOutwardItemListView = QueryData<
  ReturnType<typeof buildGoodsOutwardsQuery>
>[number];

// =====================================================
// DETAIL VIEW TYPES (for detail pages)
// =====================================================

/**
 * Goods inward with complete details
 * Type inferred from buildGoodsInwardByNumberQuery
 * Used in: inward detail page
 */
export type InwardDetailView = QueryData<
  ReturnType<typeof buildGoodsInwardByNumberQuery>
>;

/**
 * Goods outward with complete details
 * Type inferred from buildGoodsOutwardByNumberQuery
 * Used in: outward detail page
 */
export type OutwardDetailView = QueryData<
  ReturnType<typeof buildGoodsOutwardByNumberQuery>
>;

/**
 * Goods outward by sales order with sales order details
 * Type inferred from buildGoodsOutwardsBySalesOrderQuery
 * Used in: sales order detail page
 */
export type OutwardBySalesOrderView = QueryData<
  ReturnType<typeof buildGoodsOutwardsBySalesOrderQuery>
>[number];

/**
 * Goods inward by purchase order with purchase order details
 * Type inferred from buildGoodsInwardsByPurchaseOrderQuery
 * Used in: purchase order detail page
 */
export type InwardByPurchaseOrderView = QueryData<
  ReturnType<typeof buildGoodsInwardsByPurchaseOrderQuery>
>[number];

// =====================================================
// SPECIALIZED VIEW TYPES (for specific use cases)
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
    Tables<"partners">,
    "id" | "first_name" | "last_name" | "company_name" | "display_name"
  > | null;
  from_warehouse: Pick<Tables<"warehouses">, "id" | "name"> | null;
}

/**
 * Outward item with details for product detail page
 * Shows outward flow history for a specific product
 */
export interface OutwardItemWithOutwardDetailView extends Tables<"goods_outward_items"> {
  outward:
    | (Pick<
        GoodsOutward,
        "id" | "sequence_number" | "outward_date" | "outward_type"
      > & {
        partner: Pick<
          Tables<"partners">,
          "id" | "first_name" | "last_name" | "company_name" | "display_name"
        > | null;
        to_warehouse: Pick<Tables<"warehouses">, "id" | "name"> | null;
      })
    | null;
}
