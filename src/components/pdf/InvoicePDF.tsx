import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";
import type { InvoiceDetailView } from "@/types/invoices.types";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { convertAmountToWords } from "@/lib/utils/number-to-words";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import type { MeasuringUnit } from "@/types/database/enums";

// Register Poppins font which has proper Unicode support for ₹ symbol
Font.register({
  family: "Poppins",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrFJA.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLEj6V1s.ttf",
      fontWeight: 600,
    },
  ],
});

// Helper to format amount without currency symbol (just number with commas)
const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Helper to format amount with rupee symbol
const formatCurrency = (amount: number): string => {
  return `₹ ${formatAmount(amount)}`;
};

const styles = StyleSheet.create({
  page: {
    padding: 20,
    fontSize: 12,
    fontFamily: "Poppins",
    color: "#000000",
    lineHeight: 1.5, // 150% line height
    borderTop: "1px solid #000",
    borderLeft: "1px solid #000",
    borderRight: "1px solid #000",
  },
  // Header Section
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottom: "1px solid #000",
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  headerRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  companyLogo: {
    width: 48,
    height: 48,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 20,
    fontWeight: "semibold",
  },
  companyContact: {
    fontSize: 12,
    marginTop: 8,
  },
  invoiceTitle: {
    fontSize: 20,
    fontWeight: "semibold",
  },
  invoiceNumber: {
    fontSize: 12,
    marginTop: 8,
  },
  // Two Column Section
  twoColumnSection: {
    flexDirection: "row",
    borderBottom: "1px solid #000",
    borderLeft: "1px solid #000",
    borderRight: "1px solid #000",
  },
  column: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  columnWithBorder: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderRight: "1px solid #000",
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "semibold",
  },
  textLine: {
    fontSize: 12,
  },
  // Items Table
  table: {
    borderBottom: "1px solid #000",
    borderLeft: "1px solid #000",
    borderRight: "1px solid #000",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottom: "1px solid #000",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "0.5px solid #ccc",
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  tableCell: {
    fontSize: 12,
  },
  // Column widths for items table
  colSrNo: {
    width: "6%",
  },
  colDescription: {
    width: "33%",
  },
  colHSN: {
    width: "10%",
  },
  colQty: {
    width: "12%",
    textAlign: "right",
  },
  colRate: {
    width: "13%",
    textAlign: "right",
  },
  colUnit: {
    width: "10%",
    textAlign: "right",
  },
  colAmount: {
    width: "16%",
    textAlign: "right",
  },
  // Totals Section
  totalsSection: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: {
    fontSize: 12,
  },
  totalValue: {
    fontSize: 12,
    textAlign: "right",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 4,
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: "semibold",
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: "semibold",
    textAlign: "right",
  },
  // Amount in Words
  amountInWords: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderBottom: "1px solid #000",
    borderLeft: "1px solid #000",
    borderRight: "1px solid #000",
  },
  amountInWordsLabel: {
    fontSize: 12,
  },
  amountInWordsText: {
    fontSize: 14,
    fontWeight: "semibold",
  },
  // Footer Section
  footer: {
    flexDirection: "row",
    // borderBottom: "1px solid #000",
  },
  declarationSection: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
    // borderRight: "1px solid #000",
  },
  declarationTitle: {
    fontSize: 10,
    fontWeight: "semibold",
  },
  declarationText: {
    fontSize: 10,
  },
  signatureSection: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
    alignItems: "flex-end",
  },
  signatureFor: {
    fontSize: 10,
    fontWeight: "semibold",
    marginBottom: 30,
  },
  signatureLabel: {
    fontSize: 10,
  },
});

interface InvoicePDFProps {
  invoice: InvoiceDetailView;
}

