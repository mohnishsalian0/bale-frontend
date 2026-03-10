/**
 * Warehouse Module
 * Handles warehouse creation with idempotent quantity-based pattern
 * All functions are idempotent - safe to run multiple times
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database/supabase";
import type { WarehouseConfig } from "../config/warehouses.config";

// ============================================================================
// TYPES
// ============================================================================

export interface WarehouseResult {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  distribution_weight: number;
}

// ============================================================================
// WAREHOUSE FUNCTIONS
// ============================================================================

/**
 * Ensure warehouses exist (idempotent with quantity handling)
 * Takes expected quantity from config, fetches existing, creates difference
 * Returns all warehouses (existing + newly created)
 */
export async function ensureWarehouses(
  supabase: SupabaseClient<Database>,
  companyId: string,
  warehouseConfigs: WarehouseConfig[],
): Promise<WarehouseResult[]> {
  console.log(`🏭 Ensuring ${warehouseConfigs.length} warehouses exist...\n`);

  // Fetch existing warehouses for this company
  const { data: existing, error: fetchError } = await supabase
    .from("warehouses")
    .select("id, name, city, state, address_line1, pin_code")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (fetchError) {
    console.error("❌ Error fetching warehouses:", fetchError);
    throw fetchError;
  }

  // Create a map of config by warehouse name (used throughout)
  const configMap = new Map(
    warehouseConfigs.map((config) => [config.name, config]),
  );

  // Filter to only count warehouses that exist in our config
  const existingInConfig = existing?.filter((w) => configMap.has(w.name)) || [];

  // If count matches expected, return existing warehouses
  if (existingInConfig.length === warehouseConfigs.length) {
    console.log(`✅ All ${warehouseConfigs.length} warehouses already exist\n`);
    return existingInConfig.map((w) => ({
      id: w.id,
      name: w.name,
      city: w.city,
      state: w.state,
      distribution_weight: configMap.get(w.name)!.distribution_weight,
    }));
  }

  // Determine which warehouses are missing by filtering out existing names
  const existingNames = new Set(existingInConfig.map((w) => w.name));
  const toCreate = warehouseConfigs.filter(
    (config) => !existingNames.has(config.name),
  );
  console.log(
    `📦 Creating ${toCreate.length} new warehouses (${existingInConfig.length} already exist)...`,
  );

  const { data: created, error: createError } = await supabase
    .from("warehouses")
    .insert(
      toCreate.map((config) => ({
        company_id: companyId,
        name: config.name,
        slug: "",
        address_line1: config.address_line1,
        city: config.city,
        state: config.state,
        country: config.country,
        pin_code: config.pin_code,
      })),
    )
    .select("id, name, city, state");

  if (createError || !created) {
    console.error("❌ Failed to create warehouses:", createError);
    throw createError || new Error("Failed to create warehouses");
  }

  console.log(`✅ Created ${created.length} new warehouses\n`);

  // Return all warehouses (existing + created) with distribution weights
  const allWarehouses = [...existingInConfig, ...created];

  console.log(`📊 Total warehouses: ${allWarehouses.length}\n`);

  return allWarehouses.map((w) => ({
    id: w.id,
    name: w.name,
    city: w.city,
    state: w.state,
    distribution_weight: configMap.get(w.name)!.distribution_weight,
  }));
}
