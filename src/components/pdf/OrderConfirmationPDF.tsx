import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Tables } from "@/types/database/supabase";

type Company = Tables<"companies">;

interface OrderConfirmationPDFProps {
  company: Company;
  order: any; // Full order with customer and items
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
    paddingBottom: 20,
    borderBottom: "2px solid #e5e7eb",
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  logo: {
    width: 60,
    height: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  statusBadge: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: "bold",
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 12,
  },
  table: {
    width: "100%",
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    padding: 8,
    borderBottom: "1px solid #d1d5db",
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#374151",
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottom: "1px solid #e5e7eb",
  },
  tableCell: {
    fontSize: 10,
    color: "#111827",
  },
  col1: { flex: 3 }, // Product name
  col2: { flex: 1, textAlign: "center" }, // Quantity
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  infoItem: {
    width: "45%",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 10,
    color: "#6b7280",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 11,
    color: "#111827",
    fontWeight: "bold",
  },
  address: {
    fontSize: 11,
    color: "#111827",
    lineHeight: 1.5,
  },
  notes: {
    fontSize: 10,
    color: "#4b5563",
    lineHeight: 1.6,
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    paddingTop: 16,
    borderTop: "1px solid #e5e7eb",
    fontSize: 9,
    color: "#9ca3af",
    textAlign: "center",
  },
});

export function OrderConfirmationPDF({
  company,
  order,
}: OrderConfirmationPDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{company.name}</Text>
          </View>
          {company.logo_url && (
            <Image src={company.logo_url} style={styles.logo} />
          )}
        </View>

        {/* Title and Order Info */}
        <View>
          <Text style={styles.title}>Order Confirmation</Text>
          <Text style={styles.orderNumber}>Order #{order.sequence_number}</Text>
          <View style={styles.statusBadge}>
            <Text>{order.status.replace("_", " ").toUpperCase()}</Text>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.col1]}>Product</Text>
              <Text style={[styles.tableHeaderCell, styles.col2]}>
                Quantity
              </Text>
            </View>
            {order.sales_order_items?.map((item: any, index: number) => (
              <View key={index} style={styles.tableRow}>
                <View style={styles.col1}>
                  <Text style={styles.tableCell}>{item.product?.name}</Text>
                  <Text
                    style={[
                      styles.tableCell,
                      { fontSize: 9, color: "#6b7280", marginTop: 2 },
                    ]}
                  >
                    PROD-{item.product?.sequence_number}
                  </Text>
                </View>
                <Text style={[styles.tableCell, styles.col2]}>
                  {item.quantity}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Details</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{order.customer?.name}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{order.customer?.email}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{order.customer?.phone}</Text>
            </View>
            {order.customer?.gstin && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>GSTIN</Text>
                <Text style={styles.infoValue}>{order.customer.gstin}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.address}>
            <Text>{order.customer?.address_line_1}</Text>
            {order.customer?.address_line_2 && (
              <Text>{order.customer.address_line_2}</Text>
            )}
            <Text>
              {order.customer?.city}, {order.customer?.state}{" "}
              {order.customer?.pin_code}
            </Text>
            <Text>{order.customer?.country}</Text>
          </View>
        </View>

        {/* Special Instructions */}
        {order.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Instructions</Text>
            <Text style={styles.notes}>{order.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            This is a computer-generated document. No signature is required.
          </Text>
          <Text style={{ marginTop: 4 }}>
            Generated on{" "}
            {new Date().toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
