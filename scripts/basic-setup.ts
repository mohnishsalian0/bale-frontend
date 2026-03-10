/**
 * Setup Script - Minimal Test Data
 * Creates a fresh test environment with minimal data for development
 *
 * Usage:
 *   npx tsx scripts/setup.ts [local|staging]
 *
 * Phase 1: Core Setup (Company, Warehouses, Partners, Attributes, Products)
 * - Company + Catalog + Admin User
 * - 5 Warehouses (2 business + 3 vendor factories)
 * - 9 Partners (3 customers + 2 suppliers + 2 vendors + 2 agents)
 * - Attributes (6 materials + 6 colors + 19 tags)
 * - 100 Products (template-based)
 */

// ============================================================================
// IMPORTS - Modules & Config
// ============================================================================

import {
  initializeEnvironment,
  createSupabaseClient,
  updateRecords,
} from "./modules/shared";
import {
  ensureCompany,
  ensureCatalogConfiguration,
  ensureAdminUser,
} from "./modules/company";
import { ensureWarehouses } from "./modules/warehouse";
import { ensurePartners } from "./modules/partners";
import { ensureAllAttributes } from "./modules/attributes";
import { ensureProducts } from "./modules/products";
import { generateSalesOrders } from "./modules/sales-orders";
import { generatePurchaseOrders } from "./modules/purchase-orders";
import { generateGoodsInwards } from "./modules/goods-inwards";
import { generateGoodsTransfers } from "./modules/goods-transfers";
import { generateGoodsOutwards } from "./modules/goods-outwards";
import { generateGoodsConverts } from "./modules/goods-converts";
import {
  generateSalesInvoices,
  generatePurchaseInvoices,
  fetchChargeLedgers,
} from "./modules/invoices";
import {
  generateSalesAdjustmentNotes,
  generatePurchaseAdjustmentNotes,
  fetchReturnLedgers,
} from "./modules/adjustment-notes";
import {
  generatePaymentReceipts,
  generatePaymentMade,
  fetchPaymentLedgers,
} from "./modules/payments";
import { generateQRBatches } from "./modules/qr-batches";
import { ALL_WAREHOUSES } from "./config/warehouses.config";
import { ALL_TEST_PARTNERS } from "./config/partners.config";
import {
  MATERIALS,
  COLORS,
  TAGS,
  SERVICE_TYPES,
} from "./config/attributes.config";
import { PRODUCT_TEMPLATES } from "./config/product-templates.config";
import { LOT_NUMBERS } from "./config/lot-numbers.config";
import { GOODS_INWARDS_CONFIG } from "./config/goods-inwards.config";
import { GOODS_TRANSFERS_CONFIG } from "./config/goods-transfers.config";
import { GOODS_OUTWARDS_CONFIG } from "./config/goods-outwards.config";
import { GOODS_CONVERTS_CONFIG } from "./config/goods-converts.config";
import { ADJUSTMENT_NOTES_CONFIG } from "./config/adjustment-notes.config";
import { PAYMENTS_CONFIG } from "./config/payments.config";
import { QR_BATCHES_CONFIG } from "./config/qr-batches.config";
import { generateJobWorks } from "./modules/job-works";
import { JOB_WORKS_CONFIG } from "./config/job-works.config";

// ============================================================================
// MAIN SETUP FUNCTION
// ============================================================================

