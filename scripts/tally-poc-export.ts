/**
 * Tally Export POC
 * Generates TallyPrime-compatible XML files for import via Gateway of Tally → Import Data
 * Run: npx tsx scripts/tally-poc-export.ts
 */

import * as fs from "fs";
import * as path from "path";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const COMPANY_NAME = "Bale Test Company";

const STOCK_ITEMS = [
  { name: "Cotton Fabric 100 GSM", hsn: "5209", gstRate: 5, unit: "Mtr" },
  { name: "Silk Fabric 200 GSM", hsn: "5007", gstRate: 5, unit: "Mtr" },
  { name: "Polyester Fabric 150 GSM", hsn: "5407", gstRate: 12, unit: "Mtr" },
  { name: "Wool Fabric 300 GSM", hsn: "5112", gstRate: 5, unit: "Mtr" },
  { name: "Linen Fabric 180 GSM", hsn: "5309", gstRate: 5, unit: "Mtr" },
] as const;

const CUSTOMERS = [
  {
    name: "Acme Textiles Pvt Ltd",
    gstin: "27AABCU1234R1ZX",
    state: "Maharashtra",
    gstType: "intra" as const,
  },
  {
    name: "Sharma Fabrics",
    gstin: "29AABCS5678R1ZY",
    state: "Karnataka",
    gstType: "inter" as const,
  },
  {
    name: "Mumbai Garments Ltd",
    gstin: "27AABCM9012R1ZZ",
    state: "Maharashtra",
    gstType: "intra" as const,
  },
];

const SUPPLIERS = [
  {
    name: "Sunrise Mills",
    gstin: "24AABCS3456R1ZA",
    state: "Gujarat",
    gstType: "inter" as const,
  },
  {
    name: "Karnataka Weavers",
    gstin: "29AABCK7890R1ZB",
    state: "Karnataka",
    gstType: "inter" as const,
  },
];

// Default ledgers (pre-existing in Tally or created in masters)
const DEFAULT_LEDGERS = [
  { name: "Sales", parent: "Sales Accounts" },
  { name: "Purchase", parent: "Purchase Accounts" },
  { name: "CGST @ 2.5%", parent: "Duties & Taxes" },
  { name: "CGST @ 5%", parent: "Duties & Taxes" },
  { name: "SGST @ 2.5%", parent: "Duties & Taxes" },
  { name: "SGST @ 5%", parent: "Duties & Taxes" },
  { name: "IGST @ 5%", parent: "Duties & Taxes" },
  { name: "IGST @ 10%", parent: "Duties & Taxes" },
  { name: "Freight Outward", parent: "Indirect Expenses" },
  { name: "Packaging Charges", parent: "Indirect Expenses" },
  { name: "HDFC Bank", parent: "Bank Accounts" },
  { name: "Cash", parent: "Cash-in-Hand" },
];

interface SalesInvoice {
  number: string;
  date: string;
  party: string;
  gstType: "intra" | "inter";
  items: Array<{
    name: string;
    qty: number;
    rate: number;
    amount: number;
    gstRate: number;
    hsn: string;
    unit: string;
  }>;
  extraCharges?: Array<{ ledger: string; amount: number }>;
  taxableAmount: number;
  cgstRate?: number;
  cgstAmount?: number;
  sgstRate?: number;
  sgstAmount?: number;
  igstRate?: number;
  igstAmount?: number;
  total: number;
}

interface PurchaseInvoice {
  number: string;
  date: string;
  party: string;
  items: Array<{
    name: string;
    qty: number;
    rate: number;
    amount: number;
    gstRate: number;
    hsn: string;
    unit: string;
  }>;
  taxableAmount: number;
  igstRate: number;
  igstAmount: number;
  total: number;
}

interface Receipt {
  number: string;
  date: string;
  party: string;
  amount: number;
  againstInvoice: string;
  mode: string;
}

const SALES_INVOICES: SalesInvoice[] = [
  {
    number: "INV/2025-26/0001",
    date: "20260301",
    party: "Acme Textiles Pvt Ltd",
    gstType: "intra",
    items: [
      {
        name: "Cotton Fabric 100 GSM",
        qty: 100,
        rate: 500,
        amount: 50000,
        gstRate: 5,
        hsn: "5209",
        unit: "Mtr",
      },
    ],
    taxableAmount: 50000,
    cgstRate: 2.5,
    cgstAmount: 1250,
    sgstRate: 2.5,
    sgstAmount: 1250,
    total: 52500,
  },
  {
    number: "INV/2025-26/0002",
    date: "20260302",
    party: "Sharma Fabrics",
    gstType: "inter",
    items: [
      {
        name: "Silk Fabric 200 GSM",
        qty: 50,
        rate: 1200,
        amount: 60000,
        gstRate: 5,
        hsn: "5007",
        unit: "Mtr",
      },
    ],
    taxableAmount: 60000,
    igstRate: 5,
    igstAmount: 3000,
    total: 63000,
  },
  {
    number: "INV/2025-26/0003",
    date: "20260331",
    party: "Mumbai Garments Ltd",
    gstType: "intra",
    items: [
      {
        name: "Polyester Fabric 150 GSM",
        qty: 200,
        rate: 300,
        amount: 60000,
        gstRate: 12,
        hsn: "5407",
        unit: "Mtr",
      },
    ],
    taxableAmount: 60000,
    cgstRate: 5,
    cgstAmount: 3000,
    sgstRate: 5,
    sgstAmount: 3000,
    total: 66000,
  },
];

