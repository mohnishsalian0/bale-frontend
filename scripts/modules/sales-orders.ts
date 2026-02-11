/**
 * Sales Orders Module
 * Handles sales order generation with idempotent pattern
 *
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database/supabase";
import { getRandomDate, randomInt, randomFloat, selectRandom } from "./shared";

// ============================================================================
// TYPES
// ============================================================================

export interface SalesOrdersConfig {
  totalOrders: number;
  year: number;
}

export interface SalesOrderResult {
  id: string;
  sequence_number: number;
  status: string;
}

// ============================================================================
// SALES ORDERS FUNCTIONS
// ============================================================================

/**
 * Generate sales orders with idempotent pattern
 * - Fetch existing orders by company + year
 * - Calculate difference
 * - Create missing orders
 * - Return all orders
 */
export async function generateSalesOrders(
  supabase: SupabaseClient<Database>,
  companyId: string,
  warehouses: Array<{ id: string; name: string; distribution_weight: number }>,
  userId: string,
  customerIds: string[],
  productIds: string[],
  config: SalesOrdersConfig,
): Promise<SalesOrderResult[]> {
  console.log(
    `\n📋 Ensuring ${config.totalOrders} sales orders exist for year ${config.year}...\n`,
  );

  // Fetch existing sales orders for this company in the given year
  const { data: existing, error: fetchError } = await supabase
    .from("sales_orders")
    .select("id, sequence_number, status, order_date")
    .eq("company_id", companyId)
    .gte("order_date", `${config.year}-01-01`)
    .lte("order_date", `${config.year}-12-31`)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (fetchError) {
    console.error("❌ Error fetching sales orders:", fetchError);
    throw fetchError;
  }

  const existingCount = existing?.length || 0;

  // If count matches expected, return existing orders
  if (existingCount === config.totalOrders) {
    console.log(`✅ All ${existingCount} sales orders already exist\n`);
    return existing!;
  }

  // Calculate how many orders to create
  const toCreate = config.totalOrders - existingCount;
  console.log(
    `📦 Creating ${toCreate} new sales orders (${existingCount} already exist)...`,
  );

  // Monthly targets for seasonal variance (proportional distribution)
  const monthlyTargets = [
    50,
    50,
    50, // Jan-Mar (wedding season)
    40,
    40,
    40, // Apr-Jun (summer)
    30,
    50, // Jul-Aug (monsoon dip then recovery)
    40,
    40,
    40, // Sep-Nov (festive)
    30, // Dec
  ];

  // Calculate sum for proportional distribution
  const totalMonthlyTargets = monthlyTargets.reduce(
    (sum, target) => sum + target,
    0,
  );

  const createdOrders: SalesOrderResult[] = [];
  let totalCreated = 0;

  // Create orders for each month
  for (let month = 1; month <= 12; month++) {
    const targetCount = Math.floor(
      (monthlyTargets[month - 1] / totalMonthlyTargets) * toCreate,
    );

    if (targetCount === 0) continue;

    console.log(`📅 Month ${month}: Creating ${targetCount} sales orders...`);

    for (let i = 0; i < targetCount; i++) {
      const orderDate = getRandomDate(month, config.year);
      const deliveryDays = randomInt(7, 45);
      const orderDateObj = new Date(orderDate);
      orderDateObj.setDate(orderDateObj.getDate() + deliveryDays);
      const deliveryDueDate = orderDateObj.toISOString().split("T")[0];

      const customerId =
        customerIds[Math.floor(Math.random() * customerIds.length)];

      // Discount logic (70% get discount)
      const hasDiscount = Math.random() < 0.7;
      const discountType = hasDiscount
        ? Math.random() < 0.8
          ? "percentage"
          : "flat_amount"
        : "none";
      const discountValue = hasDiscount ? randomFloat(5, 20) : 0;

      const advanceAmount = randomFloat(1000, 10000);

      // Create order items (1-8 products per order)
      const itemCount = randomInt(1, 8);
      const selectedProducts = selectRandom(productIds, itemCount);
      const lineItems = selectedProducts.map((productId) => {
        const requiredQty = randomInt(5, 200);
        const unitRate = randomFloat(100, 5000);

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
        "create_sales_order_with_items",
        {
          p_order_data: {
            company_id: companyId,
            warehouse_id: selectedWarehouse.id,
            customer_id: customerId,
            order_date: orderDate,
            delivery_due_date: deliveryDueDate,
            payment_terms: ["15 days net", "30 days net", "Cash on delivery"][
              randomInt(0, 2)
            ],
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
        console.error(`❌ Failed to create order: ${orderError.message}`);
        continue;
      }

      // Get the created order by sequence number
      const { data: order } = await supabase
        .from("sales_orders")
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

  console.log(`\n✨ Successfully created ${totalCreated} new sales orders!`);

  // Return all orders (existing + created)
  const allOrders = [...(existing || []), ...createdOrders];

  console.log(`📊 Total sales orders: ${allOrders.length}\n`);

  return allOrders;
}
