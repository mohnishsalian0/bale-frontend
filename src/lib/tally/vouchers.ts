import {
  envelope,
  escapeXml,
  formatTallyAmount,
  formatTallyDate,
  tag,
  tallyMessage,
} from "./xml";

// ============================================================================
// Tax ledger name resolution
// ============================================================================
// Bale currently uses a single general ledger per tax type (one CGST, one SGST,
// one IGST — no rate split). When rate-specific ledgers are introduced later,
// change only this helper.
const TAX_LEDGER_NAMES = {
  cgst: "CGST",
  sgst: "SGST",
  igst: "IGST",
} as const;

function taxLedgerName(kind: "cgst" | "sgst" | "igst"): string {
  return TAX_LEDGER_NAMES[kind];
}

// ============================================================================
// Input shapes — defined here so queries can be built against them
// ============================================================================

export interface InvoiceForExport {
  id: string;
  tally_guid: string;
  invoice_number: string;
  invoice_date: string;
  invoice_type: "sales" | "purchase";
  taxable_amount: number | null;
  total_cgst_amount: number | null;
  total_sgst_amount: number | null;
  total_igst_amount: number | null;
  total_amount: number | null;
  round_off_amount: number | null;
  party_ledger_name: string | null;
  counter_ledger_name: string | null;
  is_cancelled: boolean;
}

export interface PaymentAllocationForExport {
  amount_applied: number;
  allocation_type: string;
  is_cancelled: boolean;
  invoice: {
    invoice_number: string;
  } | null;
}

export interface PaymentForExport {
  id: string;
  tally_guid: string;
  payment_number: string;
  payment_date: string;
  voucher_type: "payment" | "receipt";
  total_amount: number;
  tds_amount: number | null;
  net_amount: number | null;
  tds_applicable: boolean | null;
  instrument_number: string | null;
  transaction_id: string | null;
  is_cancelled: boolean;
  party_ledger: { name: string } | null;
  counter_ledger: { name: string } | null;
  tds_ledger: { name: string } | null;
  payment_allocations: PaymentAllocationForExport[];
}

export interface AdjustmentNoteForExport {
  id: string;
  tally_guid: string;
  adjustment_number: string;
  adjustment_date: string;
  adjustment_type: "credit" | "debit";
  subtotal_amount: number | null;
  total_cgst_amount: number | null;
  total_sgst_amount: number | null;
  total_igst_amount: number | null;
  total_amount: number | null;
  round_off_amount: number | null;
  party_ledger_name: string | null;
  counter_ledger_name: string | null;
  is_cancelled: boolean;
  invoice: {
    invoice_number: string;
    invoice_type: "sales" | "purchase";
  } | null;
}

// ============================================================================
// Ledger entry helpers
// ============================================================================

interface LedgerEntry {
  ledgerName: string;
  amount: number; // signed: negative = Dr, positive = Cr
  billAllocations?: Array<{
    billType: "New Ref" | "Agst Ref" | "On Account" | "Advance";
    name: string;
    amount: number;
  }>;
}

function num(n: number | string | null | undefined): number {
  if (n === null || n === undefined) return 0;
  const parsed = typeof n === "string" ? parseFloat(n) : n;
  return Number.isFinite(parsed) ? parsed : 0;
}

function ledgerEntryXml(entry: LedgerEntry, indent: string): string {
  const isDebit = entry.amount < 0;
  const parts: string[] = [];
  parts.push(`${indent}<ALLLEDGERENTRIES.LIST>`);
  parts.push(`${indent}  ${tag("LEDGERNAME", entry.ledgerName)}`);
  parts.push(`${indent}  ${tag("ISDEEMEDPOSITIVE", isDebit ? "Yes" : "No")}`);
  parts.push(`${indent}  ${tag("AMOUNT", formatTallyAmount(entry.amount))}`);

  if (entry.billAllocations && entry.billAllocations.length > 0) {
    for (const bill of entry.billAllocations) {
      parts.push(`${indent}  <BILLALLOCATIONS.LIST>`);
      parts.push(`${indent}    ${tag("NAME", bill.name)}`);
      parts.push(`${indent}    ${tag("BILLTYPE", bill.billType)}`);
      parts.push(`${indent}    ${tag("AMOUNT", formatTallyAmount(bill.amount))}`);
      parts.push(`${indent}  </BILLALLOCATIONS.LIST>`);
    }
  }

  parts.push(`${indent}</ALLLEDGERENTRIES.LIST>`);
  return parts.join("\n");
}

