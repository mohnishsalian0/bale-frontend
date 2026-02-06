/**
 * Load Testing Setup Script - Heavy Test Data (Phase 1 Only)
 * Creates a test environment with Phase 1 data for load testing
 * This is a temporary file until Phase 2 modules are fully migrated
 *
 * Usage:
 *   npx tsx scripts/load-setup-phase1.ts [local|staging]
 *
 * Phase 1: Core Setup (Company, Warehouses, Partners, Attributes, Products)
 * - Company + Catalog + Admin User
 * - 5 Warehouses (2 business + 3 vendor factories)
 * - 9 Partners (3 customers + 2 suppliers + 2 vendors + 2 agents)
 * - Attributes (6 materials + 6 colors + 19 tags)
 * - 100 Products (template-based)
 *
 * Phase 2: Heavy Transactions (TODO - see load-setup.ts for current implementation)
 * - Will be migrated to module files in future iterations
 */

import type { Database } from "@/types/database";

// ============================================================================
// IMPORTS - Modules & Config
// ============================================================================

import {
  initializeEnvironment,
  createSupabaseClient,
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

import { ALL_WAREHOUSES } from "./config/warehouses.config";
import { ALL_TEST_PARTNERS } from "./config/partners.config";
import { MATERIALS, COLORS, TAGS } from "./config/attributes.config";
import { PRODUCT_TEMPLATES } from "./config/product-templates.config";

// ============================================================================
// MAIN LOAD TESTING SETUP FUNCTION
// ============================================================================

async function runLoadSetup() {
  console.log("🚀 Starting Load Testing Setup - Heavy Test Data (Phase 1)\n");
  console.log("=" + "=".repeat(79) + "\n");

  // Initialize environment and Supabase client
  const env = initializeEnvironment();
  const supabase = createSupabaseClient(env.supabaseUrl, env.supabaseServiceKey);

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
    const userId = await ensureAdminUser(
      supabase,
      companyId,
      warehouses[0].id,
    );

    // Step 5: Partners (9 total)
    const partners = await ensurePartners(
      supabase,
      companyId,
      ALL_TEST_PARTNERS,
    );

    // Step 6: Attributes (materials, colors, tags)
    const attributes = await ensureAllAttributes(
      supabase,
      companyId,
      MATERIALS,
      COLORS,
      TAGS,
    );

    // Create attribute ID mappings for product creation
    const attributeIds = {
      materials: Object.fromEntries(
        attributes.materials.map((m) => [m.name, m.id]),
      ),
      colors: Object.fromEntries(
        attributes.colors.map((c) => [c.name, c.id]),
      ),
      tags: Object.fromEntries(
        attributes.tags.map((t) => [t.name, t.id]),
      ),
    };

    // Step 7: Products (100 from templates)
    const products = await ensureProducts(
      supabase,
      companyId,
      userId,
      PRODUCT_TEMPLATES,
      attributeIds,
    );

    // ========================================================================
    // PHASE 2: HEAVY TRANSACTIONS (TODO)
    // ========================================================================

    console.log("\n📋 PHASE 2: Heavy Transactions (Coming Soon)\n");
    console.log("   ⏳ For now, use scripts/load-setup.ts for Phase 2 data");
    console.log("   ⏳ Phase 2 modules will be created in future iterations\n");

    // TODO: Implement Phase 2 modules
    // - Sales Orders (100+)
    // - Purchase Orders (100+)
    // - Goods Inward (600+)
    // - Goods Outward (300+)
    // - Goods Transfer (50+)
    // - Invoices (200+)
    // - Adjustment Notes (100+)
    // - Payments (300+)
    // - QR Batches
    // - Random status changes

    // ========================================================================
    // SUMMARY
    // ========================================================================

    console.log("\n" + "=".repeat(80));
    console.log("✅ LOAD TESTING SETUP COMPLETE - PHASE 1");
    console.log("=".repeat(80) + "\n");

    console.log("📊 Summary:");
    console.log(`   Company: ${companyName} (${companyId})`);
    console.log(`   Warehouses: ${warehouses.length}`);
    console.log(`   Partners: ${partners.length}`);
    console.log(
      `   Attributes: ${attributes.materials.length} materials, ${attributes.colors.length} colors, ${attributes.tags.length} tags`,
    );
    console.log(`   Products: ${products.length}`);
    console.log(`   Admin User ID: ${userId}\n`);

    console.log("🎉 Phase 1 complete! Use load-setup.ts for Phase 2 transactions.\n");
  } catch (error) {
    console.error("\n❌ Load setup failed:", error);
    process.exit(1);
  }
}

// ============================================================================
// RUN
// ============================================================================

runLoadSetup();
