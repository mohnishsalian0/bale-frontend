const XML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

export function escapeXml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(/[&<>"']/g, (c) => XML_ESCAPE_MAP[c]);
}

export function tag(
  name: string,
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined || value === "") return "";
  return `<${name}>${escapeXml(value)}</${name}>`;
}

export function formatTallyDate(isoDate: string): string {
  return isoDate.replaceAll("-", "").slice(0, 8);
}

export function formatTallyAmount(amount: number | string): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

export function envelope(
  reportName: "All Masters" | "Vouchers",
  companyName: string,
  body: string,
): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>${escapeXml(reportName)}</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${escapeXml(companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
${body}
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;
}

export function tallyMessage(inner: string): string {
  return `        <TALLYMESSAGE xmlns:UDF="TallyUDF">
${inner}
        </TALLYMESSAGE>`;
}
