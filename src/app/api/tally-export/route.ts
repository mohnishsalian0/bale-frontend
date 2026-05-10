import { NextResponse } from "next/server";
import { zipSync, strToU8 } from "fflate";

import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { tallyExportSchema } from "@/lib/validations/tally-export";
import {
  buildAdjustmentNotesForExportQuery,
  buildInvoicesForExportQuery,
  buildLedgersForExportQuery,
  buildPaymentsForExportQuery,
} from "@/lib/queries/tally-export";
import { buildMastersXml } from "@/lib/tally/masters";
import {
  buildTransactionsXml,
  type AdjustmentNoteForExport,
  type InvoiceForExport,
  type PaymentAllocationForExport,
  type PaymentForExport,
} from "@/lib/tally/vouchers";
import type { LedgerForExport } from "@/lib/tally/masters";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = tallyExportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const { date_from, date_to } = parsed.data;
  const supabase = await createClient();

  // Fetch company name for the XML envelope (SVCURRENTCOMPANY).
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", user.company_id)
    .single();

  if (companyError || !company) {
    return NextResponse.json(
      { error: "Could not load company" },
      { status: 500 },
    );
  }

  // Fetch all four datasets in parallel under the user's RLS.
  const [ledgersRes, invoicesRes, paymentsRes, adjustmentsRes] =
    await Promise.all([
      buildLedgersForExportQuery(supabase),
      buildInvoicesForExportQuery(supabase, date_from, date_to),
      buildPaymentsForExportQuery(supabase, date_from, date_to),
      buildAdjustmentNotesForExportQuery(supabase, date_from, date_to),
    ]);

  const firstError =
    ledgersRes.error ||
    invoicesRes.error ||
    paymentsRes.error ||
    adjustmentsRes.error;
  if (firstError) {
    return NextResponse.json(
      { error: `Data fetch failed: ${firstError.message}` },
      { status: 500 },
    );
  }

  const ledgers = (ledgersRes.data ?? []) as LedgerForExport[];
  const invoices = ((invoicesRes.data ?? []) as unknown[])
    .map(normalizeInvoice)
    .filter((inv): inv is InvoiceForExport => inv !== null);
  const payments = ((paymentsRes.data ?? []) as unknown[])
    .map(normalizePayment)
    .filter((p): p is PaymentForExport => p !== null);
  const adjustmentNotes = ((adjustmentsRes.data ?? []) as unknown[])
    .map(normalizeAdjustmentNote)
    .filter((n): n is AdjustmentNoteForExport => n !== null);

  const masters = buildMastersXml(ledgers, company.name);
  const transactions = buildTransactionsXml({
    invoices,
    payments,
    adjustmentNotes,
    companyName: company.name,
  });

  // Stamp exported_to_tally_at for rows that haven't been exported yet so
  // the DB's prevent_*_edit / prevent_*_delete triggers engage. Rows already
  // stamped are left alone so re-exports don't refresh the lock date.
  const invoiceIds = invoices.map((i) => i.id);
  const paymentIds = payments.map((p) => p.id);
  const adjustmentIds = adjustmentNotes.map((n) => n.id);
  const nowIso = new Date().toISOString();

  await Promise.all([
    invoiceIds.length > 0
      ? supabase
          .from("invoices")
          .update({
            exported_to_tally_at: nowIso,
            tally_export_status: "exported",
          })
          .in("id", invoiceIds)
          .is("exported_to_tally_at", null)
      : Promise.resolve({ error: null }),
    paymentIds.length > 0
      ? supabase
          .from("payments")
          .update({ exported_to_tally_at: nowIso })
          .in("id", paymentIds)
          .is("exported_to_tally_at", null)
      : Promise.resolve({ error: null }),
    adjustmentIds.length > 0
      ? supabase
          .from("adjustment_notes")
          .update({ exported_to_tally_at: nowIso })
          .in("id", adjustmentIds)
          .is("exported_to_tally_at", null)
      : Promise.resolve({ error: null }),
  ]);

  const zip = zipSync({
    "masters.xml": strToU8(masters),
    "transactions.xml": strToU8(transactions),
  });

  const filename = `tally-export-${date_from}_to_${date_to}.zip`;
  // Copy into a standalone ArrayBuffer so it satisfies Response's BodyInit.
  const bodyBuffer = new ArrayBuffer(zip.byteLength);
  new Uint8Array(bodyBuffer).set(zip);

  return new Response(bodyBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(zip.byteLength),
    },
  });
}

// ============================================================================
// Normalizers: Supabase returns joined rows; coerce to our typed shapes and
// drop rows missing data we require for XML output.
// ============================================================================

