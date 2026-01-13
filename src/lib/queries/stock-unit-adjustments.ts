import { createClient } from "@/lib/supabase/browser";
import type { Database, TablesInsert } from "@/types/database/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  StockUnitAdjustmentListView,
  StockUnitAdjustmentDetailView,
  StockUnitAdjustment,
} from "@/types/stock-unit-adjustments.types";

// ============================================================================
// QUERY BUILDERS
// ============================================================================

/**
 * Query builder for fetching stock unit adjustments
 */
export const buildStockUnitAdjustmentsQuery = (
  supabase: SupabaseClient<Database>,
  stockUnitId: string,
) => {
  return supabase
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
};

/**
 * Query builder for fetching a single stock unit adjustment by ID
 */
export const buildStockUnitAdjustmentByIdQuery = (
  supabase: SupabaseClient<Database>,
  id: string,
) => {
  return supabase
    .from("stock_unit_adjustments")
    .select(`*`)
    .eq("id", id)
    .is("deleted_at", null)
    .single();
};

/**
 * Get stock unit adjustments by stock unit ID
 */
export async function getStockUnitAdjustments(
  stockUnitId: string,
): Promise<StockUnitAdjustmentListView[]> {
  const supabase = createClient();
  const { data, error } = await buildStockUnitAdjustmentsQuery(
    supabase,
    stockUnitId,
  );

  if (error) throw error;

  return data || [];
}

/**
 * Get a single stock unit adjustment by ID
 */
export async function getStockUnitAdjustment(
  id: string,
): Promise<StockUnitAdjustmentDetailView> {
  const supabase = createClient();
  const { data, error } = await buildStockUnitAdjustmentByIdQuery(supabase, id);

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
    .insert(adjustment as TablesInsert<"stock_unit_adjustments">)
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
