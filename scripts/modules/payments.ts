/**
 * Payments Module
 * Handles payment receipt (customer payments) and payment made (supplier payments) generation
 *
 * Migrated from load-setup.ts (lines 2714-3240)
 * - Payment Receipts: From sales invoices (100% get payments)
 * - Payment Made: From purchase invoices (87.5% get payments)
 * - Full/partial payments with allocations
 * - Payment modes: cash, cheque, neft, rtgs, upi, card
 * - TDS applicable for purchase payments (15% chance)
 * - RPC: create_payment_with_allocations
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database/supabase";
import { randomInt, randomFloat } from "./shared";

// ============================================================================
// TYPES
// ============================================================================

export interface PaymentResult {
  id: string;
  slug: string;
  voucher_type: "receipt" | "payment";
  is_cancelled: boolean;
}

interface PaymentLedgers {
  cash: { id: string; name: string } | undefined;
  bank: { id: string; name: string } | undefined;
  tds: { id: string; name: string } | undefined;
}

type PaymentMode = "cash" | "cheque" | "neft" | "rtgs" | "upi" | "card";

interface PaymentModeDetails {
  instrument_number?: string;
  instrument_date?: string;
  instrument_bank?: string;
  instrument_branch?: string;
  instrument_ifsc?: string;
  transaction_id?: string;
  vpa?: string;
  card_last_four?: string;
}

interface PaymentAllocation {
  allocation_type: "against_ref" | "advance";
  invoice_id?: string;
  amount_applied: number;
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
 * Fetch payment ledgers (Cash, Bank Account, TDS Payable)
 */
export async function fetchPaymentLedgers(
  supabase: SupabaseClient<Database>,
  companyId: string,
): Promise<PaymentLedgers> {
  const { data: paymentLedgers } = await supabase
    .from("ledgers")
    .select("id, name, system_name")
    .eq("company_id", companyId)
    .in("system_name", ["cash", "bank", "tds_payable"]);

  return {
    cash: paymentLedgers?.find((l) => l.system_name === "cash"),
    bank: paymentLedgers?.find((l) => l.system_name === "bank"),
    tds: paymentLedgers?.find((l) => l.system_name === "tds_payable"),
  };
}

/**
 * Generate payment mode based on distribution
 */
function generatePaymentMode(
  config: typeof import("../config/payments.config").PAYMENTS_CONFIG,
): PaymentMode {
  const roll = Math.random();
  let cumulative = 0;

  if (roll < (cumulative += config.paymentModeDistribution.cash)) return "cash";
  if (roll < (cumulative += config.paymentModeDistribution.cheque))
    return "cheque";
  if (roll < (cumulative += config.paymentModeDistribution.neft)) return "neft";
  if (roll < (cumulative += config.paymentModeDistribution.rtgs)) return "rtgs";
  if (roll < (cumulative += config.paymentModeDistribution.upi)) return "upi";
  return "card";
}

/**
 * Generate payment mode-specific instrument details
 */
