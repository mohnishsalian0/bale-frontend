/**
 * Record Status Module
 * Generic module for applying status updates to records
 *
 * Handles:
 * - Status distribution (e.g., 60% completed, 30% in_transit, 10% cancelled)
 * - Completions with timestamps and user tracking
 * - Cancellations with reasons
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// ============================================================================
// TYPES
// ============================================================================

export interface StatusConfig {
  status: string;
  percentage: number;
  updateFields?: Record<string, any>; // Additional fields to set for this status
  updateFieldsGenerator?: () => Record<string, any>; // Function to generate fields dynamically
}

export interface StatusDistributionResult {
  status: string;
  count: number;
}

// ============================================================================
// RECORD STATUS FUNCTIONS
// ============================================================================

/**
 * Apply status distribution to records
 *
 * @param supabase - Supabase client
 * @param tableName - Table name (e.g., "goods_transfers", "sales_orders")
 * @param records - Dictionary of record IDs <=> update data
 * @param status - Status (e.g., "completed")
 *
 * @example
 * applyStatusDistribution(
 *   supabase,
 *   "goods_transfers",
 *   transferIds,
 *   "completed",
 * )
 */
export async function applyStatusDistribution(
  supabase: SupabaseClient<Database>,
  tableName: string,
  records: Record<string, any>,
  status: string,
) {
  if (records.length === 0) {
    return [];
  }

  const payload = Object.entries(records).map(([id, data]) => ({
    id,
    status,
    ...data,
  }));

  const { error } = await supabase
    .from(tableName as any)
    .upsert(payload, { onConflict: "id" });

  if (error) {
    console.error(`❌ Failed to update ${tableName} to ${status}:`, error);
    throw error;
  }
}
