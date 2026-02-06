/**
 * Adjustment Notes Module
 * Handles credit/debit note generation with idempotent pattern
 *
 * Migrated from load-setup.ts (lines 2517-2708)
 * - Credit Notes: Sales invoices (80% credit, 20% debit)
 * - Debit Notes: Purchase invoices (80% debit, 20% credit)
 * - 20-25% of eligible invoices get adjustment notes
 * - Only invoices with outstanding_amount > 0 are eligible
 * - RPC: create_adjustment_note_with_items
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { randomInt, randomFloat } from "./shared";

// ============================================================================
// TYPES
// ============================================================================

export interface AdjustmentNoteResult {
  id: string;
  slug: string;
  adjustment_type: "credit" | "debit";
  is_cancelled: boolean;
}

interface ReturnLedgers {
  salesReturn: { id: string; name: string } | undefined;
  purchaseReturn: { id: string; name: string } | undefined;
}

interface AdjustmentNoteItem {
  product_id: string;
  quantity: number;
  rate: number;
  gst_rate: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Round to 2 decimal places to avoid precision issues
 */
function roundTo2(num: number): number {
  return Math.round(num * 100) / 100;
}

/**
 * Fetch return ledgers (Sales Return and Purchase Return)
 */
export async function fetchReturnLedgers(
  supabase: SupabaseClient<Database>,
  companyId: string,
): Promise<ReturnLedgers> {
  const { data: returnLedgers } = await supabase
    .from("ledgers")
    .select("id, name, system_name")
    .eq("company_id", companyId)
    .in("system_name", ["sales_return", "purchase_return"]);

  return {
    salesReturn: returnLedgers?.find((l) => l.system_name === "sales_return"),
    purchaseReturn: returnLedgers?.find(
      (l) => l.system_name === "purchase_return",
    ),
  };
}

/**
 * Generate random items for adjustment note
 * Items have quantity, rate, and GST rate
 */
function generateAdjustmentNoteItems(
  productIds: string[],
  config: {
    itemsPerNote: [number, number];
    itemQuantityRange: [number, number];
    itemRateRange: [number, number];
    gstRates: readonly number[];
  },
): AdjustmentNoteItem[] {
  const itemCount = randomInt(config.itemsPerNote[0], config.itemsPerNote[1]);

  // Randomly select products (without replacement)
  const shuffled = [...productIds].sort(() => Math.random() - 0.5);
  const selectedProducts = shuffled.slice(0, itemCount);

  return selectedProducts.map((productId) => {
    const quantity = randomFloat(
      config.itemQuantityRange[0],
      config.itemQuantityRange[1],
      2,
    );
    const rate = randomFloat(
      config.itemRateRange[0],
      config.itemRateRange[1],
      2,
    );
    const gst_rate =
      config.gstRates[randomInt(0, config.gstRates.length - 1)];

    return {
      product_id: productId,
      quantity: roundTo2(quantity),
      rate: roundTo2(rate),
      gst_rate,
    };
  });
}

/**
 * Create a single adjustment note with items using RPC
 * Handles both credit and debit notes
 */
async function createSingleAdjustmentNote(
  supabase: SupabaseClient<Database>,
  params: {
    companyId: string;
    userId: string;
    warehouseId: string;
    invoiceId: string;
    adjustmentType: "credit" | "debit";
    counterLedgerId: string;
    items: AdjustmentNoteItem[];
    reason: string;
    config: {
      adjustmentDateOffsetDays: { min: number; max: number };
    };
  },
): Promise<string | null> {
  const {
    companyId,
    userId,
    warehouseId,
    invoiceId,
    adjustmentType,
    counterLedgerId,
    items,
    reason,
    config,
  } = params;

  // Generate adjustment date (1-30 days in the past)
  const adjustmentDate = new Date();
  adjustmentDate.setDate(
    adjustmentDate.getDate() -
      randomInt(
        config.adjustmentDateOffsetDays.min,
        config.adjustmentDateOffsetDays.max,
      ),
  );
  const formattedDate = adjustmentDate.toISOString().split("T")[0];

  // Create adjustment note using RPC
  const { data: adjustmentSlug, error } = await supabase.rpc(
    "create_adjustment_note_with_items",
    {
      p_invoice_id: invoiceId,
      p_warehouse_id: warehouseId,
      p_counter_ledger_id: counterLedgerId,
      p_adjustment_type: adjustmentType,
      p_adjustment_date: formattedDate,
      p_reason: reason,
      p_notes: "Auto-generated test data",
      p_attachments: [],
      p_items: items as unknown as any,
      p_company_id: companyId,
    },
  );

  if (error) {
    console.error(
      `   ❌ Failed to create adjustment note: ${error.message}`,
    );
    return null;
  }

  return adjustmentSlug;
}