function voucherXml(args: {
  vchType: "Sales" | "Purchase" | "Receipt" | "Payment" | "Credit Note" | "Debit Note";
  guid: string;
  date: string;
  voucherNumber: string;
  partyLedgerName: string;
  narration?: string;
  entries: LedgerEntry[];
}): string {
  const indent = "          ";
  const dateFormatted = formatTallyDate(args.date);
  const parts: string[] = [];
  parts.push(
    `${indent}<VOUCHER VCHTYPE="${escapeXml(args.vchType)}" ACTION="Create" OBJVIEW="${args.vchType.includes("Note") || args.vchType === "Sales" || args.vchType === "Purchase" ? "Accounting Voucher View" : "Accounting Voucher View"}">`,
  );
  parts.push(`${indent}  ${tag("GUID", args.guid)}`);
  parts.push(`${indent}  ${tag("DATE", dateFormatted)}`);
  parts.push(`${indent}  ${tag("EFFECTIVEDATE", dateFormatted)}`);
  parts.push(`${indent}  ${tag("VOUCHERTYPENAME", args.vchType)}`);
  parts.push(`${indent}  ${tag("VOUCHERNUMBER", args.voucherNumber)}`);
  parts.push(`${indent}  ${tag("REFERENCE", args.voucherNumber)}`);
  parts.push(`${indent}  ${tag("PARTYLEDGERNAME", args.partyLedgerName)}`);
  if (args.narration) {
    parts.push(`${indent}  ${tag("NARRATION", args.narration)}`);
  }
  for (const entry of args.entries) {
    parts.push(ledgerEntryXml(entry, `${indent}  `));
  }
  parts.push(`${indent}</VOUCHER>`);
  return parts.join("\n");
}

// ============================================================================
// Invoice voucher builders (Sales / Purchase)
// ============================================================================

function buildInvoiceVoucher(invoice: InvoiceForExport): string | null {
  if (invoice.is_cancelled) return null;
  if (!invoice.party_ledger_name || !invoice.counter_ledger_name) return null;

  const isSales = invoice.invoice_type === "sales";
  const total = num(invoice.total_amount);
  const taxable = num(invoice.taxable_amount);
  const cgst = num(invoice.total_cgst_amount);
  const sgst = num(invoice.total_sgst_amount);
  const igst = num(invoice.total_igst_amount);
  const roundOff = num(invoice.round_off_amount);

  // For Sales: party is Dr (negative), income + taxes are Cr (positive)
  // For Purchase: party is Cr (positive), expense + taxes are Dr (negative)
  const partySign = isSales ? -1 : 1;
  const counterSign = isSales ? 1 : -1;

  const entries: LedgerEntry[] = [
    {
      ledgerName: invoice.party_ledger_name,
      amount: partySign * total,
      billAllocations: [
        {
          billType: "New Ref",
          name: invoice.invoice_number,
          amount: partySign * total,
        },
      ],
    },
    {
      ledgerName: invoice.counter_ledger_name,
      amount: counterSign * taxable,
    },
  ];

  if (cgst !== 0) {
    entries.push({
      ledgerName: taxLedgerName("cgst"),
      amount: counterSign * cgst,
    });
  }
  if (sgst !== 0) {
    entries.push({
      ledgerName: taxLedgerName("sgst"),
      amount: counterSign * sgst,
    });
  }
  if (igst !== 0) {
    entries.push({
      ledgerName: taxLedgerName("igst"),
      amount: counterSign * igst,
    });
  }
  if (roundOff !== 0) {
    entries.push({
      ledgerName: "Round Off",
      amount: counterSign * roundOff,
    });
  }

  return voucherXml({
    vchType: isSales ? "Sales" : "Purchase",
    guid: invoice.tally_guid,
    date: invoice.invoice_date,
    voucherNumber: invoice.invoice_number,
    partyLedgerName: invoice.party_ledger_name,
    entries,
  });
}

// ============================================================================
// Payment voucher builders (Payment / Receipt)
// ============================================================================

