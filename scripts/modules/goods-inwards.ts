/**
 * Goods Inwards Module
 * Handles goods inward generation with idempotent pattern
 *
 * Migrated from load-setup.ts (lines 602-847)
 * - Creates goods inwards from purchase orders
 * - Creates stock units with lot numbers, quality grades, warehouse locations
 * - Associates with inbound_goods_movements
 * - RPC: create_goods_inward_with_units
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { randomInt, randomFloat } from "./shared";

// ============================================================================
// TYPES
// ============================================================================

export interface GoodsInwardsConfig {
  fulfillmentRate: number; // e.g., 0.8 for 80% of purchase orders
}

export interface GoodsInwardResult {
  id: string;
  sequence_number: number;
}

// ============================================================================
// GOODS INWARDS FUNCTIONS
// ============================================================================

/**
 * Generate goods inwards with idempotent pattern
 * - Fetch existing goods inwards by company
 * - Fetch purchase orders with items
 * - Update purchase orders to "in_progress" status
 * - Create goods inwards from in_progress purchase orders
 * - Return all goods inwards
 */
export async function generateGoodsInwards(
  supabase: SupabaseClient<Database>,
  companyId: string,
  userId: string,
  lotNumbers: string[],
  config: GoodsInwardsConfig,
): Promise<GoodsInwardResult[]> {
  console.log(`\n📥 Ensuring goods inwards exist...\n`);

  // Fetch existing goods inwards for this company
  const { data: existing, error: fetchError } = await supabase
    .from("goods_inwards")
    .select("id, sequence_number")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (fetchError) {
    console.error("❌ Error fetching goods inwards:", fetchError);
    throw fetchError;
  }

  const existingCount = existing?.length || 0;

  // Fetch all purchase orders with items
  const { data: allPOs, error: poFetchError } = await supabase
    .from("purchase_orders")
    .select(
      `
      id,
      warehouse_id,
      supplier_id,
      order_date,
      status,
      purchase_order_items (
        product_id,
        required_quantity
      )
    `,
    )
    .eq("company_id", companyId)
    .is("deleted_at", null);

  if (poFetchError || !allPOs) {
    console.error("❌ Failed to fetch purchase orders:", poFetchError);
    throw poFetchError;
  }

  // Calculate target based on purchase order fulfillment rate
  const targetCount = Math.floor(allPOs.length * config.fulfillmentRate);

  // If count matches expected, return existing
  if (existingCount >= targetCount) {
    console.log(
      `✅ Sufficient goods inwards already exist (${existingCount})\n`,
    );
    return existing!;
  }

  // Calculate how many to create
  const toCreate = targetCount - existingCount;
  console.log(
    `📦 Creating ${toCreate} new goods inwards (${existingCount} already exist)...`,
  );

  // Step 1: Update purchase orders to "in_progress" status (those that haven't been updated)
  const posToUpdate = allPOs
    .filter((po) => po.status === "approval_pending")
    .slice(0, targetCount);

  if (posToUpdate.length > 0) {
    console.log(
      `📝 Updating ${posToUpdate.length} purchase orders to 'in_progress'...`,
    );
    const { error: updateError } = await supabase
      .from("purchase_orders")
      .update({ status: "in_progress" })
      .in(
        "id",
        posToUpdate.map((po) => po.id),
      );

    if (updateError) {
      console.error("❌ Failed to update purchase orders:", updateError);
      throw updateError;
    }
  }

  // Step 2: Get purchase orders that are now in_progress
  const posWithItems = allPOs
    .filter(
      (po) =>
        po.status === "in_progress" || posToUpdate.some((p) => p.id === po.id),
    )
    .slice(0, targetCount);

  // Step 3: Create goods inwards
  const createdInwards: GoodsInwardResult[] = [];
  let totalCreated = 0;

  for (const po of posWithItems.slice(existingCount)) {
    if (totalCreated >= toCreate) break;

    const inwardDate = new Date(po.order_date);
    inwardDate.setDate(inwardDate.getDate() + randomInt(5, 30)); // 5-30 days after PO

    // Determine if this inward gets lot numbers (80% chance)
    const hasLotNumber = Math.random() < 0.8;
    const lotNumber = hasLotNumber
      ? lotNumbers[Math.floor(Math.random() * lotNumbers.length)]
      : null;

    // Create stock units for each product in the PO
    const stockUnitsData = [];
    for (const item of po.purchase_order_items) {
      const receivedQty = randomFloat(
        item.required_quantity * 0.5,
        item.required_quantity,
      );
      const stockUnitsCount = randomInt(1, 3); // 1-3 stock units per product
      const qtyPerUnit = receivedQty / stockUnitsCount;

      for (let j = 0; j < stockUnitsCount; j++) {
        const quantity =
          j === stockUnitsCount - 1
            ? parseFloat((receivedQty - qtyPerUnit * j).toFixed(2))
            : parseFloat(qtyPerUnit.toFixed(2));

        const qualityRoll = Math.random();
        const qualityGrade =
          qualityRoll < 0.6 ? "A" : qualityRoll < 0.9 ? "B" : "C";
        const rackLetter = String.fromCharCode(65 + randomInt(0, 9)); // A-J
        const rackNumber = randomInt(1, 20);

        stockUnitsData.push({
          product_id: item.product_id,
          initial_quantity: quantity,
          quality_grade: qualityGrade,
          warehouse_location: `Rack ${rackLetter}-${rackNumber}`,
          lot_number: lotNumber,
          created_by: userId,
        });
      }
    }

    // Create goods inward using RPC
    const { data: sequenceNumber, error: inwardError } = await supabase.rpc(
      "create_goods_inward_with_units",
      {
        p_inward_data: {
          company_id: companyId,
          warehouse_id: po.warehouse_id,
          inward_type: "purchase_order",
          purchase_order_id: po.id,
          partner_id: po.supplier_id,
          inward_date: inwardDate.toISOString().split("T")[0],
          notes: "PO receipt - auto-generated test data",
          created_by: userId,
        },
        p_stock_units: stockUnitsData,
      },
    );

    if (inwardError) {
      console.error(`❌ Failed to create goods inward: ${inwardError.message}`);
      continue;
    }

    // Get the created inward
    const { data: inward } = await supabase
      .from("goods_inwards")
      .select("id, sequence_number")
      .eq("company_id", companyId)
      .eq("sequence_number", Number(sequenceNumber))
      .single();

    if (inward) {
      createdInwards.push(inward);
    }

    totalCreated++;
    if (totalCreated % 10 === 0) {
      console.log(`   ✅ Created ${totalCreated}/${toCreate} goods inwards...`);
    }
  }

  console.log(`\n✨ Successfully created ${totalCreated} new goods inwards!`);

  // Re-query to get all goods inwards (including newly created ones)
  const { data: allInwards } = await supabase
    .from("goods_inwards")
    .select("id, sequence_number")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  console.log(`📊 Total goods inwards: ${allInwards?.length || 0}\n`);

  return allInwards || [];
}