function generatePaymentModeDetails(
  paymentMode: PaymentMode,
  paymentDate: Date,
  config: typeof import("../config/payments.config").PAYMENTS_CONFIG,
): PaymentModeDetails {
  const details: PaymentModeDetails = {};

  switch (paymentMode) {
    case "cheque":
      // Cheque details - 80% full details, 20% only number
      if (
        Math.random() < config.instrumentDetailProbabilities.cheque.fullDetails
      ) {
        details.instrument_number = `${randomInt(100000, 999999)}`;
        // Instrument date is 1-3 days before payment date
        const instrumentDate = new Date(paymentDate);
        instrumentDate.setDate(
          instrumentDate.getDate() -
            randomInt(
              config.instrumentDateOffsetDays.min,
              config.instrumentDateOffsetDays.max,
            ),
        );
        details.instrument_date = instrumentDate.toISOString().split("T")[0];
        details.instrument_bank =
          config.banks[randomInt(0, config.banks.length - 1)];
        details.instrument_branch =
          config.branches[randomInt(0, config.branches.length - 1)];
        const ifscPrefix =
          config.ifscPrefixes[randomInt(0, config.ifscPrefixes.length - 1)];
        details.instrument_ifsc = `${ifscPrefix}0${String(randomInt(100000, 999999)).substring(0, 6)}`;
      } else {
        details.instrument_number = `${randomInt(100000, 999999)}`;
      }
      break;

    case "neft":
    case "rtgs":
      // Bank transfer details - 90% have transaction ID
      if (
        Math.random() < config.instrumentDetailProbabilities.neft.transactionId
      ) {
        const prefix = paymentMode.toUpperCase();
        details.transaction_id = `${prefix}${randomInt(10000000000, 99999999999)}`;
      }
      break;

    case "upi":
      // UPI details - 70% have VPA, 60% have transaction ID
      if (Math.random() < config.instrumentDetailProbabilities.upi.vpa) {
        const userName = `user${randomInt(1000, 9999)}`;
        const handle =
          config.upiHandles[randomInt(0, config.upiHandles.length - 1)];
        details.vpa = `${userName}${handle}`;
      }
      if (
        Math.random() < config.instrumentDetailProbabilities.upi.transactionId
      ) {
        details.transaction_id = `${randomInt(100000000000, 999999999999)}`;
      }
      break;

    case "card":
      // Card details - 80% have last 4 digits, 50% have transaction ID
      if (Math.random() < config.instrumentDetailProbabilities.card.lastFour) {
        details.card_last_four = `${randomInt(1000, 9999)}`;
      }
      if (
        Math.random() < config.instrumentDetailProbabilities.card.transactionId
      ) {
        details.transaction_id = `TXN${randomInt(10000000000, 99999999999)}`;
      }
      break;

    case "cash":
      // Cash has no additional details
      break;
  }

  return details;
}

/**
 * Create a single payment with allocations using RPC
 */
async function createSinglePayment(
  supabase: SupabaseClient<Database>,
  params: {
    companyId: string;
    userId: string;
    voucherType: "receipt" | "payment";
    partyLedgerId: string;
    counterLedgerId: string;
    paymentMode: PaymentMode;
    paymentDate: string;
    totalAmount: number;
    tdsApplicable: boolean;
    tdsRate: number;
    tdsLedgerId: string | null;
    allocations: PaymentAllocation[];
    paymentModeDetails: PaymentModeDetails;
  },
): Promise<string | null> {
  const {
    companyId,
    voucherType,
    partyLedgerId,
    counterLedgerId,
    paymentMode,
    paymentDate,
    totalAmount,
    tdsApplicable,
    tdsRate,
    tdsLedgerId,
    allocations,
    paymentModeDetails,
  } = params;

  // Create payment using RPC
  const { data: paymentSlug, error } = await supabase.rpc(
    "create_payment_with_allocations",
    {
      p_voucher_type: voucherType,
      p_party_ledger_id: partyLedgerId,
      p_counter_ledger_id: counterLedgerId,
      p_payment_date: paymentDate,
      p_payment_mode: paymentMode,
      p_total_amount: roundTo2(totalAmount),
      p_tds_applicable: tdsApplicable,
      p_tds_rate: tdsRate,
      p_tds_ledger_id: tdsLedgerId || undefined,
      p_notes: "Auto-generated test data",
      p_attachments: [],
      p_allocations: allocations as unknown as any,
      // Payment mode-specific fields
      p_instrument_number: paymentModeDetails.instrument_number || undefined,
      p_instrument_date: paymentModeDetails.instrument_date || undefined,
      p_instrument_bank: paymentModeDetails.instrument_bank || undefined,
      p_instrument_branch: paymentModeDetails.instrument_branch || undefined,
      p_instrument_ifsc: paymentModeDetails.instrument_ifsc || undefined,
      p_transaction_id: paymentModeDetails.transaction_id || undefined,
      p_vpa: paymentModeDetails.vpa || undefined,
      p_card_last_four: paymentModeDetails.card_last_four || undefined,
      p_company_id: companyId,
    },
  );

  if (error) {
    console.error(`   ❌ Failed to create ${voucherType}: ${error.message}`);
    return null;
  }

  return paymentSlug;
}

/**
 * Apply cancellation status to a random subset of payments
 */
