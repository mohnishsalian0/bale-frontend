/**
 * Invoices Module
 * Handles sales and purchase invoice generation with idempotent pattern
 *
 * Migrated from load-setup.ts (lines 1749-2372)
 * - Creates invoices from sales/purchase orders
 * - Calculates tax and applies discounts
 * - Associates with goods movements
 * - Adds additional charges inline
 * - RPC: create_invoice_with_items
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database/supabase";
import { randomInt, randomFloat, getRandomDate } from "../modules/shared";
import { INVOICES_CONFIG } from "../config/invoices.config";

// ============================================================================
// TYPES
// ============================================================================

export interface InvoiceResult {
  id: string;
  sequence_number: number | null;
  invoice_type: "sales" | "purchase";
  tax_type: "gst" | "igst" | "no_tax";
  outstanding_amount: number;
}

interface ChargeLedgers {
  freightOutward?: { id: string };
  freightInward?: { id: string };
  packaging?: { id: string };
  agentCommission?: { id: string };
  handling?: { id: string };
  loadingUnloading?: { id: string };
  labour?: { id: string };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Select goods movements that belong to a specific order
 * For sales: filter goods_outwards by sales_order_id
 * For purchase: filter goods_inwards by purchase_order_id
 */
async function selectGoodsMovementsFromOrder(
  supabase: SupabaseClient<Database>,
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
 * Generate additional charges data for an invoice
 * Returns JSONB array to be passed to RPC function
 */
function generateAdditionalChargesData(
  invoiceType: "sales" | "purchase",
  chargeLedgers: ChargeLedgers,
  companyId: string,
): Array<{ ledger_id: string; charge_type: string; charge_value: number }> {
  const charges: Array<{
    ledger_id: string;
    charge_type: string;
    charge_value: number;
  }> = [];

  // Decide if this invoice gets additional charges
  if (Math.random() > INVOICES_CONFIG.additionalChargesRate) {
    return charges;
  }

  if (invoiceType === "sales") {
    // Freight Outward (60% chance, flat amount)
    if (
      chargeLedgers.freightOutward &&
      Math.random() < INVOICES_CONFIG.additionalCharges.sales.freightOutward
    ) {
      charges.push({
        ledger_id: chargeLedgers.freightOutward.id,
        charge_type: "flat_amount",
        charge_value: randomFloat(500, 2000, 2),
      });
    }

    // Packaging Charges (45% chance, percentage OR flat)
    if (
      chargeLedgers.packaging &&
      Math.random() < INVOICES_CONFIG.additionalCharges.sales.packaging
    ) {
      const isPercentage = Math.random() < 0.5;
      charges.push({
        ledger_id: chargeLedgers.packaging.id,
        charge_type: isPercentage ? "percentage" : "flat_amount",
        charge_value: isPercentage
          ? randomFloat(2, 3, 2) // 2-3%
          : randomFloat(200, 500, 2), // ₹200-500
      });
    }

    // Agent Commission (50% chance, percentage)
    if (
      chargeLedgers.agentCommission &&
      Math.random() < INVOICES_CONFIG.additionalCharges.sales.agentCommission
    ) {
      charges.push({
        ledger_id: chargeLedgers.agentCommission.id,
        charge_type: "percentage",
        charge_value: randomFloat(2, 5, 2), // 2-5%
      });
    }

    // Handling Charges (30% chance, flat amount)
    if (
      chargeLedgers.handling &&
      Math.random() < INVOICES_CONFIG.additionalCharges.sales.handling
    ) {
      charges.push({
        ledger_id: chargeLedgers.handling.id,
        charge_type: "flat_amount",
        charge_value: randomFloat(300, 1000, 2),
      });
    }
  } else {
    // PURCHASE INVOICE CHARGES
    // Freight Inward (65% chance, flat amount)
    if (
      chargeLedgers.freightInward &&
      Math.random() < INVOICES_CONFIG.additionalCharges.purchase.freightInward
    ) {
      charges.push({
        ledger_id: chargeLedgers.freightInward.id,
        charge_type: "flat_amount",
        charge_value: randomFloat(800, 3000, 2),
      });
    }

    // Loading/Unloading Charges (45% chance, flat amount)
    if (
      chargeLedgers.loadingUnloading &&
      Math.random() <
        INVOICES_CONFIG.additionalCharges.purchase.loadingUnloading
    ) {
      charges.push({
        ledger_id: chargeLedgers.loadingUnloading.id,
        charge_type: "flat_amount",
        charge_value: randomFloat(300, 1000, 2),
      });
    }

    // Labour Charges (40% chance, flat amount)
    if (
      chargeLedgers.labour &&
      Math.random() < INVOICES_CONFIG.additionalCharges.purchase.labour
    ) {
      charges.push({
        ledger_id: chargeLedgers.labour.id,
        charge_type: "flat_amount",
        charge_value: randomFloat(500, 1500, 2),
      });
    }

    // Handling Charges (30% chance, flat amount)
    if (
      chargeLedgers.handling &&
      Math.random() < INVOICES_CONFIG.additionalCharges.purchase.handling
    ) {
      charges.push({
        ledger_id: chargeLedgers.handling.id,
        charge_type: "flat_amount",
        charge_value: randomFloat(400, 1000, 2),
      });
    }

    // Packaging Charges (25% chance, flat amount - for import/special packaging)
    if (
      chargeLedgers.packaging &&
      Math.random() < INVOICES_CONFIG.additionalCharges.purchase.packaging
    ) {
      charges.push({
        ledger_id: chargeLedgers.packaging.id,
        charge_type: "flat_amount",
        charge_value: randomFloat(500, 1200, 2),
      });
    }
  }

  return charges;
}

/**
 * Create a single invoice (deduplicated logic for sales and purchase)
 */
async function createSingleInvoice(
  supabase: SupabaseClient<Database>,
  params: {
    companyId: string;
    userId: string;
    invoiceType: "sales" | "purchase";
    order: any;
    partyLedgerId: string;
    counterLedgerId: string;
    year: number;
    chargeLedgers: ChargeLedgers;
  },
): Promise<InvoiceResult | null> {
  const {
    companyId,
    userId,
    invoiceType,
    order,
    partyLedgerId,
    counterLedgerId,
    year,
    chargeLedgers,
  } = params;

  const invoiceDate = getRandomDate(randomInt(1, 12), year);
  const dueInDays =
    invoiceType === "sales" ? randomInt(15, 45) : randomInt(15, 60);
  const dueDateObj = new Date(invoiceDate);
  dueDateObj.setDate(dueDateObj.getDate() + dueInDays);
  const dueDate = dueDateObj.toISOString().split("T")[0];

  // Tax type distribution from config
  const taxRoll = Math.random();
  let taxType: "gst" | "igst" | "no_tax";
  if (taxRoll < INVOICES_CONFIG.taxDistribution.gst) {
    taxType = "gst";
  } else if (
    taxRoll <
    INVOICES_CONFIG.taxDistribution.gst + INVOICES_CONFIG.taxDistribution.igst
  ) {
    taxType = "igst";
  } else {
    taxType = "no_tax";
  }

  // Discount distribution from config
  const discountConfig =
    invoiceType === "sales" ? INVOICES_CONFIG.sales : INVOICES_CONFIG.purchase;
  const discountRoll = Math.random();
  let discountType: "none" | "percentage" | "flat_amount";
  let discountValue = 0;

  if (discountRoll < discountConfig.discountDistribution.percentage) {
    discountType = "percentage";
    discountValue = randomFloat(
      discountConfig.discountPercentageRange[0],
      discountConfig.discountPercentageRange[1],
      0,
    );
  } else if (
    discountRoll <
    discountConfig.discountDistribution.percentage +
      discountConfig.discountDistribution.flat_amount
  ) {
    discountType = "flat_amount";
    discountValue = randomFloat(
      discountConfig.discountFlatRange[0],
      discountConfig.discountFlatRange[1],
      0,
    );
  } else {
    discountType = "none";
  }

  // Get goods movements (if applicable)
  let goodsMovementIds: string[] | null = null;
  if (Math.random() < INVOICES_CONFIG.goodsMovementLinkRate) {
    goodsMovementIds = await selectGoodsMovementsFromOrder(
      supabase,
      order.id,
      invoiceType,
    );
    if (goodsMovementIds.length === 0) goodsMovementIds = null;
  }

  // Prepare items
  const orderItems =
    invoiceType === "sales"
      ? order.sales_order_items || []
      : order.purchase_order_items || [];

  const items = orderItems.map((item: any) => ({
    product_id: item.product_id,
    quantity: item.required_quantity,
    rate: item.unit_rate,
  }));

  // Generate additional charges data
  const additionalCharges = generateAdditionalChargesData(
    invoiceType,
    chargeLedgers,
    companyId,
  );

  // Payment terms
  const paymentTermsOptions =
    invoiceType === "sales"
      ? ["15 days net", "30 days net", "Cash on delivery"]
      : ["15 days net", "30 days net", "45 days net", "60 days net"];

  // Supplier invoice details (purchase only)
  let supplierInvoiceNumber: string | undefined = undefined;
  let supplierInvoiceDate: string | undefined = undefined;
  if (invoiceType === "purchase") {
    supplierInvoiceNumber = `SUP-INV-${year}-${String(randomInt(1000, 9999)).padStart(4, "0")}`;
    supplierInvoiceDate = invoiceDate;
  }

  // Create invoice using RPC
  const { data: invoiceSlug, error: rpcError } = await supabase.rpc(
    "create_invoice_with_items",
    {
      p_invoice_type: invoiceType,
      p_party_ledger_id: partyLedgerId,
      p_counter_ledger_id: counterLedgerId,
      p_warehouse_id: order.warehouse_id,
      p_invoice_date: invoiceDate,
      p_payment_terms:
        paymentTermsOptions[randomInt(0, paymentTermsOptions.length - 1)],
      p_due_date: dueDate,
      p_tax_type: taxType,
      p_discount_type: discountType,
      p_discount_value: discountValue,
      p_supplier_invoice_number: supplierInvoiceNumber,
      p_supplier_invoice_date: supplierInvoiceDate,
      p_notes: `Auto-generated test data (${invoiceType})`,
      p_attachments: [],
      p_items: items,
      p_source_sales_order_id: invoiceType === "sales" ? order.id : null,
      p_source_purchase_order_id: invoiceType === "purchase" ? order.id : null,
      p_goods_movement_ids: goodsMovementIds || undefined,
      p_additional_charges:
        additionalCharges.length > 0 ? additionalCharges : undefined,
      p_company_id: companyId,
    },
  );

  if (rpcError) {
    console.error(
      `   ❌ Failed to create ${invoiceType} invoice: ${rpcError.message}`,
    );
    return null;
  }

  // Get created invoice
  const { data: createdInvoice } = await supabase
    .from("invoices")
    .select("id, sequence_number, invoice_type, tax_type, outstanding_amount")
    .eq("company_id", companyId)
    .eq("slug", invoiceSlug)
    .single();

  if (!createdInvoice) return null;

  // Ensure non-null values for required fields
  return {
    id: createdInvoice.id,
    sequence_number: createdInvoice.sequence_number,
    invoice_type: createdInvoice.invoice_type,
    tax_type: createdInvoice.tax_type || "no_tax",
    outstanding_amount: createdInvoice.outstanding_amount || 0,
  };
}

// ============================================================================
// SALES INVOICES GENERATION
// ============================================================================

/**
 * Generate sales invoices with idempotent pattern
 */
export async function generateSalesInvoices(
  supabase: SupabaseClient<Database>,
  companyId: string,
  userId: string,
  year: number,
  chargeLedgers: ChargeLedgers,
): Promise<InvoiceResult[]> {
  console.log(`\n📄 Generating sales invoices for year ${year}...\n`);

  // Fetch existing sales invoices
  const { data: existingInvoices, error: fetchError } = await supabase
    .from("invoices")
    .select("id, sequence_number, invoice_type, tax_type, outstanding_amount")
    .eq("company_id", companyId)
    .eq("invoice_type", "sales")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (fetchError) {
    console.error("❌ Error fetching existing sales invoices:", fetchError);
    throw fetchError;
  }

  const existingSalesInvoices = existingInvoices || [];

  // Fetch all sales orders
  const { data: allSalesOrders, error: soFetchError } = await supabase
    .from("sales_orders")
    .select(
      `
      id,
      order_date,
      customer_id,
      warehouse_id,
      sales_order_items (
        product_id,
        required_quantity,
        unit_rate
      )
    `,
    )
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (soFetchError || !allSalesOrders) {
    console.error("❌ Failed to fetch sales orders:", soFetchError);
    throw soFetchError;
  }

  const targetCount = Math.floor(
    allSalesOrders.length * INVOICES_CONFIG.salesInvoiceRate,
  );
  const toCreate = Math.max(0, targetCount - existingSalesInvoices.length);

  console.log(
    `📝 Creating ${toCreate} new sales invoices (${existingSalesInvoices.length} already exist)...`,
  );

  if (toCreate === 0) {
    console.log("✨ All sales invoices already exist!\n");
    return [];
  }

  // Get customer ledgers (Sundry Debtors)
  const { data: sundryDebtorsParentGroup } = await supabase
    .from("parent_groups")
    .select("id")
    .eq("name", "Sundry Debtors")
    .single();

  if (!sundryDebtorsParentGroup) {
    console.error("❌ Sundry Debtors parent group not found.");
    return [];
  }

  const { data: customerLedgersList } = await supabase
    .from("ledgers")
    .select("id, partner_id")
    .eq("company_id", companyId)
    .eq("ledger_type", "party")
    .eq("parent_group_id", sundryDebtorsParentGroup.id);

  // Get default Sales ledger
  const { data: salesLedger } = await supabase
    .from("ledgers")
    .select("id")
    .eq("company_id", companyId)
    .eq("name", "Sales")
    .eq("is_default", true)
    .single();

  if (
    !customerLedgersList ||
    customerLedgersList.length === 0 ||
    !salesLedger
  ) {
    console.error("❌ Missing customer ledgers or Sales ledger.");
    return [];
  }

  const ordersToProcess = allSalesOrders.slice(
    existingSalesInvoices.length,
    existingSalesInvoices.length + toCreate,
  );

  const createdInvoices: InvoiceResult[] = [];

  for (const order of ordersToProcess) {
    const customerLedger = customerLedgersList.find(
      (l) => l.partner_id === (order as any).customer_id,
    );

    if (!customerLedger) {
      console.error(
        `❌ Missing ledger for customer ${(order as any).customer_id}. Skipping.`,
      );
      continue;
    }

    const invoice = await createSingleInvoice(supabase, {
      companyId,
      userId,
      invoiceType: "sales",
      order,
      partyLedgerId: customerLedger.id,
      counterLedgerId: salesLedger.id,
      year,
      chargeLedgers,
    });

    if (invoice) {
      createdInvoices.push(invoice);
      if (createdInvoices.length % 10 === 0) {
        console.log(
          `   ✅ Created ${createdInvoices.length}/${toCreate} sales invoices...`,
        );
      }
    }
  }

  console.log(
    `\n✨ Successfully created ${createdInvoices.length} sales invoices!\n`,
  );

  return createdInvoices;
}

// ============================================================================
// PURCHASE INVOICES GENERATION
// ============================================================================

/**
 * Generate purchase invoices with idempotent pattern
 */
export async function generatePurchaseInvoices(
  supabase: SupabaseClient<Database>,
  companyId: string,
  userId: string,
  year: number,
  chargeLedgers: ChargeLedgers,
): Promise<InvoiceResult[]> {
  console.log(`\n📄 Generating purchase invoices for year ${year}...\n`);

  // Fetch existing purchase invoices
  const { data: existingInvoices, error: fetchError } = await supabase
    .from("invoices")
    .select("id, sequence_number, invoice_type, tax_type, outstanding_amount")
    .eq("company_id", companyId)
    .eq("invoice_type", "purchase")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (fetchError) {
    console.error("❌ Error fetching existing purchase invoices:", fetchError);
    throw fetchError;
  }

  const existingPurchaseInvoices = existingInvoices || [];

  // Fetch all purchase orders
  const { data: allPurchaseOrders, error: poFetchError } = await supabase
    .from("purchase_orders")
    .select(
      `
      id,
      order_date,
      supplier_id,
      warehouse_id,
      purchase_order_items (
        product_id,
        required_quantity,
        unit_rate
      )
    `,
    )
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (poFetchError || !allPurchaseOrders) {
    console.error("❌ Failed to fetch purchase orders:", poFetchError);
    throw poFetchError;
  }

  const targetCount = Math.floor(
    allPurchaseOrders.length * INVOICES_CONFIG.purchaseInvoiceRate,
  );
  const toCreate = Math.max(0, targetCount - existingPurchaseInvoices.length);

  console.log(
    `📝 Creating ${toCreate} new purchase invoices (${existingPurchaseInvoices.length} already exist)...`,
  );

  if (toCreate === 0) {
    console.log("✨ All purchase invoices already exist!\n");
    return [];
  }

  // Get supplier ledgers (Sundry Creditors)
  const { data: sundryCreditorsParentGroup } = await supabase
    .from("parent_groups")
    .select("id")
    .eq("name", "Sundry Creditors")
    .single();

  if (!sundryCreditorsParentGroup) {
    console.error("❌ Sundry Creditors parent group not found.");
    return [];
  }

  const { data: supplierLedgersList } = await supabase
    .from("ledgers")
    .select("id, partner_id")
    .eq("company_id", companyId)
    .eq("ledger_type", "party")
    .eq("parent_group_id", sundryCreditorsParentGroup.id);

  // Get default Purchase ledger
  const { data: purchaseLedger } = await supabase
    .from("ledgers")
    .select("id")
    .eq("company_id", companyId)
    .eq("name", "Purchase")
    .eq("is_default", true)
    .single();

  if (
    !supplierLedgersList ||
    supplierLedgersList.length === 0 ||
    !purchaseLedger
  ) {
    console.error("❌ Missing supplier ledgers or Purchase ledger.");
    return [];
  }

  const ordersToProcess = allPurchaseOrders.slice(
    existingPurchaseInvoices.length,
    existingPurchaseInvoices.length + toCreate,
  );

  const createdInvoices: InvoiceResult[] = [];

  for (const order of ordersToProcess) {
    const supplierLedger = supplierLedgersList.find(
      (l) => l.partner_id === (order as any).supplier_id,
    );

    if (!supplierLedger) {
      console.error(
        `❌ Missing ledger for supplier ${(order as any).supplier_id}. Skipping.`,
      );
      continue;
    }

    const invoice = await createSingleInvoice(supabase, {
      companyId,
      userId,
      invoiceType: "purchase",
      order,
      partyLedgerId: supplierLedger.id,
      counterLedgerId: purchaseLedger.id,
      year,
      chargeLedgers,
    });

    if (invoice) {
      createdInvoices.push(invoice);
      if (createdInvoices.length % 10 === 0) {
        console.log(
          `   ✅ Created ${createdInvoices.length}/${toCreate} purchase invoices...`,
        );
      }
    }
  }

  console.log(
    `\n✨ Successfully created ${createdInvoices.length} purchase invoices!\n`,
  );

  return createdInvoices;
}

// ============================================================================
// CHARGE LEDGERS HELPER
// ============================================================================

/**
 * Fetch charge ledgers once for reuse
 */
export async function fetchChargeLedgers(
  supabase: SupabaseClient<Database>,
  companyId: string,
): Promise<ChargeLedgers> {
  const { data: chargeLedgers, error: ledgerError } = await supabase
    .from("ledgers")
    .select("id, name, system_name")
    .eq("company_id", companyId)
    .in("system_name", [
      "freight_outward",
      "freight_inward",
      "packaging_charges",
      "agent_commission",
      "handling_charges",
      "loading_unloading_charges",
      "labour_charges",
    ]);

  if (ledgerError || !chargeLedgers || chargeLedgers.length === 0) {
    console.error("❌ No charge ledgers found.");
    throw ledgerError || new Error("No charge ledgers found");
  }

  return {
    freightOutward: chargeLedgers.find(
      (l) => l.system_name === "freight_outward",
    ),
    freightInward: chargeLedgers.find(
      (l) => l.system_name === "freight_inward",
    ),
    packaging: chargeLedgers.find((l) => l.system_name === "packaging_charges"),
    agentCommission: chargeLedgers.find(
      (l) => l.system_name === "agent_commission",
    ),
    handling: chargeLedgers.find((l) => l.system_name === "handling_charges"),
    loadingUnloading: chargeLedgers.find(
      (l) => l.system_name === "loading_unloading_charges",
    ),
    labour: chargeLedgers.find((l) => l.system_name === "labour_charges"),
  };
}