const PURCHASE_INVOICES: PurchaseInvoice[] = [
  {
    number: "PINV/2025-26/0001",
    date: "20260301",
    party: "Sunrise Mills",
    items: [
      {
        name: "Cotton Fabric 100 GSM",
        qty: 500,
        rate: 350,
        amount: 175000,
        gstRate: 5,
        hsn: "5209",
        unit: "Mtr",
      },
    ],
    taxableAmount: 175000,
    igstRate: 5,
    igstAmount: 8750,
    total: 183750,
  },
  {
    number: "PINV/2025-26/0002",
    date: "20260302",
    party: "Karnataka Weavers",
    items: [
      {
        name: "Silk Fabric 200 GSM",
        qty: 200,
        rate: 900,
        amount: 180000,
        gstRate: 5,
        hsn: "5007",
        unit: "Mtr",
      },
    ],
    taxableAmount: 180000,
    igstRate: 5,
    igstAmount: 9000,
    total: 189000,
  },
];

const RECEIPTS: Receipt[] = [
  {
    number: "RCP/2025-26/0001",
    date: "20260331",
    party: "Acme Textiles Pvt Ltd",
    amount: 52500,
    againstInvoice: "INV/2025-26/0001",
    mode: "NEFT",
  },
  {
    number: "RCP/2025-26/0002",
    date: "20260331",
    party: "Sharma Fabrics",
    amount: 63000,
    againstInvoice: "INV/2025-26/0002",
    mode: "NEFT",
  },
];

// ─── XML HELPERS ─────────────────────────────────────────────────────────────

function makeGuid(seed: string): string {
  // Deterministic pseudo-GUID from a string seed so re-runs produce same GUIDs
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (Math.imul(31, hash) + seed.charCodeAt(i)) | 0;
  }
  const h = Math.abs(hash).toString(16).padStart(8, "0");
  return `${h}-0000-0000-0000-${h}${h.slice(0, 4)}`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

