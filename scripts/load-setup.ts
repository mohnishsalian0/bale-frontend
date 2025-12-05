import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Parse command line argument for environment
const args = process.argv.slice(2);
const env = args[0] || "local";

if (!["local", "staging"].includes(env)) {
  console.error(
    "❌ Invalid environment. Use: npx tsx scripts/load-setup.ts [local|staging]",
  );
  process.exit(1);
}

// Select credentials based on environment
let supabaseUrl: string;
let supabaseServiceKey: string;
let appUrl: string;

if (env === "staging") {
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_PROD!;
  supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_PROD!;
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing staging environment variables!");
    console.error("Make sure these are set in .env.local:");
    console.error("  - NEXT_PUBLIC_SUPABASE_URL_PROD");
    console.error("  - SUPABASE_SERVICE_ROLE_KEY_PROD");
    process.exit(1);
  }
} else {
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  appUrl = "http://localhost:3000";

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing local environment variables!");
    console.error("Make sure these are set in .env.local:");
    console.error("  - NEXT_PUBLIC_SUPABASE_URL");
    console.error("  - SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
}

console.log(`🔧 Environment: ${env.toUpperCase()}`);
console.log(`🔗 Supabase URL: ${supabaseUrl}\n`);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a random date within a specific month and year
 */
function getRandomDate(month: number, year: number): string {
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = Math.floor(Math.random() * daysInMonth) + 1;
  return new Date(year, month - 1, day).toISOString().split("T")[0];
}

/**
 * Get seasonal factor for adjusting data volumes
 * Higher values in wedding season (Jan-Mar) and festive season (Sep-Nov)
 */
function getSeasonalFactor(month: number): number {
  const factors: Record<number, number> = {
    1: 1.3, // Jan - Wedding season
    2: 1.3, // Feb - Wedding season
    3: 1.3, // Mar - Wedding season
    4: 1.0, // Apr
    5: 1.0, // May
    6: 1.0, // Jun
    7: 0.8, // Jul - Monsoon dip
    8: 0.8, // Aug - Monsoon dip
    9: 1.2, // Sep - Festive prep
    10: 1.2, // Oct - Festive season
    11: 1.2, // Nov - Festive season
    12: 0.7, // Dec - Year-end slowdown
  };
  return factors[month] || 1.0;
}

/**
 * Select random items from array
 */
function selectRandom<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, array.length));
}

/**
 * Generate random number between min and max
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random float between min and max with decimals
 */