/**
 * Apply cancellation status to a random subset of adjustment notes
 */
async function applyCancellations(
  supabase: SupabaseClient<Database>,
  userId: string,
  adjustmentSlugs: string[],
  cancellationRate: number,
  cancellationReasons: readonly string[],
): Promise<number> {
  let cancelledCount = 0;

  for (const slug of adjustmentSlugs) {
    if (Math.random() >= cancellationRate) continue;

    // Fetch adjustment note by slug
    const { data: adjustment } = await supabase
      .from("adjustment_notes")
      .select("id")
      .eq("slug", slug)
      .single();

    if (!adjustment) continue;

    // Update to cancelled
    const { error } = await supabase
      .from("adjustment_notes")
      .update({
        is_cancelled: true,
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId,
        cancellation_reason:
          cancellationReasons[randomInt(0, cancellationReasons.length - 1)],
      })
      .eq("id", adjustment.id);

    if (!error) {
      cancelledCount++;
    }
  }

  return cancelledCount;
}

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Generate adjustment notes for sales invoices
 * - 80% credit notes (reduce receivables)
 * - 20% debit notes (increase receivables)
 * - Only for invoices with outstanding > 0
 * - 20-25% of eligible sales invoices get adjustment notes
 */
export async function generateSalesAdjustmentNotes(
  supabase: SupabaseClient<Database>,
  companyId: string,
  userId: string,
  warehouseId: string,
  productIds: string[],
  config: typeof import("../config/adjustment-notes.config").ADJUSTMENT_NOTES_CONFIG,
  returnLedgers: ReturnLedgers,
): Promise<AdjustmentNoteResult[]> {
  console.log("\n📝 Generating sales adjustment notes...\n");

  if (!returnLedgers.salesReturn) {
    console.error("❌ Sales Return ledger not found. Skipping...\n");
    return [];
  }

  // Fetch all sales invoices
  const { data: allSalesInvoices } = await supabase
    .from("invoices")
    .select("id, outstanding_amount")
    .eq("company_id", companyId)
    .eq("invoice_type", "sales")
    .is("deleted_at", null);

  if (!allSalesInvoices) {
    console.log("✅ No sales invoices found. Skipping...\n");
    return [];
  }

  // Get sales invoice IDs
  const salesInvoiceIds = allSalesInvoices.map((inv) => inv.id);

  // Fetch existing adjustment notes for sales invoices
  const { data: existingSalesNotes } = await supabase
    .from("adjustment_notes")
    .select("id, slug, adjustment_type, is_cancelled, invoice_id")
    .eq("company_id", companyId)
    .in("invoice_id", salesInvoiceIds);

  const existingCount = existingSalesNotes?.length || 0;

  // Filter eligible invoices (outstanding > 0)
  const eligibleInvoices = allSalesInvoices.filter(
    (inv) => roundTo2(inv.outstanding_amount || 0) > 0,
  );

  // Calculate target count
  const targetCount = Math.floor(
    eligibleInvoices.length * config.adjustmentRate,
  );

  if (existingCount >= targetCount) {
    console.log(
      `✅ Sufficient sales adjustment notes already exist (${existingCount})\n`,
    );
    return existingSalesNotes || [];
  }

  const toCreate = targetCount - existingCount;
  console.log(
    `📝 Creating ${toCreate} new sales adjustment notes (${existingCount} already exist)...`,
  );

  // Select random invoices to adjust
  const shuffled = [...eligibleInvoices].sort(() => Math.random() - 0.5);
  const selectedInvoices = shuffled.slice(0, toCreate);

  const createdSlugs: string[] = [];
  let successCount = 0;

  for (const invoice of selectedInvoices) {
    // Determine adjustment type: 80% credit, 20% debit
    const adjustmentType: "credit" | "debit" =
      Math.random() < config.salesCreditRate ? "credit" : "debit";

    // Generate items
    const items = generateAdjustmentNoteItems(productIds, {
      itemsPerNote: config.itemsPerNote,
      itemQuantityRange: config.itemQuantityRange,
      itemRateRange: config.itemRateRange,
      gstRates: config.gstRates,
    });

    // Select reason
    const reasonList =
      adjustmentType === "credit"
        ? config.reasons.credit
        : config.reasons.debit;
    const reason = reasonList[randomInt(0, reasonList.length - 1)];

    // Create adjustment note
    const slug = await createSingleAdjustmentNote(supabase, {
      companyId,
      userId,
      warehouseId,
      invoiceId: invoice.id,
      adjustmentType,
      counterLedgerId: returnLedgers.salesReturn.id,
      items,
      reason,
      config: {
        adjustmentDateOffsetDays: config.adjustmentDateOffsetDays,
      },
    });

    if (slug) {
      createdSlugs.push(slug);
      successCount++;
    }

    if (successCount % 10 === 0) {
      console.log(
        `   ✅ Created ${successCount}/${toCreate} sales adjustment notes...`,
      );
    }
  }

  console.log(`\n✨ Successfully created ${successCount} sales adjustment notes!`);

  // Apply cancellations
  if (createdSlugs.length > 0) {
    const cancelledCount = await applyCancellations(
      supabase,
      userId,
      createdSlugs,
      config.cancellationRate,
      config.cancellationReasons,
    );
    console.log(
      `📝 Cancelled ${cancelledCount} adjustment notes (${Math.round((cancelledCount / successCount) * 100)}%)\n`,
    );
  }

  // Re-query to get all sales adjustment notes
  const { data: allSalesNotes } = await supabase
    .from("adjustment_notes")
    .select("id, slug, adjustment_type, is_cancelled, invoice_id")
    .eq("company_id", companyId)
    .in("invoice_id", salesInvoiceIds)
    .order("created_at", { ascending: true });

  console.log(`📊 Total sales adjustment notes: ${allSalesNotes?.length || 0}\n`);

  return allSalesNotes || [];
}

