/**
 * Goods Outwards Module
 * Handles goods outward generation with idempotent pattern
 *
 * Migrated from load-setup.ts (lines 1176-1415)
 * - Goods Outwards: From sales orders (60% fulfillment)
 * - Allocates stock units using FIFO/LIFO strategy
 * - Associates with outbound_goods_movements
 * - RPC: create_goods_outward_with_items
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database/supabase";
import { randomInt, randomFloat } from "./shared";
import { Json } from "@/types/database/supabase";

// ============================================================================
// TYPES
// ============================================================================

export interface GoodsOutwardsConfig {
  fulfillmentRate: number; // e.g., 0.6 for 60% of sales orders
}

export interface GoodsOutwardResult {
  id: string;
  sequence_number: number;
}

interface StockUnitAllocation {
  stock_unit_id: string;
  quantity: number;
  updated_at?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Select stock units for dispatch using FIFO or LIFO strategy
 * Prefers Grade A quality, allocates greedily until required quantity is met
 */
async function selectStockUnitsForDispatch(
  supabase: SupabaseClient<Database>,
  companyId: string,
  warehouseId: string,
  productId: string,
  requiredQty: number,
  preferFifo: boolean = true,
): Promise<StockUnitAllocation[]> {
  const { data: stockUnits, error } = await supabase
    .from("stock_units")
    .select("id, remaining_quantity, quality_grade, created_at, updated_at")
    .eq("company_id", companyId)
    .eq("current_warehouse_id", warehouseId)
    .eq("product_id", productId)
    .in("status", ["available"])
    .gt("remaining_quantity", 0)
    .order("quality_grade", { ascending: true }) // Prefer grade A
    .order("created_at", { ascending: preferFifo })
    .limit(20);

  if (error || !stockUnits || stockUnits.length === 0) {
    return [];
  }

  const dispatchItems: StockUnitAllocation[] = [];
  let remaining = requiredQty;

  for (const unit of stockUnits) {
    if (remaining <= 0) break;

    const dispatchQty = Math.min(remaining, unit.remaining_quantity);
    dispatchItems.push({
      stock_unit_id: unit.id,
      quantity: dispatchQty,
      updated_at: unit.updated_at,
    });
    remaining -= dispatchQty;
  }

  return dispatchItems;
}

// ============================================================================
// GOODS OUTWARDS FUNCTIONS
// ============================================================================

/**
 * Generate goods outwards with idempotent pattern
 * - Fetch existing goods outwards by company
 * - Fetch sales orders with items
 * - Update sales orders to "in_progress" status
 * - Create goods outwards from in_progress sales orders with stock allocations
 * - Return all goods outwards
 */