function randomFloat(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

/**
 * Select stock units for dispatch using FIFO or random strategy
 */
async function selectStockUnitsForDispatch(
  companyId: string,
  warehouseId: string,
  productId: string,
  requiredQty: number,
  preferFifo: boolean = true,
): Promise<Array<{ stock_unit_id: string; quantity: number }>> {
  const orderBy = preferFifo ? "created_at.asc" : "created_at.desc";

  const { data: stockUnits, error } = await supabase
    .from("stock_units")
    .select("id, remaining_quantity, quality_grade, created_at")
    .eq("company_id", companyId)
    .eq("warehouse_id", warehouseId)
    .eq("product_id", productId)
    .in("status", ["full", "partial"])
    .gt("remaining_quantity", 0)
    .order("quality_grade", { ascending: true }) // Prefer grade A
    .order("created_at", { ascending: preferFifo })
    .limit(20);

  if (error || !stockUnits || stockUnits.length === 0) {
    return [];
  }

  const dispatchItems: Array<{ stock_unit_id: string; quantity: number }> = [];
  let remaining = requiredQty;

  for (const unit of stockUnits) {
    if (remaining <= 0) break;

    const dispatchQty = Math.min(remaining, unit.remaining_quantity);
    dispatchItems.push({
      stock_unit_id: unit.id,
      quantity: dispatchQty,
    });
    remaining -= dispatchQty;
  }

  return dispatchItems;
}

// ============================================================================
// PRODUCT GENERATION
// ============================================================================

interface ProductTemplate {
  name: string;
  category: string;
  gsmRange: [number, number];
  threadCountRange: [number, number];
  stockType: "roll" | "batch" | "piece";
  measuringUnit: "metre" | "yard" | "kilogram" | "unit" | null;
  priceRange: [number, number];
  materials: string[];
  colors: string[];
  tags: string[];
}

const PRODUCT_TEMPLATES: ProductTemplate[] = [
  // Silk fabrics (20) - All rolls with metre/yard/kilogram
  ...Array.from({ length: 20 }, (_, i) => {
    const measuringUnits: Array<"metre" | "yard" | "kilogram"> = ["metre", "yard", "kilogram"];
    return {
      name: `Silk Fabric ${["Banarasi", "Kanjivaram", "Tussar", "Chanderi", "Mysore"][i % 5]} ${i + 1}`,
      category: "silk",
      gsmRange: [80, 150] as [number, number],
      threadCountRange: [70, 120] as [number, number],
      stockType: "roll" as const,
      measuringUnit: measuringUnits[i % 3],
      priceRange: [2000, 5000] as [number, number],
      materials: ["Silk"],
      colors: ["Red", "White", "Green", "Yellow", "Blue"],
      tags: ["premium", "wedding", "traditional", "luxury", "festive"],
    };
  }),
  // Cotton fabrics (30) - Mix of roll and batch
  ...Array.from({ length: 30 }, (_, i) => {
    const isBatch = i % 3 === 0;
    const rollUnits: Array<"metre" | "yard" | "kilogram"> = ["metre", "yard", "kilogram"];
    return {
      name: `Cotton Fabric ${["Regular", "Organic", "Printed", "Khadi", "Slub"][i % 5]} ${i + 1}`,
      category: "cotton",
      gsmRange: [120, 180] as [number, number],
      threadCountRange: [50, 80] as [number, number],
      stockType: (isBatch ? "batch" : "roll") as "roll" | "batch",
      measuringUnit: (isBatch ? "unit" : rollUnits[i % 3]) as "metre" | "yard" | "kilogram" | "unit",
      priceRange: [300, 800] as [number, number],
      materials: ["Cotton"],
      colors: ["White", "Black", "Blue", "Yellow", "Red"],
      tags: ["summer", "breathable", "casual", "eco-friendly", "printed"],
    };
  }),
  // Wool/Blends (15) - All rolls
  ...Array.from({ length: 15 }, (_, i) => {
    const rollUnits: Array<"metre" | "yard" | "kilogram"> = ["metre", "yard", "kilogram"];
    return {
      name: `Wool Fabric ${["Pure", "Cashmere", "Merino", "Blend", "Fine"][i % 5]} ${i + 1}`,
      category: "wool",
      gsmRange: [180, 300] as [number, number],
      threadCountRange: [40, 65] as [number, number],
      stockType: "roll" as const,
      measuringUnit: rollUnits[i % 3],
      priceRange: [1500, 3500] as [number, number],
      materials: ["Wool"],
      colors: ["Black", "White", "Blue", "Green"],
      tags: ["winter", "warm", "premium", "luxury"],
    };
  }),
  // Synthetic (20) - Mix of roll, batch, and piece
  ...Array.from({ length: 20 }, (_, i) => {
    const isPiece = i % 5 === 0;
    const isBatch = i % 7 === 0 && !isPiece;
    const rollUnits: Array<"metre" | "yard" | "kilogram"> = ["metre", "yard", "kilogram"];
    return {
      name: `Synthetic Fabric ${["Polyester", "Nylon", "Rayon", "Lycra"][i % 4]} ${i + 1}`,
      category: "synthetic",
      gsmRange: [140, 220] as [number, number],
      threadCountRange: [55, 85] as [number, number],
      stockType: (isPiece ? "piece" : isBatch ? "batch" : "roll") as "roll" | "batch" | "piece",
      measuringUnit: (isPiece ? null : isBatch ? "unit" : rollUnits[i % 3]) as "metre" | "yard" | "kilogram" | "unit" | null,
      priceRange: [250, 700] as [number, number],
      materials: ["Polyester"],
      colors: ["Blue", "Black", "Red", "Green", "Yellow"],
      tags: ["modern", "formal", "wrinkle-free", "durable"],
    };
  }),
  // Specialty (15) - Mix of roll and batch
  ...Array.from({ length: 15 }, (_, i) => {
    const isBatch = i % 4 === 0;
    const rollUnits: Array<"metre" | "yard" | "kilogram"> = ["metre", "yard", "kilogram"];
    return {
      name: `Specialty Fabric ${["Linen", "Jute", "Bamboo", "Modal", "Hemp"][i % 5]} ${i + 1}`,
      category: "specialty",
      gsmRange: [130, 200] as [number, number],
      threadCountRange: [45, 70] as [number, number],
      stockType: (isBatch ? "batch" : "roll") as "roll" | "batch",
      measuringUnit: (isBatch ? "unit" : rollUnits[i % 3]) as "metre" | "yard" | "kilogram" | "unit",
      priceRange: [600, 1500] as [number, number],
      materials: ["Linen"],
      colors: ["White", "Black", "Green", "Yellow"],
      tags: ["eco-friendly", "summer", "breathable", "modern"],
    };
  }),
];

async function generateProducts(
  companyId: string,
  userId: string,
  materialIds: Record<string, string>,
  colorIds: Record<string, string>,
  tagIds: Record<string, string>,
) {
  console.log("\n📦 Generating 100 products...\n");

  const products = [];
  let successCount = 0;

  for (let i = 0; i < PRODUCT_TEMPLATES.length; i++) {
    const template = PRODUCT_TEMPLATES[i];
    const gsm = randomInt(template.gsmRange[0], template.gsmRange[1]);
    const threadCount = randomInt(
      template.threadCountRange[0],
      template.threadCountRange[1],
    );
    const costPrice = randomFloat(
      template.priceRange[0],
      template.priceRange[1],
    );
    const margin = randomFloat(1.25, 1.8); // 25-80% margin
    const sellingPrice = parseFloat((costPrice * margin).toFixed(2));

    const showOnCatalog = Math.random() < 0.7; // 70% visible
    const minStockAlert = Math.random() < 0.8; // 80% have alerts
    const minStockThreshold = minStockAlert
      ? randomInt(10, 100)
      : undefined;

    products.push({
      company_id: companyId,
      name: template.name,
      gsm,
      thread_count_cm: threadCount,
      stock_type: template.stockType,
      measuring_unit: template.measuringUnit,
      cost_price_per_unit: costPrice,
      selling_price_per_unit: sellingPrice,
      show_on_catalog: showOnCatalog,
      min_stock_alert: minStockAlert,
      min_stock_threshold: minStockThreshold,
      hsn_code: template.category === "silk" ? "5007" : template.category === "cotton" ? "5208" : "5407",
      notes: `${template.category} fabric - auto-generated test data`,
      created_by: userId,
    });

    // Insert in batches of 50
    if (products.length === 50 || i === PRODUCT_TEMPLATES.length - 1) {
      const { data, error } = await supabase
        .from("products")
        .insert(products)
        .select();

      if (error) {
        console.error(`❌ Failed to insert products batch: ${error.message}`);
      } else if (data) {
        successCount += data.length;

        // Link materials, colors, tags
        for (let j = 0; j < data.length; j++) {
          const product = data[j];
          const template = PRODUCT_TEMPLATES[i - products.length + j + 1];

          // Link materials (1-3 per product)
          const materialCount = randomInt(1, 3);
          const selectedMaterials = selectRandom(
            template.materials,
            materialCount,
          );
          for (const materialName of selectedMaterials) {
            if (materialIds[materialName]) {
              await supabase.from("product_material_assignments").insert({
                product_id: product.id,
                material_id: materialIds[materialName],
              });
            }
          }

          // Link colors (1-4 per product)
          const colorCount = randomInt(1, 4);
          const selectedColors = selectRandom(template.colors, colorCount);
          for (const colorName of selectedColors) {
            if (colorIds[colorName]) {
              await supabase.from("product_color_assignments").insert({
                product_id: product.id,
                color_id: colorIds[colorName],
              });
            }
          }

          // Link tags (2-6 per product)
          const tagCount = randomInt(2, 6);
          const selectedTags = selectRandom(template.tags, tagCount);
          for (const tagName of selectedTags) {
            if (tagIds[tagName]) {
              await supabase.from("product_tag_assignments").insert({
                product_id: product.id,
                tag_id: tagIds[tagName],
              });
            }
          }
        }

        console.log(`✅ Created ${successCount} products so far...`);
      }

      products.length = 0; // Clear batch
    }
  }

  console.log(`\n✨ Successfully created ${successCount} products!`);
  return successCount;
}

// ============================================================================
// GOODS INWARDS GENERATION
// ============================================================================

async function generateGoodsInwards(
  companyId: string,
  warehouseId: string,
  userId: string,
  partnerIds: string[],
  productIds: string[],
  year: number,
) {
  console.log("\n📥 Generating 600 goods inwards entries...\n");

  const monthlyTargets = [
    60, 60, 60, // Jan-Mar (wedding season)
    45, 45, 45, 45, 45, // Apr-Aug
    55, 55, 55, // Sep-Nov (festive)
    35, // Dec
  ];

  let totalCreated = 0;

  // Constraint: inward_type must be 'job_work' | 'sales_return' | 'purchase_order' | 'other'
  // And each type has specific field requirements
  const otherReasons = [
    "Regular supplier purchase",
    "Bulk purchase order",
    "Seasonal stock replenishment",
    "Customer return received",
    "Warehouse transfer",
    "Donation received",
    "Production sample return",
  ];

  for (let month = 1; month <= 12; month++) {
    const targetCount = monthlyTargets[month - 1];
    console.log(`📅 Month ${month}: Creating ${targetCount} inwards...`);

    for (let i = 0; i < targetCount; i++) {
      const inwardDate = getRandomDate(month, year);

      // For now, use "other" type with other_reason (simplest approach)
      // In real scenarios, you'd use 'purchase_order', 'job_work', 'sales_return' with proper references
      const reason = otherReasons[Math.floor(Math.random() * otherReasons.length)];
      const partnerId = partnerIds[Math.floor(Math.random() * partnerIds.length)];

      // Create inward
      const { data: inward, error: inwardError } = await supabase
        .from("goods_inwards")
        .insert({
          company_id: companyId,
          warehouse_id: warehouseId,
          inward_type: "other",
          other_reason: reason,
          partner_id: partnerId,
          inward_date: inwardDate,
          notes: `${reason} - auto-generated test data`,
          created_by: userId,
        })
        .select()
        .single();

      if (inwardError || !inward) {
        console.error(`❌ Failed to create inward: ${inwardError?.message}`);
        continue;
      }

      // Create stock units for this inward (1-5 products)
      const itemCount = randomInt(1, 5);
      const selectedProducts = selectRandom(productIds, itemCount);

      for (const productId of selectedProducts) {
        const stockUnitsCount = randomInt(1, 8);

        for (let j = 0; j < stockUnitsCount; j++) {
          const quantity = randomFloat(10, 150, 2);
          const qualityRoll = Math.random();
          const qualityGrade =
            qualityRoll < 0.6 ? "A" : qualityRoll < 0.9 ? "B" : "C";
          const rackLetter = String.fromCharCode(65 + randomInt(0, 9)); // A-J
          const rackNumber = randomInt(1, 20);

          await supabase.from("stock_units").insert({
            company_id: companyId,
            warehouse_id: warehouseId,
            product_id: productId,
            created_from_inward_id: inward.id,
            initial_quantity: quantity,
            remaining_quantity: quantity,
            quality_grade: qualityGrade,
            warehouse_location: `Rack ${rackLetter}-${rackNumber}`,
            manufacturing_date: inwardDate,
            created_by: userId,
          });
        }
      }

      totalCreated++;
      if (totalCreated % 50 === 0) {
        console.log(`   ✅ Created ${totalCreated}/600 inwards...`);
      }
    }
  }

  console.log(`\n✨ Successfully created ${totalCreated} goods inwards!`);
  return totalCreated;
}

// ============================================================================
// SALES ORDERS GENERATION
// ============================================================================

async function generateSalesOrders(
  companyId: string,
  warehouseId: string,
  userId: string,
  customerIds: string[],
  productIds: string[],
  year: number,
) {
  console.log("\n📋 Generating 500 sales orders...\n");

  const monthlyTargets = [
    50, 50, 50, // Jan-Mar (wedding season)
    40, 40, 40, // Apr-Jun (summer)
    30, 50, // Jul-Aug (monsoon dip then recovery)
    40, 40, 40, // Sep-Nov (festive)
    30, // Dec
  ];

  let totalCreated = 0;
  const statuses = ["approval_pending", "in_progress", "completed", "cancelled"];
  const statusWeights = [0.15, 0.25, 0.5, 0.1]; // 15%, 25%, 50%, 10%

  const createdOrders: Array<{
    id: string;
    status: string;
    items: Array<{ product_id: string; required_quantity: number; dispatched_quantity: number }>;
  }> = [];

  for (let month = 1; month <= 12; month++) {
    const targetCount = monthlyTargets[month - 1];
    console.log(`📅 Month ${month}: Creating ${targetCount} sales orders...`);

    for (let i = 0; i < targetCount; i++) {
      const orderDate = getRandomDate(month, year);
      const deliveryDays = randomInt(7, 45);
      const orderDateObj = new Date(orderDate);
      orderDateObj.setDate(orderDateObj.getDate() + deliveryDays);
      const expectedDeliveryDate = orderDateObj.toISOString().split("T")[0];

      // Select status based on weights
      const statusRoll = Math.random();
      let status = statuses[0];
      let cumulative = 0;
      for (let j = 0; j < statuses.length; j++) {
        cumulative += statusWeights[j];
        if (statusRoll < cumulative) {
          status = statuses[j];
          break;
        }
      }

      // 15% of in_progress orders are overdue
      let finalDeliveryDate = expectedDeliveryDate;
      if (status === "in_progress" && Math.random() < 0.15) {
        const today = new Date();
        const pastDate = new Date(today);
        pastDate.setDate(today.getDate() - randomInt(1, 30));
        finalDeliveryDate = pastDate.toISOString().split("T")[0];
      }

      const customerId = customerIds[Math.floor(Math.random() * customerIds.length)];

      // Discount logic (discount_type_enum: 'none' | 'percentage' | 'flat_amount')
      const hasDiscount = Math.random() < 0.7; // 70% get discount
      const discountType = hasDiscount ? (Math.random() < 0.8 ? "percentage" : "flat_amount") : "none";
      const discountValue = hasDiscount ? randomFloat(5, 20, 0) : 0;

      const totalAmount = randomFloat(5000, 50000, 2);
      const advanceAmount = randomFloat(totalAmount * 0.3, totalAmount * 0.6, 2);

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("sales_orders")
        .insert({
          company_id: companyId,
          warehouse_id: warehouseId,
          customer_id: customerId,
          order_date: orderDate,
          expected_delivery_date: finalDeliveryDate,
          status: status,
          total_amount: totalAmount,
          advance_amount: advanceAmount,
          discount_type: discountType,
          discount_value: discountValue,
          notes: `${status} order - auto-generated test data`,
          created_by: userId,
        })
        .select()
        .single();

      if (orderError || !order) {
        console.error(`❌ Failed to create order: ${orderError?.message}`);
        continue;
      }

      // Create order items (1-8 products per order)
      const itemCount = randomInt(1, 8);
      const selectedProducts = selectRandom(productIds, itemCount);
      const orderItems: Array<{ product_id: string; required_quantity: number; dispatched_quantity: number }> = [];

      for (const productId of selectedProducts) {
        const requiredQty = randomInt(5, 200);
        let dispatchedQty = 0;

        if (status === "completed") {
          dispatchedQty = requiredQty;
        } else if (status === "cancelled") {
          dispatchedQty = Math.random() < 0.1 ? randomInt(1, requiredQty * 0.3) : 0;
        } else if (status === "in_progress") {
          dispatchedQty = Math.floor(requiredQty * randomFloat(0.3, 0.9));
        } else if (status === "approval_pending") {
          dispatchedQty = Math.random() < 0.2 ? randomInt(1, 10) : 0;
        }

        await supabase.from("sales_order_items").insert({
          company_id: companyId,
          warehouse_id: warehouseId,
          sales_order_id: order.id,
          product_id: productId,
          required_quantity: requiredQty,
          dispatched_quantity: dispatchedQty,
          notes: `Auto-generated test data`,
        });

        orderItems.push({ product_id: productId, required_quantity: requiredQty, dispatched_quantity: dispatchedQty });
      }

      createdOrders.push({
        id: order.id,
        status: order.status,
        items: orderItems,
      });

      totalCreated++;
      if (totalCreated % 50 === 0) {
        console.log(`   ✅ Created ${totalCreated}/500 orders...`);
      }
    }
  }

  console.log(`\n✨ Successfully created ${totalCreated} sales orders!`);
  return createdOrders;
}

// ============================================================================
// GOODS OUTWARDS GENERATION
// ============================================================================

async function generateGoodsOutwards(
  companyId: string,
  warehouseId: string,
  userId: string,
  salesOrders: Array<{
    id: string;
    status: string;
    items: Array<{ product_id: string; required_quantity: number; dispatched_quantity: number }>;
  }>,
  year: number,
) {
  console.log("\n📤 Generating goods outwards (linked to sales orders + standalone)...\n");

  let totalCreated = 0;

  // Get customer partner IDs for outwards
  const { data: customers } = await supabase
    .from("partners")
    .select("id")
    .eq("company_id", companyId)
    .eq("partner_type", "customer")
    .limit(5);

  const customerPartnerIds = customers?.map((c) => c.id) || [];

  // 1. Create outwards for sales orders (280 outwards from 500 orders)
  for (const order of salesOrders) {
    // Skip if no items dispatched
    const totalDispatched = order.items.reduce((sum, item) => sum + item.dispatched_quantity, 0);
    if (totalDispatched === 0) continue;

    // Prepare stock unit items
    const stockUnitItems: Array<{ stock_unit_id: string; quantity: number }> = [];

    for (const item of order.items) {
      if (item.dispatched_quantity === 0) continue;

      const preferFifo = Math.random() < 0.7; // 70% use FIFO
      const selected = await selectStockUnitsForDispatch(
        companyId,
        warehouseId,
        item.product_id,
        item.dispatched_quantity,
        preferFifo,
      );

      stockUnitItems.push(...selected);
    }

    if (stockUnitItems.length === 0) {
      console.log(`   ⚠️  No stock available for order ${order.id}, skipping...`);
      continue;
    }

    // Get a random customer partner_id (constraint requires partner_id OR to_warehouse_id)
    const partnerId = customerPartnerIds.length > 0
      ? customerPartnerIds[Math.floor(Math.random() * customerPartnerIds.length)]
      : null;

    if (!partnerId) {
      console.log(`   ⚠️  No customer partner available, skipping order ${order.id}...`);
      continue;
    }

    // Create outward using RPC function
    const outwardDate = getRandomDate(randomInt(1, 12), year);
    const { error } = await supabase.rpc("create_goods_outward_with_items", {
      p_outward_data: {
        company_id: companyId,
        warehouse_id: warehouseId,
        partner_id: partnerId,
        outward_type: "sales_order",
        sales_order_id: order.id,
        outward_date: outwardDate,
        notes: "Sales order dispatch - auto-generated",
        created_by: userId,
      },
      p_stock_unit_items: stockUnitItems,
    });

    if (error) {
      console.error(`   ❌ Failed to create outward for order: ${error.message}`);
    } else {
      totalCreated++;
      if (totalCreated % 50 === 0) {
        console.log(`   ✅ Created ${totalCreated} outwards...`);
      }
    }
  }

  console.log(`   ✅ Created ${totalCreated} sales order outwards`);

  // 2. Create standalone "other" outwards (120 entries)
  console.log("\n📤 Creating standalone 'other' outwards...");
  const otherReasons = [
    "Sample sent for exhibition",
    "Quality testing at lab",
    "Customer sample approval",
    "Marketing material",
    "Damaged goods removal",
  ];

  const { data: availableStockUnits } = await supabase
    .from("stock_units")
    .select("id, product_id, remaining_quantity")
    .eq("company_id", companyId)
    .eq("warehouse_id", warehouseId)
    .in("status", ["full", "partial"])
    .gt("remaining_quantity", 0)
    .limit(500);

  if (availableStockUnits && availableStockUnits.length > 0) {
    let stockIndex = 0;

    for (let i = 0; i < 120 && stockIndex < availableStockUnits.length; i++) {
      const outwardDate = getRandomDate(randomInt(1, 12), year);
      const reason = otherReasons[Math.floor(Math.random() * otherReasons.length)];

      // Select 1-6 stock units
      const itemCount = Math.min(randomInt(1, 6), availableStockUnits.length - stockIndex);
      const stockUnitItems: Array<{ stock_unit_id: string; quantity: number }> = [];

      for (let j = 0; j < itemCount; j++) {
        const stockUnit = availableStockUnits[stockIndex++];
        const useFullQty = Math.random() < 0.4; // 40% use full quantity
        const quantity = useFullQty
          ? stockUnit.remaining_quantity
          : randomFloat(1, stockUnit.remaining_quantity, 2);

        stockUnitItems.push({
          stock_unit_id: stockUnit.id,
          quantity: quantity,
        });
      }

      // Get a random partner for the outward (constraint requires partner_id OR to_warehouse_id)
      const partnerId = customerPartnerIds.length > 0
        ? customerPartnerIds[Math.floor(Math.random() * customerPartnerIds.length)]
        : null;

      if (!partnerId) {
        console.log(`   ⚠️  No partner available for other outward, skipping...`);
        continue;
      }

      const { error } = await supabase.rpc("create_goods_outward_with_items", {
        p_outward_data: {
          company_id: companyId,
          warehouse_id: warehouseId,
          partner_id: partnerId,
          outward_type: "other",
          other_reason: reason,
          outward_date: outwardDate,
          notes: `${reason} - auto-generated`,
          created_by: userId,
        },
        p_stock_unit_items: stockUnitItems,
      });

      if (error) {
        console.error(`   ❌ Failed to create other outward: ${error.message}`);
      } else {
        totalCreated++;
        if (totalCreated % 50 === 0) {
          console.log(`   ✅ Created ${totalCreated} total outwards...`);
        }
      }
    }
  }

  console.log(`\n✨ Successfully created ${totalCreated} goods outwards!`);
  return totalCreated;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

async function loadTestData() {
  console.log("🌱 Starting bulk test data generation...\n");

  // Get or verify company exists
  const { data: companies, error: companyError } = await supabase
    .from("companies")
    .select("id, name, slug")
    .limit(1);

  if (companyError || !companies || companies.length === 0) {
    console.error("❌ No company found. Please run setup.ts first to create a company.");
    return;
  }

  const companyId = companies[0].id;
  const companyName = companies[0].name;
  console.log(`📦 Using company: ${companyName} (${companyId})\n`);

  // Get warehouse
  const { data: warehouses, error: whError } = await supabase
    .from("warehouses")
    .select("id, name")
    .eq("company_id", companyId)
    .limit(1);

  if (whError || !warehouses || warehouses.length === 0) {
    console.error("❌ No warehouse found. Please run setup.ts first.");
    return;
  }

  const warehouseId = warehouses[0].id;
  console.log(`🏭 Using warehouse: ${warehouses[0].name} (${warehouseId})\n`);

  // Get user
  const { data: users, error: userError } = await supabase
    .from("users")
    .select("id")
    .eq("company_id", companyId)
    .limit(1);

  if (userError || !users || users.length === 0) {
    console.error("❌ No user found. Please run setup.ts first.");
    return;
  }

  const userId = users[0].id;

  // Get existing materials, colors, tags
  const { data: materials } = await supabase
    .from("product_materials")
    .select("id, name")
    .eq("company_id", companyId);

  const { data: colors } = await supabase
    .from("product_colors")
    .select("id, name")
    .eq("company_id", companyId);

  const { data: tags } = await supabase
    .from("product_tags")
    .select("id, name")
    .eq("company_id", companyId);

  if (!materials || !colors || !tags) {
    console.error("❌ Missing product attributes. Please run setup.ts first.");
    return;
  }

  const materialIds: Record<string, string> = {};
  materials.forEach((m) => (materialIds[m.name] = m.id));

  const colorIds: Record<string, string> = {};
  colors.forEach((c) => (colorIds[c.name] = c.id));

  const tagIds: Record<string, string> = {};
  tags.forEach((t) => (tagIds[t.name] = t.id));

  // Get partners
  const { data: partners } = await supabase
    .from("partners")
    .select("id, partner_type")
    .eq("company_id", companyId);

  if (!partners || partners.length === 0) {
    console.error("❌ No partners found. Please run setup.ts first.");
    return;
  }

  const supplierIds = partners.filter((p) => p.partner_type === "supplier").map((p) => p.id);
  const customerIds = partners.filter((p) => p.partner_type === "customer").map((p) => p.id);

  if (supplierIds.length === 0 || customerIds.length === 0) {
    console.error("❌ Missing suppliers or customers. Please run setup.ts first.");
    return;
  }

  // Generate products
  await generateProducts(companyId, userId, materialIds, colorIds, tagIds);

  // Get created product IDs
  const { data: productsList } = await supabase
    .from("products")
    .select("id")
    .eq("company_id", companyId);

  if (!productsList || productsList.length === 0) {
    console.error("❌ No products found after generation.");
    return;
  }

  const productIds = productsList.map((p) => p.id);

  // Generate goods inwards
  await generateGoodsInwards(
    companyId,
    warehouseId,
    userId,
    supplierIds,
    productIds,
    2025,
  );

  // Generate sales orders
  const salesOrders = await generateSalesOrders(
    companyId,
    warehouseId,
    userId,
    customerIds,
    productIds,
    2025,
  );

  // Generate goods outwards
  await generateGoodsOutwards(
    companyId,
    warehouseId,
    userId,
    salesOrders,
    2025,
  );

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 Bulk test data generation complete!");
  console.log("\n📊 Summary:");
  console.log("   • 100 products with varied attributes");
  console.log("   • 600 goods inwards with stock units");
  console.log("   • 500 sales orders (spanning Jan-Dec 2025)");
  console.log("   • ~400 goods outwards (linked to orders + standalone)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

loadTestData().catch(console.error);
