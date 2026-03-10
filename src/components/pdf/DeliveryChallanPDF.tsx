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
import type { OutwardDetailView } from "@/types/stock-flow.types";
import type { Company } from "@/types/companies.types";
import { formatAbsoluteDate } from "@/lib/utils/date";
import { getMeasuringUnitAbbreviation } from "@/lib/utils/measuring-units";
import type { MeasuringUnit } from "@/types/database/enums";
import {
  getPartnerShippingAddress,
  getFormattedAddress,
} from "@/lib/utils/partner";

// Register Poppins font which has proper Unicode support
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
  challanTitle: {
    fontSize: 20,
    fontWeight: "semibold",
  },
  challanNumber: {
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
    marginTop: 2,
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
    width: "40%",
  },
  colHSN: {
    width: "12%",
  },
  colNoOfUnits: {
    width: "12%",
    textAlign: "right",
  },
  colQty: {
    width: "15%",
    textAlign: "right",
  },
  colUnit: {
    width: "15%",
    textAlign: "right",
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

interface DeliveryChallanPDFProps {
  outward: OutwardDetailView;
  company: Company;
}

// Helper to group items by product and calculate totals
interface GroupedItem {
  productName: string;
  productHSN: string | null;
  measuringUnit: MeasuringUnit;
  noOfUnits: number;
  totalQuantity: number;
}

function groupItemsByProduct(
  items: OutwardDetailView["goods_outward_items"],
): GroupedItem[] {
  const grouped = new Map<string, GroupedItem>();

  items.forEach((item) => {
    if (!item.stock_unit?.product) return;

    const productId = item.stock_unit.product.id;
    const existing = grouped.get(productId);

    if (existing) {
      existing.noOfUnits += 1;
      existing.totalQuantity += item.quantity_dispatched;
    } else {
      grouped.set(productId, {
        productName: item.stock_unit.product.name,
        productHSN: item.stock_unit.product.hsn_code || null,
        measuringUnit: item.stock_unit.product.measuring_unit as MeasuringUnit,
        noOfUnits: 1,
        totalQuantity: item.quantity_dispatched,
      });
    }
  });

  return Array.from(grouped.values());
}

export function DeliveryChallanPDF({
  outward,
  company,
}: DeliveryChallanPDFProps) {
  // Determine outward type label and reference
  const getOutwardReference = () => {
    switch (outward.outward_type) {
      case "sales_order":
        return outward.sales_order
          ? `SO-${outward.sales_order.sequence_number}`
          : "-";
      case "job_work":
        return outward.job_work
          ? `JW-${outward.job_work.sequence_number}`
          : "-";
      case "purchase_return":
        return "Purchase Return";
      case "other":
        return outward.other_reason || "Other";
      default:
        return "-";
    }
  };

  // Determine destination details (always partner, warehouse transfers handled separately)
  const destinationName = outward.partner
    ? outward.partner.display_name ||
      outward.partner.company_name ||
      `${outward.partner.first_name} ${outward.partner.last_name}`
    : "-";

  const destinationAddress = outward.partner
    ? getFormattedAddress(getPartnerShippingAddress(outward.partner)).join(", ")
    : "-";

  // Group items by product
  const groupedItems = groupItemsByProduct(outward.goods_outward_items);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {company.logo_url && (
              <Image src={company.logo_url || ""} style={styles.companyLogo} />
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
            <Text style={styles.challanTitle}>DELIVERY CHALLAN</Text>
            <Text style={styles.challanNumber}>
              GO-{outward.sequence_number}
            </Text>
          </View>
        </View>

        {/* Company Info and Goods Outward Details Section */}
        <View style={styles.twoColumnSection}>
          {/* Left: Company Details */}
          <View style={styles.columnWithBorder}>
            <Text style={styles.textLine}>Company Details</Text>
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

          {/* Right: Goods Outward Details */}
          <View style={styles.column}>
            <Text style={styles.textLine}>Goods Outward Details</Text>
            <View style={styles.sectionRow}>
              <Text style={styles.textLine}>GO No.</Text>
              <Text style={styles.sectionTitle}>
                GO-{outward.sequence_number}
              </Text>
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.textLine}>Outward Date</Text>
              <Text style={styles.textLine}>
                {formatAbsoluteDate(outward.outward_date)}
              </Text>
            </View>

            {outward.expected_delivery_date && (
              <View style={styles.sectionRow}>
                <Text style={styles.textLine}>Expected Delivery</Text>
                <Text style={styles.textLine}>
                  {formatAbsoluteDate(outward.expected_delivery_date)}
                </Text>
              </View>
            )}

            <View style={styles.sectionRow}>
              <Text style={styles.textLine}>Outward Type</Text>
              <Text style={styles.textLine}>
                {outward.outward_type
                  .split("_")
                  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(" ")}
              </Text>
            </View>

            <View style={styles.sectionRow}>
              <Text style={styles.textLine}>Reference</Text>
              <Text style={styles.textLine}>{getOutwardReference()}</Text>
            </View>

            {outward.agent && (
              <View style={styles.sectionRow}>
                <Text style={styles.textLine}>Agent</Text>
                <Text style={styles.textLine}>
                  {outward.agent.display_name || outward.agent.company_name}
                </Text>
              </View>
            )}

            {outward.transport_type && (
              <View style={styles.sectionRow}>
                <Text style={styles.textLine}>Transport Type</Text>
                <Text style={styles.textLine}>
                  {outward.transport_type.toUpperCase()}
                </Text>
              </View>
            )}

            {outward.transport_reference_number && (
              <View style={styles.sectionRow}>
                <Text style={styles.textLine}>Transport Ref</Text>
                <Text style={styles.textLine}>
                  {outward.transport_reference_number}
                </Text>
              </View>
            )}

            {outward.notes && (
              <Text style={styles.textLine}>Note: {outward.notes}</Text>
            )}
          </View>
        </View>

        {/* Source and Destination Section */}
        <View style={styles.twoColumnSection}>
          {/* Left: Source Warehouse */}
          <View style={styles.columnWithBorder}>
            <Text style={styles.textLine}>Source (Sent from)</Text>
            <Text style={styles.sectionTitle}>
              {outward.warehouse?.name || "-"}
            </Text>
            {outward.warehouse?.address_line1 && (
              <Text style={styles.textLine}>
                {outward.warehouse.address_line1}
              </Text>
            )}
            {outward.warehouse?.address_line2 && (
              <Text style={styles.textLine}>
                {outward.warehouse.address_line2}
              </Text>
            )}
            {(outward.warehouse?.city || outward.warehouse?.pin_code) && (
              <Text style={styles.textLine}>
                {[outward.warehouse.city, outward.warehouse.pin_code]
                  .filter(Boolean)
                  .join(" - ")}
              </Text>
            )}
            {outward.warehouse?.state && (
              <Text style={styles.textLine}>
                State: {outward.warehouse.state}
              </Text>
            )}
          </View>

          {/* Right: Destination (Partner or Warehouse) */}
          <View style={styles.column}>
            <Text style={styles.textLine}>Destination (Received at)</Text>
            <Text style={styles.sectionTitle}>{destinationName}</Text>
            {destinationAddress !== "-" && (
              <Text style={styles.textLine}>{destinationAddress}</Text>
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
            <Text style={[styles.tableCell, styles.colNoOfUnits]}>
              No. of Units
            </Text>
            <Text style={[styles.tableCell, styles.colQty]}>Quantity</Text>
            <Text style={[styles.tableCell, styles.colUnit]}>Unit</Text>
          </View>

          {/* Table Rows */}
          {groupedItems.map((item, index) => {
            const unitAbbr = getMeasuringUnitAbbreviation(item.measuringUnit);
            return (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colSrNo]}>
                  {index + 1}
                </Text>
                <Text style={[styles.tableCell, styles.colDescription]}>
                  {item.productName}
                </Text>
                <Text style={[styles.tableCell, styles.colHSN]}>
                  {item.productHSN || "-"}
                </Text>
                <Text style={[styles.tableCell, styles.colNoOfUnits]}>
                  {item.noOfUnits}
                </Text>
                <Text style={[styles.tableCell, styles.colQty]}>
                  {item.totalQuantity.toFixed(2)}
                </Text>
                <Text style={[styles.tableCell, styles.colUnit]}>
                  {unitAbbr}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Footer: Declaration and Signature */}
        <View style={styles.footer}>
          {/* Left: Declaration */}
          <View style={styles.declarationSection}>
            <Text style={styles.declarationTitle}>Declaration</Text>
            <Text style={styles.declarationText}>
              We declare that the particulars given above are true and correct.
              The goods mentioned are dispatched at the risk and cost of the
              consignee.
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