export async function generateGoodsOutwards(
  supabase: SupabaseClient<Database>,
  companyId: string,
  userId: string,
  config: GoodsOutwardsConfig,
): Promise<GoodsOutwardResult[]> {
  console.log(`\n📤 Ensuring goods outwards exist...\n`);

  // Fetch existing goods outwards for this company
  const { data: existing, error: fetchError } = await supabase
    .from("goods_outwards")
    .select("id, sequence_number")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (fetchError) {
    console.error("❌ Error fetching goods outwards:", fetchError);
    throw fetchError;
  }

  const existingCount = existing?.length || 0;

  // Fetch all sales orders with items (including pending_quantity)
  const { data: allSOs, error: soFetchError } = await supabase
    .from("sales_orders")
    .select(
      `
      id,
      warehouse_id,
      customer_id,
      order_date,
      status,
      sales_order_items (
        product_id,
        required_quantity,
        pending_quantity
      )
    `,
    )
    .eq("company_id", companyId)
    .is("deleted_at", null);

  if (soFetchError || !allSOs) {
    console.error("❌ Failed to fetch sales orders:", soFetchError);
    throw soFetchError;
  }

  // Calculate target based on sales order fulfillment rate
  const targetCount = Math.floor(allSOs.length * config.fulfillmentRate);

  // If count matches expected, return existing
  if (existingCount >= targetCount) {
    console.log(
      `✅ Sufficient goods outwards already exist (${existingCount})\n`,
    );
    return existing!;
  }

  // Calculate how many to create
  const toCreate = targetCount - existingCount;
  console.log(
    `📦 Creating ${toCreate} new goods outwards (${existingCount} already exist)...`,
  );

  // Step 1: Update sales orders to "in_progress" status (those that haven't been updated)
  const sosToUpdate = allSOs
    .filter((so) => so.status === "approval_pending")
    .slice(0, targetCount);

  if (sosToUpdate.length > 0) {
    console.log(
      `📝 Updating ${sosToUpdate.length} sales orders to 'in_progress'...`,
    );
    const { error: updateError } = await supabase
      .from("sales_orders")
      .update({ status: "in_progress" })
      .in(
        "id",
        sosToUpdate.map((so) => so.id),
      );

    if (updateError) {
      console.error("❌ Failed to update sales orders:", updateError);
      throw updateError;
    }
  }

  // Step 2: Get sales orders that are now in_progress (combine already in_progress + newly updated)
  const alreadyInProgress = allSOs.filter((so) => so.status === "in_progress");
  const sosWithItems = [...alreadyInProgress, ...sosToUpdate];

  // Step 3: Create goods outwards
  const createdOutwards: GoodsOutwardResult[] = [];
  let totalCreated = 0;

  for (const so of sosWithItems) {
    if (totalCreated >= toCreate) break;

    // Prepare stock unit items - dispatch based on pending_quantity
    const stockUnitItems: StockUnitAllocation[] = [];

    for (const item of so.sales_order_items) {
      // Use pending_quantity if available, otherwise use required_quantity
      const pendingQty = item.pending_quantity ?? item.required_quantity;

      if (pendingQty <= 0) continue;

      // Randomly dispatch 50-100% of pending quantity
      const dispatchPercentage = randomFloat(0.5, 1.0);
      const quantityToDispatch = Math.ceil(pendingQty * dispatchPercentage);

      if (quantityToDispatch === 0) continue;

      const preferFifo = Math.random() < 0.7; // 70% use FIFO
      const selected = await selectStockUnitsForDispatch(
        supabase,
        companyId,
        so.warehouse_id!,
        item.product_id,
        quantityToDispatch,
        preferFifo,
      );

      stockUnitItems.push(...selected);
    }

    if (stockUnitItems.length === 0) {
      // No stock available, skip this order
      continue;
    }

    // Calculate outward date as max(SO order_date, latest stock unit updated_at) + random offset
    const soDate = new Date(so.order_date);
    const latestStockUpdatedAt = stockUnitItems.reduce((latest, item) => {
      if (!item.updated_at) return latest;
      const itemDate = new Date(item.updated_at);
      return itemDate > latest ? itemDate : latest;
    }, soDate);

    const outwardDate = new Date(latestStockUpdatedAt);
    outwardDate.setDate(outwardDate.getDate() + randomInt(1, 7)); // 1-7 days after latest date

    // Create goods outward using RPC
    const { data: sequenceNumber, error: outwardError } = await supabase.rpc(
      "create_goods_outward_with_items",
      {
        p_outward_data: {
          company_id: companyId,
          warehouse_id: so.warehouse_id,
          partner_id: so.customer_id,
          outward_type: "sales_order",
          sales_order_id: so.id,
          outward_date: outwardDate.toISOString().split("T")[0],
          notes: "Sales order dispatch - auto-generated test data",
          created_by: userId,
        },
        p_stock_unit_items: stockUnitItems as unknown as Json[],
      },
    );

    if (outwardError) {
      console.error(
        `❌ Failed to create goods outward: ${outwardError.message}`,
      );
      continue;
    }

    // Get the created outward
    const { data: outward } = await supabase
      .from("goods_outwards")
      .select("id, sequence_number")
      .eq("company_id", companyId)
      .eq("sequence_number", Number(sequenceNumber))
      .single();

    if (outward) {
      createdOutwards.push(outward);
    }

    totalCreated++;
    if (totalCreated % 10 === 0) {
      console.log(
        `   ✅ Created ${totalCreated}/${toCreate} goods outwards...`,
      );
    }
  }

  console.log(`\n✨ Successfully created ${totalCreated} new goods outwards!`);

  // Re-query to get all goods outwards (including newly created ones)
  const { data: allOutwards } = await supabase
    .from("goods_outwards")
    .select("id, sequence_number")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  console.log(`📊 Total goods outwards: ${allOutwards?.length || 0}\n`);

  return allOutwards || [];
}
