import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import QRCode from "qrcode";
import { formatStockUnitNumber } from "@/lib/utils/product";
import type { QRTemplateField } from "@/lib/utils/qr-batches";
import type { Tables } from "@/types/database/supabase";
import type { MeasuringUnit, StockType } from "@/types/database/enums";
import { getMeasuringUnitAbbreviation } from "../utils/measuring-units";

// Type for product attributes in label data
interface LabelProductAttribute {
  id: string;
  name: string;
}

// Type for label data combining stock unit and product information
export type LabelData = Pick<
  Tables<"stock_units">,
  | "id"
  | "sequence_number"
  | "manufacturing_date"
  | "initial_quantity"
  | "quality_grade"
  | "warehouse_location"
> & {
  product: Pick<
    Tables<"products">,
    | "name"
    | "sequence_number"
    | "hsn_code"
    | "gsm"
    | "selling_price_per_unit"
    | "stock_type"
    | "measuring_unit"
  > & {
    materials?: LabelProductAttribute[];
    colors?: LabelProductAttribute[];
  };
  qrCodeDataUrl?: string;
};

// Define styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 0,
    backgroundColor: "#ffffff",
  },
  labelsGrid: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  label: {
    width: "50%",
    padding: 16,
    position: "relative",
    minHeight: 200,
    borderBottom: "2px solid #000000",
    borderRight: "2px solid #000000",
  },
  labelRight: {
    // Labels in right column - no right border
    borderRight: "none",
  },
  labelContent: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 40, // Space for logo at bottom
  },
  fieldsList: {
    flex: 1,
    gap: 8,
  },
  fieldRow: {
    fontSize: 10,
    color: "#000000",
  },
  qrCode: {
    width: 100,
    height: 100,
  },
  logo: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 40,
    height: 40,
  },
});

interface QRLabelDocumentProps {
  stockUnits: LabelData[];
  selectedFields: QRTemplateField[];
  companyLogoUrl: string | null;
}

// Map field IDs to their display labels
const FIELD_LABELS: Record<QRTemplateField, string> = {
  product_name: "Name:",
  product_number: "Product No:",
  hsn_code: "HSN code:",
  material: "Material:",
  color: "Color:",
  gsm: "GSM:",
  selling_price_per_unit: "Sale price:",
  unit_number: "Unit No:",
  manufacturing_date: "Made on:",
  initial_quantity: "Size:",
  quality_grade: "Quality:",
  warehouse_location: "Location:",
};

// Generate QR code data URL
export async function generateQRCodeDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 100,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
}

// Get field value from label data
function getFieldValue(unit: LabelData, field: QRTemplateField): string {
  let value: string;

  // Map fields to correct location (stock unit or product)
  switch (field) {
    case "product_name":
      value = unit.product.name;
      break;
    case "product_number":
      value = String(unit.product.sequence_number);
      break;
    case "hsn_code":
      value = unit.product.hsn_code || "-";
      break;
    case "material":
      value = unit.product.materials?.map((m) => m.name).join(", ") || "-";
      break;
    case "color":
      value = unit.product.colors?.map((c) => c.name).join(", ") || "-";
      break;
    case "gsm":
      value = String(unit.product.gsm ?? "-");
      break;
    case "selling_price_per_unit":
      value = `₹ ${unit.product.selling_price_per_unit}`;
      break;
    case "unit_number":
      return formatStockUnitNumber(
        unit.sequence_number,
        unit.product.stock_type as StockType,
      );
    case "manufacturing_date":
      value = unit.manufacturing_date
        ? new Date(unit.manufacturing_date).toLocaleDateString()
        : "-";
      break;
    case "initial_quantity":
      value = `${unit.initial_quantity} ${getMeasuringUnitAbbreviation(unit.product.measuring_unit as MeasuringUnit)}`;
      break;
    case "quality_grade":
      value = String(unit.quality_grade ?? "-");
      break;
    case "warehouse_location":
      value = String(unit.warehouse_location ?? "-");
      break;
    default:
      return "";
  }

  if (value === null || value === undefined) {
    return "";
  }

  return value;
}

// Single label component
interface LabelProps {
  unit: LabelData;
  qrCodeDataUrl: string;
  selectedFields: QRTemplateField[];
  companyLogoUrl: string | null;
  isRightColumn: boolean;
}

const Label: React.FC<LabelProps> = ({
  unit,
  qrCodeDataUrl,
  selectedFields,
  companyLogoUrl,
  isRightColumn,
}) => (
  <View
    style={[styles.label, isRightColumn ? styles.labelRight : {}]}
    wrap={false}
  >
    <View style={styles.labelContent}>
      <View style={styles.fieldsList}>
        {selectedFields.map((field) => {
          const value = getFieldValue(unit, field);
          if (!value) return null;

          return (
            <Text key={field} style={styles.fieldRow}>
              {FIELD_LABELS[field]} {value}
            </Text>
          );
        })}
      </View>
      <Image src={qrCodeDataUrl} style={styles.qrCode} />
    </View>
    {companyLogoUrl && <Image src={companyLogoUrl} style={styles.logo} />}
  </View>
);

// Main PDF document component
export const QRLabelDocument: React.FC<QRLabelDocumentProps> = ({
  stockUnits,
  selectedFields,
  companyLogoUrl,
}) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.labelsGrid}>
        {stockUnits.map((unit, index) => (
          <Label
            key={unit.id}
            unit={unit}
            qrCodeDataUrl={unit.qrCodeDataUrl || ""} // Will be injected before rendering
            selectedFields={selectedFields}
            companyLogoUrl={companyLogoUrl}
            isRightColumn={index % 2 === 1} // Even indices = left column, odd = right column
          />
        ))}
      </View>
    </Page>
  </Document>
);
