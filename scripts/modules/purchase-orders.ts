/**
 * Purchase Orders Module
 * Handles purchase order generation with idempotent pattern
 *
 * TODO: Migrate from load-setup.ts (lines 1004-1170)
 * - Creates 400 purchase orders distributed across 12 months
 * - Seasonal variance factors
 * - 30% orders have associated agents
 * - Discount logic (60% get discount)
 * - 1-8 line items per order
 * - Payment terms: 15/30/45/60 days net, COD
 * - RPC: create_purchase_order_with_items
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getRandomDate, randomInt, randomFloat, selectRandom } from "./shared";

// ============================================================================
// TYPES
// ============================================================================

export interface PurchaseOrdersConfig {
  totalOrders: number;
  year: number;
}

export interface PurchaseOrderResult {
  id: string;
  sequence_number: number;
  status: string;
}

// ============================================================================
// PURCHASE ORDERS FUNCTIONS
// ============================================================================

/**
 * Generate purchase orders with idempotent pattern
 * - Fetch existing orders by company + year
 * - Calculate difference
 * - Create missing orders
 * - Return all orders
 */
export async function generatePurchaseOrders(
  supabase: SupabaseClient<Database>,
  companyId: string,
  warehouses: Array<{ id: string; name: string; distribution_weight: number }>,
  userId: string,
  supplierIds: string[],
  agentIds: string[],
  productIds: string[],
  config: PurchaseOrdersConfig,
): Promise<PurchaseOrderResult[]> {
  console.log(
    `\n📦 Ensuring ${config.totalOrders} purchase orders exist for year ${config.year}...\n`,
  );

  // Fetch existing purchase orders for this company in the given year
  const { data: existing, error: fetchError } = await supabase
    .from("purchase_orders")
    .select("id, sequence_number, status, order_date")
    .eq("company_id", companyId)
    .gte("order_date", `${config.year}-01-01`)
    .lte("order_date", `${config.year}-12-31`)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (fetchError) {
    console.error("❌ Error fetching purchase orders:", fetchError);
    throw fetchError;
  }

  const existingCount = existing?.length || 0;

  // If count matches expected, return existing orders
  if (existingCount === config.totalOrders) {
    console.log(`✅ All ${existingCount} purchase orders already exist\n`);
    return existing!;
  }

  // Calculate how many orders to create
  const toCreate = config.totalOrders - existingCount;
  console.log(
    `📦 Creating ${toCreate} new purchase orders (${existingCount} already exist)...`,
  );

  // Monthly targets for seasonal variance (proportional distribution)
  const monthlyTargets = [
    40, 40, 40, // Jan-Mar (wedding season - higher procurement)
    30, 30, 30, // Apr-Jun (regular)
    25, 35, // Jul-Aug (monsoon dip then recovery)
    35, 35, 35, // Sep-Nov (festive season prep)
    25, // Dec
  ];

  // Calculate sum for proportional distribution
  const totalMonthlyTargets = monthlyTargets.reduce((sum, target) => sum + target, 0);

  const createdOrders: PurchaseOrderResult[] = [];
  let totalCreated = 0;

  // Create orders for each month
  for (let month = 1; month <= 12; month++) {
    const targetCount = Math.floor(
      (monthlyTargets[month - 1] / totalMonthlyTargets) * toCreate,
    );

    if (targetCount === 0) continue;

    console.log(
      `📅 Month ${month}: Creating ${targetCount} purchase orders...`,
    );

    for (let i = 0; i < targetCount; i++) {
      const orderDate = getRandomDate(month, config.year);
      const deliveryDays = randomInt(10, 60); // Longer lead time for procurement
      const orderDateObj = new Date(orderDate);
      orderDateObj.setDate(orderDateObj.getDate() + deliveryDays);
      const deliveryDueDate = orderDateObj.toISOString().split("T")[0];

      const supplierId =
        supplierIds[Math.floor(Math.random() * supplierIds.length)];
      const agentId =
        Math.random() < 0.3 && agentIds.length > 0
          ? agentIds[Math.floor(Math.random() * agentIds.length)]
          : ""; // 30% have agents

      // Discount logic (60% get discount)
      const hasDiscount = Math.random() < 0.6;
      const discountType = hasDiscount
        ? Math.random() < 0.9
          ? "percentage"
          : "flat_amount"
        : "none";
      const discountValue = hasDiscount ? randomFloat(3, 15) : 0;

      const advanceAmount = randomFloat(2000, 15000);

      // Payment terms
      const paymentTermsOptions = [
        "15 days net",
        "30 days net",
        "45 days net",
        "60 days net",
        "Cash on delivery",
      ];
      const paymentTerms =
        paymentTermsOptions[
          Math.floor(Math.random() * paymentTermsOptions.length)
        ];

      // Create order items (1-8 products per order)
      const itemCount = randomInt(1, 8);
      const selectedProducts = selectRandom(productIds, itemCount);
      const lineItems = selectedProducts.map((productId) => {
        const requiredQty = randomInt(10, 300); // Higher quantities for purchases
        const unitRate = randomFloat(80, 4000);

        return {
          product_id: productId,
          required_quantity: requiredQty,
          unit_rate: unitRate,
        };
      });

      // Randomly assign warehouse
      const selectedWarehouse = warehouses[randomInt(0, warehouses.length - 1)];

      // Create order using RPC function
      const { data: sequenceNumber, error: orderError } = await supabase.rpc(
        "create_purchase_order_with_items",
        {
          p_order_data: {
            company_id: companyId,
            warehouse_id: selectedWarehouse.id,
            supplier_id: supplierId,
            agent_id: agentId,
            order_date: orderDate,
            delivery_due_date: deliveryDueDate,
            payment_terms: paymentTerms,
            tax_type: "gst",
            advance_amount: advanceAmount,
            discount_type: discountType,
            discount_value: discountValue,
            notes: "Auto-generated test data",
            source: "manual",
            status: "approval_pending",
            created_by: userId,
          },
          p_line_items: lineItems,
        },
      );

      if (orderError) {
        console.error(
          `❌ Failed to create purchase order: ${orderError.message}`,
        );
        continue;
      }

      // Get the created order by sequence number
      const { data: order } = await supabase
        .from("purchase_orders")
        .select("id, sequence_number, status")
        .eq("company_id", companyId)
        .eq("sequence_number", sequenceNumber)
        .single();

      if (order) {
        createdOrders.push(order);
      }

      totalCreated++;
      if (totalCreated % 50 === 0) {
        console.log(`   ✅ Created ${totalCreated}/${toCreate} orders...`);
      }
    }
  }

  console.log(`\n✨ Successfully created ${totalCreated} new purchase orders!`);

  // Return all orders (existing + created)
  const allOrders = [...(existing || []), ...createdOrders];

  console.log(`📊 Total purchase orders: ${allOrders.length}\n`);

  return allOrders;
}