export function InvoicePDF({ invoice }: InvoicePDFProps) {
  // Determine invoice type label
  const invoiceTypeLabel =
    invoice.invoice_type === "sales" ? "Sale Invoice" : "Purchase Invoice";

  // Calculate totals
  const subtotal = invoice.subtotal_amount || 0;
  const discountAmount = invoice.discount_amount || 0;
  const taxableAmount = invoice.taxable_amount || 0;
  const cgstAmount = invoice.total_cgst_amount || 0;
  const sgstAmount = invoice.total_sgst_amount || 0;
  const igstAmount = invoice.total_igst_amount || 0;
  const directTaxAmount = invoice.direct_tax_amount || 0;
  const roundOffAmount = invoice.round_off_amount || 0;
  const grandTotal = invoice.total_amount || 0;

  // Amount in words
  const amountInWords = convertAmountToWords(grandTotal);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {invoice.company_logo_url && (
              <Image
                src={invoice.company_logo_url || ""}
                style={styles.companyLogo}
              />
            )}
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{invoice.company_name}</Text>
              <Text style={styles.companyContact}>
                {[
                  invoice.company_email,
                  invoice.company_phone,
                  invoice.company_website_url,
                ]
                  .filter(Boolean)
                  .join(" | ")}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.invoiceTitle}>{invoiceTypeLabel}</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
          </View>
        </View>

        {/* Company Info and Invoice Details Section */}
        <View style={styles.twoColumnSection}>
          {/* Left: Company Details */}
          <View style={styles.columnWithBorder}>
            <Text style={styles.textLine}>Company Details</Text>
            <Text style={styles.sectionTitle}>{invoice.company_name}</Text>
            {invoice.company_address_line1 && (
              <Text style={styles.textLine}>
                {invoice.company_address_line1}
              </Text>
            )}
            {invoice.company_address_line2 && (
              <Text style={styles.textLine}>
                {invoice.company_address_line2}
              </Text>
            )}
            {(invoice.company_city || invoice.company_pincode) && (
              <Text style={styles.textLine}>
                {[invoice.company_city, invoice.company_pincode]
                  .filter(Boolean)
                  .join(" - ")}
              </Text>
            )}
            {invoice.company_state && (
              <Text style={styles.textLine}>
                State: {invoice.company_state}
              </Text>
            )}
            {invoice.company_gst_number && (
              <Text style={styles.textLine}>
                GSTIN: {invoice.company_gst_number}
              </Text>
            )}
            {invoice.company_pan_number && (
              <Text style={styles.textLine}>
                PAN: {invoice.company_pan_number}
              </Text>
            )}
          </View>

          {/* Right: Invoice Details */}
          <View style={styles.column}>
            <Text style={styles.textLine}>Invoice Details</Text>

            {/* For Purchase Invoices: Show Supplier Invoice Details First */}
            {invoice.invoice_type === "purchase" && (
              <>
                {invoice.supplier_invoice_number && (
                  <View style={styles.sectionRow}>
                    <Text style={styles.textLine}>Supplier Invoice No.</Text>
                    <Text style={styles.sectionTitle}>
                      {invoice.supplier_invoice_number}
                    </Text>
                  </View>
                )}

                {invoice.supplier_invoice_date && (
                  <View style={styles.sectionRow}>
                    <Text style={styles.textLine}>Supplier Invoice Date</Text>
                    <Text style={styles.textLine}>
                      {formatAbsoluteDate(invoice.supplier_invoice_date)}
                    </Text>
                  </View>
                )}
              </>
            )}

            {/* Our Invoice Details */}
            <View style={styles.sectionRow}>
              <Text style={styles.textLine}>
                {invoice.invoice_type === "purchase"
                  ? "Reference No."
                  : "Invoice No."}
              </Text>
              <Text style={styles.sectionTitle}>{invoice.invoice_number}</Text>
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.textLine}>
                {invoice.invoice_type === "purchase"
                  ? "Record Date"
                  : "Invoice Date"}
              </Text>
              <Text style={styles.textLine}>
                {formatAbsoluteDate(invoice.invoice_date)}
              </Text>
            </View>

            {invoice.due_date && (
              <View style={styles.sectionRow}>
                <Text style={styles.textLine}>Due Date</Text>
                <Text style={styles.textLine}>
                  {formatAbsoluteDate(invoice.due_date)}
                </Text>
              </View>
            )}

            {invoice.payment_terms && (
              <View style={styles.sectionRow}>
                <Text style={styles.textLine}>Payment Terms</Text>
                <Text style={styles.textLine}>{invoice.payment_terms}</Text>
              </View>
            )}

            <View style={styles.sectionRow}>
              <Text style={styles.textLine}>Place of Supply</Text>
              <Text style={styles.textLine}>
                {invoice.invoice_type === "sales"
                  ? invoice.party_shipping_state || "-"
                  : invoice.warehouse_state || "-"}
              </Text>
            </View>

            {invoice.notes && (
              <Text style={styles.textLine}>Note: {invoice.notes}</Text>
            )}
          </View>
        </View>

        {/* Buyer and Consignee Section */}
        <View style={styles.twoColumnSection}>
          {/* Left: Buyer/Supplier Details */}
          <View style={styles.columnWithBorder}>
            <Text style={styles.textLine}>
              {invoice.invoice_type === "sales"
                ? "Buyer (Bill to)"
                : "Supplier (Bill from)"}
            </Text>
            <Text style={styles.sectionTitle}>
              {invoice.party_name || invoice.party_display_name}
            </Text>
            {invoice.party_billing_address_line1 && (
              <Text style={styles.textLine}>
                {invoice.party_billing_address_line1}
              </Text>
            )}
            {invoice.party_billing_address_line2 && (
              <Text style={styles.textLine}>
                {invoice.party_billing_address_line2}
              </Text>
            )}
            {(invoice.party_billing_city || invoice.party_billing_pincode) && (
              <Text style={styles.textLine}>
                {[invoice.party_billing_city, invoice.party_billing_pincode]
                  .filter(Boolean)
                  .join(" - ")}
              </Text>
            )}
            {invoice.party_billing_state && (
              <Text style={styles.textLine}>
                State: {invoice.party_billing_state}
              </Text>
            )}
            {invoice.party_gst_number && (
              <Text style={styles.textLine}>
                GSTIN: {invoice.party_gst_number}
              </Text>
            )}
          </View>

          {/* Right: Consignee Details */}
          <View style={styles.column}>
            <Text style={styles.textLine}>
              {invoice.invoice_type === "sales"
                ? "Consignee (Ship to)"
                : "Buyer (Received at)"}
            </Text>
            {invoice.invoice_type === "purchase" ? (
              <>
                <Text style={styles.sectionTitle}>{invoice.company_name}</Text>
                {invoice.warehouse_name && (
                  <Text style={styles.textLine}>{invoice.warehouse_name}</Text>
                )}
                {invoice.warehouse_address_line1 && (
                  <Text style={styles.textLine}>
                    {invoice.warehouse_address_line1}
                  </Text>
                )}
                {invoice.warehouse_address_line2 && (
                  <Text style={styles.textLine}>
                    {invoice.warehouse_address_line2}
                  </Text>
                )}
                {(invoice.warehouse_city || invoice.warehouse_pincode) && (
                  <Text style={styles.textLine}>
                    {[invoice.warehouse_city, invoice.warehouse_pincode]
                      .filter(Boolean)
                      .join(" - ")}
                  </Text>
                )}
                {invoice.warehouse_state && (
                  <Text style={styles.textLine}>
                    State: {invoice.warehouse_state}
                  </Text>
                )}
                {invoice.company_gst_number && (
                  <Text style={styles.textLine}>
                    GSTIN: {invoice.company_gst_number}
                  </Text>
                )}
              </>
            ) : (
              <>
                <Text style={styles.sectionTitle}>
                  {invoice.party_name || invoice.party_display_name}
                </Text>
                {invoice.party_shipping_address_line1 && (
                  <Text style={styles.textLine}>
                    {invoice.party_shipping_address_line1}
                  </Text>
                )}
                {invoice.party_shipping_address_line2 && (
                  <Text style={styles.textLine}>
                    {invoice.party_shipping_address_line2}
                  </Text>
                )}
                {(invoice.party_shipping_city ||
                  invoice.party_shipping_pincode) && (
                  <Text style={styles.textLine}>
                    {[
                      invoice.party_shipping_city,
                      invoice.party_shipping_pincode,
                    ]
                      .filter(Boolean)
                      .join(" - ")}
                  </Text>
                )}
                {invoice.party_shipping_state && (
                  <Text style={styles.textLine}>
                    State: {invoice.party_shipping_state}
                  </Text>
                )}
                {invoice.party_gst_number && (
                  <Text style={styles.textLine}>
                    GSTIN: {invoice.party_gst_number}
                  </Text>
                )}
              </>
            )}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.colSrNo]}>Sr. No.</Text>
            <Text style={[styles.tableCell, styles.colDescription]}>
              Item Description
            </Text>
            <Text style={[styles.tableCell, styles.colHSN]}>HSN/SAC</Text>
            <Text style={[styles.tableCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableCell, styles.colRate]}>Rate</Text>
            <Text style={[styles.tableCell, styles.colUnit]}>Unit</Text>
            <Text style={[styles.tableCell, styles.colAmount]}>Amount</Text>
          </View>

          {/* Table Rows */}
          {invoice.invoice_items.map((item, index) => {
            const unitAbbr = getMeasuringUnitAbbreviation(
              item.product_measuring_unit as MeasuringUnit,
            );
            return (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colSrNo]}>
                  {index + 1}
                </Text>
                <Text style={[styles.tableCell, styles.colDescription]}>
                  {item.product_name}
                </Text>
                <Text style={[styles.tableCell, styles.colHSN]}>
                  {item.product_hsn_code || "-"}
                </Text>
                <Text style={[styles.tableCell, styles.colQty]}>
                  {item.quantity} {unitAbbr}
                </Text>
                <Text style={[styles.tableCell, styles.colRate]}>
                  {formatAmount(item.rate)}
                </Text>
                <Text style={[styles.tableCell, styles.colUnit]}>
                  {unitAbbr}
                </Text>
                <Text style={[styles.tableCell, styles.colAmount]}>
                  {formatAmount(item.quantity * item.rate)}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.twoColumnSection}>
          {/* Left: Empty Section */}
          <View style={styles.columnWithBorder}></View>

          <View style={styles.column}>
            {/* Totals Section */}
            <View style={styles.totalsSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{formatAmount(subtotal)}</Text>
              </View>

              {discountAmount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>
                    Discount
                    {invoice.discount_type === "percentage" &&
                      ` (${invoice.discount_value}%)`}
                  </Text>
                  <Text style={styles.totalValue}>
                    -{formatAmount(discountAmount)}
                  </Text>
                </View>
              )}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Taxable Amount</Text>
                <Text style={styles.totalValue}>
                  {formatAmount(taxableAmount)}
                </Text>
              </View>

              {/* Tax breakdown based on tax_type */}
              {invoice.tax_type === "gst" && (
                <>
                  {cgstAmount > 0 && (
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>CGST</Text>
                      <Text style={styles.totalValue}>
                        {formatAmount(cgstAmount)}
                      </Text>
                    </View>
                  )}
                  {sgstAmount > 0 && (
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>SGST</Text>
                      <Text style={styles.totalValue}>
                        {formatAmount(sgstAmount)}
                      </Text>
                    </View>
                  )}
                </>
              )}

              {invoice.tax_type === "igst" && igstAmount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>IGST</Text>
                  <Text style={styles.totalValue}>
                    {formatAmount(igstAmount)}
                  </Text>
                </View>
              )}

              {/* Direct Tax (TDS/TCS) */}
              {directTaxAmount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>
                    {invoice.direct_tax_type?.toUpperCase()}
                    {invoice.direct_tax_rate &&
                      ` (${invoice.direct_tax_rate}%)`}
                  </Text>
                  <Text style={styles.totalValue}>
                    -{formatAmount(directTaxAmount)}
                  </Text>
                </View>
              )}

              {/* Round-off */}
              {roundOffAmount !== 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Round Off</Text>
                  <Text style={styles.totalValue}>
                    {roundOffAmount > 0 ? "+" : ""}
                    {formatAmount(roundOffAmount)}
                  </Text>
                </View>
              )}

              {/* Grand Total */}
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalValue}>
                  {formatCurrency(grandTotal)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Amount in Words */}
        <View style={styles.amountInWords}>
          <Text style={styles.amountInWordsLabel}>
            Amount (in words):{" "}
            <Text style={styles.amountInWordsText}>{amountInWords}</Text>
          </Text>
        </View>

        {/* Footer: Declaration and Signature */}
        <View style={styles.footer}>
          {/* Left: Declaration */}
          <View style={styles.declarationSection}>
            <Text style={styles.declarationTitle}>Declaration</Text>
            <Text style={styles.declarationText}>
              {invoice.invoice_type === "sales"
                ? "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct."
                : "This is a record of the supplier's invoice received. All particulars are as per the original invoice and recorded for GST Input Tax Credit purposes."}
            </Text>
          </View>

          {/* Right: Signature */}
          <View style={styles.signatureSection}>
            <Text style={styles.signatureFor}>For {invoice.company_name}</Text>
            <Text style={styles.signatureLabel}>Authorised Signature</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