function buildPaymentVoucher(payment: PaymentForExport): string | null {
  if (payment.is_cancelled) return null;
  if (!payment.party_ledger?.name || !payment.counter_ledger?.name) return null;

  const isReceipt = payment.voucher_type === "receipt";
  const total = num(payment.total_amount);
  const tds = num(payment.tds_amount);
  const net = num(payment.net_amount ?? total);

  // Receipt: bank/cash is Dr (negative), party is Cr (positive)
  // Payment: party is Dr (negative), bank/cash is Cr (positive)
  const partySign = isReceipt ? 1 : -1;
  const counterSign = isReceipt ? -1 : 1;

  const partyAllocations = payment.payment_allocations
    .filter((a) => !a.is_cancelled)
    .map((a) => {
      if (a.allocation_type === "against_ref" && a.invoice?.invoice_number) {
        return {
          billType: "Agst Ref" as const,
          name: a.invoice.invoice_number,
          amount: partySign * num(a.amount_applied),
        };
      }
      if (a.allocation_type === "advance") {
        return {
          billType: "Advance" as const,
          name: payment.payment_number,
          amount: partySign * num(a.amount_applied),
        };
      }
      return {
        billType: "On Account" as const,
        name: payment.payment_number,
        amount: partySign * num(a.amount_applied),
      };
    });

  const allocatedTotal = partyAllocations.reduce(
    (sum, a) => sum + Math.abs(a.amount),
    0,
  );
  const unallocated = total - allocatedTotal;
  if (unallocated > 0.005) {
    partyAllocations.push({
      billType: "On Account",
      name: payment.payment_number,
      amount: partySign * unallocated,
    });
  }

  const entries: LedgerEntry[] = [
    {
      ledgerName: payment.party_ledger.name,
      amount: partySign * total,
      billAllocations:
        partyAllocations.length > 0 ? partyAllocations : undefined,
    },
    {
      ledgerName: payment.counter_ledger.name,
      amount: counterSign * net,
    },
  ];

  if (payment.tds_applicable && tds > 0 && payment.tds_ledger?.name) {
    entries.push({
      ledgerName: payment.tds_ledger.name,
      amount: counterSign * tds,
    });
  }

  const narrationBits = [
    payment.instrument_number && `Instrument: ${payment.instrument_number}`,
    payment.transaction_id && `Txn ID: ${payment.transaction_id}`,
  ].filter(Boolean) as string[];

  return voucherXml({
    vchType: isReceipt ? "Receipt" : "Payment",
    guid: payment.tally_guid,
    date: payment.payment_date,
    voucherNumber: payment.payment_number,
    partyLedgerName: payment.party_ledger.name,
    narration: narrationBits.join(" | ") || undefined,
    entries,
  });
}

// ============================================================================
// Adjustment note voucher builders (Credit Note / Debit Note)
// ============================================================================

function buildAdjustmentVoucher(note: AdjustmentNoteForExport): string | null {
  if (note.is_cancelled) return null;
  if (!note.party_ledger_name || !note.counter_ledger_name || !note.invoice) return null;

  const isCredit = note.adjustment_type === "credit";
  const total = num(note.total_amount);
  const taxable = num(note.subtotal_amount);
  const cgst = num(note.total_cgst_amount);
  const sgst = num(note.total_sgst_amount);
  const igst = num(note.total_igst_amount);
  const roundOff = num(note.round_off_amount);

  // Credit note reverses a sale (or a purchase). Signs mirror the reversed invoice.
  // Credit note against sales: party Cr (positive), sales-return Dr (negative)
  // Debit note against purchase: party Dr (negative), purchase-return Cr (positive)
  const partySign = isCredit ? 1 : -1;
  const counterSign = isCredit ? -1 : 1;

  const entries: LedgerEntry[] = [
    {
      ledgerName: note.party_ledger_name,
      amount: partySign * total,
      billAllocations: [
        {
          billType: "Agst Ref",
          name: note.invoice.invoice_number,
          amount: partySign * total,
        },
      ],
    },
    {
      ledgerName: note.counter_ledger_name,
      amount: counterSign * taxable,
    },
  ];

  if (cgst !== 0) {
    entries.push({
      ledgerName: taxLedgerName("cgst"),
      amount: counterSign * cgst,
    });
  }
  if (sgst !== 0) {
    entries.push({
      ledgerName: taxLedgerName("sgst"),
      amount: counterSign * sgst,
    });
  }
  if (igst !== 0) {
    entries.push({
      ledgerName: taxLedgerName("igst"),
      amount: counterSign * igst,
    });
  }
  if (roundOff !== 0) {
    entries.push({
      ledgerName: "Round Off",
      amount: counterSign * roundOff,
    });
  }

  return voucherXml({
    vchType: isCredit ? "Credit Note" : "Debit Note",
    guid: note.tally_guid,
    date: note.adjustment_date,
    voucherNumber: note.adjustment_number,
    partyLedgerName: note.party_ledger_name,
    entries,
  });
}

// ============================================================================
// Top-level builder
// ============================================================================

export function buildTransactionsXml(args: {
  invoices: InvoiceForExport[];
  payments: PaymentForExport[];
  adjustmentNotes: AdjustmentNoteForExport[];
  companyName: string;
}): string {
  const messages: string[] = [];

  for (const invoice of args.invoices) {
    const xml = buildInvoiceVoucher(invoice);
    if (xml) messages.push(tallyMessage(xml));
  }
  for (const payment of args.payments) {
    const xml = buildPaymentVoucher(payment);
    if (xml) messages.push(tallyMessage(xml));
  }
  for (const note of args.adjustmentNotes) {
    const xml = buildAdjustmentVoucher(note);
    if (xml) messages.push(tallyMessage(xml));
  }

  return envelope("Vouchers", args.companyName, messages.join("\n"));
}
