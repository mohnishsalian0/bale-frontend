import type { Tables } from "@/types/database/supabase";
import type { QueryData } from "@supabase/supabase-js";
import {
  buildStockUnitAdjustmentsQuery,
  buildStockUnitAdjustmentByIdQuery,
} from "@/lib/queries/stock-unit-adjustments";

export type StockUnitAdjustment = Tables<"stock_unit_adjustments">;

// ============================================================================
// RAW TYPES (QueryData inferred from query builders)
// ============================================================================

/**
 * Raw type inferred from buildStockUnitAdjustmentsQuery
 * Used as bridge between Supabase response and StockUnitAdjustmentListView
 */
export type StockUnitAdjustmentListViewRaw = QueryData<
  ReturnType<typeof buildStockUnitAdjustmentsQuery>
>[number];

/**
 * Raw type inferred from buildStockUnitAdjustmentByIdQuery
 * Used as bridge between Supabase response and StockUnitAdjustmentDetailView
 */
export type StockUnitAdjustmentDetailViewRaw = QueryData<
  ReturnType<typeof buildStockUnitAdjustmentByIdQuery>
>;

/**
 * Stock unit adjustment for list views
 * Used in: adjustment history lists
 */
export type StockUnitAdjustmentListView = Pick<
  StockUnitAdjustment,
  "id" | "quantity_adjusted" | "adjustment_date" | "reason"
>;

/**
 * Stock unit adjustment for detail views
 * Used in: adjustment detail modals
 */
export type StockUnitAdjustmentDetailView = StockUnitAdjustment;