function wrapEnvelope(reportName: string, content: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>${reportName}</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(COMPANY_NAME)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
${content}
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

// ─── XML BUILDERS ────────────────────────────────────────────────────────────

function buildMastersXml(): string {
  const parts: string[] = [];

  // UOM must come first — stock items reference it
  parts.push(`          <UNIT NAME="Mtr" ACTION="Create">
            <NAME>Mtr</NAME>
            <ISSIMPLEUNIT>Yes</ISSIMPLEUNIT>
            <FORMALNAME>Metres</FORMALNAME>
          </UNIT>`);

  // Default ledgers (no TAXTYPE — Tally rejects unknown values via import)
  for (const ledger of DEFAULT_LEDGERS) {
    parts.push(`          <LEDGER NAME="${escapeXml(ledger.name)}" ACTION="Create">
            <NAME>${escapeXml(ledger.name)}</NAME>
            <PARENT>${escapeXml(ledger.parent)}</PARENT>
          </LEDGER>`);
  }

  // Customer ledgers (Sundry Debtors)
  for (const customer of CUSTOMERS) {
    parts.push(`          <LEDGER NAME="${escapeXml(customer.name)}" ACTION="Create">
            <NAME>${escapeXml(customer.name)}</NAME>
            <PARENT>Sundry Debtors</PARENT>
            <ISBILLWISEON>Yes</ISBILLWISEON>
            <LEDGERGSTREGDETAILS.LIST>
              <GSTIN>${escapeXml(customer.gstin)}</GSTIN>
              <STATENAME>${escapeXml(customer.state)}</STATENAME>
              <REGISTRATIONTYPE>Regular</REGISTRATIONTYPE>
            </LEDGERGSTREGDETAILS.LIST>
          </LEDGER>`);
  }

  // Supplier ledgers (Sundry Creditors)
  for (const supplier of SUPPLIERS) {
    parts.push(`          <LEDGER NAME="${escapeXml(supplier.name)}" ACTION="Create">
            <NAME>${escapeXml(supplier.name)}</NAME>
            <PARENT>Sundry Creditors</PARENT>
            <ISBILLWISEON>Yes</ISBILLWISEON>
            <LEDGERGSTREGDETAILS.LIST>
              <GSTIN>${escapeXml(supplier.gstin)}</GSTIN>
              <STATENAME>${escapeXml(supplier.state)}</STATENAME>
              <REGISTRATIONTYPE>Regular</REGISTRATIONTYPE>
            </LEDGERGSTREGDETAILS.LIST>
          </LEDGER>`);
  }

  // Stock items — no PARENT, Tally assigns to root automatically
  for (const item of STOCK_ITEMS) {
    parts.push(`          <STOCKITEM NAME="${escapeXml(item.name)}" ACTION="Create">
            <NAME>${escapeXml(item.name)}</NAME>
            <BASEUNITS>${item.unit}</BASEUNITS>
            <GSTDETAILS.LIST>
              <HSNCODE>${item.hsn}</HSNCODE>
              <TAXABILITY>Taxable</TAXABILITY>
            </GSTDETAILS.LIST>
          </STOCKITEM>`);
  }

  return wrapEnvelope("All Masters", parts.join("\n"));
}

function buildSalesInvoicesXml(): string {
  const parts: string[] = [];

  for (const inv of SALES_INVOICES) {
    const allInventoryEntries = inv.items
      .map(
        (item) => `
              <ALLINVENTORYENTRIES.LIST>
                <STOCKITEMNAME>${escapeXml(item.name)}</STOCKITEMNAME>
                <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                <RATE>${formatAmount(item.rate)}/${item.unit}</RATE>
                <AMOUNT>-${formatAmount(item.amount)}</AMOUNT>
                <ACTUALQTY>${item.qty} ${item.unit}</ACTUALQTY>
                <BILLEDQTY>${item.qty} ${item.unit}</BILLEDQTY>
                <ACCOUNTINGALLOCATIONS.LIST>
                  <LEDGERNAME>Sales</LEDGERNAME>
                  <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                  <AMOUNT>-${formatAmount(item.amount)}</AMOUNT>
                </ACCOUNTINGALLOCATIONS.LIST>
              </ALLINVENTORYENTRIES.LIST>`
      )
      .join("");

    // Extra charges (freight, packaging) as plain ledger entries
    const extraLedgerEntries = (inv.extraCharges || [])
      .map(
        (charge) => `
              <LEDGERENTRIES.LIST>
                <LEDGERNAME>${escapeXml(charge.ledger)}</LEDGERNAME>
                <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                <AMOUNT>-${formatAmount(charge.amount)}</AMOUNT>
              </LEDGERENTRIES.LIST>`
      )
      .join("");

    // GST ledger entries
    let gstEntries = "";
    if (inv.gstType === "intra" && inv.cgstAmount && inv.sgstAmount) {
      const cgstLedger = `CGST @ ${inv.cgstRate}%`;
      const sgstLedger = `SGST @ ${inv.sgstRate}%`;
      gstEntries = `
              <LEDGERENTRIES.LIST>
                <LEDGERNAME>${escapeXml(cgstLedger)}</LEDGERNAME>
                <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                <AMOUNT>-${formatAmount(inv.cgstAmount)}</AMOUNT>
              </LEDGERENTRIES.LIST>
              <LEDGERENTRIES.LIST>
                <LEDGERNAME>${escapeXml(sgstLedger)}</LEDGERNAME>
                <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                <AMOUNT>-${formatAmount(inv.sgstAmount)}</AMOUNT>
              </LEDGERENTRIES.LIST>`;
    } else if (inv.gstType === "inter" && inv.igstAmount) {
      const igstLedger = `IGST @ ${inv.igstRate}%`;
      gstEntries = `
              <LEDGERENTRIES.LIST>
                <LEDGERNAME>${escapeXml(igstLedger)}</LEDGERNAME>
                <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
                <AMOUNT>-${formatAmount(inv.igstAmount)}</AMOUNT>
              </LEDGERENTRIES.LIST>`;
    }

    parts.push(`          <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Invoice Voucher View">
            <GUID>${makeGuid(inv.number)}</GUID>
            <DATE>${inv.date}</DATE>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXml(inv.number)}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${escapeXml(inv.party)}</PARTYLEDGERNAME>
            <ISINVOICE>Yes</ISINVOICE>
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(inv.party)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>${formatAmount(inv.total)}</AMOUNT>
              <BILLALLOCATIONS.LIST>
                <NAME>${escapeXml(inv.number)}</NAME>
                <BILLTYPE>New Ref</BILLTYPE>
                <AMOUNT>${formatAmount(inv.total)}</AMOUNT>
              </BILLALLOCATIONS.LIST>
            </LEDGERENTRIES.LIST>${allInventoryEntries}${extraLedgerEntries}${gstEntries}
          </VOUCHER>`);
  }

  return wrapEnvelope("Vouchers", parts.join("\n"));
}

function buildPurchaseInvoicesXml(): string {
  const parts: string[] = [];

  for (const inv of PURCHASE_INVOICES) {
    const igstLedger = `IGST @ ${inv.igstRate}%`;

    const allInventoryEntries = inv.items
      .map(
        (item) => `
              <ALLINVENTORYENTRIES.LIST>
                <STOCKITEMNAME>${escapeXml(item.name)}</STOCKITEMNAME>
                <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                <RATE>${formatAmount(item.rate)}/${item.unit}</RATE>
                <AMOUNT>${formatAmount(item.amount)}</AMOUNT>
                <ACTUALQTY>${item.qty} ${item.unit}</ACTUALQTY>
                <BILLEDQTY>${item.qty} ${item.unit}</BILLEDQTY>
                <ACCOUNTINGALLOCATIONS.LIST>
                  <LEDGERNAME>Purchase</LEDGERNAME>
                  <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                  <AMOUNT>${formatAmount(item.amount)}</AMOUNT>
                </ACCOUNTINGALLOCATIONS.LIST>
              </ALLINVENTORYENTRIES.LIST>`
      )
      .join("");

    parts.push(`          <VOUCHER VCHTYPE="Purchase" ACTION="Create" OBJVIEW="Invoice Voucher View">
            <GUID>${makeGuid(inv.number)}</GUID>
            <DATE>${inv.date}</DATE>
            <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXml(inv.number)}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${escapeXml(inv.party)}</PARTYLEDGERNAME>
            <ISINVOICE>Yes</ISINVOICE>
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(inv.party)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>-${formatAmount(inv.total)}</AMOUNT>
              <BILLALLOCATIONS.LIST>
                <NAME>${escapeXml(inv.number)}</NAME>
                <BILLTYPE>New Ref</BILLTYPE>
                <AMOUNT>-${formatAmount(inv.total)}</AMOUNT>
              </BILLALLOCATIONS.LIST>
            </LEDGERENTRIES.LIST>${allInventoryEntries}
              <LEDGERENTRIES.LIST>
                <LEDGERNAME>${escapeXml(igstLedger)}</LEDGERNAME>
                <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
                <AMOUNT>${formatAmount(inv.igstAmount)}</AMOUNT>
              </LEDGERENTRIES.LIST>
          </VOUCHER>`);
  }

  return wrapEnvelope("Vouchers", parts.join("\n"));
}

function buildReceiptsXml(): string {
  const parts: string[] = [];

  for (const receipt of RECEIPTS) {
    parts.push(`          <VOUCHER VCHTYPE="Receipt" ACTION="Create" OBJVIEW="Accounting Voucher View">
            <GUID>${makeGuid(receipt.number)}</GUID>
            <DATE>${receipt.date}</DATE>
            <VOUCHERTYPENAME>Receipt</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${escapeXml(receipt.number)}</VOUCHERNUMBER>
            <PARTYLEDGERNAME>${escapeXml(receipt.party)}</PARTYLEDGERNAME>
            <NARRATION>${escapeXml(receipt.mode)} received against ${escapeXml(receipt.againstInvoice)}</NARRATION>
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>HDFC Bank</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>${formatAmount(receipt.amount)}</AMOUNT>
            </LEDGERENTRIES.LIST>
            <LEDGERENTRIES.LIST>
              <LEDGERNAME>${escapeXml(receipt.party)}</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>-${formatAmount(receipt.amount)}</AMOUNT>
              <BILLALLOCATIONS.LIST>
                <NAME>${escapeXml(receipt.againstInvoice)}</NAME>
                <BILLTYPE>Agst Ref</BILLTYPE>
                <AMOUNT>-${formatAmount(receipt.amount)}</AMOUNT>
              </BILLALLOCATIONS.LIST>
            </LEDGERENTRIES.LIST>
          </VOUCHER>`);
  }

  return wrapEnvelope("Vouchers", parts.join("\n"));
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

function main() {
  const outputDir = path.join(process.cwd(), "tally-export");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const files = [
    { name: "01_masters.xml", content: buildMastersXml() },
    { name: "02_sales_invoices.xml", content: buildSalesInvoicesXml() },
    { name: "03_purchase_invoices.xml", content: buildPurchaseInvoicesXml() },
    { name: "04_receipts.xml", content: buildReceiptsXml() },
  ];

  for (const file of files) {
    const filePath = path.join(outputDir, file.name);
    fs.writeFileSync(filePath, file.content, "utf-8");
    console.log(`✓ Written: ${filePath}`);
  }

  console.log("\nImport order in TallyPrime (Gateway of Tally → Import Data):");
  console.log("  1. Masters  → 01_masters.xml");
  console.log("  2. Vouchers → 02_sales_invoices.xml");
  console.log("  3. Vouchers → 03_purchase_invoices.xml");
  console.log("  4. Vouchers → 04_receipts.xml");
}

main();