async function applyCancellations(
  supabase: SupabaseClient<Database>,
  userId: string,
  paymentSlugs: string[],
  cancellationRate: number,
  cancellationReasons: readonly string[],
): Promise<number> {
  let cancelledCount = 0;

  for (const slug of paymentSlugs) {
    if (Math.random() >= cancellationRate) continue;

    // Fetch payment by slug
    const { data: payment } = await supabase
      .from("payments")
      .select("id")
      .eq("slug", slug)
      .single();

    if (!payment) continue;

    // Update to cancelled
    const { error } = await supabase
      .from("payments")
      .update({
        is_cancelled: true,
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId,
        cancellation_reason:
          cancellationReasons[randomInt(0, cancellationReasons.length - 1)],
      })
      .eq("id", payment.id);

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
 * Generate payment receipts for sales invoices
 * - 100% of sales invoices get payment receipts
 * - Full/partial payments (70% full, 30% partial)
 * - Payment modes: cash, cheque, neft, rtgs, upi, card
 * - Single invoice allocation
 * - 5% cancellation rate
 */
export async function generatePaymentReceipts(
  supabase: SupabaseClient<Database>,
  companyId: string,
  userId: string,
  config: typeof import("../config/payments.config").PAYMENTS_CONFIG,
  paymentLedgers: PaymentLedgers,
): Promise<PaymentResult[]> {
  console.log("\n💰 Generating payment receipts (sales)...\n");

  if (!paymentLedgers.cash || !paymentLedgers.bank) {
    console.error("❌ Cash or Bank ledger not found. Skipping...\n");
    return [];
  }

  // Fetch all sales invoices
  const { data: allSalesInvoices } = await supabase
    .from("invoices")
    .select("id, party_ledger_id, outstanding_amount")
    .eq("company_id", companyId)
    .eq("invoice_type", "sales")
    .is("deleted_at", null);

  if (!allSalesInvoices || allSalesInvoices.length === 0) {
    console.log("✅ No sales invoices found. Skipping...\n");
    return [];
  }

  // Get sales invoice IDs
  const salesInvoiceIds = allSalesInvoices.map((inv) => inv.id);

  // Fetch existing payment receipts for sales invoices
  const { data: existingReceipts } = await supabase
    .from("payments")
    .select("id, slug, voucher_type, is_cancelled")
    .eq("company_id", companyId)
    .eq("voucher_type", "receipt");

  // Get payment allocations to filter receipts linked to sales invoices
  const existingReceiptIds = existingReceipts?.map((r) => r.id) || [];
  const { data: receiptAllocations } = await supabase
    .from("payment_allocations")
    .select("payment_id, invoice_id")
    .in("payment_id", existingReceiptIds)
    .in("invoice_id", salesInvoiceIds);

  const linkedReceiptIds = new Set(
    receiptAllocations?.map((a) => a.payment_id) || [],
  );
  const existingSalesReceipts =
    existingReceipts?.filter((r) => linkedReceiptIds.has(r.id)) || [];

  const existingCount = existingSalesReceipts.length;

  // Filter eligible invoices (outstanding > 0)
  const eligibleInvoices = allSalesInvoices.filter(
    (inv) => roundTo2(inv.outstanding_amount || 0) > 0,
  );

  // Calculate target count
  const targetCount = Math.floor(
    eligibleInvoices.length * config.paymentReceiptRate,
  );

  if (existingCount >= targetCount) {
    console.log(
      `✅ Sufficient payment receipts already exist (${existingCount})\n`,
    );
    return existingSalesReceipts;
  }

  const toCreate = targetCount - existingCount;
  console.log(
    `💵 Creating ${toCreate} new payment receipts (${existingCount} already exist)...`,
  );

  // Select random invoices to pay
  const shuffled = [...eligibleInvoices].sort(() => Math.random() - 0.5);
  const selectedInvoices = shuffled.slice(0, toCreate);

  const createdSlugs: string[] = [];
  let successCount = 0;

  for (const invoice of selectedInvoices) {
    // Payment mode
    const paymentMode = generatePaymentMode(config);

    // Counter ledger MUST match payment mode
    const counterLedgerId =
      paymentMode === "cash" ? paymentLedgers.cash.id : paymentLedgers.bank.id;

    // Full or partial payment
    const isFullPayment = Math.random() < config.fullPaymentRate;
    const totalAmount = isFullPayment
      ? invoice.outstanding_amount || 0
      : (invoice.outstanding_amount || 0) *
        randomFloat(
          config.partialPaymentRange[0],
          config.partialPaymentRange[1],
        );

    if (totalAmount <= 0) continue;

    // Payment date (1-60 days in the past)
    const paymentDate = new Date();
    paymentDate.setDate(
      paymentDate.getDate() -
        randomInt(
          config.paymentDateOffsetDays.min,
          config.paymentDateOffsetDays.max,
        ),
    );
    const formattedDate = paymentDate.toISOString().split("T")[0];

    // Generate payment mode-specific details
    const paymentModeDetails = generatePaymentModeDetails(
      paymentMode,
      paymentDate,
      config,
    );

    // Allocation: single invoice (against_ref)
    const allocations: PaymentAllocation[] = [
      {
        allocation_type: "against_ref",
        invoice_id: invoice.id,
        amount_applied: roundTo2(totalAmount),
      },
    ];

    // Create payment receipt
    const slug = await createSinglePayment(supabase, {
      companyId,
      userId,
      voucherType: "receipt",
      partyLedgerId: invoice.party_ledger_id,
      counterLedgerId,
      paymentMode,
      paymentDate: formattedDate,
      totalAmount,
      tdsApplicable: false, // No TDS for receipts
      tdsRate: 0,
      tdsLedgerId: null,
      allocations,
      paymentModeDetails,
    });

    if (slug) {
      createdSlugs.push(slug);
      successCount++;
    }

    if (successCount % 10 === 0) {
      console.log(
        `   ✅ Created ${successCount}/${toCreate} payment receipts...`,
      );
    }
  }

  console.log(`\n✨ Successfully created ${successCount} payment receipts!`);

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
      `💳 Cancelled ${cancelledCount} receipts (${Math.round((cancelledCount / successCount) * 100)}%)\n`,
    );
  }

  // Re-query to get all sales payment receipts
  const { data: allReceipts } = await supabase
    .from("payments")
    .select("id, slug, voucher_type, is_cancelled")
    .eq("company_id", companyId)
    .eq("voucher_type", "receipt")
    .order("created_at", { ascending: true });

  console.log(`📊 Total payment receipts: ${(allReceipts || []).length}\n`);

  return allReceipts || [];
}

