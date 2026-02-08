/**
 * QR Batches Module
 * Handles QR code batch generation for stock units
 *
 * Migrated from setup.ts (lines 2036-2233)
 * - Creates QR batches with field selections
 * - Links stock units to batches via qr_batch_items
 * - Batch size: 5-15 stock units per batch
 * - 3 batches per warehouse
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { randomInt } from "./shared";

// ============================================================================
// TYPES
// ============================================================================

export interface QRBatchResult {
  id: string;
  batch_name: string;
  total_items: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique batch name with date
 */
function generateBatchName(
  template: string,
  index: number,
  date: Date,
): string {
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  if (index > 0) {
    return `${template} #${index + 1} - ${month} ${year}`;
  }
  return `${template} - ${month} ${year}`;
}

/**
 * Generate a random creation date within the offset range
 */
function generateBatchDate(
  config: typeof import("../config/qr-batches.config").QR_BATCHES_CONFIG,
): Date {
  const date = new Date();
  const daysAgo = randomInt(
    config.batchDateOffsetDays.min,
    config.batchDateOffsetDays.max,
  );
  date.setDate(date.getDate() - daysAgo);
  return date;
}

/**
 * Select random fields from available options
 */
function selectRandomFields(
  config: typeof import("../config/qr-batches.config").QR_BATCHES_CONFIG,
): string[] {
  const index = randomInt(0, config.availableFields.length - 1);
  return [...config.availableFields[index]];
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Generate QR batches for all warehouses
 * - 3 batches per warehouse
 * - 5-15 stock units per batch
 * - Random field selections
 * - Idempotent: checks existing batches by name
 */
export async function generateQRBatches(
  supabase: SupabaseClient<Database>,
  companyId: string,
  warehouses: Array<{ id: string; name: string }>,
  userId: string,
  config: typeof import("../config/qr-batches.config").QR_BATCHES_CONFIG,
): Promise<QRBatchResult[]> {
  console.log("\n📱 Generating QR batches...\n");

  const allBatches: QRBatchResult[] = [];

  for (const warehouse of warehouses) {
    console.log(`\n🏭 Processing warehouse: ${warehouse.name}`);

    // Fetch available stock units for this warehouse
    const { data: availableStockUnits, error: stockUnitsError } = await supabase
      .from("stock_units")
      .select("id")
      .eq("company_id", companyId)
      .eq("current_warehouse_id", warehouse.id)
      .in("status", ["full", "partial"])
      .limit(100);

    if (
      stockUnitsError ||
      !availableStockUnits ||
      availableStockUnits.length === 0
    ) {
      console.log(
        `   ⚠️  No stock units found for ${warehouse.name}. Skipping...`,
      );
      continue;
    }

    console.log(
      `   📦 Found ${availableStockUnits.length} available stock units`,
    );

    // Fetch existing batches for this warehouse
    const { data: existingBatches } = await supabase
      .from("qr_batches")
      .select("id, batch_name")
      .eq("company_id", companyId)
      .eq("warehouse_id", warehouse.id)
      .order("created_at", { ascending: true });

    const existingCount = existingBatches?.length || 0;
    const targetCount = config.batchesPerWarehouse;

    if (existingCount >= targetCount) {
      console.log(`   ✅ Sufficient batches already exist (${existingCount})`);
      // Add existing batches to results
      if (existingBatches) {
        for (const batch of existingBatches) {
          const { count } = await supabase
            .from("qr_batch_items")
            .select("*", { count: "exact", head: true })
            .eq("batch_id", batch.id);

          allBatches.push({
            id: batch.id,
            batch_name: batch.batch_name,
            total_items: count || 0,
          });
        }
      }
      continue;
    }

    const toCreate = targetCount - existingCount;
    console.log(
      `   📝 Creating ${toCreate} new batches (${existingCount} already exist)...`,
    );

    let stockUnitIndex = 0;
    let createdCount = 0;

    for (let i = 0; i < toCreate; i++) {
      // Generate batch details
      const templateIndex = randomInt(0, config.batchNameTemplates.length - 1);
      const template = config.batchNameTemplates[templateIndex];
      const batchDate = generateBatchDate(config);
      const batchName = generateBatchName(template, i, batchDate);
      const fieldsSelected = selectRandomFields(config);

      // Check if batch already exists
      const { data: existingBatch } = await supabase
        .from("qr_batches")
        .select("id, batch_name")
        .eq("company_id", companyId)
        .eq("batch_name", batchName)
        .single();

      let batchId: string;
      let batchNameFinal: string;

      if (existingBatch) {
        console.log(`   ⏭️  Batch "${batchName}" already exists`);
        batchId = existingBatch.id;
        batchNameFinal = existingBatch.batch_name;
      } else {
        // Create new batch
        const { data: newBatch, error: batchError } = await supabase
          .from("qr_batches")
          .insert({
            company_id: companyId,
            warehouse_id: warehouse.id,
            batch_name: batchName,
            fields_selected: fieldsSelected,
            pdf_url: null,
            image_url: null,
            created_by: userId,
            created_at: batchDate.toISOString(),
          })
          .select("id, batch_name")
          .single();

        if (batchError || !newBatch) {
          console.error(`   ❌ Failed to create batch: ${batchName}`);
          console.error(`      Error: ${batchError?.message}`);
          continue;
        }

        batchId = newBatch.id;
        batchNameFinal = newBatch.batch_name;
        console.log(`   ✅ Created batch: ${batchName}`);
      }

      // Check if batch items already exist
      const { data: existingItems } = await supabase
        .from("qr_batch_items")
        .select("id")
        .eq("batch_id", batchId);

      if (existingItems && existingItems.length > 0) {
        console.log(
          `      ⏭️  Batch items already exist (${existingItems.length} items)`,
        );
        allBatches.push({
          id: batchId,
          batch_name: batchNameFinal,
          total_items: existingItems.length,
        });
        stockUnitIndex += existingItems.length;
        continue;
      }

      // Add stock units to batch
      const itemCount = Math.min(
        randomInt(config.stockUnitsPerBatch.min, config.stockUnitsPerBatch.max),
        availableStockUnits.length - stockUnitIndex,
      );

      if (itemCount === 0) {
        console.log(
          `      ⚠️  No more stock units available. Stopping batch creation.`,
        );
        break;
      }

      let addedItems = 0;
      for (
        let j = 0;
        j < itemCount && stockUnitIndex < availableStockUnits.length;
        j++
      ) {
        const { error: itemError } = await supabase
          .from("qr_batch_items")
          .insert({
            company_id: companyId,
            warehouse_id: warehouse.id,
            batch_id: batchId,
            stock_unit_id: availableStockUnits[stockUnitIndex].id,
          });

        if (itemError) {
          console.error(
            `      ❌ Failed to add item to batch: ${itemError.message}`,
          );
        } else {
          addedItems++;
        }

        stockUnitIndex++;
      }

      console.log(`      ✅ Added ${addedItems} items to batch`);

      allBatches.push({
        id: batchId,
        batch_name: batchNameFinal,
        total_items: addedItems,
      });

      createdCount++;
    }

    console.log(
      `   ✨ Created ${createdCount} new batches for ${warehouse.name}`,
    );
  }

  console.log(`\n📊 Total QR batches: ${allBatches.length}\n`);

  return allBatches;
}