async function runSetup() {
  console.log("🚀 Starting Setup Script - Minimal Test Data\n");
  console.log("=" + "=".repeat(79) + "\n");

  // Initialize environment and Supabase client
  const env = initializeEnvironment();
  const supabase = createSupabaseClient(
    env.supabaseUrl,
    env.supabaseServiceKey,
  );

  try {
    // ========================================================================
    // PHASE 1: CORE SETUP
    // ========================================================================

    console.log("📋 PHASE 1: Core Setup\n");

    // Step 1: Company
    const { companyId, companyName } = await ensureCompany(supabase);

    // Step 2: Catalog Configuration
    await ensureCatalogConfiguration(supabase, companyId);

    // Step 3: Warehouses (5 total)
    const warehouses = await ensureWarehouses(
      supabase,
      companyId,
      ALL_WAREHOUSES,
    );

    // Step 4: Admin User (assigned to first warehouse)
    const userId = await ensureAdminUser(supabase, companyId, warehouses[0].id);

    // Step 5: Partners (9 total)
    const partners = await ensurePartners(
      supabase,
      companyId,
      ALL_TEST_PARTNERS,
    );

    // Step 6: Attributes (materials, colors, tags, service types)
    const attributes = await ensureAllAttributes(
      supabase,
      companyId,
      MATERIALS,
      COLORS,
      TAGS,
      SERVICE_TYPES,
    );

    // Create attribute ID mappings for product creation
    const attributeIds = {
      materials: Object.fromEntries(
        attributes.materials.map((m) => [m.name, m.id]),
      ),
      colors: Object.fromEntries(attributes.colors.map((c) => [c.name, c.id])),
      tags: Object.fromEntries(attributes.tags.map((t) => [t.name, t.id])),
    };

    // Service type ID mappings for job work creation
    const serviceTypeIds = Object.fromEntries(
      attributes.serviceTypes.map((st) => [st.name, st.id]),
    );

    // Step 7: Products (100 from templates)
    const products = await ensureProducts(
      supabase,
      companyId,
      userId,
      PRODUCT_TEMPLATES,
      attributeIds,
    );

    // Extract partner IDs by type
    const customerIds = partners
      .filter((p) => p.partner_type === "customer")
      .map((p) => p.id);
    const supplierIds = partners
      .filter((p) => p.partner_type === "supplier")
      .map((p) => p.id);
    const vendorIds = partners
      .filter((p) => p.partner_type === "vendor")
      .map((p) => p.id);
    const agentIds = partners
      .filter((p) => p.partner_type === "agent")
      .map((p) => p.id);

    // Split products into raw materials and finished goods
    // Raw material products have names starting with "Raw "
    const rawProductIds = products
      .filter((p) => p.name.startsWith("Raw "))
      .map((p) => p.id);
    const finishedProductIds = products
      .filter((p) => !p.name.startsWith("Raw "))
      .map((p) => p.id);

    // Purchase orders: biased 80% towards raw materials (suppliers provide raw stock)
    // Sales orders: finished products only (customers buy finished goods)
    const poProductIds = [
      ...Array(4).fill(rawProductIds).flat(), // 80% raw
      ...finishedProductIds, // 20% finished
    ];
    const productIds = products.map((p) => p.id);

    // Use a fixed year for data generation for consistency in minimal setup
    const currentYear = 2025;

    // Step 8: Sales Orders (50 for minimal setup) — finished products only
    const salesOrders = await generateSalesOrders(
      supabase,
      companyId,
      warehouses,
      userId,
      customerIds,
      finishedProductIds,
      {
        totalOrders: 50,
        year: currentYear,
        inProgressRatio: 0.8,
      },
    );

    // Step 9: Purchase Orders (40 for minimal setup) — 80% raw, 20% finished
    const purchaseOrders = await generatePurchaseOrders(
      supabase,
      companyId,
      warehouses,
      userId,
      supplierIds,
      agentIds,
      poProductIds,
      {
        totalOrders: 40,
        year: currentYear,
        inProgressRatio: 0.8,
      },
    );

    // Step 10: Goods Inwards (80% of purchase orders)
    const goodsInwards = await generateGoodsInwards(
      supabase,
      companyId,
      userId,
      [...LOT_NUMBERS],
      GOODS_INWARDS_CONFIG,
    );

    // Step 11: Complete 50% of purchase orders
    const purchaseOrderCompletionRecords = Object.fromEntries(
      purchaseOrders
        .filter(() => Math.random() < 0.5)
        .map((po) => [po.id, { status: "completed" }]),
    );
    await updateRecords(
      supabase,
      "purchase_orders",
      purchaseOrderCompletionRecords,
    );

    // Step 12: Goods Transfers - Warehouse to Factory (15 transfers)
    const transfersToFactory = await generateGoodsTransfers(
      supabase,
      companyId,
      userId,
      warehouses,
      GOODS_TRANSFERS_CONFIG,
      {
        totalTransfers: 15,
        direction: "warehouse_to_factory",
        year: currentYear,
      },
    );

    // Step 12.5: Job Works (15 for minimal setup)
    const jobWorks = await generateJobWorks(
      supabase,
      companyId,
      warehouses,
      userId,
      vendorIds,
      agentIds,
      finishedProductIds,
      serviceTypeIds,
      { totalOrders: 15, year: currentYear },
      JOB_WORKS_CONFIG,
    );

    // Step 13: Goods Converts — raw materials → finished goods at factory warehouses
    // Internally fetches in_progress job works for linking
    const goodsConverts = await generateGoodsConverts(
      supabase,
      companyId,
      userId,
      warehouses,
      vendorIds,
      rawProductIds,
      finishedProductIds,
      10,
      GOODS_CONVERTS_CONFIG,
    );

    // Step 13: Goods Transfers - Factory to Warehouse (15 transfers)
    const transfersToWarehouse = await generateGoodsTransfers(
      supabase,
      companyId,
      userId,
      warehouses,
      GOODS_TRANSFERS_CONFIG,
      {
        totalTransfers: 30, // Total cumulative (15 + 15)
        direction: "factory_to_warehouse",
        year: currentYear,
      },
    );

    // Step 14: Goods Outwards (60% of sales orders)
    const goodsOutwards = await generateGoodsOutwards(
      supabase,
      companyId,
      userId,
      GOODS_OUTWARDS_CONFIG,
    );

    // Step 15: Goods Transfers - Warehouse to Factory (15 transfers)
    const salesOrderCompletionRecords = Object.fromEntries(
      salesOrders
        .filter(() => Math.random() < 0.5)
        .map((po) => [po.id, { status: "completed" }]),
    );
    await updateRecords(supabase, "sales_orders", salesOrderCompletionRecords);

    // Step 16: Fetch charge ledgers (reusable for both invoice types)
    const chargeLedgers = await fetchChargeLedgers(supabase, companyId);

    // Step 17: Sales Invoices (with additional charges inline)
    const salesInvoices = await generateSalesInvoices(
      supabase,
      companyId,
      userId,
      currentYear,
      chargeLedgers,
    );

    // Step 19: Purchase Invoices (with additional charges inline)
    const purchaseInvoices = await generatePurchaseInvoices(
      supabase,
      companyId,
      userId,
      currentYear,
      chargeLedgers,
    );

    // Step 20: Fetch return ledgers (reusable for both adjustment note types)
    const returnLedgers = await fetchReturnLedgers(supabase, companyId);

    // Step 21: Sales Adjustment Notes (credit/debit notes for sales invoices)
    const salesAdjustmentNotes = await generateSalesAdjustmentNotes(
      supabase,
      companyId,
      userId,
      warehouses[0].id, // Use first warehouse for adjustment notes
      productIds,
      ADJUSTMENT_NOTES_CONFIG,
      returnLedgers,
    );

    // Step 22: Purchase Adjustment Notes (credit/debit notes for purchase invoices)
    const purchaseAdjustmentNotes = await generatePurchaseAdjustmentNotes(
      supabase,
      companyId,
      userId,
      warehouses[0].id, // Use first warehouse for adjustment notes
      productIds,
      ADJUSTMENT_NOTES_CONFIG,
      returnLedgers,
    );

    // Step 23: Fetch payment ledgers (reusable for both payment types)
    const paymentLedgers = await fetchPaymentLedgers(supabase, companyId);

    // Step 24: Payment Receipts (customer payments for sales invoices)
    const paymentReceipts = await generatePaymentReceipts(
      supabase,
      companyId,
      userId,
      PAYMENTS_CONFIG,
      paymentLedgers,
    );

    // Step 25: Payment Made (supplier payments for purchase invoices)
    const paymentMade = await generatePaymentMade(
      supabase,
      companyId,
      userId,
      PAYMENTS_CONFIG,
      paymentLedgers,
    );

    // Step 26: QR Batches (QR code batches for stock units)
    const qrBatches = await generateQRBatches(
      supabase,
      companyId,
      warehouses,
      userId,
      QR_BATCHES_CONFIG,
    );

    // ========================================================================
    // SUMMARY
    // ========================================================================

    console.log("\n" + "=".repeat(80));
    console.log("✅ SETUP COMPLETE - MINIMAL TEST DATA");
    console.log("=".repeat(80) + "\n");

    console.log("📊 Summary:");
    console.log(`   Company: ${companyName} (${companyId})`);
    console.log(`   Warehouses: ${warehouses.length}`);
    console.log(`   Partners: ${partners.length}`);
    console.log(
      `   Attributes: ${attributes.materials.length} materials, ${attributes.colors.length} colors, ${attributes.tags.length} tags`,
    );
    console.log(`   Products: ${products.length}`);
    console.log(`   Sales Orders: ${salesOrders.length}`);
    console.log(`   Purchase Orders: ${purchaseOrders.length}`);
    console.log(`   Goods Inwards: ${goodsInwards.length}`);
    console.log(
      `   Purchase Order completions: ${purchaseOrderCompletionRecords.length}`,
    );
    console.log(
      `   Goods Transfers: ${transfersToFactory.length} total warehouse→factory`,
    );
    console.log(`   Job Works: ${jobWorks.length}`);
    console.log(`   Goods Converts: ${goodsConverts.length}`);
    console.log(
      `   Goods Transfers: ${transfersToWarehouse.length} total factory→warehouse`,
    );
    console.log(`   Goods Outwards: ${goodsOutwards.length}`);
    console.log(
      `   Sales Order completions: ${salesOrderCompletionRecords.length}`,
    );
    console.log(`   Sales Invoices: ${salesInvoices.length}`);
    console.log(`   Purchase Invoices: ${purchaseInvoices.length}`);
    console.log(
      `   Total Invoices: ${salesInvoices.length + purchaseInvoices.length}`,
    );
    console.log(`   Sales Adjustment Notes: ${salesAdjustmentNotes.length}`);
    console.log(
      `   Purchase Adjustment Notes: ${purchaseAdjustmentNotes.length}`,
    );
    console.log(
      `   Total Adjustment Notes: ${salesAdjustmentNotes.length + purchaseAdjustmentNotes.length}`,
    );
    console.log(`   Payment Receipts: ${paymentReceipts.length}`);
    console.log(`   Payment Made: ${paymentMade.length}`);
    console.log(
      `   Total Payments: ${paymentReceipts.length + paymentMade.length}`,
    );
    console.log(`   QR Batches: ${qrBatches.length}`);
    console.log(`   Admin User ID: ${userId}\n`);

    console.log("🎉 You can now start using the application!\n");
  } catch (error) {
    console.error("\n❌ Setup failed:", error);
    process.exit(1);
  }
}

// ============================================================================
// RUN
// ============================================================================

runSetup();
