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
 * @param recordIds - Array of record IDs to update
 * @param statusConfigs - Array of status configurations with percentages
 * @returns Array of status distribution results
 *
 * @example
 * applyStatusDistribution(
 *   supabase,
 *   "goods_transfers",
 *   transferIds,
 *   [
 *     { status: "completed", percentage: 0.6, updateFieldsGenerator: () => ({ completed_at: new Date().toISOString(), completed_by: userId }) },
 *     { status: "in_transit", percentage: 0.3 },
 *     { status: "cancelled", percentage: 0.1, updateFields: { cancellation_reason: "Test" } },
 *   ]
 * )
 */
export async function applyStatusDistribution(
  supabase: SupabaseClient<Database>,
  tableName: string,
  recordIds: string[],
  statusConfigs: StatusConfig[],
): Promise<StatusDistributionResult[]> {
  if (recordIds.length === 0) {
    return [];
  }

  // Validate percentages sum to 1.0
  const totalPercentage = statusConfigs.reduce(
    (sum, config) => sum + config.percentage,
    0,
  );
  if (Math.abs(totalPercentage - 1.0) > 0.01) {
    throw new Error(
      `Status percentages must sum to 1.0, got ${totalPercentage}`,
    );
  }

  // Shuffle record IDs for random distribution
  const shuffledIds = [...recordIds].sort(() => Math.random() - 0.5);

  const results: StatusDistributionResult[] = [];
  let startIndex = 0;

  for (const config of statusConfigs) {
    const count = Math.round(recordIds.length * config.percentage);
    const idsForStatus = shuffledIds.slice(startIndex, startIndex + count);

    if (idsForStatus.length > 0) {
      // Build update object
      const updateFields = config.updateFieldsGenerator
        ? config.updateFieldsGenerator()
        : config.updateFields || {};

      const updateData = {
        status: config.status,
        ...updateFields,
      };

      const { error } = await supabase
        .from(tableName as any)
        .update(updateData)
        .in("id", idsForStatus);

      if (error) {
        console.error(
          `❌ Failed to update ${tableName} to ${config.status}:`,
          error,
        );
        throw error;
      }

      results.push({
        status: config.status,
        count: idsForStatus.length,
      });
    }

    startIndex += count;
  }

  return results;
}
