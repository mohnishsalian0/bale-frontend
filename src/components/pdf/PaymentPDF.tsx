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
import type { PaymentDetailView } from "@/types/payments.types";
import type { Company } from "@/types/companies.types";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { convertAmountToWords } from "@/lib/utils/number-to-words";

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
  paymentTitle: {
    fontSize: 20,
    fontWeight: "semibold",
  },
  paymentNumber: {
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
  // Allocations Table
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
  // Column widths for allocations table
  colSrNo: {
    width: "10%",
  },
  colDescription: {
    width: "35%",
  },
  colInvoiceNumber: {
    width: "25%",
  },
  colInvoiceDate: {
    width: "15%",
  },
  colAmount: {
    width: "15%",
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
  netAmountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 4,
  },
  netAmountLabel: {
    fontSize: 14,
    fontWeight: "semibold",
  },
  netAmountValue: {
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
  },
  declarationSection: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
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

interface PaymentPDFProps {
  payment: PaymentDetailView;
  company: Company;
}

export function PaymentPDF({ payment, company }: PaymentPDFProps) {
  // Determine payment type label
  const paymentTypeLabel =
    payment.voucher_type === "receipt" ? "Payment Receipt" : "Payment Voucher";

  // Calculate amounts
  const totalAmount = payment.total_amount || 0;
  const tdsAmount = payment.tds_amount || 0;
  const netAmount = payment.net_amount || 0;

  // Amount in words
  const amountInWords = convertAmountToWords(netAmount);

  // Determine payer and payee based on voucher type
  const isReceipt = payment.voucher_type === "receipt";
  const payerName = isReceipt
    ? payment.party_name || payment.party_display_name || "-"
    : company.name || "-";
  const payeeName = isReceipt
    ? company.name || "-"
    : payment.party_name || payment.party_display_name || "-";
  const payerGSTIN = isReceipt ? payment.party_gst_number || "-" : company.gst_number || "-";
  const payeeGSTIN = isReceipt ? company.gst_number || "-" : payment.party_gst_number || "-";
  const payerPAN = isReceipt ? payment.party_pan_number || "-" : company.pan_number || "-";
  const payeePAN = isReceipt ? company.pan_number || "-" : payment.party_pan_number || "-";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {company.logo_url && (
              <Image
                src={company.logo_url || ""}
                style={styles.companyLogo}
              />
            )}
            <View style={styles.companyInfo}>
              <Text style={styles.companyName}>{company.name}</Text>
              <Text style={styles.companyContact}>
                {[company.email, company.phone_number, company.website_url]
                  .filter(Boolean)
                  .join(" | ")}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.paymentTitle}>{paymentTypeLabel}</Text>
            <Text style={styles.paymentNumber}>{payment.payment_number}</Text>
          </View>
        </View>

        {/* Payment Details and Reference Section */}
        <View style={styles.twoColumnSection}>
          {/* Left: Payment Details */}
          <View style={styles.columnWithBorder}>
            <Text style={styles.textLine}>Payment Details</Text>

            <View style={styles.sectionRow}>
              <Text style={styles.textLine}>Payment No.</Text>
              <Text style={styles.sectionTitle}>{payment.payment_number}</Text>
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.textLine}>Payment Date</Text>
              <Text style={styles.textLine}>
                {formatAbsoluteDate(payment.payment_date)}
              </Text>
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.textLine}>Payment Mode</Text>
              <Text style={styles.textLine}>
                {payment.payment_mode.toUpperCase()}
              </Text>
            </View>

            {payment.reference_number && (
              <View style={styles.sectionRow}>
                <Text style={styles.textLine}>Reference No.</Text>
                <Text style={styles.textLine}>{payment.reference_number}</Text>
              </View>
            )}

            {payment.reference_date && (
              <View style={styles.sectionRow}>
                <Text style={styles.textLine}>Reference Date</Text>
                <Text style={styles.textLine}>
                  {formatAbsoluteDate(payment.reference_date)}
                </Text>
              </View>
            )}
          </View>

          {/* Right: Reference Information */}
          <View style={styles.column}>
            <Text style={styles.textLine}>Reference Information</Text>

            <View style={styles.sectionRow}>
              <Text style={styles.textLine}>Place of Payment</Text>
              <Text style={styles.textLine}>{company.state || "-"}</Text>
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.textLine}>Account</Text>
              <Text style={styles.textLine}>
                {payment.counter_ledger?.name || "-"}
              </Text>
            </View>

            {payment.notes && (
              <Text style={styles.textLine}>Note: {payment.notes}</Text>
            )}
          </View>
        </View>

        {/* Payer and Payee Section */}
        <View style={styles.twoColumnSection}>
          {/* Left: Payer Details */}
          <View style={styles.columnWithBorder}>
            <Text style={styles.textLine}>Payer</Text>
            <Text style={styles.sectionTitle}>{payerName}</Text>
            {payerGSTIN !== "-" && (
              <Text style={styles.textLine}>GSTIN: {payerGSTIN}</Text>
            )}
            {payerPAN !== "-" && (
              <Text style={styles.textLine}>PAN: {payerPAN}</Text>
            )}
          </View>

          {/* Right: Payee Details */}
          <View style={styles.column}>
            <Text style={styles.textLine}>Payee</Text>
            <Text style={styles.sectionTitle}>{payeeName}</Text>
            {payeeGSTIN !== "-" && (
              <Text style={styles.textLine}>GSTIN: {payeeGSTIN}</Text>
            )}
            {payeePAN !== "-" && (
              <Text style={styles.textLine}>PAN: {payeePAN}</Text>
            )}
          </View>
        </View>

        {/* Payment Allocations Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, styles.colSrNo]}>Sr. No.</Text>
            <Text style={[styles.tableCell, styles.colDescription]}>
              Description
            </Text>
            <Text style={[styles.tableCell, styles.colInvoiceNumber]}>
              Invoice Number
            </Text>
            <Text style={[styles.tableCell, styles.colInvoiceDate]}>
              Invoice Date
            </Text>
            <Text style={[styles.tableCell, styles.colAmount]}>Amount</Text>
          </View>

          {/* Table Rows */}
          {payment.payment_allocations.map((allocation, index) => {
            const isAdvance = allocation.allocation_type === "advance";
            return (
              <View key={allocation.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colSrNo]}>
                  {index + 1}
                </Text>
                <Text style={[styles.tableCell, styles.colDescription]}>
                  {isAdvance ? "Advance Payment" : "Payment against invoice"}
                </Text>
                <Text style={[styles.tableCell, styles.colInvoiceNumber]}>
                  {isAdvance ? "-" : allocation.invoice?.invoice_number || "-"}
                </Text>
                <Text style={[styles.tableCell, styles.colInvoiceDate]}>
                  {isAdvance
                    ? "-"
                    : allocation.invoice?.invoice_date
                      ? formatAbsoluteDate(allocation.invoice.invoice_date)
                      : "-"}
                </Text>
                <Text style={[styles.tableCell, styles.colAmount]}>
                  {formatAmount(allocation.amount_applied)}
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
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>{formatAmount(totalAmount)}</Text>
              </View>

              {payment.tds_applicable && tdsAmount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>
                    TDS @ {payment.tds_rate}%
                  </Text>
                  <Text style={styles.totalValue}>
                    -{formatAmount(tdsAmount)}
                  </Text>
                </View>
              )}

              {/* Net Amount */}
              <View style={styles.netAmountRow}>
                <Text style={styles.netAmountLabel}>Net Amount</Text>
                <Text style={styles.netAmountValue}>
                  {formatCurrency(netAmount)}
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
              Received with thanks. This payment is subject to realization of
              cheque/instrument.
            </Text>
          </View>

          {/* Right: Signature */}
          <View style={styles.signatureSection}>
            <Text style={styles.signatureFor}>For {company.name}</Text>
            <Text style={styles.signatureLabel}>Authorised Signature</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
