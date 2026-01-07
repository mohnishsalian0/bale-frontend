import { createClient } from "@/lib/supabase/browser";
import type {
  StockUnitAdjustmentListView,
  StockUnitAdjustmentDetailView,
  StockUnitAdjustment,
} from "@/types/stock-unit-adjustments.types";

/**
 * Get stock unit adjustments by stock unit ID
 */
export async function getStockUnitAdjustments(
  stockUnitId: string,
): Promise<StockUnitAdjustmentListView[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("stock_unit_adjustments")
    .select(
      `
      id,
      quantity_adjusted,
      adjustment_date,
      reason
    `,
    )
    .eq("stock_unit_id", stockUnitId)
    .is("deleted_at", null)
    .order("adjustment_date", { ascending: false });

  if (error) throw error;

  return (data || []) as StockUnitAdjustmentListView[];
}

/**
 * Get a single stock unit adjustment by ID
 */
export async function getStockUnitAdjustment(
  id: string,
): Promise<StockUnitAdjustmentDetailView> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("stock_unit_adjustments")
    .select(`*`)
    .eq("id", id)
    .is("deleted_at", null)
    .single<StockUnitAdjustmentDetailView>();

  if (error) throw error;
  return data;
}

/**
 * Create a new stock unit adjustment
 */
export async function createStockUnitAdjustment(adjustment: {
  stock_unit_id: string;
  quantity_adjusted: number;
  adjustment_date: string;
  reason: string;
}): Promise<StockUnitAdjustment> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("stock_unit_adjustments")
    .insert(adjustment)
    .select()
    .single<StockUnitAdjustment>();

  if (error) throw error;
  return data;
}

/**
 * Delete a stock unit adjustment (soft delete)
 */
export async function deleteStockUnitAdjustment(id: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from("stock_unit_adjustments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}
