import type { Tables } from "@/types/database/supabase";

export type StockUnitAdjustment = Tables<"stock_unit_adjustments">;

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