function normalizeInvoice(raw: unknown): InvoiceForExport | null {
  const r = raw as Record<string, unknown>;
  if (typeof r.tally_guid !== "string" || r.tally_guid.length === 0) return null;
  return {
    id: String(r.id),
    tally_guid: r.tally_guid,
    invoice_number: String(r.invoice_number ?? ""),
    invoice_date: String(r.invoice_date ?? ""),
    invoice_type: r.invoice_type as "sales" | "purchase",
    taxable_amount: (r.taxable_amount as number | null) ?? null,
    total_cgst_amount: (r.total_cgst_amount as number | null) ?? null,
    total_sgst_amount: (r.total_sgst_amount as number | null) ?? null,
    total_igst_amount: (r.total_igst_amount as number | null) ?? null,
    total_amount: (r.total_amount as number | null) ?? null,
    round_off_amount: (r.round_off_amount as number | null) ?? null,
    party_ledger_name: (r.party_ledger_name as string | null) ?? null,
    counter_ledger_name: (r.counter_ledger_name as string | null) ?? null,
    is_cancelled: Boolean(r.is_cancelled),
  };
}

function normalizePayment(raw: unknown): PaymentForExport | null {
  const r = raw as Record<string, unknown>;
  if (typeof r.tally_guid !== "string" || r.tally_guid.length === 0) return null;

  const allocationsRaw = (r.payment_allocations as unknown[]) ?? [];
  const allocations: PaymentAllocationForExport[] = allocationsRaw.map((a) => {
    const ar = a as Record<string, unknown>;
    const invoiceJoin = ar.invoice as Record<string, unknown> | null;
    return {
      amount_applied: Number(ar.amount_applied ?? 0),
      allocation_type: String(ar.allocation_type ?? ""),
      is_cancelled: Boolean(ar.is_cancelled),
      invoice: invoiceJoin
        ? { invoice_number: String(invoiceJoin.invoice_number ?? "") }
        : null,
    };
  });

  const partyLedger = r.party_ledger as Record<string, unknown> | null;
  const counterLedger = r.counter_ledger as Record<string, unknown> | null;
  const tdsLedger = r.tds_ledger as Record<string, unknown> | null;

  return {
    id: String(r.id),
    tally_guid: r.tally_guid,
    payment_number: String(r.payment_number ?? ""),
    payment_date: String(r.payment_date ?? ""),
    voucher_type: r.voucher_type as "payment" | "receipt",
    total_amount: Number(r.total_amount ?? 0),
    tds_amount: (r.tds_amount as number | null) ?? null,
    net_amount: (r.net_amount as number | null) ?? null,
    tds_applicable: (r.tds_applicable as boolean | null) ?? false,
    instrument_number: (r.instrument_number as string | null) ?? null,
    transaction_id: (r.transaction_id as string | null) ?? null,
    is_cancelled: Boolean(r.is_cancelled),
    party_ledger: partyLedger
      ? { name: String(partyLedger.name ?? "") }
      : null,
    counter_ledger: counterLedger
      ? { name: String(counterLedger.name ?? "") }
      : null,
    tds_ledger: tdsLedger ? { name: String(tdsLedger.name ?? "") } : null,
    payment_allocations: allocations,
  };
}

function normalizeAdjustmentNote(raw: unknown): AdjustmentNoteForExport | null {
  const r = raw as Record<string, unknown>;
  if (typeof r.tally_guid !== "string" || r.tally_guid.length === 0) return null;

  const invoiceJoin = r.invoice as Record<string, unknown> | null;

  return {
    id: String(r.id),
    tally_guid: r.tally_guid,
    adjustment_number: String(r.adjustment_number ?? ""),
    adjustment_date: String(r.adjustment_date ?? ""),
    adjustment_type: r.adjustment_type as "credit" | "debit",
    subtotal_amount: (r.subtotal_amount as number | null) ?? null,
    total_cgst_amount: (r.total_cgst_amount as number | null) ?? null,
    total_sgst_amount: (r.total_sgst_amount as number | null) ?? null,
    total_igst_amount: (r.total_igst_amount as number | null) ?? null,
    total_amount: (r.total_amount as number | null) ?? null,
    round_off_amount: (r.round_off_amount as number | null) ?? null,
    party_ledger_name: (r.party_ledger_name as string | null) ?? null,
    counter_ledger_name: (r.counter_ledger_name as string | null) ?? null,
    is_cancelled: Boolean(r.is_cancelled),
    invoice: invoiceJoin
      ? {
          invoice_number: String(invoiceJoin.invoice_number ?? ""),
          invoice_type: invoiceJoin.invoice_type as "sales" | "purchase",
        }
      : null,
  };
}
