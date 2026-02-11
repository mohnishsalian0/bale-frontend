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
import type { PurchaseOrderDetailView } from "@/types/purchase-orders.types";
import type { InwardByPurchaseOrderView } from "@/types/stock-flow.types";
import type { CompanyPDFView } from "@/types/companies.types";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { convertAmountToWords } from "@/lib/utils/number-to-words";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import type {
  MeasuringUnit,
  PurchaseOrderStatus,
} from "@/types/database/enums";

// Register Poppins font for proper Unicode support
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

// Helper to format amount without currency symbol
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
    lineHeight: 1.5,
    borderTop: "1px solid #000",
    borderLeft: "1px solid #000",
    borderRight: "1px solid #000",
    position: "relative",
  },
  // Watermark
  watermarkContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  watermark: {
    fontSize: 80,
    fontWeight: "semibold",
    color: "#e0e0e0",
    opacity: 0.3,
    transform: "rotate(-45deg)",
    textAlign: "center",
  },
  watermarkCompleted: {
    color: "#22c55e",
  },
  watermarkCancelled: {
    color: "#ef4444",
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
  orderTitle: {
    fontSize: 20,
    fontWeight: "semibold",
    color: "#000000",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 2,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: "semibold",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  statusPending: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },
  statusInProgress: {
    backgroundColor: "#dbeafe",
    color: "#1e40af",
  },
  statusCompleted: {
    backgroundColor: "#d1fae5",
    color: "#065f46",
  },
  statusCancelled: {
    backgroundColor: "#fee2e2",
    color: "#991b1b",
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
    width: "30%",
  },
  colQty: {
    width: "12%",
    textAlign: "right",
  },
  colReceived: {
    width: "18%",
    textAlign: "right",
  },
  colRate: {
    width: "12%",
    textAlign: "right",
  },
  colUnit: {
    width: "8%",
    textAlign: "right",
  },
  colAmount: {
    width: "14%",
    textAlign: "right",
  },
  // Receipt Section (left side of totals)
  receiptTitle: {
    fontSize: 12,
    fontWeight: "semibold",
    marginBottom: 0,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 12,
  },
  receiptLabel: {
    fontSize: 12,
  },
  receiptValue: {
    fontSize: 12,
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
  // Status Notes
  statusNotesSection: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    marginTop: 4,
    marginBottom: 4,
  },
  statusNotesLabel: {
    fontSize: 10,
    fontWeight: "semibold",
  },
  statusNotesText: {
    fontSize: 10,
    marginTop: 2,
  },
  // Goods Inward Details Section
  goodsInwardSection: {
    marginVertical: 8,
  },
  goodsInwardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  goodsInwardTitle: {
    fontSize: 12,
    fontWeight: "semibold",
  },
  goodsInwardDate: {
    fontSize: 12,
  },
  goodsInwardTable: {
    borderTop: "1px solid #000",
    borderBottom: "1px solid #000",
    borderLeft: "1px solid #000",
    borderRight: "1px solid #000",
  },
  goodsInwardTableHeader: {
    flexDirection: "row",
    borderBottom: "1px solid #000",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  goodsInwardTableRow: {
    flexDirection: "row",
    borderBottom: "0.5px solid #ccc",
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  goodsInwardTableCell: {
    fontSize: 12,
  },
  // Column widths for goods inward table
  giColSrNo: {
    width: "10%",
  },
  giColProduct: {
    width: "65%",
  },
  giColReceived: {
    width: "25%",
    textAlign: "right",
  },
});

interface PurchaseOrderPDFProps {
  order: PurchaseOrderDetailView;
  company: CompanyPDFView;
  linkedInwards?: InwardByPurchaseOrderView[];
}

export function PurchaseOrderPDF({
  order,
  company,
  linkedInwards = [],
}: PurchaseOrderPDFProps) {
  // Calculate totals from database-calculated values
  const subtotal = order.purchase_order_items.reduce(
    (sum, item) => sum + (item.line_total || 0),
    0,
  );
  const discountAmount = order.discount_amount || 0;
  const taxableAmount = subtotal - discountAmount;
  const gstAmount = order.gst_amount || 0;
  const grandTotal = order.total_amount || 0;

  // Calculate completion percentage
  const totalRequired = order.purchase_order_items.reduce(
    (sum, item) => sum + (item.required_quantity || 0),
    0,
  );
  const totalReceived = order.purchase_order_items.reduce(
    (sum, item) => sum + (item.received_quantity || 0),
    0,
  );
  const completionPercentage =
    totalRequired > 0 ? (totalReceived / totalRequired) * 100 : 0;

  // Amount in words
  const amountInWords = convertAmountToWords(grandTotal);

  // Status display
  const statusConfig: Record<
    PurchaseOrderStatus,
    { label: string; style: typeof styles.statusPending }
  > = {
    approval_pending: {
      label: "PENDING APPROVAL",
      style: styles.statusPending,
    },
    in_progress: { label: "IN PROGRESS", style: styles.statusInProgress },
    completed: { label: "COMPLETED", style: styles.statusCompleted },
    cancelled: { label: "CANCELLED", style: styles.statusCancelled },
  };
  const currentStatus =
    statusConfig[order.status as PurchaseOrderStatus] ||
    statusConfig.in_progress;

  // Determine if we should show watermark
  const showWatermark =
    order.status === "completed" || order.status === "cancelled";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {company.logo_url && (
              <Image src={company.logo_url} style={styles.companyLogo} />
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
            <Text style={styles.orderTitle}>Purchase Order</Text>
          </View>
        </View>

        {/* Seller Info and Order Details Section */}
        <View style={styles.twoColumnSection}>
          {/* Left: Seller Details */}
          <View style={styles.columnWithBorder}>
            <Text style={styles.textLine}>Seller Details</Text>
            <Text style={styles.sectionTitle}>
              {order.supplier?.company_name ||
                [order.supplier?.first_name, order.supplier?.last_name]
                  .filter(Boolean)
                  .join(" ") ||
                order.supplier?.display_name}
            </Text>
            {order.supplier?.billing_address_line1 && (
              <Text style={styles.textLine}>
                {order.supplier.billing_address_line1}
              </Text>
            )}
            {order.supplier?.billing_address_line2 && (
              <Text style={styles.textLine}>
                {order.supplier.billing_address_line2}
              </Text>
            )}
            {(order.supplier?.billing_city ||
              order.supplier?.billing_pin_code) && (
              <Text style={styles.textLine}>
                {[order.supplier.billing_city, order.supplier.billing_pin_code]
                  .filter(Boolean)
                  .join(" - ")}
              </Text>
            )}
            {order.supplier?.billing_state && (
              <Text style={styles.textLine}>
                State: {order.supplier.billing_state}
              </Text>
            )}
            {order.supplier?.gst_number && (
              <Text style={styles.textLine}>
                GSTIN: {order.supplier.gst_number}
              </Text>
            )}
            {order.supplier?.pan_number && (
              <Text style={styles.textLine}>
                PAN: {order.supplier.pan_number}
              </Text>
            )}
          </View>

          {/* Right: Order Details */}
          <View style={styles.column}>
            <Text style={styles.textLine}>Order Details</Text>

            {/* Show supplier invoice details first for purchase orders */}
            {order.supplier_invoice_number && (
              <View style={styles.sectionRow}>
                <Text style={styles.textLine}>Supplier Invoice No.</Text>
                <Text style={styles.sectionTitle}>
                  {order.supplier_invoice_number}
                </Text>
              </View>
            )}

            {order.supplier_invoice_date && (
              <View style={styles.sectionRow}>
                <Text style={styles.textLine}>Supplier Invoice Date</Text>
                <Text style={styles.textLine}>
                  {formatAbsoluteDate(order.supplier_invoice_date)}
                </Text>
              </View>
            )}

            <View style={styles.sectionRow}>
              <Text style={styles.textLine}>Reference No.</Text>
              <Text style={styles.sectionTitle}>
                PO-{order.sequence_number}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.textLine}>Status</Text>
              <View style={[styles.statusBadge, currentStatus.style]}>
                <Text>{currentStatus.label}</Text>
              </View>
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.textLine}>Order Date</Text>
              <Text style={styles.textLine}>
                {formatAbsoluteDate(order.order_date)}
              </Text>
            </View>

            {order.delivery_due_date && (
              <View style={styles.sectionRow}>
                <Text style={styles.textLine}>Expected Delivery</Text>
                <Text style={styles.textLine}>
                  {formatAbsoluteDate(order.delivery_due_date)}
                </Text>
              </View>
            )}

            {order.payment_terms && (
              <View style={styles.sectionRow}>
                <Text style={styles.textLine}>Payment Terms</Text>
                <Text style={styles.textLine}>{order.payment_terms}</Text>
              </View>
            )}

            {order.advance_amount != null && order.advance_amount > 0 && (
              <View style={styles.sectionRow}>
                <Text style={styles.textLine}>Advance Amount</Text>
                <Text style={styles.textLine}>
                  {formatCurrency(order.advance_amount)}
                </Text>
              </View>
            )}

            <View style={styles.sectionRow}>
              <Text style={styles.textLine}>Place of Supply</Text>
              <Text style={styles.textLine}>
                {order.warehouse?.state || "-"}
              </Text>
            </View>

            {order.notes && (
              <Text style={[styles.textLine, { marginTop: 4 }]}>
                Note: {order.notes}
              </Text>
            )}
          </View>
        </View>

        {/* Buyer and Consignee Section */}
        <View style={styles.twoColumnSection}>
          {/* Left: Buyer (Bill to) */}
          <View style={styles.columnWithBorder}>
            <Text style={styles.textLine}>Buyer (Bill to)</Text>
            <Text style={styles.sectionTitle}>{company.name}</Text>
            {company.address_line1 && (
              <Text style={styles.textLine}>{company.address_line1}</Text>
            )}
            {company.address_line2 && (
              <Text style={styles.textLine}>{company.address_line2}</Text>
            )}
            {(company.city || company.pin_code) && (
              <Text style={styles.textLine}>
                {[company.city, company.pin_code].filter(Boolean).join(" - ")}
              </Text>
            )}
            {company.state && (
              <Text style={styles.textLine}>State: {company.state}</Text>
            )}
            {company.gst_number && (
              <Text style={styles.textLine}>GSTIN: {company.gst_number}</Text>
            )}
            {company.pan_number && (
              <Text style={styles.textLine}>PAN: {company.pan_number}</Text>
            )}
          </View>

          {/* Right: Consignee (Ship to) */}
          <View style={styles.column}>
            <Text style={styles.textLine}>Consignee (Ship to)</Text>
            <Text style={styles.sectionTitle}>{company.name}</Text>
            {order.warehouse?.name && (
              <Text style={styles.textLine}>{order.warehouse?.name}</Text>
            )}
            {order.warehouse?.address_line1 && (
              <Text style={styles.textLine}>
                {order.warehouse?.address_line1}
              </Text>
            )}
            {order.warehouse?.address_line2 && (
              <Text style={styles.textLine}>
                {order.warehouse?.address_line2}
              </Text>
            )}
            {(order.warehouse?.city || order.warehouse?.pin_code) && (
              <Text style={styles.textLine}>
                {[order.warehouse?.city, order.warehouse?.pin_code]
                  .filter(Boolean)
                  .join(" - ")}
              </Text>
            )}
            {order.warehouse?.state && (
              <Text style={styles.textLine}>
                State: {order.warehouse?.state}
              </Text>
            )}
            {company.gst_number && (
              <Text style={styles.textLine}>GSTIN: {company.gst_number}</Text>
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
            <Text style={[styles.tableCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableCell, styles.colReceived]}>Received</Text>
            <Text style={[styles.tableCell, styles.colRate]}>Rate</Text>
            <Text style={[styles.tableCell, styles.colUnit]}>Unit</Text>
            <Text style={[styles.tableCell, styles.colAmount]}>Amount</Text>
          </View>

          {/* Table Rows */}
          {order.purchase_order_items.map((item, index) => {
            const unitAbbr = getMeasuringUnitAbbreviation(
              item.product?.measuring_unit as MeasuringUnit,
            );
            const receivedQty = item.received_quantity || 0;
            const requiredQty = item.required_quantity || 0;
            const receivedPercentage =
              requiredQty > 0
                ? ((receivedQty / requiredQty) * 100).toFixed(0)
                : 0;

            return (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colSrNo]}>
                  {index + 1}
                </Text>
                <Text style={[styles.tableCell, styles.colDescription]}>
                  {item.product?.name}
                  {"\n"}
                  <Text
                    style={{
                      fontSize: 9,
                      color: "#6b7280",
                      fontWeight: "semibold",
                    }}
                  >
                    HSN: {item.product?.hsn_code || "-"}
                  </Text>
                </Text>
                <Text style={[styles.tableCell, styles.colQty]}>
                  {item.required_quantity} {unitAbbr}
                </Text>
                <Text style={[styles.tableCell, styles.colReceived]}>
                  {receivedQty} {unitAbbr} ({receivedPercentage}%)
                </Text>
                <Text style={[styles.tableCell, styles.colRate]}>
                  {formatAmount(item.unit_rate)}
                </Text>
                <Text style={[styles.tableCell, styles.colUnit]}>
                  {unitAbbr}
                </Text>
                <Text style={[styles.tableCell, styles.colAmount]}>
                  {formatAmount(item.line_total || 0)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Receipt Tracking and Totals Section */}
        <View style={styles.twoColumnSection}>
          {/* Left: Receipt Tracking (only for in_progress and completed) */}
          <View style={styles.columnWithBorder}>
            {(order.status === "in_progress" ||
              order.status === "completed") && (
              <View style={styles.totalsSection}>
                <Text style={styles.receiptTitle}>Receipt</Text>

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Total Ordered</Text>
                  <Text style={styles.receiptValue}>{totalRequired} units</Text>
                </View>

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Total Received</Text>
                  <Text style={styles.receiptValue}>{totalReceived} units</Text>
                </View>

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Pending</Text>
                  <Text style={styles.receiptValue}>
                    {totalRequired - totalReceived} units
                  </Text>
                </View>

                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Completion</Text>
                  <Text style={styles.receiptValue}>
                    {completionPercentage.toFixed(1)}%
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Right: Totals */}
          <View style={styles.column}>
            <View style={styles.totalsSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{formatAmount(subtotal)}</Text>
              </View>

              {discountAmount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>
                    Discount
                    {order.discount_type === "percentage" &&
                      ` (${order.discount_value}%)`}
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

              {order.tax_type === "gst" && gstAmount > 0 && (
                <>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>CGST</Text>
                    <Text style={styles.totalValue}>
                      {formatAmount(gstAmount / 2)}
                    </Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>SGST</Text>
                    <Text style={styles.totalValue}>
                      {formatAmount(gstAmount / 2)}
                    </Text>
                  </View>
                </>
              )}

              {order.tax_type === "igst" && gstAmount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>IGST</Text>
                  <Text style={styles.totalValue}>
                    {formatAmount(gstAmount)}
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

        {/* Watermark (only for completed/cancelled) - Rendered last to be on top */}
        {showWatermark && (
          <View style={styles.watermarkContainer}>
            <View
              style={[
                styles.watermark,
                order.status === "completed"
                  ? styles.watermarkCompleted
                  : styles.watermarkCancelled,
              ]}
            >
              <Text>
                {order.status === "completed" ? "FULFILLED" : "CANCELLED"}
              </Text>
            </View>
          </View>
        )}
      </Page>

      {/* Goods Inward Details - New Page */}
      {linkedInwards && linkedInwards.length > 0 && (
        <Page size="A4" style={styles.page}>
          {linkedInwards.map((inward) => {
            // Group stock units by product
            const productMap = new Map<
              string,
              {
                productName: string;
                productCode: string;
                orderedQty: number;
                receivedQty: number;
                unit: MeasuringUnit;
              }
            >();

            // Aggregate quantities by product
            inward.stock_units?.forEach((stockUnit) => {
              const productId = stockUnit.product?.id;
              if (!productId) return;

              const existing = productMap.get(productId);
              const receivedQty = stockUnit.initial_quantity || 0;

              if (existing) {
                existing.receivedQty += receivedQty;
              } else {
                // Find matching purchase order item to get ordered qty
                const orderItem = order.purchase_order_items.find(
                  (oi) => oi.product?.id === productId,
                );

                productMap.set(productId, {
                  productName: stockUnit.product?.name || "",
                  productCode:
                    stockUnit.product?.sequence_number?.toString() || "",
                  orderedQty: orderItem?.required_quantity || 0,
                  receivedQty: receivedQty,
                  unit: stockUnit.product?.measuring_unit as MeasuringUnit,
                });
              }
            });

            const products = Array.from(productMap.values());

            return (
              <View key={inward.id} style={styles.goodsInwardSection}>
                {/* Inward Header */}
                <View style={styles.goodsInwardHeader}>
                  <Text style={styles.goodsInwardTitle}>
                    Goods Inward GI-{inward.sequence_number}
                  </Text>
                  <Text style={styles.goodsInwardDate}>
                    {formatAbsoluteDate(inward.inward_date)}
                  </Text>
                </View>

                {/* Table */}
                <View style={styles.goodsInwardTable}>
                  {/* Table Header */}
                  <View style={styles.goodsInwardTableHeader}>
                    <Text
                      style={[styles.goodsInwardTableCell, styles.giColSrNo]}
                    >
                      Sr. No.
                    </Text>
                    <Text
                      style={[styles.goodsInwardTableCell, styles.giColProduct]}
                    >
                      Product Name
                    </Text>
                    <Text
                      style={[
                        styles.goodsInwardTableCell,
                        styles.giColReceived,
                      ]}
                    >
                      Received Qty
                    </Text>
                  </View>

                  {/* Table Rows */}
                  {products.map((product, index) => {
                    const unitAbbr = getMeasuringUnitAbbreviation(product.unit);

                    return (
                      <View key={index} style={styles.goodsInwardTableRow}>
                        <Text
                          style={[
                            styles.goodsInwardTableCell,
                            styles.giColSrNo,
                          ]}
                        >
                          {index + 1}
                        </Text>
                        <Text
                          style={[
                            styles.goodsInwardTableCell,
                            styles.giColProduct,
                          ]}
                        >
                          {product.productName}
                        </Text>
                        <Text
                          style={[
                            styles.goodsInwardTableCell,
                            styles.giColReceived,
                          ]}
                        >
                          {product.receivedQty} {unitAbbr}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}

          {/* Status Notes (for completed/cancelled orders) */}
          {order.status_notes && (
            <View style={styles.statusNotesSection}>
              <Text style={styles.statusNotesLabel}>
                {order.status === "completed"
                  ? "Completion Notes"
                  : "Cancellation Reason"}
                :
              </Text>
              <Text style={styles.statusNotesText}>{order.status_notes}</Text>
            </View>
          )}

          {/* Footer: Declaration and Signature */}
          <View style={styles.footer}>
            {/* Left: Declaration */}
            <View style={styles.declarationSection}>
              <Text style={styles.declarationTitle}>Declaration</Text>
              <Text style={styles.declarationText}>
                This is a purchase order document. Materials will be recorded in
                inventory upon receipt. All particulars are as per mutual
                agreement.
              </Text>
            </View>

            {/* Right: Signature */}
            <View style={styles.signatureSection}>
              <Text style={styles.signatureFor}>For {company.name}</Text>
              <Text style={styles.signatureLabel}>Authorised Signature</Text>
            </View>
          </View>
        </Page>
      )}
    </Document>
  );
}