/**
 * Generate adjustment notes for purchase invoices
 * - 80% debit notes (reduce payables)
 * - 20% credit notes (increase payables)
 * - Only for invoices with outstanding > 0
 * - 20-25% of eligible purchase invoices get adjustment notes
 */
export async function generatePurchaseAdjustmentNotes(
  supabase: SupabaseClient<Database>,
  companyId: string,
  userId: string,
  warehouseId: string,
  productIds: string[],
  config: typeof import("../config/adjustment-notes.config").ADJUSTMENT_NOTES_CONFIG,
  returnLedgers: ReturnLedgers,
): Promise<AdjustmentNoteResult[]> {
  console.log("\n📝 Generating purchase adjustment notes...\n");

  if (!returnLedgers.purchaseReturn) {
    console.error("❌ Purchase Return ledger not found. Skipping...\n");
    return [];
  }

  // Fetch all purchase invoices
  const { data: allPurchaseInvoices } = await supabase
    .from("invoices")
    .select("id, outstanding_amount")
    .eq("company_id", companyId)
    .eq("invoice_type", "purchase")
    .is("deleted_at", null);

  if (!allPurchaseInvoices) {
    console.log("✅ No purchase invoices found. Skipping...\n");
    return [];
  }

  // Get purchase invoice IDs
  const purchaseInvoiceIds = allPurchaseInvoices.map((inv) => inv.id);

  // Fetch existing adjustment notes for purchase invoices
  const { data: existingPurchaseNotes } = await supabase
    .from("adjustment_notes")
    .select("id, slug, adjustment_type, is_cancelled, invoice_id")
    .eq("company_id", companyId)
    .in("invoice_id", purchaseInvoiceIds);

  const existingCount = existingPurchaseNotes?.length || 0;

  // Filter eligible invoices (outstanding > 0)
  const eligibleInvoices = allPurchaseInvoices.filter(
    (inv) => roundTo2(inv.outstanding_amount || 0) > 0,
  );

  // Calculate target count
  const targetCount = Math.floor(
    eligibleInvoices.length * config.adjustmentRate,
  );

  if (existingCount >= targetCount) {
    console.log(
      `✅ Sufficient purchase adjustment notes already exist (${existingCount})\n`,
    );
    return existingPurchaseNotes || [];
  }

  const toCreate = targetCount - existingCount;
  console.log(
    `📝 Creating ${toCreate} new purchase adjustment notes (${existingCount} already exist)...`,
  );

  // Select random invoices to adjust
  const shuffled = [...eligibleInvoices].sort(() => Math.random() - 0.5);
  const selectedInvoices = shuffled.slice(0, toCreate);

  const createdSlugs: string[] = [];
  let successCount = 0;

  for (const invoice of selectedInvoices) {
    // Determine adjustment type: 80% debit, 20% credit
    const adjustmentType: "credit" | "debit" =
      Math.random() < config.purchaseDebitRate ? "debit" : "credit";

    // Generate items
    const items = generateAdjustmentNoteItems(productIds, {
      itemsPerNote: config.itemsPerNote,
      itemQuantityRange: config.itemQuantityRange,
      itemRateRange: config.itemRateRange,
      gstRates: config.gstRates,
    });

    // Select reason
    const reasonList =
      adjustmentType === "credit"
        ? config.reasons.credit
        : config.reasons.debit;
    const reason = reasonList[randomInt(0, reasonList.length - 1)];

    // Create adjustment note
    const slug = await createSingleAdjustmentNote(supabase, {
      companyId,
      userId,
      warehouseId,
      invoiceId: invoice.id,
      adjustmentType,
      counterLedgerId: returnLedgers.purchaseReturn.id,
      items,
      reason,
      config: {
        adjustmentDateOffsetDays: config.adjustmentDateOffsetDays,
      },
    });

    if (slug) {
      createdSlugs.push(slug);
      successCount++;
    }

    if (successCount % 10 === 0) {
      console.log(
        `   ✅ Created ${successCount}/${toCreate} purchase adjustment notes...`,
      );
    }
  }

  console.log(
    `\n✨ Successfully created ${successCount} purchase adjustment notes!`,
  );

  // Apply cancellations
  if (createdSlugs.length > 0) {
    const cancelledCount = await applyCancellations(
      supabase,
      userId,
      createdSlugs,
      config.cancellationRate,
      config.cancellationReasons,
    );
    console.log(
      `📝 Cancelled ${cancelledCount} adjustment notes (${Math.round((cancelledCount / successCount) * 100)}%)\n`,
    );
  }

  // Re-query to get all purchase adjustment notes
  const { data: allPurchaseNotes } = await supabase
    .from("adjustment_notes")
    .select("id, slug, adjustment_type, is_cancelled, invoice_id")
    .eq("company_id", companyId)
    .in("invoice_id", purchaseInvoiceIds)
    .order("created_at", { ascending: true });

  console.log(
    `📊 Total purchase adjustment notes: ${allPurchaseNotes?.length || 0}\n`,
  );

  return allPurchaseNotes || [];
}
