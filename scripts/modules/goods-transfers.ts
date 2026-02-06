/**
 * Goods Transfers Module
 * Handles warehouse-to-warehouse stock transfers with idempotent pattern
 *
 * Migrated from load-setup.ts (lines 1422-1722)
 * - Transfers between business warehouses and vendor factories
 * - Two directions: warehouse→factory and factory→warehouse
 * - Contextual notes based on warehouse types
 * - Max 2 transfers per stock unit
 * - Status: 60% completed, 30% in_transit, 10% cancelled
 * - RPC: create_goods_transfer_with_items
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { TransportType } from "../config/goods-transfers.config";
import { randomInt, selectRandom } from "./shared";
import { applyStatusDistribution } from "./record-status";

// ============================================================================
// TYPES
// ============================================================================

export interface GoodsTransfersOptions {
  totalTransfers: number;
  direction: "warehouse_to_factory" | "factory_to_warehouse";
  year: number;
}

export interface GoodsTransferResult {
  id: string;
  sequence_number: number;
}

interface Warehouse {
  id: string;
  name: string;
}

interface StockUnitForTransfer {
  id: string;
  current_warehouse_id: string;
  updated_at: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate contextual transfer notes based on warehouse types
 */
function generateTransferNote(
  fromName: string,
  toName: string,
  count: number,
): string {
  const isFromFactory = fromName.toLowerCase().includes("factory");
  const isToFactory = toName.toLowerCase().includes("factory");
  const isFromMain = fromName.toLowerCase().includes("main");
  const isToMain = toName.toLowerCase().includes("main");
  const isFromRegional = fromName.toLowerCase().includes("regional");
  const isToRegional = toName.toLowerCase().includes("regional");

  let action = "";

  if (isFromMain && isToFactory) {
    // Main → Factory
    if (toName.toLowerCase().includes("dyeing")) action = "Sent for dyeing";
    else if (toName.toLowerCase().includes("knitting"))
      action = "Sent for knitting";
    else if (toName.toLowerCase().includes("weaving"))
      action = "Sent for weaving";
    else if (toName.toLowerCase().includes("processing"))
      action = "Sent for processing";
    else action = "Sent for job work";
  } else if (isFromFactory && isToMain) {
    // Factory → Main
    if (fromName.toLowerCase().includes("dyeing")) action = "Finished dyeing";
    else if (fromName.toLowerCase().includes("knitting"))
      action = "Finished knitting";
    else if (fromName.toLowerCase().includes("weaving"))
      action = "Finished weaving";
    else if (fromName.toLowerCase().includes("processing"))
      action = "Finished processing";
    else action = "Job work completed";
  } else if (isFromMain && isToRegional) {
    // Main → Regional
    action = "Stock distribution";
  } else if (isFromRegional && isToMain) {
    // Regional → Main
    action = "Consolidation to main warehouse";
  } else if (isFromRegional && isToFactory) {
    // Regional → Factory
    if (toName.toLowerCase().includes("dyeing")) action = "Sent for dyeing";
    else if (toName.toLowerCase().includes("knitting"))
      action = "Sent for knitting";
    else if (toName.toLowerCase().includes("weaving"))
      action = "Sent for weaving";
    else if (toName.toLowerCase().includes("processing"))
      action = "Sent for processing";
    else action = "Sent for job work";
  } else if (isFromFactory && isToRegional) {
    // Factory → Regional
    action = "Direct delivery to regional warehouse";
  } else if (isFromRegional && isToRegional) {
    // Regional → Regional
    action = "Inter-regional stock transfer";
  } else if (isFromFactory && isToFactory) {
    // Factory → Factory
    action = "Sent for additional processing";
  } else {
    action = "Warehouse transfer";
  }

  return `${action} (${count} units)`;
}

/**
 * Get random date within 1 week after a minimum date
 */
function getTransferDateAfter(minDate: Date, config: any): string {
  const transferDate = new Date(minDate);
  transferDate.setDate(
    transferDate.getDate() +
      randomInt(
        config.transferDateOffsetDays.min,
        config.transferDateOffsetDays.max,
      ),
  );
  return transferDate.toISOString().split("T")[0];
}

// ============================================================================
// GOODS TRANSFERS FUNCTIONS
// ============================================================================

/**
 * Generate goods transfers with idempotent pattern
 * - Fetch existing transfers by company
 * - Fetch all stock units with transfer constraints
 * - Create transfers from source to destination warehouses
 * - Randomly assign statuses (60% completed, 30% in_transit, 10% cancelled)
 * - Return all transfers
 */
