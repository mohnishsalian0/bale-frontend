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
import type { SalesOrderDetailView } from "@/types/sales-orders.types";
import type { OutwardBySalesOrderView } from "@/types/stock-flow.types";
import type { CompanyPDFView } from "@/types/companies.types";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { convertAmountToWords } from "@/lib/utils/number-to-words";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import type { MeasuringUnit, SalesOrderStatus } from "@/types/database/enums";

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
  colDispatched: {
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
  // Fulfillment Section (left side of totals)
  fulfillmentTitle: {
    fontSize: 12,
    fontWeight: "semibold",
    marginBottom: 0,
  },
  fulfillmentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 12,
  },
  fulfillmentLabel: {
    fontSize: 12,
  },
  fulfillmentValue: {
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
  // Goods Outward Details Section
  goodsOutwardSection: {
    marginVertical: 8,
  },
  goodsOutwardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  goodsOutwardTitle: {
    fontSize: 12,
    fontWeight: "semibold",
  },
  goodsOutwardDate: {
    fontSize: 12,
  },
  goodsOutwardTable: {
    borderTop: "1px solid #000",
    borderBottom: "1px solid #000",
    borderLeft: "1px solid #000",
    borderRight: "1px solid #000",
  },
  goodsOutwardTableHeader: {
    flexDirection: "row",
    borderBottom: "1px solid #000",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  goodsOutwardTableRow: {
    flexDirection: "row",
    borderBottom: "0.5px solid #ccc",
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  goodsOutwardTableCell: {
    fontSize: 12,
  },
  // Column widths for goods outward table
  goColSrNo: {
    width: "10%",
  },
  goColProduct: {
    width: "65%",
  },
  goColDispatched: {
    width: "25%",
    textAlign: "right",
  },
});

interface SalesOrderPDFProps {
  order: Omit<SalesOrderDetailView, "agent" | "warehouse" | "customer"> & {
    customer: Omit<SalesOrderDetailView["customer"], "ledger">;
  };
  company: CompanyPDFView;
  linkedOutwards?: OutwardBySalesOrderView[];
}

export function SalesOrderPDF({
  order,
  company,
  linkedOutwards = [],
}: SalesOrderPDFProps) {
  // Calculate totals from database-calculated values
  const subtotal = order.sales_order_items.reduce(
    (sum, item) => sum + (item.line_total || 0),
    0,
  );
  const discountAmount = order.discount_amount || 0;
  const taxableAmount = subtotal - discountAmount;
  const gstAmount = order.gst_amount || 0;
  const grandTotal = order.total_amount || 0;

  // Calculate completion percentage
  const totalRequired = order.sales_order_items.reduce(
    (sum, item) => sum + (item.required_quantity || 0),
    0,
  );
  const totalDispatched = order.sales_order_items.reduce(
    (sum, item) => sum + (item.dispatched_quantity || 0),
    0,
  );
  const completionPercentage =
    totalRequired > 0 ? (totalDispatched / totalRequired) * 100 : 0;

  // Amount in words
  const amountInWords = convertAmountToWords(grandTotal);

  // Status display
  const statusConfig: Record<
    SalesOrderStatus,
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
    statusConfig[order.status as SalesOrderStatus] || statusConfig.in_progress;

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
            <Text style={styles.orderTitle}>Sales Order</Text>
          </View>
        </View>

        {/* Company Info and Order Details Section */}
        <View style={styles.twoColumnSection}>
          {/* Left: Seller Details */}
          <View style={styles.columnWithBorder}>
            <Text style={styles.textLine}>Seller Details</Text>
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

          {/* Right: Order Details */}
          <View style={styles.column}>
            <Text style={styles.textLine}>Order Details</Text>

            <View style={styles.sectionRow}>
              <Text style={styles.textLine}>Order No.</Text>
              <Text style={styles.sectionTitle}>
                SO-{order.sequence_number}
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
                {order.customer?.billing_state || "-"}
              </Text>
            </View>

            {order.notes && (
              <Text style={[styles.textLine, { marginTop: 4 }]}>
                Note: {order.notes}
              </Text>
            )}
          </View>
        </View>

        {/* Buyer and Shipping Section */}
        <View style={styles.twoColumnSection}>
          {/* Left: Billing Customer */}
          <View style={styles.columnWithBorder}>
            <Text style={styles.textLine}>Buyer (Bill to)</Text>
            <Text style={styles.sectionTitle}>
              {order.customer?.company_name ||
                [order.customer?.first_name, order.customer?.last_name]
                  .filter(Boolean)
                  .join(" ") ||
                order.customer?.display_name}
            </Text>
            {order.customer?.billing_address_line1 && (
              <Text style={styles.textLine}>
                {order.customer.billing_address_line1}
              </Text>
            )}
            {order.customer?.billing_address_line2 && (
              <Text style={styles.textLine}>
                {order.customer.billing_address_line2}
              </Text>
            )}
            {(order.customer?.billing_city ||
              order.customer?.billing_pin_code) && (
              <Text style={styles.textLine}>
                {[order.customer.billing_city, order.customer.billing_pin_code]
                  .filter(Boolean)
                  .join(" - ")}
              </Text>
            )}
            {order.customer?.billing_state && (
              <Text style={styles.textLine}>
                State: {order.customer.billing_state}
              </Text>
            )}
            {order.customer?.gst_number && (
              <Text style={styles.textLine}>
                GSTIN: {order.customer.gst_number}
              </Text>
            )}
          </View>

          {/* Right: Shipping Address */}
          <View style={styles.column}>
            <Text style={styles.textLine}>Consignee (Ship to)</Text>
            <Text style={styles.sectionTitle}>
              {order.customer?.company_name ||
                [order.customer?.first_name, order.customer?.last_name]
                  .filter(Boolean)
                  .join(" ") ||
                order.customer?.display_name}
            </Text>
            {order.customer?.shipping_same_as_billing ? (
              <>
                {order.customer?.billing_address_line1 && (
                  <Text style={styles.textLine}>
                    {order.customer.billing_address_line1}
                  </Text>
                )}
                {order.customer?.billing_address_line2 && (
                  <Text style={styles.textLine}>
                    {order.customer.billing_address_line2}
                  </Text>
                )}
                {(order.customer?.billing_city ||
                  order.customer?.billing_pin_code) && (
                  <Text style={styles.textLine}>
                    {[
                      order.customer.billing_city,
                      order.customer.billing_pin_code,
                    ]
                      .filter(Boolean)
                      .join(" - ")}
                  </Text>
                )}
                {order.customer?.billing_state && (
                  <Text style={styles.textLine}>
                    State: {order.customer.billing_state}
                  </Text>
                )}
              </>
            ) : (
              <>
                {order.customer?.shipping_address_line1 && (
                  <Text style={styles.textLine}>
                    {order.customer.shipping_address_line1}
                  </Text>
                )}
                {order.customer?.shipping_address_line2 && (
                  <Text style={styles.textLine}>
                    {order.customer.shipping_address_line2}
                  </Text>
                )}
                {(order.customer?.shipping_city ||
                  order.customer?.shipping_pin_code) && (
                  <Text style={styles.textLine}>
                    {[
                      order.customer.shipping_city,
                      order.customer.shipping_pin_code,
                    ]
                      .filter(Boolean)
                      .join(" - ")}
                  </Text>
                )}
                {order.customer?.shipping_state && (
                  <Text style={styles.textLine}>
                    State: {order.customer.shipping_state}
                  </Text>
                )}
              </>
            )}
            {order.customer?.gst_number && (
              <Text style={styles.textLine}>
                GSTIN: {order.customer.gst_number}
              </Text>
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
            <Text style={[styles.tableCell, styles.colDispatched]}>
              Dispatched
            </Text>
            <Text style={[styles.tableCell, styles.colRate]}>Rate</Text>
            <Text style={[styles.tableCell, styles.colUnit]}>Unit</Text>
            <Text style={[styles.tableCell, styles.colAmount]}>Amount</Text>
          </View>

          {/* Table Rows */}
          {order.sales_order_items.map((item, index) => {
            const unitAbbr = getMeasuringUnitAbbreviation(
              item.product?.measuring_unit as MeasuringUnit,
            );
            const dispatchedQty = item.dispatched_quantity || 0;
            const requiredQty = item.required_quantity || 0;
            const dispatchedPercentage =
              requiredQty > 0
                ? ((dispatchedQty / requiredQty) * 100).toFixed(0)
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
                <Text style={[styles.tableCell, styles.colDispatched]}>
                  {dispatchedQty} {unitAbbr} ({dispatchedPercentage}%)
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

        {/* Fulfillment Tracking and Totals Section */}
        <View style={styles.twoColumnSection}>
          {/* Left: Fulfillment Tracking (only for in_progress and completed) */}
          <View style={styles.columnWithBorder}>
            {(order.status === "in_progress" ||
              order.status === "completed") && (
              <View style={styles.totalsSection}>
                <Text style={styles.fulfillmentTitle}>Fulfillment</Text>

                <View style={styles.fulfillmentRow}>
                  <Text style={styles.fulfillmentLabel}>Total Ordered</Text>
                  <Text style={styles.fulfillmentValue}>
                    {totalRequired} units
                  </Text>
                </View>

                <View style={styles.fulfillmentRow}>
                  <Text style={styles.fulfillmentLabel}>Total Dispatched</Text>
                  <Text style={styles.fulfillmentValue}>
                    {totalDispatched} units
                  </Text>
                </View>

                <View style={styles.fulfillmentRow}>
                  <Text style={styles.fulfillmentLabel}>Pending</Text>
                  <Text style={styles.fulfillmentValue}>
                    {totalRequired - totalDispatched} units
                  </Text>
                </View>

                <View style={styles.fulfillmentRow}>
                  <Text style={styles.fulfillmentLabel}>Completion</Text>
                  <Text style={styles.fulfillmentValue}>
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

      {/* Goods Outward Details - New Page */}
      {linkedOutwards && linkedOutwards.length > 0 && (
        <Page size="A4" style={styles.page}>
          {linkedOutwards.map((outward) => {
            // Group outward items by product
            const productMap = new Map<
              string,
              {
                productName: string;
                productCode: string;
                orderedQty: number;
                dispatchedQty: number;
                unit: MeasuringUnit;
              }
            >();

            // Aggregate quantities by product
            outward.goods_outward_items?.forEach((item) => {
              const productId = item.stock_unit?.product?.id;
              if (!productId) return;

              const existing = productMap.get(productId);
              const dispatchedQty = item.quantity_dispatched || 0;

              if (existing) {
                existing.dispatchedQty += dispatchedQty;
              } else {
                // Find matching sales order item to get ordered qty
                const orderItem = order.sales_order_items.find(
                  (oi) => oi.product?.id === productId,
                );

                productMap.set(productId, {
                  productName: item.stock_unit?.product?.name || "",
                  productCode:
                    item.stock_unit?.product?.sequence_number?.toString() || "",
                  orderedQty: orderItem?.required_quantity || 0,
                  dispatchedQty: dispatchedQty,
                  unit: item.stock_unit?.product
                    ?.measuring_unit as MeasuringUnit,
                });
              }
            });

            const products = Array.from(productMap.values());

            return (
              <View key={outward.id} style={styles.goodsOutwardSection}>
                {/* Outward Header */}
                <View style={styles.goodsOutwardHeader}>
                  <Text style={styles.goodsOutwardTitle}>
                    Goods Outward GO-{outward.sequence_number}
                  </Text>
                  <Text style={styles.goodsOutwardDate}>
                    {formatAbsoluteDate(outward.outward_date)}
                  </Text>
                </View>

                {/* Table */}
                <View style={styles.goodsOutwardTable}>
                  {/* Table Header */}
                  <View style={styles.goodsOutwardTableHeader}>
                    <Text
                      style={[styles.goodsOutwardTableCell, styles.goColSrNo]}
                    >
                      Sr. No.
                    </Text>
                    <Text
                      style={[
                        styles.goodsOutwardTableCell,
                        styles.goColProduct,
                      ]}
                    >
                      Product Name
                    </Text>
                    <Text
                      style={[
                        styles.goodsOutwardTableCell,
                        styles.goColDispatched,
                      ]}
                    >
                      Dispatched Qty
                    </Text>
                  </View>

                  {/* Table Rows */}
                  {products.map((product, index) => {
                    const unitAbbr = getMeasuringUnitAbbreviation(product.unit);

                    return (
                      <View key={index} style={styles.goodsOutwardTableRow}>
                        <Text
                          style={[
                            styles.goodsOutwardTableCell,
                            styles.goColSrNo,
                          ]}
                        >
                          {index + 1}
                        </Text>
                        <Text
                          style={[
                            styles.goodsOutwardTableCell,
                            styles.goColProduct,
                          ]}
                        >
                          {product.productName}
                        </Text>
                        <Text
                          style={[
                            styles.goodsOutwardTableCell,
                            styles.goColDispatched,
                          ]}
                        >
                          {product.dispatchedQty} {unitAbbr}
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
                This is an order confirmation and fulfillment document. Final
                invoice will be issued upon fulfillment. All particulars are as
                per mutual agreement.
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
