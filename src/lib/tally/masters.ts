import { escapeXml, envelope, tag, tallyMessage } from "./xml";

export interface LedgerForExport {
  id: string;
  name: string;
  gst_applicable: boolean;
  gst_rate: number | null;
  parent_group: { name: string } | null;
}

function buildLedger(ledger: LedgerForExport): string {
  const parts: string[] = [];
  parts.push(
    `          <LEDGER NAME="${escapeXml(ledger.name)}" ACTION="Create">`,
  );
  parts.push(`            ${tag("NAME", ledger.name)}`);

  if (ledger.parent_group?.name) {
    parts.push(`            ${tag("PARENT", ledger.parent_group.name)}`);
  }

  if (ledger.gst_applicable) {
    parts.push(`            ${tag("ISGSTAPPLICABLE", "&#4; Applicable")}`);
    if (ledger.gst_rate !== null && ledger.gst_rate > 0) {
      parts.push(`            ${tag("GSTTYPEOFSUPPLY", "Goods")}`);
    }
  }

  parts.push(`          </LEDGER>`);
  return parts.filter(Boolean).join("\n");
}

export function buildMastersXml(
  ledgers: LedgerForExport[],
  companyName: string,
): string {
  const body = ledgers.map((l) => tallyMessage(buildLedger(l))).join("\n");
  return envelope("All Masters", companyName, body);
}