export async function generateGoodsTransfers(
  supabase: SupabaseClient<Database>,
  companyId: string,
  userId: string,
  warehouses: Warehouse[],
  config: any, // GOODS_TRANSFERS_CONFIG
  options: GoodsTransfersOptions,
): Promise<GoodsTransferResult[]> {
  const directionLabel =
    options.direction === "warehouse_to_factory"
      ? "Business Warehouse → Vendor Factory"
      : "Vendor Factory → Business Warehouse";

  console.log(`\n🔄 Ensuring goods transfers exist (${directionLabel})...\n`);

  // Fetch existing transfers for this company
  const { data: existing, error: fetchError } = await supabase
    .from("goods_transfers")
    .select("id, sequence_number")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (fetchError) {
    console.error("❌ Error fetching goods transfers:", fetchError);
    throw fetchError;
  }

  const existingCount = existing?.length || 0;
  const targetCount = options.totalTransfers;

  // If count matches expected, return existing
  if (existingCount >= targetCount) {
    console.log(
      `✅ Sufficient goods transfers already exist (${existingCount})\n`,
    );
    return existing!;
  }

  // Calculate how many to create
  const toCreate = targetCount - existingCount;
  console.log(
    `📦 Creating ${toCreate} new transfers (${existingCount} already exist)...`,
  );

  // Separate warehouses into business and factory
  const businessWarehouses = warehouses.filter(
    (w) =>
      !w.name.toLowerCase().includes("factory") &&
      (w.name.toLowerCase().includes("warehouse") ||
        w.name.toLowerCase().includes("main") ||
        w.name.toLowerCase().includes("regional")),
  );

  const factoryWarehouses = warehouses.filter((w) =>
    w.name.toLowerCase().includes("factory"),
  );

  if (businessWarehouses.length === 0 || factoryWarehouses.length === 0) {
    console.error(
      "❌ Missing business warehouses or factory warehouses. Cannot create transfers.",
    );
    return existing || [];
  }

  // Determine source and destination based on direction
  const sourceWarehouses =
    options.direction === "warehouse_to_factory"
      ? businessWarehouses
      : factoryWarehouses;
  const destinationWarehouses =
    options.direction === "warehouse_to_factory"
      ? factoryWarehouses
      : businessWarehouses;

  console.log(
    `   Source warehouses: ${sourceWarehouses.map((w) => w.name).join(", ")}`,
  );
  console.log(
    `   Destination warehouses: ${destinationWarehouses.map((w) => w.name).join(", ")}`,
  );

  // Fetch all stock units from source warehouses
  const { data: allStockUnits, error: stockError } = await supabase
    .from("stock_units")
    .select("id, current_warehouse_id, updated_at")
    .eq("company_id", companyId)
    .in("status", ["full", "partial"])
    .gt("remaining_quantity", 0)
    .in(
      "current_warehouse_id",
      sourceWarehouses.map((w) => w.id),
    );

  if (stockError || !allStockUnits || allStockUnits.length === 0) {
    console.error("❌ No stock units available for transfers");
    return existing || [];
  }

  console.log(`   Loaded ${allStockUnits.length} eligible stock units`);

  // Shuffle stock units for random selection
  const shuffledStockUnits = [...allStockUnits].sort(() => Math.random() - 0.5);

  // Create transfers
  const createdTransfers: GoodsTransferResult[] = [];
  let totalCreated = 0;
  let skippedCount = 0;
  let stockUnitIndex = 0;

  for (let i = 0; i < toCreate; i++) {
    // Select random source warehouse
    const fromWarehouse =
      sourceWarehouses[randomInt(0, sourceWarehouses.length - 1)];

    // Get target number of stock units for this transfer
    const targetStockUnitCount = randomInt(
      config.stockUnitsPerTransfer.min,
      config.stockUnitsPerTransfer.max,
    );

    // Get stock units from this warehouse
    const availableFromWarehouse = shuffledStockUnits.filter(
      (su) => su.current_warehouse_id === fromWarehouse.id,
    );

    if (availableFromWarehouse.length < config.stockUnitsPerTransfer.min) {
      skippedCount++;
      continue; // Not enough stock units in this warehouse
    }

    // Select random stock units from this warehouse
    const selectedStockUnits = selectRandom(
      availableFromWarehouse,
      Math.min(targetStockUnitCount, availableFromWarehouse.length),
    );
    const selectedStockUnitIds = selectedStockUnits.map((su) => su.id);

    // Remove selected stock units from shuffled array to avoid reuse
    selectedStockUnitIds.forEach((id) => {
      const index = shuffledStockUnits.findIndex((su) => su.id === id);
      if (index > -1) shuffledStockUnits.splice(index, 1);
    });

    // Get the latest updated_at from selected stock units
    const latestUpdatedAt = selectedStockUnits.reduce((latest, su) => {
      const suDate = new Date(su.updated_at);
      return suDate > latest ? suDate : latest;
    }, new Date(0));

    // Select random destination warehouse
    const toWarehouse =
      destinationWarehouses[randomInt(0, destinationWarehouses.length - 1)];

    // Generate transfer date within 1 week after latest stock unit updated_at
    const transferDate = getTransferDateAfter(latestUpdatedAt, config);

    // Expected delivery date
    const transferDateObj = new Date(transferDate);
    const expectedDeliveryDate = new Date(transferDateObj);
    expectedDeliveryDate.setDate(
      expectedDeliveryDate.getDate() +
        randomInt(
          config.expectedDeliveryDays.min,
          config.expectedDeliveryDays.max,
        ),
    );

    // Generate contextual notes
    const notes = generateTransferNote(
      fromWarehouse.name,
      toWarehouse.name,
      selectedStockUnitIds.length,
    );

    // Random transport type
    const transportType =
      config.transportTypes[
        randomInt(0, config.transportTypes.length - 1)
      ] as TransportType;

    const transferData = {
      company_id: companyId,
      from_warehouse_id: fromWarehouse.id,
      to_warehouse_id: toWarehouse.id,
      transfer_date: transferDate,
      expected_delivery_date: expectedDeliveryDate.toISOString().split("T")[0],
      transport_type: transportType,
      notes,
      created_by: userId,
    };

    const { error: transferError } = await supabase.rpc(
      "create_goods_transfer_with_items",
      {
        p_transfer_data: transferData,
        p_stock_unit_ids: selectedStockUnitIds,
      },
    );

    if (transferError) {
      console.error(`   ❌ Failed to create transfer: ${transferError.message}`);
      skippedCount++;
      continue;
    }

    // Get the created transfer
    const { data: createdTransfer } = await supabase
      .from("goods_transfers")
      .select("id, sequence_number")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (createdTransfer) {
      createdTransfers.push(createdTransfer);
      totalCreated++;

      if (totalCreated % 10 === 0) {
        console.log(`   ✅ Created ${totalCreated}/${toCreate} transfers...`);
      }
    }
  }

  console.log(`\n✨ Successfully created ${totalCreated} new transfers!`);

  if (skippedCount > 0) {
    console.log(`   • Skipped (insufficient stock): ${skippedCount}`);
  }

  // Apply status distribution to created transfers
  if (createdTransfers.length > 0) {
    console.log(`\n📊 Applying status distribution...`);

    const cancellationReasons = [
      "Warehouse capacity issue",
      "Transport unavailable",
      "Order changed",
    ];

    const statusResults = await applyStatusDistribution(
      supabase,
      "goods_transfers",
      createdTransfers.map((t) => t.id),
      [
        {
          status: "completed",
          percentage: config.statusDistribution.completed,
          updateFieldsGenerator: () => {
            // Generate random completion date (between min and max delivery days)
            const daysToComplete = randomInt(
              config.expectedDeliveryDays.min,
              config.expectedDeliveryDays.max - 1,
            );
            const completedDate = new Date();
            completedDate.setDate(completedDate.getDate() - daysToComplete);
            return {
              completed_at: completedDate.toISOString(),
              completed_by: userId,
            };
          },
        },
        {
          status: "in_transit",
          percentage: config.statusDistribution.in_transit,
        },
        {
          status: "cancelled",
          percentage: config.statusDistribution.cancelled,
          updateFieldsGenerator: () => ({
            cancellation_reason:
              cancellationReasons[randomInt(0, cancellationReasons.length - 1)],
          }),
        },
      ],
    );

    statusResults.forEach((result) => {
      const percentage = Math.round((result.count / createdTransfers.length) * 100);
      console.log(`   • ${result.status}: ${result.count} (${percentage}%)`);
    });
  }

  // Re-query to get all transfers
  const { data: allTransfers } = await supabase
    .from("goods_transfers")
    .select("id, sequence_number")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  console.log(`📊 Total goods transfers: ${allTransfers?.length || 0}\n`);

  return allTransfers || [];
}
