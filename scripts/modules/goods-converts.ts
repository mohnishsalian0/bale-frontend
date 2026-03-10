/**
 * Goods Converts Module
 * Handles goods convert generation with idempotent pattern
 *
 * Flow:
 *   1. Fetch existing converts for idempotency check
 *   2. Filter factory warehouses from the warehouses list
 *   3. For each convert to create:
 *      a. Pick a random factory warehouse
 *      b. Find available raw-material stock units at that factory
 *      c. Select `unitsPerConvert` units as input
 *      d. Derive service type from factory warehouse name
 *      e. Pick a random finished product as output
 *      f. Call create_goods_convert_with_items — consumes full remaining_quantity
 *         of each input unit
 *      g. Randomly determine final status:
 *         - completed (70%): call complete_goods_convert
 *             • output units are 1:1 with input units
 *             • each output initial_quantity = input quantity_consumed * ratio
 *             • wastage_quantity = quantity_consumed - initial_quantity (the diff)
 *         - cancelled (10%): call cancel_goods_convert
 *         - in_progress (20%): leave as-is
 *   4. Return all converts
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database/supabase";
import { randomInt, randomFloat, selectRandom } from "./shared";
import type { GoodsConvertsConfig } from "../config/goods-converts.config";
import {
  FACTORY_SERVICE_TYPE_MAP,
  DEFAULT_SERVICE_TYPE,
  CONVERT_CANCELLATION_REASONS,
} from "../config/goods-converts.config";

// ============================================================================
// TYPES
// ============================================================================

export interface GoodsConvertResult {
  id: string;
  sequence_number: number;
  status: string;
}

/** Job work data needed for linking converts to job works */
export interface JobWorkForLinking {
  id: string;
  status: string;
  items: Array<{ product_id: string; expected_quantity: number }>;
}

interface Warehouse {
  id: string;
  name: string;
}

interface StockUnit {
  id: string;
  product_id: string;
  remaining_quantity: number;
  last_activity_date: string | null;
  updated_at: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function deriveServiceType(warehouseName: string): string {
  const lower = warehouseName.toLowerCase();
  for (const { keyword, serviceType } of FACTORY_SERVICE_TYPE_MAP) {
    if (lower.includes(keyword)) return serviceType;
  }
  return DEFAULT_SERVICE_TYPE;
}

function isFactoryWarehouse(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.includes("factory") ||
    lower.includes("dyeing") ||
    lower.includes("knitting") ||
    lower.includes("weaving") ||
    lower.includes("processing") ||
    lower.includes("embroidery")
  );
}

// ============================================================================
// GOODS CONVERTS FUNCTION
// ============================================================================

/**
 * Generate goods converts with idempotent pattern.
 *
 * @param supabase           Supabase client (service key)
 * @param companyId          Company UUID
 * @param userId             Admin user UUID (used as created_by)
 * @param warehouses         All warehouses (factory ones filtered internally)
 * @param vendorIds          Partner IDs with type='vendor'
 * @param rawProductIds      Product IDs for raw materials (convert inputs)
 * @param finishedProductIds Product IDs for finished goods (convert outputs)
 * @param totalConverts      Total converts to ensure exist
 * @param config             Ratio and range settings
 */
