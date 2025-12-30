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
 * Calculate financial year from a date (April 1 - March 31)
 * Returns format: 2024-25
 */
function getFinancialYear(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const month = dateObj.getMonth() + 1; // 0-indexed, so +1
  const year = dateObj.getFullYear();

  if (month >= 4) {
    // Apr-Dec: FY is current year to next year
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    // Jan-Mar: FY is previous year to current year
    return `${year - 1}-${String(year).slice(-2)}`;
  }
}

/**
 * Round amount to 2 decimal places to avoid floating point precision issues
 */
function roundTo2(num: number): number {
  return Math.round(num * 100) / 100;
}

/**
 * Select goods movements that belong to a specific order
 * For sales: filter goods_outwards by sales_order_id
 * For purchase: filter goods_inwards by purchase_order_id
 */
async function selectGoodsMovementsFromOrder(
  orderId: string,
  orderType: "sales" | "purchase",
): Promise<string[]> {
  if (orderType === "sales") {
    const { data: outwards } = await supabase
      .from("goods_outwards")
      .select("id")
      .eq("sales_order_id", orderId)
      .limit(5);

    return outwards?.map((o) => o.id) || [];
  } else {
    const { data: inwards } = await supabase
      .from("goods_inwards")
      .select("id")
      .eq("purchase_order_id", orderId)
      .limit(5);

    return inwards?.map((i) => i.id) || [];
  }
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
    const measuringUnits: Array<"metre" | "yard" | "kilogram"> = [
      "metre",
      "yard",
      "kilogram",
    ];
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
    const rollUnits: Array<"metre" | "yard" | "kilogram"> = [
      "metre",
      "yard",
      "kilogram",
    ];
    return {
      name: `Cotton Fabric ${["Regular", "Organic", "Printed", "Khadi", "Slub"][i % 5]} ${i + 1}`,
      category: "cotton",
      gsmRange: [120, 180] as [number, number],
      threadCountRange: [50, 80] as [number, number],
      stockType: (isBatch ? "batch" : "roll") as "roll" | "batch",
      measuringUnit: (isBatch ? "unit" : rollUnits[i % 3]) as
        | "metre"
        | "yard"
        | "kilogram"
        | "unit",
      priceRange: [300, 800] as [number, number],
      materials: ["Cotton"],
      colors: ["White", "Black", "Blue", "Yellow", "Red"],
      tags: ["summer", "breathable", "casual", "eco-friendly", "printed"],
    };
  }),
  // Wool/Blends (15) - All rolls
  ...Array.from({ length: 15 }, (_, i) => {
    const rollUnits: Array<"metre" | "yard" | "kilogram"> = [
      "metre",
      "yard",
      "kilogram",
    ];
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
    const rollUnits: Array<"metre" | "yard" | "kilogram"> = [
      "metre",
      "yard",
      "kilogram",
    ];
    return {
      name: `Synthetic Fabric ${["Polyester", "Nylon", "Rayon", "Lycra"][i % 4]} ${i + 1}`,
      category: "synthetic",
      gsmRange: [140, 220] as [number, number],
      threadCountRange: [55, 85] as [number, number],
      stockType: (isPiece ? "piece" : isBatch ? "batch" : "roll") as
        | "roll"
        | "batch"
        | "piece",
      measuringUnit: (isPiece ? null : isBatch ? "unit" : rollUnits[i % 3]) as
        | "metre"
        | "yard"
        | "kilogram"
        | "unit"
        | null,
      priceRange: [250, 700] as [number, number],
      materials: ["Polyester"],
      colors: ["Blue", "Black", "Red", "Green", "Yellow"],
      tags: ["modern", "formal", "wrinkle-free", "durable"],
    };
  }),
  // Specialty (15) - Mix of roll and batch
  ...Array.from({ length: 15 }, (_, i) => {
    const isBatch = i % 4 === 0;
    const rollUnits: Array<"metre" | "yard" | "kilogram"> = [
      "metre",
      "yard",
      "kilogram",
    ];
    return {
      name: `Specialty Fabric ${["Linen", "Jute", "Bamboo", "Modal", "Hemp"][i % 5]} ${i + 1}`,
      category: "specialty",
      gsmRange: [130, 200] as [number, number],
      threadCountRange: [45, 70] as [number, number],
      stockType: (isBatch ? "batch" : "roll") as "roll" | "batch",
      measuringUnit: (isBatch ? "unit" : rollUnits[i % 3]) as
        | "metre"
        | "yard"
        | "kilogram"
        | "unit",
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
    const minStockThreshold = minStockAlert ? randomInt(10, 100) : undefined;

    // 30% of products get custom product codes, 70% auto-generate
    const hasCustomCode = Math.random() < 0.3;
    const productCode = hasCustomCode
      ? `${template.category.toUpperCase().substring(0, 4)}-${String(i + 1).padStart(3, "0")}`
      : undefined; // Will auto-generate as PROD-{sequence}

    products.push({
      company_id: companyId,
      name: template.name,
      product_code: productCode,
      gsm,
      thread_count_cm: threadCount,
      stock_type: template.stockType,
      measuring_unit: template.measuringUnit,
      cost_price_per_unit: costPrice,
      selling_price_per_unit: sellingPrice,
      show_on_catalog: showOnCatalog,
      min_stock_alert: minStockAlert,
      min_stock_threshold: minStockThreshold,
      hsn_code:
        template.category === "silk"
          ? "5007"
          : template.category === "cotton"
            ? "5208"
            : "5407",
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

          // Link attributes (materials, colors, tags) using consolidated table
          const attributeAssignments = [];

          // Materials (1-3 per product)
          const materialCount = randomInt(1, 3);
          const selectedMaterials = selectRandom(
            template.materials,
            materialCount,
          );
          for (const materialName of selectedMaterials) {
            if (materialIds[materialName]) {
              attributeAssignments.push({
                product_id: product.id,
                attribute_id: materialIds[materialName],
              });
            }
          }

          // Colors (1-4 per product)
          const colorCount = randomInt(1, 4);
          const selectedColors = selectRandom(template.colors, colorCount);
          for (const colorName of selectedColors) {
            if (colorIds[colorName]) {
              attributeAssignments.push({
                product_id: product.id,
                attribute_id: colorIds[colorName],
              });
            }
          }

          // Tags (2-6 per product)
          const tagCount = randomInt(2, 6);
          const selectedTags = selectRandom(template.tags, tagCount);
          for (const tagName of selectedTags) {
            if (tagIds[tagName]) {
              attributeAssignments.push({
                product_id: product.id,
                attribute_id: tagIds[tagName],
              });
            }
          }

          // Batch insert all attribute assignments
          if (attributeAssignments.length > 0) {
            await supabase
              .from("product_attribute_assignments")
              .insert(attributeAssignments);
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
  console.log(
    "   Distribution: 50% purchase orders, 30% sales returns, 20% other\n",
  );

  const monthlyTargets = [
    60,
    60,
    60, // Jan-Mar (wedding season)
    45,
    45,
    45,
    45,
    45, // Apr-Aug
    55,
    55,
    55, // Sep-Nov (festive)
    35, // Dec
  ];

  let totalCreated = 0;
  let linkedToPO = 0;
  let linkedToSR = 0;
  let other = 0;

  // Fetch fresh purchase orders from database (only in_progress can receive goods inwards)
  const { data: posFromDb } = await supabase
    .from("purchase_orders")
    .select(
      `
      id,
      status,
      supplier_id,
      purchase_order_items (
        id,
        product_id,
        required_quantity
      )
    `,
    )
    .eq("company_id", companyId)
    .eq("warehouse_id", warehouseId)
    .eq("status", "in_progress");

  const eligiblePOs = posFromDb || [];

  // Fetch fresh sales orders from database (only in_progress for now, will be completed later)
  const { data: sosFromDb } = await supabase
    .from("sales_orders")
    .select(
      `
      id,
      status,
      customer_id,
      sales_order_items (
        id,
        product_id,
        required_quantity
      )
    `,
    )
    .eq("company_id", companyId)
    .eq("warehouse_id", warehouseId)
    .eq("status", "in_progress");

  const eligibleSOs = sosFromDb || [];

  const otherReasons = [
    "Warehouse transfer",
    "Donation received",
    "Production sample return",
    "Quality test return",
    "Manual stock adjustment",
  ];

  let poIndex = 0;
  let soIndex = 0;

  for (let month = 1; month <= 12; month++) {
    const targetCount = monthlyTargets[month - 1];
    console.log(`📅 Month ${month}: Creating ${targetCount} inwards...`);

    for (let i = 0; i < targetCount; i++) {
      const inwardDate = getRandomDate(month, year);
      const typeRoll = Math.random();
      let inwardType: "purchase_order" | "sales_return" | "other";
      let purchaseOrderId: string | null = null;
      let salesOrderId: string | null = null;
      let otherReason: string | null = null;
      let selectedProducts: Array<{ id: string; quantity: number }> = [];

      // Determine inward type based on distribution: 50% PO, 30% SR, 20% other
      if (typeRoll < 0.5 && eligiblePOs.length > 0) {
        // Link to purchase order (50%)
        inwardType = "purchase_order";
        const po = eligiblePOs[poIndex % eligiblePOs.length];
        poIndex++;
        purchaseOrderId = po.id;

        // Use products from the PO - receive 50-100% of required quantity randomly
        selectedProducts = (po.purchase_order_items || []).map((item) => {
          const receivePercentage = randomFloat(0.5, 1.0);
          const quantityToReceive = Math.ceil(
            item.required_quantity * receivePercentage,
          );
          return {
            id: item.product_id,
            quantity: quantityToReceive,
          };
        });
        linkedToPO++;
      } else if (typeRoll < 0.8 && eligibleSOs.length > 0) {
        // Link to sales return (30%)
        inwardType = "sales_return";
        const so = eligibleSOs[soIndex % eligibleSOs.length];
        soIndex++;
        salesOrderId = so.id;

        // Use some products from the SO as returns (20-50% of required quantity)
        const soItems = so.sales_order_items || [];
        selectedProducts = soItems
          .slice(0, randomInt(1, Math.min(3, soItems.length))) // Return 1-3 product types
          .map((item) => ({
            id: item.product_id,
            quantity: Math.ceil(item.required_quantity * randomFloat(0.2, 0.5)),
          }));
        linkedToSR++;
      } else {
        // Other type (20%)
        inwardType = "other";
        otherReason =
          otherReasons[Math.floor(Math.random() * otherReasons.length)];

        // Random products
        const itemCount = randomInt(1, 5);
        selectedProducts = selectRandom(productIds, itemCount).map((id) => ({
          id,
          quantity: randomFloat(10, 150, 2),
        }));
        other++;
      }

      const partnerId =
        partnerIds[Math.floor(Math.random() * partnerIds.length)];

      // Create inward
      const { data: inward, error: inwardError } = await supabase
        .from("goods_inwards")
        .insert({
          company_id: companyId,
          warehouse_id: warehouseId,
          inward_type: inwardType,
          purchase_order_id: purchaseOrderId,
          sales_order_id: salesOrderId,
          other_reason: otherReason,
          partner_id: partnerId,
          inward_date: inwardDate,
          notes: `${inwardType === "purchase_order" ? "PO receipt" : inwardType === "sales_return" ? "Customer return" : otherReason} - auto-generated`,
          created_by: userId,
        })
        .select()
        .single();

      if (inwardError || !inward) {
        console.error(`❌ Failed to create inward: ${inwardError?.message}`);
        continue;
      }

      // Create stock units for this inward
      for (const product of selectedProducts) {
        const stockUnitsCount = randomInt(1, 5); // Fewer stock units per product
        const totalQty = product.quantity;
        const qtyPerUnit = totalQty / stockUnitsCount;

        for (let j = 0; j < stockUnitsCount; j++) {
          const quantity =
            j === stockUnitsCount - 1
              ? parseFloat((totalQty - qtyPerUnit * j).toFixed(2)) // Last unit gets remainder
              : parseFloat(qtyPerUnit.toFixed(2));

          const qualityRoll = Math.random();
          const qualityGrade =
            qualityRoll < 0.6 ? "A" : qualityRoll < 0.9 ? "B" : "C";
          const rackLetter = String.fromCharCode(65 + randomInt(0, 9)); // A-J
          const rackNumber = randomInt(1, 20);

          await supabase.from("stock_units").insert({
            company_id: companyId,
            warehouse_id: warehouseId,
            product_id: product.id,
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
        console.log(
          `   ✅ Created ${totalCreated}/600 inwards (PO: ${linkedToPO}, SR: ${linkedToSR}, Other: ${other})...`,
        );
      }
    }
  }

  console.log(`\n✨ Successfully created ${totalCreated} goods inwards!`);
  console.log(
    `   • Linked to purchase orders: ${linkedToPO} (${Math.round((linkedToPO / totalCreated) * 100)}%)`,
  );
  console.log(
    `   • Linked to sales returns: ${linkedToSR} (${Math.round((linkedToSR / totalCreated) * 100)}%)`,
  );
  console.log(
    `   • Other inwards: ${other} (${Math.round((other / totalCreated) * 100)}%)`,
  );
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

  let totalCreated = 0;

  const createdOrders: Array<{
    id: string;
    items: Array<{
      product_id: string;
      required_quantity: number;
    }>;
  }> = [];

  for (let month = 1; month <= 12; month++) {
    const targetCount = monthlyTargets[month - 1];
    console.log(`📅 Month ${month}: Creating ${targetCount} sales orders...`);

    for (let i = 0; i < targetCount; i++) {
      const orderDate = getRandomDate(month, year);
      const deliveryDays = randomInt(7, 45);
      const orderDateObj = new Date(orderDate);
      orderDateObj.setDate(orderDateObj.getDate() + deliveryDays);
      const deliveryDueDate = orderDateObj.toISOString().split("T")[0];

      const customerId =
        customerIds[Math.floor(Math.random() * customerIds.length)];

      // Discount logic (discount_type_enum: 'none' | 'percentage' | 'flat_amount')
      const hasDiscount = Math.random() < 0.7; // 70% get discount
      const discountType = hasDiscount
        ? Math.random() < 0.8
          ? "percentage"
          : "flat_amount"
        : "none";
      const discountValue = hasDiscount ? randomFloat(5, 20, 0) : 0;

      const advanceAmount = randomFloat(1000, 10000, 2);

      // Create order items (1-8 products per order)
      const itemCount = randomInt(1, 8);
      const selectedProducts = selectRandom(productIds, itemCount);
      const orderItems: Array<{
        product_id: string;
        required_quantity: number;
      }> = [];

      const lineItems = selectedProducts.map((productId) => {
        const requiredQty = randomInt(5, 200);
        const unitRate = randomFloat(100, 5000, 2);

        orderItems.push({
          product_id: productId,
          required_quantity: requiredQty,
        });

        return {
          product_id: productId,
          required_quantity: requiredQty,
          unit_rate: unitRate,
        };
      });

      // Create order using RPC function
      const { data: sequenceNumber, error: orderError } = await supabase.rpc(
        "create_sales_order_with_items",
        {
          p_order_data: {
            company_id: companyId,
            warehouse_id: warehouseId,
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
            status: "approval_pending", // Always start with pending
            created_by: userId,
          },
          p_line_items: lineItems,
        },
      );

      if (orderError) {
        console.error(`❌ Failed to create order: ${orderError.message}`);
        continue;
      }

      // Get the created order ID by sequence number
      const { data: order } = await supabase
        .from("sales_orders")
        .select("id")
        .eq("company_id", companyId)
        .eq("sequence_number", sequenceNumber)
        .single();

      if (order) {
        createdOrders.push({
          id: order.id,
          items: orderItems,
        });
      }

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
// PURCHASE ORDERS GENERATION
// ============================================================================

async function generatePurchaseOrders(
  companyId: string,
  warehouseId: string,
  userId: string,
  supplierIds: string[],
  agentIds: string[],
  productIds: string[],
  year: number,
) {
  console.log("\n📦 Generating 400 purchase orders...\n");

  const monthlyTargets = [
    40,
    40,
    40, // Jan-Mar (wedding season - higher procurement)
    30,
    30,
    30, // Apr-Jun (regular)
    25,
    35, // Jul-Aug (monsoon dip then recovery)
    35,
    35,
    35, // Sep-Nov (festive season prep)
    25, // Dec
  ];

  let totalCreated = 0;

  const createdOrders: Array<{
    id: string;
    items: Array<{
      product_id: string;
      required_quantity: number;
    }>;
  }> = [];

  for (let month = 1; month <= 12; month++) {
    const targetCount = monthlyTargets[month - 1];
    console.log(
      `📅 Month ${month}: Creating ${targetCount} purchase orders...`,
    );

    for (let i = 0; i < targetCount; i++) {
      const orderDate = getRandomDate(month, year);
      const deliveryDays = randomInt(10, 60); // Longer lead time for procurement
      const orderDateObj = new Date(orderDate);
      orderDateObj.setDate(orderDateObj.getDate() + deliveryDays);
      const deliveryDueDate = orderDateObj.toISOString().split("T")[0];

      const supplierId =
        supplierIds[Math.floor(Math.random() * supplierIds.length)];
      const agentId =
        Math.random() < 0.3 && agentIds.length > 0
          ? agentIds[Math.floor(Math.random() * agentIds.length)]
          : ""; // 30% have agents, use empty string for NULL

      // Discount logic (discount_type_enum: 'none' | 'percentage' | 'flat_amount')
      const hasDiscount = Math.random() < 0.6; // 60% get discount (less than sales)
      const discountType = hasDiscount
        ? Math.random() < 0.9
          ? "percentage"
          : "flat_amount"
        : "none";
      const discountValue = hasDiscount ? randomFloat(3, 15, 0) : 0; // Lower discounts for purchases

      const advanceAmount = randomFloat(2000, 15000, 2);

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
      const orderItems: Array<{
        product_id: string;
        required_quantity: number;
      }> = [];

      const lineItems = selectedProducts.map((productId) => {
        const requiredQty = randomInt(10, 300); // Higher quantities for purchases
        const unitRate = randomFloat(80, 4000, 2);

        orderItems.push({
          product_id: productId,
          required_quantity: requiredQty,
        });

        return {
          product_id: productId,
          required_quantity: requiredQty,
          unit_rate: unitRate,
        };
      });

      // Create order using RPC function
      const { data: sequenceNumber, error: orderError } = await supabase.rpc(
        "create_purchase_order_with_items",
        {
          p_order_data: {
            company_id: companyId,
            warehouse_id: warehouseId,
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
            status: "approval_pending", // Always start with pending
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

      // Get the created order ID by sequence number
      const { data: order } = await supabase
        .from("purchase_orders")
        .select("id")
        .eq("company_id", companyId)
        .eq("sequence_number", sequenceNumber)
        .single();

      if (order) {
        createdOrders.push({
          id: order.id,
          items: orderItems,
        });
      }

      totalCreated++;
      if (totalCreated % 50 === 0) {
        console.log(`   ✅ Created ${totalCreated}/400 purchase orders...`);
      }
    }
  }

  console.log(`\n✨ Successfully created ${totalCreated} purchase orders!`);
  return createdOrders;
}

// ============================================================================
// GOODS OUTWARDS GENERATION
// ============================================================================

async function generateGoodsOutwards(
  companyId: string,
  warehouseId: string,
  userId: string,
  year: number,
) {
  console.log(
    "\n📤 Generating goods outwards (linked to sales orders + standalone)...\n",
  );

  let totalCreated = 0;

  // Get customer partner IDs for outwards
  const { data: customers } = await supabase
    .from("partners")
    .select("id")
    .eq("company_id", companyId)
    .eq("partner_type", "customer")
    .limit(5);

  const customerPartnerIds = customers?.map((c) => c.id) || [];

  // Fetch fresh order data from database (only in_progress orders can receive goods movements)
  const { data: ordersFromDb } = await supabase
    .from("sales_orders")
    .select(
      `
      id,
      status,
      customer_id,
      sales_order_items (
        id,
        product_id,
        required_quantity
      )
    `,
    )
    .eq("company_id", companyId)
    .eq("warehouse_id", warehouseId)
    .eq("status", "in_progress"); // Only process in_progress orders

  if (!ordersFromDb || ordersFromDb.length === 0) {
    console.log(
      "   ⚠️  No in_progress sales orders found, skipping order-linked outwards",
    );
  } else {
    console.log(`   Found ${ordersFromDb.length} in_progress orders`);

    // 1. Create outwards for sales orders (60% of in_progress orders get outwards)
    for (const order of ordersFromDb) {
      // 60% chance to create outward for this order
      if (Math.random() > 0.6) continue;

      if (!order.sales_order_items || order.sales_order_items.length === 0)
        continue;

      // Prepare stock unit items - dispatch 50-100% of each item randomly
      const stockUnitItems: Array<{ stock_unit_id: string; quantity: number }> =
        [];

      for (const item of order.sales_order_items) {
        // Randomly dispatch 50-100% of required quantity
        const dispatchPercentage = randomFloat(0.5, 1.0);
        const quantityToDispatch = Math.ceil(
          item.required_quantity * dispatchPercentage,
        );

        if (quantityToDispatch === 0) continue;

        const preferFifo = Math.random() < 0.7; // 70% use FIFO
        const selected = await selectStockUnitsForDispatch(
          companyId,
          warehouseId,
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

      // Get a random customer partner_id (constraint requires partner_id OR to_warehouse_id)
      const partnerId =
        customerPartnerIds.length > 0
          ? customerPartnerIds[
              Math.floor(Math.random() * customerPartnerIds.length)
            ]
          : null;

      if (!partnerId) {
        console.log(
          `   ⚠️  No customer partner available, skipping order ${order.id}...`,
        );
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
        console.error(
          `   ❌ Failed to create outward for order: ${error.message}`,
        );
      } else {
        totalCreated++;
        if (totalCreated % 50 === 0) {
          console.log(`   ✅ Created ${totalCreated} outwards...`);
        }
      }
    }

    console.log(`   ✅ Created ${totalCreated} sales order outwards`);
  }

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
      const reason =
        otherReasons[Math.floor(Math.random() * otherReasons.length)];

      // Select 1-6 stock units
      const itemCount = Math.min(
        randomInt(1, 6),
        availableStockUnits.length - stockIndex,
      );
      const stockUnitItems: Array<{ stock_unit_id: string; quantity: number }> =
        [];

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
      const partnerId =
        customerPartnerIds.length > 0
          ? customerPartnerIds[
              Math.floor(Math.random() * customerPartnerIds.length)
            ]
          : null;

      if (!partnerId) {
        console.log(
          `   ⚠️  No partner available for other outward, skipping...`,
        );
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
// UPDATE ORDER STATUSES (TWO-PHASE APPROACH)
// ============================================================================

/**
 * PHASE 1: Approve orders before goods movements
 * Updates 85% of orders to in_progress (so they can receive goods movements)
 * Keeps 15% as approval_pending
 */
async function approveOrdersForMovements(
  purchaseOrders: Array<{ id: string }>,
  salesOrders: Array<{ id: string }>,
) {
  console.log("\n📊 PHASE 1: Approving orders for goods movements...\n");
  console.log(
    "   Keeping 15% as approval_pending, updating 85% to in_progress\n",
  );

  // Update purchase orders - 85% to in_progress
  console.log("   Approving purchase orders...");
  for (const po of purchaseOrders) {
    if (Math.random() < 0.85) {
      await supabase
        .from("purchase_orders")
        .update({ status: "in_progress" })
        .eq("id", po.id);
    }
  }

  // Update sales orders - 85% to in_progress
  console.log("   Approving sales orders...");
  for (const so of salesOrders) {
    if (Math.random() < 0.85) {
      await supabase
        .from("sales_orders")
        .update({ status: "in_progress" })
        .eq("id", so.id);
    }
  }

  console.log(
    "   ✅ Orders approved! 85% now in_progress, ready for goods movements",
  );
}

/**
 * PHASE 2: Finalize order statuses after goods movements
 *
 * Final distribution: 15% approval_pending, 25% in_progress, 50% completed, 10% cancelled
 *
 * Logic:
 * - Orders with goods movements → 50% chance to mark as completed, else stay in_progress
 * - Orders without goods movements → 10% chance to cancel (only if no movements attached)
 * - approval_pending orders → stay as-is
 *
 * NOTE: received_quantity and dispatched_quantity are automatically reconciled by database triggers
 */
async function finalizeOrderStatuses(
  purchaseOrders: Array<{ id: string }>,
  salesOrders: Array<{ id: string }>,
) {
  console.log(
    "\n📊 PHASE 2: Finalizing order statuses after goods movements...\n",
  );
  console.log(
    "   Target: 15% pending, 25% in_progress, 50% completed, 10% cancelled\n",
  );

  // Update purchase orders
  console.log("   Finalizing purchase order statuses...");
  for (const po of purchaseOrders) {
    // Check if order has goods movements
    const { data: inwards } = await supabase
      .from("goods_inwards")
      .select("id")
      .eq("purchase_order_id", po.id)
      .limit(1);

    const hasMovements = inwards && inwards.length > 0;

    // Get current status
    const { data: order } = await supabase
      .from("purchase_orders")
      .select("status")
      .eq("id", po.id)
      .single();

    if (!order) continue;

    // If approval_pending, leave as-is
    if (order.status === "approval_pending") continue;

    // If in_progress with movements, 50% chance to mark completed
    if (order.status === "in_progress" && hasMovements) {
      if (Math.random() < 0.59) {
        // 50/85 = 0.59 to get final 50% completed
        await supabase
          .from("purchase_orders")
          .update({ status: "completed" })
          .eq("id", po.id);
      }
    }
    // If in_progress without movements, 10% chance to cancel
    else if (order.status === "in_progress" && !hasMovements) {
      if (Math.random() < 0.12) {
        // 10/85 = 0.12 to get final 10% cancelled
        await supabase
          .from("purchase_orders")
          .update({ status: "cancelled" })
          .eq("id", po.id);
      }
    }
  }

  // Update sales orders
  console.log("   Finalizing sales order statuses...");
  for (const so of salesOrders) {
    // Check if order has goods movements
    const { data: outwards } = await supabase
      .from("goods_outwards")
      .select("id")
      .eq("sales_order_id", so.id)
      .limit(1);

    const hasMovements = outwards && outwards.length > 0;

    // Get current status
    const { data: order } = await supabase
      .from("sales_orders")
      .select("status")
      .eq("id", so.id)
      .single();

    if (!order) continue;

    // If approval_pending, leave as-is
    if (order.status === "approval_pending") continue;

    // If in_progress with movements, 50% chance to mark completed
    if (order.status === "in_progress" && hasMovements) {
      if (Math.random() < 0.59) {
        // 50/85 = 0.59 to get final 50% completed
        await supabase
          .from("sales_orders")
          .update({ status: "completed" })
          .eq("id", so.id);
      }
    }
    // If in_progress without movements, 10% chance to cancel
    else if (order.status === "in_progress" && !hasMovements) {
      if (Math.random() < 0.12) {
        // 10/85 = 0.12 to get final 10% cancelled
        await supabase
          .from("sales_orders")
          .update({ status: "cancelled" })
          .eq("id", so.id);
      }
    }
  }

  console.log("   ✅ Order statuses finalized!");
  console.log(
    "   Distribution: 15% pending, 25% in_progress, 50% completed, 10% cancelled",
  );
}

// ============================================================================
// SALES INVOICES GENERATION
// ============================================================================

async function generateSalesInvoices(
  companyId: string,
  warehouseId: string,
  userId: string,
  productIds: string[],
  salesOrders: Array<{
    id: string;
    items: Array<{ product_id: string; required_quantity: number }>;
  }>,
  year: number,
) {
  console.log("\n📄 Generating 500 sales invoices...\n");
  console.log("   Tax: 50% GST, 30% IGST, 20% no_tax");
  console.log("   Discount: Even split (33% percentage, 33% flat, 34% none)");
  console.log("   40% linked to goods movements from same order\n");

  const monthlyTargets = [
    50,
    50,
    50, // Jan-Mar (wedding season, 1.3x)
    40,
    40,
    40, // Apr-Jun (regular)
    30,
    30, // Jul-Aug (monsoon dip, 0.8x)
    45,
    45,
    45, // Sep-Nov (festive, 1.2x)
    30, // Dec (year-end, 0.7x)
  ];

  let totalCreated = 0;
  const createdInvoices: Array<{
    id: string;
    invoice_type: string;
    tax_type: string;
    outstanding_amount: number;
  }> = [];

  // Get customer ledgers
  const { data: customerLedgers } = await supabase
    .from("ledgers")
    .select("id, partner_id")
    .eq("company_id", companyId)
    .eq("ledger_type", "party")
    .in("parent_group_id", [
      (
        await supabase
          .from("parent_groups")
          .select("id")
          .eq("name", "Sundry Debtors")
          .single()
      ).data?.id,
    ]);

  // Get default Sales ledger
  const { data: salesLedger } = await supabase
    .from("ledgers")
    .select("id")
    .eq("company_id", companyId)
    .eq("name", "Sales")
    .eq("is_default", true)
    .single();

  if (!customerLedgers || customerLedgers.length === 0 || !salesLedger) {
    console.error("❌ Missing required ledgers");
    return [];
  }

  let orderIndex = 0;

  for (let month = 1; month <= 12; month++) {
    const targetCount = monthlyTargets[month - 1];
    console.log(`   📅 Month ${month}: Creating ${targetCount} invoices...`);

    for (let i = 0; i < targetCount; i++) {
      const invoiceDate = getRandomDate(month, year);
      const dueInDays = randomInt(15, 45);
      const dueDateObj = new Date(invoiceDate);
      dueDateObj.setDate(dueDateObj.getDate() + dueInDays);
      const dueDate = dueDateObj.toISOString().split("T")[0];

      // Tax type distribution: 50% GST, 30% IGST, 20% no_tax
      const taxRoll = Math.random();
      let taxType: "gst" | "igst" | "no_tax";
      if (taxRoll < 0.5) {
        taxType = "gst";
      } else if (taxRoll < 0.8) {
        taxType = "igst";
      } else {
        taxType = "no_tax";
      }

      // Discount distribution: Even split
      const discountRoll = Math.random();
      let discountType: "none" | "percentage" | "flat_amount";
      let discountValue = 0;
      if (discountRoll < 0.33) {
        discountType = "percentage";
        discountValue = randomFloat(5, 20, 0);
      } else if (discountRoll < 0.66) {
        discountType = "flat_amount";
        discountValue = randomFloat(500, 5000, 0);
      } else {
        discountType = "none";
      }

      const partyLedger =
        customerLedgers[Math.floor(Math.random() * customerLedgers.length)];

      // 60% link to sales orders
      let sourceSalesOrderId: string | null = null;
      let goodsMovementIds: string[] | null = null;

      if (Math.random() < 0.6 && salesOrders.length > 0) {
        const order = salesOrders[orderIndex % salesOrders.length];
        orderIndex++;
        sourceSalesOrderId = order.id;

        // 40% of those get goods movements from same order
        if (Math.random() < 0.4) {
          goodsMovementIds = await selectGoodsMovementsFromOrder(
            order.id,
            "sales",
          );
        }
      }

      // Create invoice items (1-8 products)
      const itemCount = randomInt(1, 8);
      const selectedProducts = selectRandom(productIds, itemCount);
      const items = selectedProducts.map((productId) => ({
        product_id: productId,
        quantity: randomFloat(5, 200, 2),
        rate: randomFloat(100, 5000, 2),
      }));

      // Create invoice using RPC
      const { data: invoiceSlug, error } = await supabase.rpc(
        "create_invoice_with_items",
        {
          p_invoice_type: "sales",
          p_party_ledger_id: partyLedger.id,
          p_counter_ledger_id: salesLedger.id,
          p_warehouse_id: warehouseId,
          p_invoice_date: invoiceDate,
          p_payment_terms: ["15 days net", "30 days net", "Cash on delivery"][
            randomInt(0, 2)
          ],
          p_due_date: dueDate,
          p_tax_type: taxType,
          p_discount_type: discountType,
          p_discount_value: discountValue,
          p_supplier_invoice_number: null,
          p_supplier_invoice_date: null,
          p_notes: "Auto-generated test data",
          p_attachments: [],
          p_items: items,
          p_source_sales_order_id: sourceSalesOrderId,
          p_source_purchase_order_id: null,
          p_goods_movement_ids: goodsMovementIds,
          p_company_id: companyId,
        },
      );

      if (error) {
        console.error(`   ❌ Failed to create invoice: ${error.message}`);
        continue;
      }

      // Get created invoice
      const { data: invoice } = await supabase
        .from("invoices")
        .select("id, outstanding_amount")
        .eq("slug", invoiceSlug)
        .single();

      if (invoice) {
        createdInvoices.push({
          id: invoice.id,
          invoice_type: "sales",
          tax_type: taxType,
          outstanding_amount: invoice.outstanding_amount,
        });
      }

      totalCreated++;
      if (totalCreated % 50 === 0) {
        console.log(`   ✅ Created ${totalCreated}/500 invoices...`);
      }
    }
  }

  console.log(`\n✨ Successfully created ${totalCreated} sales invoices!`);
  return createdInvoices;
}

// ============================================================================
// PURCHASE INVOICES GENERATION
// ============================================================================

async function generatePurchaseInvoices(
  companyId: string,
  warehouseId: string,
  userId: string,
  productIds: string[],
  purchaseOrders: Array<{
    id: string;
    items: Array<{ product_id: string; required_quantity: number }>;
  }>,
  year: number,
) {
  console.log("\n📄 Generating 400 purchase invoices...\n");
  console.log("   Tax: 50% GST, 30% IGST, 20% no_tax");
  console.log("   Discount: Even split (33% percentage, 33% flat, 34% none)");
  console.log("   40% linked to goods movements from same order\n");

  const monthlyTargets = [
    40,
    40,
    40, // Jan-Mar (procurement for wedding season)
    30,
    30,
    30, // Apr-Jun (regular)
    25,
    35, // Jul-Aug (monsoon dip then recovery)
    35,
    35,
    35, // Sep-Nov (festive prep)
    25, // Dec
  ];

  let totalCreated = 0;
  const createdInvoices: Array<{
    id: string;
    invoice_type: string;
    tax_type: string;
    outstanding_amount: number;
  }> = [];

  // Get supplier ledgers
  const { data: supplierLedgers } = await supabase
    .from("ledgers")
    .select("id, partner_id")
    .eq("company_id", companyId)
    .eq("ledger_type", "party")
    .in("parent_group_id", [
      (
        await supabase
          .from("parent_groups")
          .select("id")
          .eq("name", "Sundry Creditors")
          .single()
      ).data?.id,
    ]);

  // Get default Purchase ledger
  const { data: purchaseLedger } = await supabase
    .from("ledgers")
    .select("id")
    .eq("company_id", companyId)
    .eq("name", "Purchase")
    .eq("is_default", true)
    .single();

  if (!supplierLedgers || supplierLedgers.length === 0 || !purchaseLedger) {
    console.error("❌ Missing required ledgers");
    return [];
  }

  let orderIndex = 0;

  for (let month = 1; month <= 12; month++) {
    const targetCount = monthlyTargets[month - 1];
    console.log(`   📅 Month ${month}: Creating ${targetCount} invoices...`);

    for (let i = 0; i < targetCount; i++) {
      const invoiceDate = getRandomDate(month, year);
      const dueInDays = randomInt(15, 60);
      const dueDateObj = new Date(invoiceDate);
      dueDateObj.setDate(dueDateObj.getDate() + dueInDays);
      const dueDate = dueDateObj.toISOString().split("T")[0];

      // Tax type distribution: 50% GST, 30% IGST, 20% no_tax
      const taxRoll = Math.random();
      let taxType: "gst" | "igst" | "no_tax";
      if (taxRoll < 0.5) {
        taxType = "gst";
      } else if (taxRoll < 0.8) {
        taxType = "igst";
      } else {
        taxType = "no_tax";
      }

      // Discount distribution: Even split
      const discountRoll = Math.random();
      let discountType: "none" | "percentage" | "flat_amount";
      let discountValue = 0;
      if (discountRoll < 0.33) {
        discountType = "percentage";
        discountValue = randomFloat(3, 15, 0);
      } else if (discountRoll < 0.66) {
        discountType = "flat_amount";
        discountValue = randomFloat(500, 3000, 0);
      } else {
        discountType = "none";
      }

      const partyLedger =
        supplierLedgers[Math.floor(Math.random() * supplierLedgers.length)];

      // 60% link to purchase orders
      let sourcePurchaseOrderId: string | null = null;
      let goodsMovementIds: string[] | null = null;

      if (Math.random() < 0.6 && purchaseOrders.length > 0) {
        const order = purchaseOrders[orderIndex % purchaseOrders.length];
        orderIndex++;
        sourcePurchaseOrderId = order.id;

        // 40% of those get goods movements from same order
        if (Math.random() < 0.4) {
          goodsMovementIds = await selectGoodsMovementsFromOrder(
            order.id,
            "purchase",
          );
        }
      }

      // Create invoice items (1-8 products)
      const itemCount = randomInt(1, 8);
      const selectedProducts = selectRandom(productIds, itemCount);
      const items = selectedProducts.map((productId) => ({
        product_id: productId,
        quantity: randomFloat(10, 300, 2),
        rate: randomFloat(80, 4000, 2),
      }));

      // Supplier invoice details
      const supplierInvoiceNumber = `SUP-INV-${year}-${String(1000 + totalCreated).padStart(4, "0")}`;
      const supplierInvoiceDate = invoiceDate;

      // Create invoice using RPC
      const { data: invoiceSlug, error } = await supabase.rpc(
        "create_invoice_with_items",
        {
          p_invoice_type: "purchase",
          p_party_ledger_id: partyLedger.id,
          p_counter_ledger_id: purchaseLedger.id,
          p_warehouse_id: warehouseId,
          p_invoice_date: invoiceDate,
          p_payment_terms: [
            "15 days net",
            "30 days net",
            "45 days net",
            "60 days net",
          ][randomInt(0, 3)],
          p_due_date: dueDate,
          p_tax_type: taxType,
          p_discount_type: discountType,
          p_discount_value: discountValue,
          p_supplier_invoice_number: supplierInvoiceNumber,
          p_supplier_invoice_date: supplierInvoiceDate,
          p_notes: "Auto-generated test data",
          p_attachments: [],
          p_items: items,
          p_source_sales_order_id: null,
          p_source_purchase_order_id: sourcePurchaseOrderId,
          p_goods_movement_ids: goodsMovementIds,
          p_company_id: companyId,
        },
      );

      if (error) {
        console.error(`   ❌ Failed to create invoice: ${error.message}`);
        continue;
      }

      // Get created invoice
      const { data: invoice } = await supabase
        .from("invoices")
        .select("id, outstanding_amount")
        .eq("slug", invoiceSlug)
        .single();

      if (invoice) {
        createdInvoices.push({
          id: invoice.id,
          invoice_type: "purchase",
          tax_type: taxType,
          outstanding_amount: invoice.outstanding_amount,
        });
      }

      totalCreated++;
      if (totalCreated % 50 === 0) {
        console.log(`   ✅ Created ${totalCreated}/400 invoices...`);
      }
    }
  }

  console.log(`\n✨ Successfully created ${totalCreated} purchase invoices!`);
  return createdInvoices;
}

// ============================================================================
// ADJUSTMENT NOTES GENERATION
// ============================================================================

async function generateAdjustmentNotes(
  companyId: string,
  warehouseId: string,
  userId: string,
  productIds: string[],
  invoices: Array<{
    id: string;
    invoice_type: string;
    tax_type: string;
    outstanding_amount: number;
  }>,
) {
  console.log("\n📝 Generating ~150 adjustment notes...\n");
  console.log("   Sales invoices: 80% credit notes, 20% debit notes");
  console.log("   Purchase invoices: 80% debit notes, 20% credit notes\n");

  let totalCreated = 0;
  let creditNotes = 0;
  let debitNotes = 0;
  let cancelled = 0;

  // Get counter ledgers
  const { data: salesReturnLedger } = await supabase
    .from("ledgers")
    .select("id")
    .eq("company_id", companyId)
    .eq("name", "Sales Return")
    .single();

  const { data: purchaseReturnLedger } = await supabase
    .from("ledgers")
    .select("id")
    .eq("company_id", companyId)
    .eq("name", "Purchase Return")
    .single();

  if (!salesReturnLedger || !purchaseReturnLedger) {
    console.error("❌ Missing return ledgers");
    return;
  }

  // Filter invoices with outstanding > 0 (can apply adjustments) - use rounding to avoid precision issues
  const eligibleInvoices = invoices.filter(
    (inv) => roundTo2(inv.outstanding_amount) > 0,
  );

  // Select 20-25% of eligible invoices
  const targetCount = Math.floor(
    eligibleInvoices.length * randomFloat(0.2, 0.25),
  );
  const selectedInvoices = selectRandom(eligibleInvoices, targetCount);

  const reasons = {
    credit: [
      "Product quality issue",
      "Partial return by customer",
      "Discount adjustment",
      "Damaged goods",
    ],
    debit: [
      "Additional freight charges",
      "Late delivery penalty",
      "Short delivery adjustment",
      "Additional services",
    ],
  };

  for (const invoice of selectedInvoices) {
    // Get invoice details
    const { data: invoiceData } = await supabase
      .from("invoices")
      .select("id, invoice_type, tax_type, outstanding_amount")
      .eq("id", invoice.id)
      .single();

    if (!invoiceData || invoiceData.outstanding_amount <= 0) continue;

    // Determine adjustment type based on Indian convention
    let adjustmentType: "credit" | "debit";
    if (invoiceData.invoice_type === "sales") {
      // Sales: 80% credit (reduce receivables), 20% debit (increase receivables)
      adjustmentType = Math.random() < 0.8 ? "credit" : "debit";
    } else {
      // Purchase: 80% debit (reduce payables), 20% credit (increase payables)
      adjustmentType = Math.random() < 0.8 ? "debit" : "credit";
    }

    // Counter ledger
    const counterLedgerId =
      invoiceData.invoice_type === "sales"
        ? salesReturnLedger.id
        : purchaseReturnLedger.id;

    // Adjustment amount: 10-30% of outstanding (capped)
    const maxAdjustment = roundTo2(
      roundTo2(invoiceData.outstanding_amount) * randomFloat(0.1, 0.3),
    );

    // Create 1-3 items for the adjustment - ensure total doesn't exceed max
    const itemCount = randomInt(1, 3);
    const selectedProducts = selectRandom(productIds, itemCount);
    const items = selectedProducts.map((productId, idx) => {
      const quantity = randomFloat(1, 10, 2); // Reduced from 50 to avoid huge amounts
      const rate = randomFloat(50, 500, 2); // Reduced from 2000 to avoid huge amounts
      const gst_rate = [0, 5, 12, 18][randomInt(0, 3)];
      return {
        product_id: productId,
        quantity,
        rate: roundTo2(rate),
        gst_rate,
      };
    });

    // Adjustment date (within 30 days after invoice)
    const adjustmentDate = new Date();
    adjustmentDate.setDate(adjustmentDate.getDate() - randomInt(1, 30));
    const formattedDate = adjustmentDate.toISOString().split("T")[0];

    // Reason
    const reason =
      adjustmentType === "credit"
        ? reasons.credit[randomInt(0, reasons.credit.length - 1)]
        : reasons.debit[randomInt(0, reasons.debit.length - 1)];

    // Create adjustment note using RPC
    const { data: adjustmentSlug, error } = await supabase.rpc(
      "create_adjustment_note_with_items",
      {
        p_invoice_id: invoice.id,
        p_warehouse_id: warehouseId,
        p_counter_ledger_id: counterLedgerId,
        p_adjustment_type: adjustmentType,
        p_adjustment_date: formattedDate,
        p_reason: reason,
        p_notes: "Auto-generated test data",
        p_attachments: [],
        p_items: items,
        p_company_id: companyId,
      },
    );

    if (error) {
      console.error(`   ❌ Failed to create adjustment note: ${error.message}`);
      continue;
    }

    totalCreated++;
    if (adjustmentType === "credit") {
      creditNotes++;
    } else {
      debitNotes++;
    }

    // 8% of adjustment notes will be cancelled
    if (Math.random() < 0.08) {
      const { data: adjustment } = await supabase
        .from("adjustment_notes")
        .select("id")
        .eq("slug", adjustmentSlug)
        .single();

      if (adjustment) {
        await supabase
          .from("adjustment_notes")
          .update({
            is_cancelled: true,
            cancelled_at: new Date().toISOString(),
            cancelled_by: userId,
            cancellation_reason: [
              "Incorrect adjustment amount",
              "Wrong invoice referenced",
              "Duplicate entry",
            ][randomInt(0, 2)],
          })
          .eq("id", adjustment.id);

        cancelled++;
      }
    }

    if (totalCreated % 25 === 0) {
      console.log(`   ✅ Created ${totalCreated} adjustment notes...`);
    }
  }

  console.log(`\n✨ Successfully created ${totalCreated} adjustment notes!`);
  console.log(`   • Credit notes: ${creditNotes}`);
  console.log(`   • Debit notes: ${debitNotes}`);
  console.log(
    `   • Cancelled: ${cancelled} (${Math.round((cancelled / totalCreated) * 100)}%)`,
  );
}

// ============================================================================
// PAYMENTS & RECEIPTS GENERATION
// ============================================================================

async function generatePaymentsAndReceipts(
  companyId: string,
  userId: string,
  invoices: Array<{
    id: string;
    invoice_type: string;
    tax_type: string;
    outstanding_amount: number;
  }>,
) {
  console.log("\n💰 Generating ~850 payments/receipts...\n");
  console.log("   50% settle invoices, 50% complex allocations");
  console.log("   Payment modes match ledger types (cash mode = cash ledger)");
  console.log("   TDS: 15% of purchase payments (rates: 0.1%, 1%, 2%)\n");

  let totalCreated = 0;
  let receipts = 0;
  let payments = 0;
  let cancelled = 0;

  // Get ledgers
  const { data: cashLedger } = await supabase
    .from("ledgers")
    .select("id")
    .eq("company_id", companyId)
    .eq("name", "Cash")
    .single();

  const { data: bankLedger } = await supabase
    .from("ledgers")
    .select("id")
    .eq("company_id", companyId)
    .eq("name", "Bank Account")
    .single();

  const { data: tdsLedger } = await supabase
    .from("ledgers")
    .select("id")
    .eq("company_id", companyId)
    .eq("name", "TDS Payable")
    .single();

  if (!cashLedger || !bankLedger || !tdsLedger) {
    console.error("❌ Missing required ledgers");
    return;
  }

  // Get party ledgers with their invoices
  const { data: partyLedgers } = await supabase
    .from("ledgers")
    .select("id, partner_id, parent_group_id")
    .eq("company_id", companyId)
    .eq("ledger_type", "party");

  if (!partyLedgers || partyLedgers.length === 0) {
    console.error("❌ No party ledgers found");
    return;
  }

  // Separate sales and purchase invoices
  const salesInvoices = invoices.filter((inv) => inv.invoice_type === "sales");
  const purchaseInvoices = invoices.filter(
    (inv) => inv.invoice_type === "purchase",
  );

  // ============================================================================
  // PHASE 1: Settle invoices (50% of total payments)
  // ============================================================================

  console.log("   Phase 1: Settling invoices (~425 payments)...");

  // Process sales invoices (receipts)
  const salesTarget = Math.floor(salesInvoices.length * 0.5);
  const selectedSalesInvoices = selectRandom(salesInvoices, salesTarget);

  for (const invoice of selectedSalesInvoices) {
    // Get current invoice details
    const { data: invoiceData } = await supabase
      .from("invoices")
      .select("id, party_ledger_id, outstanding_amount")
      .eq("id", invoice.id)
      .single();

    if (!invoiceData || invoiceData.outstanding_amount <= 0) continue;

    // Payment mode distribution
    const modeRoll = Math.random();
    let paymentMode: "cash" | "cheque" | "neft" | "rtgs" | "upi" | "card";
    if (modeRoll < 0.1) {
      paymentMode = "cash";
    } else if (modeRoll < 0.25) {
      paymentMode = "cheque";
    } else if (modeRoll < 0.65) {
      paymentMode = "neft";
    } else if (modeRoll < 0.75) {
      paymentMode = "rtgs";
    } else if (modeRoll < 1.0) {
      paymentMode = "upi";
    } else {
      paymentMode = "card";
    }

    // Counter ledger MUST match payment mode
    const counterLedgerId =
      paymentMode === "cash" ? cashLedger.id : bankLedger.id;

    // Decide: full or partial payment
    const isFullPayment = Math.random() < 0.7; // 70% full, 30% partial
    const totalAmount = isFullPayment
      ? invoiceData.outstanding_amount
      : invoiceData.outstanding_amount * randomFloat(0.3, 0.8);

    // Payment date (recent past)
    const paymentDate = new Date();
    paymentDate.setDate(paymentDate.getDate() - randomInt(1, 60));
    const formattedDate = paymentDate.toISOString().split("T")[0];

    // Reference number/date for non-cash modes
    const referenceNumber =
      paymentMode === "cash"
        ? ""
        : paymentMode === "cheque"
          ? `CHQ-${randomInt(100000, 999999)}`
          : `${paymentMode.toUpperCase()}/${randomInt(100000, 999999)}`;

    const referenceDate =
      paymentMode === "cheque"
        ? new Date(
            paymentDate.getTime() - randomInt(1, 3) * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0]
        : formattedDate;

    // Allocation: single invoice (against_ref)
    const allocations = [
      {
        allocation_type: "against_ref",
        invoice_id: invoice.id,
        amount_applied: totalAmount,
      },
    ];

    // Create receipt using RPC
    const { data: paymentSlug, error } = await supabase.rpc(
      "create_payment_with_allocations",
      {
        p_voucher_type: "receipt",
        p_party_ledger_id: invoiceData.party_ledger_id,
        p_counter_ledger_id: counterLedgerId,
        p_payment_date: formattedDate,
        p_payment_mode: paymentMode,
        p_reference_number: referenceNumber,
        p_reference_date: referenceDate,
        p_total_amount: totalAmount,
        p_tds_applicable: false,
        p_tds_rate: 0,
        p_tds_ledger_id: null,
        p_notes: "Auto-generated test data",
        p_attachments: [],
        p_allocations: allocations,
        p_company_id: companyId,
      },
    );

    if (error) {
      console.error(`   ❌ Failed to create receipt: ${error.message}`);
      continue;
    }

    totalCreated++;
    receipts++;

    if (totalCreated % 50 === 0) {
      console.log(`   ✅ Created ${totalCreated} payments so far...`);
    }
  }

  // Process purchase invoices (payments with TDS)
  const purchaseTarget = Math.floor(purchaseInvoices.length * 0.5);
  const selectedPurchaseInvoices = selectRandom(
    purchaseInvoices,
    purchaseTarget,
  );

  for (const invoice of selectedPurchaseInvoices) {
    // Get current invoice details
    const { data: invoiceData } = await supabase
      .from("invoices")
      .select("id, party_ledger_id, outstanding_amount")
      .eq("id", invoice.id)
      .single();

    if (!invoiceData || invoiceData.outstanding_amount <= 0) continue;

    // Payment mode distribution
    const modeRoll = Math.random();
    let paymentMode: "cash" | "cheque" | "neft" | "rtgs" | "upi" | "card";
    if (modeRoll < 0.1) {
      paymentMode = "cash";
    } else if (modeRoll < 0.25) {
      paymentMode = "cheque";
    } else if (modeRoll < 0.65) {
      paymentMode = "neft";
    } else if (modeRoll < 0.75) {
      paymentMode = "rtgs";
    } else if (modeRoll < 1.0) {
      paymentMode = "upi";
    } else {
      paymentMode = "card";
    }

    // Counter ledger MUST match payment mode
    const counterLedgerId =
      paymentMode === "cash" ? cashLedger.id : bankLedger.id;

    // Decide: full or partial payment
    const isFullPayment = Math.random() < 0.7; // 70% full, 30% partial
    const totalAmount = isFullPayment
      ? invoiceData.outstanding_amount
      : invoiceData.outstanding_amount * randomFloat(0.3, 0.8);

    // TDS: 15% of purchase payments
    const tdsApplicable = Math.random() < 0.15;
    const tdsRate = tdsApplicable ? [0.1, 1, 2][randomInt(0, 2)] : 0;

    // Payment date (recent past)
    const paymentDate = new Date();
    paymentDate.setDate(paymentDate.getDate() - randomInt(1, 60));
    const formattedDate = paymentDate.toISOString().split("T")[0];

    // Reference number/date for non-cash modes
    const referenceNumber =
      paymentMode === "cash"
        ? ""
        : paymentMode === "cheque"
          ? `CHQ-${randomInt(100000, 999999)}`
          : `${paymentMode.toUpperCase()}/${randomInt(100000, 999999)}`;

    const referenceDate =
      paymentMode === "cheque"
        ? new Date(
            paymentDate.getTime() - randomInt(1, 3) * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0]
        : formattedDate;

    // Allocation: single invoice (against_ref)
    const allocations = [
      {
        allocation_type: "against_ref",
        invoice_id: invoice.id,
        amount_applied: totalAmount,
      },
    ];

    // Create payment using RPC
    const { data: paymentSlug, error } = await supabase.rpc(
      "create_payment_with_allocations",
      {
        p_voucher_type: "payment",
        p_party_ledger_id: invoiceData.party_ledger_id,
        p_counter_ledger_id: counterLedgerId,
        p_payment_date: formattedDate,
        p_payment_mode: paymentMode,
        p_reference_number: referenceNumber,
        p_reference_date: referenceDate,
        p_total_amount: totalAmount,
        p_tds_applicable: tdsApplicable,
        p_tds_rate: tdsRate,
        p_tds_ledger_id: tdsApplicable ? tdsLedger.id : null,
        p_notes: "Auto-generated test data",
        p_attachments: [],
        p_allocations: allocations,
        p_company_id: companyId,
      },
    );

    if (error) {
      console.error(`   ❌ Failed to create payment: ${error.message}`);
      continue;
    }

    totalCreated++;
    payments++;

    if (totalCreated % 50 === 0) {
      console.log(`   ✅ Created ${totalCreated} payments so far...`);
    }
  }

  // ============================================================================
  // PHASE 2: Complex allocations (50% of total payments)
  // ============================================================================

  console.log("   Phase 2: Complex allocations (~425 payments)...");

  // Refetch invoice outstanding amounts from DB (Phase 1 changed them)
  const { data: freshInvoices } = await supabase
    .from("invoices")
    .select("id, invoice_type, tax_type, outstanding_amount")
    .eq("company_id", companyId)
    .gt("outstanding_amount", 0); // Only get invoices with outstanding > 0

  if (!freshInvoices || freshInvoices.length === 0) {
    console.log("   ⚠️  No invoices with outstanding amounts for Phase 2");
    console.log(`\n✨ Successfully created ${totalCreated} payments/receipts!`);
    console.log(`   • Receipts (sales): ${receipts}`);
    console.log(`   • Payments (purchase): ${payments}`);
    console.log(
      `   • Cancelled: ${cancelled} (${Math.round((cancelled / totalCreated) * 100)}%)`,
    );
    return;
  }

  const freshSalesInvoices = freshInvoices.filter(
    (inv) => inv.invoice_type === "sales_invoice",
  );
  const freshPurchaseInvoices = freshInvoices.filter(
    (inv) => inv.invoice_type === "purchase_invoice",
  );

  const complexCount = 425;

  for (let i = 0; i < complexCount; i++) {
    // Randomly pick sales or purchase
    const isSales = Math.random() < 0.6; // 60% receipts, 40% payments
    const voucherType = isSales ? "receipt" : "payment";

    // Variable distribution for complex allocations
    const allocRoll = Math.random();
    const singleInvoiceChance = randomFloat(0.4, 0.6); // 40-60%
    const multiInvoiceChance = randomFloat(0.25, 0.35); // 25-35%
    // Remainder is advance (15-25%)

    let allocations: Array<{
      allocation_type: string;
      invoice_id?: string;
      amount_applied: number;
    }> = [];

    // Get eligible invoices (use FRESH data from DB)
    const eligibleInvoices = (
      isSales ? freshSalesInvoices : freshPurchaseInvoices
    ).filter((inv) => roundTo2(inv.outstanding_amount) > 0);

    if (eligibleInvoices.length === 0) continue;

    // Get a party ledger
    const randomInvoice =
      eligibleInvoices[randomInt(0, eligibleInvoices.length - 1)];
    const { data: invoiceData } = await supabase
      .from("invoices")
      .select("party_ledger_id")
      .eq("id", randomInvoice.id)
      .single();

    if (!invoiceData) continue;

    const partyLedgerId = invoiceData.party_ledger_id;

    // Payment mode
    const modeRoll = Math.random();
    let paymentMode: "cash" | "cheque" | "neft" | "rtgs" | "upi" | "card";
    if (modeRoll < 0.1) {
      paymentMode = "cash";
    } else if (modeRoll < 0.25) {
      paymentMode = "cheque";
    } else if (modeRoll < 0.65) {
      paymentMode = "neft";
    } else if (modeRoll < 0.75) {
      paymentMode = "rtgs";
    } else if (modeRoll < 1.0) {
      paymentMode = "upi";
    } else {
      paymentMode = "card";
    }

    const counterLedgerId =
      paymentMode === "cash" ? cashLedger.id : bankLedger.id;

    // Total amount
    const totalAmount = randomFloat(5000, 50000, 2);

    // TDS (only for payments)
    const tdsApplicable = !isSales && Math.random() < 0.15;
    const tdsRate = tdsApplicable ? [0.1, 1, 2][randomInt(0, 2)] : 0;

    if (allocRoll < singleInvoiceChance) {
      // Single invoice allocation
      const invoice =
        eligibleInvoices[randomInt(0, eligibleInvoices.length - 1)];
      const amountToApply = roundTo2(
        Math.min(totalAmount, roundTo2(invoice.outstanding_amount)),
      );

      // Skip if amount is too small (constraint: amount_applied > 0)
      if (amountToApply > 0) {
        allocations.push({
          allocation_type: "against_ref",
          invoice_id: invoice.id,
          amount_applied: amountToApply,
        });
      }
    } else if (allocRoll < singleInvoiceChance + multiInvoiceChance) {
      // Multi-invoice allocation (2-4 invoices)
      const invoiceCount = randomInt(2, 4);
      const selectedInvs = selectRandom(
        eligibleInvoices,
        Math.min(invoiceCount, eligibleInvoices.length),
      );

      let remainingAmount = roundTo2(totalAmount);
      for (let idx = 0; idx < selectedInvs.length; idx++) {
        const invoice = selectedInvs[idx];
        if (remainingAmount <= 0) break;

        // For the LAST invoice, use exact remaining amount to avoid precision errors
        const isLast = idx === selectedInvs.length - 1;
        const amountToApply = isLast
          ? remainingAmount
          : roundTo2(
              Math.min(remainingAmount, roundTo2(invoice.outstanding_amount)),
            );

        // Skip if amount is too small (constraint: amount_applied > 0)
        if (amountToApply > 0) {
          allocations.push({
            allocation_type: "against_ref",
            invoice_id: invoice.id,
            amount_applied: amountToApply,
          });
          remainingAmount = roundTo2(remainingAmount - amountToApply);
        }
      }
    } else {
      // Advance payment (no invoice)
      allocations.push({
        allocation_type: "advance",
        amount_applied: roundTo2(totalAmount),
      });
    }

    // Payment date
    const paymentDate = new Date();
    paymentDate.setDate(paymentDate.getDate() - randomInt(1, 60));
    const formattedDate = paymentDate.toISOString().split("T")[0];

    // Reference
    const referenceNumber =
      paymentMode === "cash"
        ? ""
        : paymentMode === "cheque"
          ? `CHQ-${randomInt(100000, 999999)}`
          : `${paymentMode.toUpperCase()}/${randomInt(100000, 999999)}`;

    const referenceDate =
      paymentMode === "cheque"
        ? new Date(
            paymentDate.getTime() - randomInt(1, 3) * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0]
        : formattedDate;

    // Create payment using RPC
    const { data: paymentSlug, error } = await supabase.rpc(
      "create_payment_with_allocations",
      {
        p_voucher_type: voucherType,
        p_party_ledger_id: partyLedgerId,
        p_counter_ledger_id: counterLedgerId,
        p_payment_date: formattedDate,
        p_payment_mode: paymentMode,
        p_reference_number: referenceNumber,
        p_reference_date: referenceDate,
        p_total_amount: totalAmount,
        p_tds_applicable: tdsApplicable,
        p_tds_rate: tdsRate,
        p_tds_ledger_id: tdsApplicable ? tdsLedger.id : null,
        p_notes: "Auto-generated test data",
        p_attachments: [],
        p_allocations: allocations,
        p_company_id: companyId,
      },
    );

    if (error) {
      console.error(`   ❌ Failed to create payment: ${error.message}`);
      continue;
    }

    totalCreated++;
    if (isSales) {
      receipts++;
    } else {
      payments++;
    }

    // 5% cancelled
    if (Math.random() < 0.05) {
      const { data: payment } = await supabase
        .from("payments")
        .select("id")
        .eq("slug", paymentSlug)
        .single();

      if (payment) {
        await supabase
          .from("payments")
          .update({
            is_cancelled: true,
            cancelled_at: new Date().toISOString(),
            cancelled_by: userId,
            cancellation_reason: [
              "Payment failed",
              "Incorrect amount entered",
              "Duplicate payment",
            ][randomInt(0, 2)],
          })
          .eq("id", payment.id);

        cancelled++;
      }
    }

    if (totalCreated % 50 === 0) {
      console.log(`   ✅ Created ${totalCreated} payments so far...`);
    }
  }

  console.log(`\n✨ Successfully created ${totalCreated} payments/receipts!`);
  console.log(`   • Receipts (sales): ${receipts}`);
  console.log(`   • Payments (purchase): ${payments}`);
  console.log(
    `   • Cancelled: ${cancelled} (${Math.round((cancelled / totalCreated) * 100)}%)`,
  );
}

// ============================================================================
// CANCEL SELECTED RECORDS
// ============================================================================

async function cancelSelectedRecords(companyId: string, userId: string) {
  console.log("\n✖ Cancelling selected records (5-10%)...\n");

  let invoicesCancelled = 0;

  // Cancel invoices WITHOUT payments or adjustments (5%)
  const { data: invoicesWithoutDeps } = await supabase
    .from("invoices")
    .select("id")
    .eq("company_id", companyId)
    .eq("has_payment", false)
    .eq("has_adjustment", false)
    .limit(50);

  if (invoicesWithoutDeps) {
    const toCancel = selectRandom(
      invoicesWithoutDeps,
      Math.floor(invoicesWithoutDeps.length * 0.05),
    );

    for (const invoice of toCancel) {
      await supabase
        .from("invoices")
        .update({
          is_cancelled: true,
          cancelled_at: new Date().toISOString(),
          cancelled_by: userId,
          cancellation_reason: [
            "Duplicate entry",
            "Customer order cancelled",
            "Data entry error",
          ][randomInt(0, 2)],
        })
        .eq("id", invoice.id);

      invoicesCancelled++;
    }
  }

  console.log(`   ✅ Cancelled ${invoicesCancelled} invoices`);
  console.log(
    "   (Adjustment notes and payments already cancelled during generation)",
  );
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
    console.error(
      "❌ No company found. Please run setup.ts first to create a company.",
    );
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

  // Get existing attributes (consolidated table)
  const { data: attributes } = await supabase
    .from("product_attributes")
    .select("id, name, group_name")
    .eq("company_id", companyId);

  if (!attributes) {
    console.error("❌ Missing product attributes. Please run setup.ts first.");
    return;
  }

  const materialIds: Record<string, string> = {};
  const colorIds: Record<string, string> = {};
  const tagIds: Record<string, string> = {};

  attributes.forEach((attr) => {
    if (attr.group_name === "material") {
      materialIds[attr.name] = attr.id;
    } else if (attr.group_name === "color") {
      colorIds[attr.name] = attr.id;
    } else if (attr.group_name === "tag") {
      tagIds[attr.name] = attr.id;
    }
  });

  // Get partners
  const { data: partners } = await supabase
    .from("partners")
    .select("id, partner_type")
    .eq("company_id", companyId);

  if (!partners || partners.length === 0) {
    console.error("❌ No partners found. Please run setup.ts first.");
    return;
  }

  const supplierIds = partners
    .filter((p) => p.partner_type === "supplier")
    .map((p) => p.id);
  const customerIds = partners
    .filter((p) => p.partner_type === "customer")
    .map((p) => p.id);
  const agentIds = partners
    .filter((p) => p.partner_type === "agent")
    .map((p) => p.id);

  if (supplierIds.length === 0 || customerIds.length === 0) {
    console.error(
      "❌ Missing suppliers or customers. Please run setup.ts first.",
    );
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

  // Generate purchase orders first (needed for linking goods inwards)
  const purchaseOrders = await generatePurchaseOrders(
    companyId,
    warehouseId,
    userId,
    supplierIds,
    agentIds,
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

  // PHASE 1: Approve orders so they can receive goods movements
  await approveOrdersForMovements(purchaseOrders, salesOrders);

  // Generate goods inwards (link 50% to POs, 30% to sales returns, 20% to other)
  await generateGoodsInwards(
    companyId,
    warehouseId,
    userId,
    supplierIds,
    productIds,
    2025,
  );

  // Generate goods outwards
  await generateGoodsOutwards(companyId, warehouseId, userId, 2025);

  // PHASE 2: Finalize order statuses after goods movements
  await finalizeOrderStatuses(purchaseOrders, salesOrders);

  // ============================================================================
  // ACCOUNTING DATA GENERATION
  // ============================================================================

  // Generate sales invoices
  const salesInvoices = await generateSalesInvoices(
    companyId,
    warehouseId,
    userId,
    productIds,
    salesOrders,
    2025,
  );

  // Generate purchase invoices
  const purchaseInvoices = await generatePurchaseInvoices(
    companyId,
    warehouseId,
    userId,
    productIds,
    purchaseOrders,
    2025,
  );

  // Combine all invoices
  const allInvoices = [...salesInvoices, ...purchaseInvoices];

  // Generate adjustment notes
  await generateAdjustmentNotes(
    companyId,
    warehouseId,
    userId,
    productIds,
    allInvoices,
  );

  // Generate payments and receipts
  await generatePaymentsAndReceipts(companyId, userId, allInvoices);

  // Cancel selected records
  await cancelSelectedRecords(companyId, userId);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 Complete test data generation finished!");
  console.log("\n📊 Summary:");
  console.log("\n📦 Inventory & Orders:");
  console.log("   • 100 products with varied attributes");
  console.log("   • 600 goods inwards with stock units");
  console.log("   • ~400 goods outwards (linked to orders + standalone)");
  console.log("   • 500 sales orders (spanning Jan-Dec 2025)");
  console.log("   • 400 purchase orders (spanning Jan-Dec 2025)");
  console.log(
    "   • Order statuses: 15% pending, 25% in_progress, 50% completed, 10% cancelled",
  );
  console.log(
    "   • Received/dispatched quantities auto-reconciled by database triggers",
  );
  console.log("\n💰 Accounting:");
  console.log("   • 500 sales invoices (50% GST, 30% IGST, 20% no_tax)");
  console.log("   • 400 purchase invoices (same tax distribution)");
  console.log("   • ~150 adjustment notes (credit & debit notes)");
  console.log(
    "   • ~850 payments/receipts (50% settle, 50% complex allocations)",
  );
  console.log(
    "   • Discounts: Even split (33% percentage, 33% flat, 34% none)",
  );
  console.log("   • TDS on 15% of purchase payments (rates: 0.1%, 1%, 2%)");
  console.log(
    "   • Payment modes match ledger types (cash mode = cash ledger)",
  );
  console.log("   • 5-10% cancelled records with reasons");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

loadTestData().catch(console.error);