/**
 * Generate payment made for purchase invoices
 * - 87.5% of purchase invoices get payments
 * - Full/partial payments (70% full, 30% partial)
 * - Payment modes: cash, cheque, neft, rtgs, upi, card
 * - TDS applicable: 15% of payments with rates [0.1%, 1%, 2%]
 * - Single invoice allocation
 * - 5% cancellation rate
 */
export async function generatePaymentMade(
  supabase: SupabaseClient<Database>,
  companyId: string,
  userId: string,
  config: typeof import("../config/payments.config").PAYMENTS_CONFIG,
  paymentLedgers: PaymentLedgers,
): Promise<PaymentResult[]> {
  console.log("\n💸 Generating payment made (purchase)...\n");

  if (!paymentLedgers.cash || !paymentLedgers.bank || !paymentLedgers.tds) {
    console.error("❌ Cash, Bank, or TDS ledger not found. Skipping...\n");
    return [];
  }

  // Fetch all purchase invoices
  const { data: allPurchaseInvoices } = await supabase
    .from("invoices")
    .select("id, party_ledger_id, outstanding_amount")
    .eq("company_id", companyId)
    .eq("invoice_type", "purchase")
    .is("deleted_at", null);

  if (!allPurchaseInvoices || allPurchaseInvoices.length === 0) {
    console.log("✅ No purchase invoices found. Skipping...\n");
    return [];
  }

  // Get purchase invoice IDs
  const purchaseInvoiceIds = allPurchaseInvoices.map((inv) => inv.id);

  // Fetch existing payments made for purchase invoices
  const { data: existingPayments } = await supabase
    .from("payments")
    .select("id, slug, voucher_type, is_cancelled")
    .eq("company_id", companyId)
    .eq("voucher_type", "payment");

  // Get payment allocations to filter payments linked to purchase invoices
  const existingPaymentIds = existingPayments?.map((p) => p.id) || [];
  const { data: paymentAllocations } = await supabase
    .from("payment_allocations")
    .select("payment_id, invoice_id")
    .in("payment_id", existingPaymentIds)
    .in("invoice_id", purchaseInvoiceIds);

  const linkedPaymentIds = new Set(
    paymentAllocations?.map((a) => a.payment_id) || [],
  );
  const existingPurchasePayments =
    existingPayments?.filter((p) => linkedPaymentIds.has(p.id)) || [];

  const existingCount = existingPurchasePayments.length;

  // Filter eligible invoices (outstanding > 0)
  const eligibleInvoices = allPurchaseInvoices.filter(
    (inv) => roundTo2(inv.outstanding_amount || 0) > 0,
  );

  // Calculate target count
  const targetCount = Math.floor(
    eligibleInvoices.length * config.paymentMadeRate,
  );

  if (existingCount >= targetCount) {
    console.log(
      `✅ Sufficient payment made already exist (${existingCount})\n`,
    );
    return existingPurchasePayments;
  }

  const toCreate = targetCount - existingCount;
  console.log(
    `💵 Creating ${toCreate} new payment made (${existingCount} already exist)...`,
  );

  // Select random invoices to pay
  const shuffled = [...eligibleInvoices].sort(() => Math.random() - 0.5);
  const selectedInvoices = shuffled.slice(0, toCreate);

  const createdSlugs: string[] = [];
  let successCount = 0;

  for (const invoice of selectedInvoices) {
    // Payment mode
    const paymentMode = generatePaymentMode(config);

    // Counter ledger MUST match payment mode
    const counterLedgerId =
      paymentMode === "cash" ? paymentLedgers.cash.id : paymentLedgers.bank.id;

    // Full or partial payment
    const isFullPayment = Math.random() < config.fullPaymentRate;
    const totalAmount = isFullPayment
      ? invoice.outstanding_amount || 0
      : (invoice.outstanding_amount || 0) *
        randomFloat(
          config.partialPaymentRange[0],
          config.partialPaymentRange[1],
        );

    if (totalAmount <= 0) continue;

    // TDS: 15% of purchase payments
    const tdsApplicable = Math.random() < config.tdsApplicableRate;
    const tdsRate = tdsApplicable
      ? config.tdsRates[randomInt(0, config.tdsRates.length - 1)]
      : 0;

    // Payment date (1-60 days in the past)
    const paymentDate = new Date();
    paymentDate.setDate(
      paymentDate.getDate() -
        randomInt(
          config.paymentDateOffsetDays.min,
          config.paymentDateOffsetDays.max,
        ),
    );
    const formattedDate = paymentDate.toISOString().split("T")[0];

    // Generate payment mode-specific details
    const paymentModeDetails = generatePaymentModeDetails(
      paymentMode,
      paymentDate,
      config,
    );

    // Allocation: single invoice (against_ref)
    const allocations: PaymentAllocation[] = [
      {
        allocation_type: "against_ref",
        invoice_id: invoice.id,
        amount_applied: roundTo2(totalAmount),
      },
    ];

    // Create payment made
    const slug = await createSinglePayment(supabase, {
      companyId,
      userId,
      voucherType: "payment",
      partyLedgerId: invoice.party_ledger_id,
      counterLedgerId,
      paymentMode,
      paymentDate: formattedDate,
      totalAmount,
      tdsApplicable,
      tdsRate,
      tdsLedgerId: tdsApplicable ? paymentLedgers.tds.id : null,
      allocations,
      paymentModeDetails,
    });

    if (slug) {
      createdSlugs.push(slug);
      successCount++;
    }

    if (successCount % 10 === 0) {
      console.log(`   ✅ Created ${successCount}/${toCreate} payment made...`);
    }
  }

  console.log(`\n✨ Successfully created ${successCount} payment made!`);

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
      `💳 Cancelled ${cancelledCount} payments (${Math.round((cancelledCount / successCount) * 100)}%)\n`,
    );
  }

  // Re-query to get all purchase payments made
  const { data: allPayments } = await supabase
    .from("payments")
    .select("id, slug, voucher_type, is_cancelled")
    .eq("company_id", companyId)
    .eq("voucher_type", "payment")
    .order("created_at", { ascending: true });

  console.log(`📊 Total payment made: ${(allPayments || []).length}\n`);

  return allPayments || [];
}