export async function generateGoodsConverts(
  supabase: SupabaseClient<Database>,
  companyId: string,
  userId: string,
  warehouses: Warehouse[],
  vendorIds: string[],
  rawProductIds: string[],
  finishedProductIds: string[],
  totalConverts: number,
  config: GoodsConvertsConfig,
): Promise<GoodsConvertResult[]> {
  console.log(`\n🔄 Ensuring ${totalConverts} goods converts exist...\n`);

  // ------------------------------------------------------------------
  // Idempotency check
  // ------------------------------------------------------------------
  const { data: existing, error: fetchError } = await supabase
    .from("goods_converts")
    .select("id, sequence_number, status")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (fetchError) {
    console.error("❌ Error fetching goods converts:", fetchError);
    throw fetchError;
  }

  const existingCount = existing?.length || 0;

  if (existingCount >= totalConverts) {
    console.log(
      `✅ Sufficient goods converts already exist (${existingCount})\n`,
    );
    return existing!;
  }

  const toCreate = totalConverts - existingCount;
  console.log(
    `📦 Creating ${toCreate} new goods converts (${existingCount} already exist)...`,
  );

  // ------------------------------------------------------------------
  // Validate inputs
  // ------------------------------------------------------------------
  if (vendorIds.length === 0) {
    console.error("❌ No vendor IDs provided");
    return existing || [];
  }
  if (rawProductIds.length === 0) {
    console.error("❌ No raw material product IDs");
    return existing || [];
  }
  if (finishedProductIds.length === 0) {
    console.error("❌ No finished product IDs");
    return existing || [];
  }

  // ------------------------------------------------------------------
  // Identify factory warehouses
  // ------------------------------------------------------------------
  const factoryWarehouses = warehouses.filter((w) =>
    isFactoryWarehouse(w.name),
  );

  if (factoryWarehouses.length === 0) {
    console.error("❌ No factory warehouses found");
    return existing || [];
  }

  console.log(
    `   Factory warehouses: ${factoryWarehouses.map((w) => w.name).join(", ")}`,
  );

  // ------------------------------------------------------------------
  // Fetch in_progress job works for linking (same pattern as goods-inwards fetching POs)
  // ------------------------------------------------------------------
  const { data: jobWorkRows } = await supabase
    .from("job_works")
    .select("id, status, job_work_items(product_id, expected_quantity)")
    .eq("company_id", companyId)
    .eq("status", "in_progress")
    .is("deleted_at", null);

  const inProgressJobWorks: JobWorkForLinking[] = (jobWorkRows || [])
    .filter((jw) => jw.job_work_items.length > 0)
    .map((jw) => ({
      id: jw.id,
      status: jw.status,
      items: jw.job_work_items,
    }));

  const linkableCount = Math.floor(
    inProgressJobWorks.length * config.jobWorkLinkRate,
  );
  const linkableJobWorks = inProgressJobWorks.slice(0, linkableCount);
  let linkedCount = 0;

  if (linkableJobWorks.length > 0) {
    console.log(
      `   Linkable job works: ${linkableJobWorks.length}/${inProgressJobWorks.length} in_progress (${config.jobWorkLinkRate * 100}%)`,
    );
  }

  // ------------------------------------------------------------------
  // Create converts
  // ------------------------------------------------------------------
  let totalCreated = 0;
  let skippedCount = 0;

  for (let i = 0; i < toCreate; i++) {
    // Pick a random factory warehouse
    const warehouse =
      factoryWarehouses[randomInt(0, factoryWarehouses.length - 1)];

    // Fetch available raw-material stock units at this factory
    const { data: availableUnits, error: stockError } = await supabase
      .from("stock_units")
      .select(
        "id, product_id, remaining_quantity, last_activity_date, updated_at",
      )
      .eq("company_id", companyId)
      .eq("current_warehouse_id", warehouse.id)
      .eq("status", "available")
      .in("product_id", rawProductIds)
      .gt("remaining_quantity", 0)
      .order("updated_at", { ascending: true });

    if (stockError || !availableUnits || availableUnits.length === 0) {
      console.log(
        `   ⚠️  No raw material stock at ${warehouse.name} — skipping convert ${i + 1}`,
      );
      skippedCount++;
      continue;
    }

    // Select unitsPerConvert input units
    const unitCount = Math.min(
      randomInt(config.unitsPerConvert.min, config.unitsPerConvert.max),
      availableUnits.length,
    );

    if (unitCount === 0) {
      skippedCount++;
      continue;
    }

    const selectedUnits = selectRandom(
      availableUnits as StockUnit[],
      unitCount,
    );

    // start_date = max(last_activity_date) + 1 day across selected units
    const latestActivity = selectedUnits.reduce((latest, su) => {
      const d = new Date(su.last_activity_date ?? su.updated_at);
      return d > latest ? d : latest;
    }, new Date(0));

    const startDate = new Date(latestActivity);
    startDate.setDate(startDate.getDate() + 1);
    const startDateStr = startDate.toISOString().split("T")[0];

    // Consume full remaining_quantity of each input unit
    const inputStockUnits = selectedUnits.map((su) => ({
      stock_unit_id: su.id,
      quantity_consumed: su.remaining_quantity,
    }));

    // Derive service type and pick output product + vendor
    const serviceType = deriveServiceType(warehouse.name);
    let outputProductId =
      finishedProductIds[randomInt(0, finishedProductIds.length - 1)];
    const vendorId = vendorIds[randomInt(0, vendorIds.length - 1)];

    // Link to a job work if any available (always link, control volume via queue size)
    let linkedJobWork: JobWorkForLinking | undefined;
    if (linkableJobWorks.length > 0) {
      linkedJobWork = linkableJobWorks.shift();
      if (linkedJobWork) {
        // Use the job work's product as output to ensure reconciliation works
        outputProductId = linkedJobWork.items[0].product_id;
        linkedCount++;
      }
    }

    // Create convert
    const { data: convertId, error: createError } = await supabase.rpc(
      "create_goods_convert_with_items",
      {
        p_convert_data: {
          company_id: companyId,
          warehouse_id: warehouse.id,
          service_type: serviceType,
          output_product_id: outputProductId,
          vendor_id: vendorId,
          job_work_id: linkedJobWork?.id,
          start_date: startDateStr,
          notes: `${serviceType} of raw material — auto-generated test data`,
          created_by: userId,
        },
        p_input_stock_units: inputStockUnits as unknown as never[],
      },
    );

    if (createError || !convertId) {
      console.error(
        `   ❌ Failed to create goods convert: ${createError?.message}`,
      );
      skippedCount++;
      continue;
    }

    // ------------------------------------------------------------------
    // Assign status
    // ------------------------------------------------------------------
    const roll = Math.random();
    let finalStatus = "in_progress";

    if (roll < config.completedRatio) {
      // Complete — output units 1:1 with input units
      // Each output qty = consumed qty * ratio; wastage = consumed - output
      const completionDate = new Date(startDate);
      completionDate.setDate(
        completionDate.getDate() +
          randomInt(
            config.completionDaysAfterStart.min,
            config.completionDaysAfterStart.max,
          ),
      );
      const completionDateStr = completionDate.toISOString().split("T")[0];

      const outputStockUnits = selectedUnits.map((su, idx) => {
        const consumed = su.remaining_quantity;
        const ratio = randomFloat(
          config.outputQuantityRatio.min,
          config.outputQuantityRatio.max,
        );
        const outputQty = parseFloat((consumed * ratio).toFixed(2));
        const wastageQty = parseFloat((consumed - outputQty).toFixed(2));

        return {
          initial_quantity: outputQty,
          wastage_quantity: wastageQty > 0 ? wastageQty : undefined,
          wastage_reason:
            wastageQty > 0
              ? `Material loss during ${serviceType.toLowerCase()}`
              : undefined,
          quality_grade: idx === 0 ? "A" : Math.random() < 0.7 ? "A" : "B",
          warehouse_location: `Rack ${String.fromCharCode(65 + randomInt(0, 9))}-${randomInt(1, 20)}`,
          created_by: userId,
        };
      });

      const { error: completeError } = await supabase.rpc(
        "complete_goods_convert",
        {
          p_convert_id: convertId as string,
          p_completion_date: completionDateStr,
          p_output_stock_units: outputStockUnits as unknown as never[],
        },
      );

      if (completeError) {
        console.error(
          `   ⚠️  Failed to complete convert ${convertId}: ${completeError.message}`,
        );
        // Leave as in_progress
      } else {
        finalStatus = "completed";
      }
    } else if (roll < config.completedRatio + config.cancelledRatio) {
      // Cancel
      const reason =
        CONVERT_CANCELLATION_REASONS[
          randomInt(0, CONVERT_CANCELLATION_REASONS.length - 1)
        ];

      const { error: cancelError } = await supabase.rpc(
        "cancel_goods_convert",
        {
          p_convert_id: convertId as string,
          p_cancellation_reason: reason,
        },
      );

      if (cancelError) {
        console.error(
          `   ⚠️  Failed to cancel convert ${convertId}: ${cancelError.message}`,
        );
      } else {
        finalStatus = "cancelled";
      }
    }
    // else: leave as in_progress

    totalCreated++;
    console.log(
      `   ✅ Convert ${totalCreated}/${toCreate} — ${warehouse.name} — ${serviceType} — ${finalStatus}`,
    );
  }

  console.log(`\n✨ Successfully created ${totalCreated} new goods converts!`);
  if (linkedCount > 0) {
    console.log(`   • Linked to job works: ${linkedCount}`);
  }
  if (skippedCount > 0) {
    console.log(
      `   • Skipped (no raw material stock at factory): ${skippedCount}`,
    );
  }

  // Re-query for accurate final list
  const { data: allConverts } = await supabase
    .from("goods_converts")
    .select("id, sequence_number, status")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  const statusSummary = (allConverts || []).reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  console.log(
    `📊 Total goods converts: ${allConverts?.length || 0} — ${JSON.stringify(statusSummary)}\n`,
  );

  return allConverts || [];
}
