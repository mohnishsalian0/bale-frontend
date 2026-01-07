import { ComponentType } from "react";
import { MeasuringUnit, StockType } from "@/types/database/enums";
import { IconCylinder, IconPackage, IconShirt } from "@tabler/icons-react";
import type { ProductWithInventoryListView } from "@/types/products.types";
import { getMeasuringUnitAbbreviation } from "./measuring-units";
import { pluralizeStockType } from "./pluralize";
import { formatAbsoluteDate } from "./date";
import { StockUnit } from "@/types/stock-units.types";

// Type for attribute objects (materials, colors, tags)
interface ProductAttribute {
  id: string;
  name: string;
  color_hex?: string | null;
}

/**
 * Get icon component for a product based on stock type
 */
export function getProductIcon(
  stock_type: StockType | null | undefined,
): ComponentType<{ className?: string }> {
  if (stock_type === "roll") return IconCylinder;
  if (stock_type === "batch") return IconPackage;
  if (stock_type === "piece") return IconShirt;
  return IconPackage; // default
}

/**
 * Get formatted product info string
 * Format: {product_code} · Material(s) · Color(s)
 */
export function getProductInfo(
  product:
    | {
        product_code?: string | null;
        materials?: ProductAttribute[] | null;
        colors?: ProductAttribute[] | null;
      }
    | null
    | undefined,
): string {
  if (!product) return "";

  const parts: string[] = [];

  if (product.product_code) {
    parts.push(product.product_code);
  }

  // Get material names (join multiple with comma)
  if (product.materials && product.materials.length > 0) {
    const materialNames = product.materials.map((m) => m.name).join(", ");
    parts.push(materialNames);
  }

  // Get color names (join multiple with comma)
  if (product.colors && product.colors.length > 0) {
    const colorNames = product.colors.map((c) => c.name).join(", ");
    parts.push(colorNames);
  }

  return parts.join(" • ");
}

/**
 * Get first material name from product
 */
export function getFirstMaterial(
  materials?: ProductAttribute[] | null,
): string | null {
  if (!materials || materials.length === 0) return null;
  return materials[0].name;
}

/**
 * Get first color name from product
 */
export function getFirstColor(
  colors?: ProductAttribute[] | null,
): string | null {
  if (!colors || colors.length === 0) return null;
  return colors[0].name;
}

/**
 * Get first color hex from product
 */
export function getFirstColorHex(
  colors?: ProductAttribute[] | null,
): string | null {
  if (!colors || colors.length === 0) return null;
  return colors[0].color_hex || null;
}

/**
 * Calculate total stock value based on quantity and price per unit
 */
export function calculateStockValue(
  quantity: number | null | undefined,
  pricePerUnit: number | null | undefined,
): number {
  if (!quantity || !pricePerUnit) return 0;
  return quantity * pricePerUnit;
}

/**
 * Get display name for stock type
 */
export function getStockTypeDisplay(
  stockType: string | null | undefined,
): string {
  if (!stockType) return "Not specified";

  switch (stockType.toLowerCase()) {
    case "roll":
      return "Roll";
    case "batch":
      return "Batch";
    case "piece":
      return "Piece";
    default:
      return stockType.charAt(0).toUpperCase() + stockType.slice(1);
  }
}

/**
 * Helper function to format available stock text
 * @returns Formatted string like "100.5 mtr", "100.5 kg", "100.5 yd", "100 units", "100 pc"
 */
export function getAvailableStockText(
  product: ProductWithInventoryListView,
): string {
  const stockType = product.stock_type as StockType;
  const units = product.inventory.in_stock_units as number;
  const quantity = product.inventory.in_stock_quantity as number;
  const unitAbbreviation = getMeasuringUnitAbbreviation(
    product.measuring_unit as MeasuringUnit | null,
  );

  if (stockType === "roll") {
    return `${quantity.toFixed(0)} ${unitAbbreviation}`;
  } else if (stockType === "batch") {
    return `${quantity.toFixed(0)} units`;
  } else if (stockType === "piece") {
    return `${pluralizeStockType(units, stockType)}`;
  } else {
    return "";
  }
}

// ============================================================================
// STOCK UNIT UTIL FUNCTIONS
// ============================================================================

/**
 * Format stock unit number with appropriate prefix based on stock type
 * @param sequenceNumber - The stock unit sequence number
 * @param stockType - The type of stock (roll, batch, piece)
 * @returns Formatted string like "ROLL-123", "BATCH-456", "PIECE-789"
 * @example
 * formatStockUnitNumber(123, 'roll') // "ROLL-123"
 * formatStockUnitNumber(456, 'batch') // "BATCH-456"
 * formatStockUnitNumber(789, 'piece') // "PIECE-789"
 * formatStockUnitNumber(111, null) // "SU-111"
 */
export function formatStockUnitNumber(
  sequenceNumber: number,
  stockType: StockType | null | undefined,
): string {
  const prefix =
    stockType === "roll"
      ? "ROLL"
      : stockType === "batch"
        ? "BATCH"
        : stockType === "piece"
          ? "PIECE"
          : "SU"; // fallback to generic SU if type unknown

  return `${prefix}-${sequenceNumber}`;
}

/**
 * Get formatted stock unit info string
 * Format: Grade: {quality_grade} • Supplier #: {supplier_number} • Location: {warehouse_location}
 */
export function getStockUnitInfo(
  stockUnit:
    | Pick<
        StockUnit,
        | "quality_grade"
        | "supplier_number"
        | "warehouse_location"
        | "manufacturing_date"
      >
    | null
    | undefined,
): string {
  if (!stockUnit) return "";

  const parts: string[] = [];

  if (stockUnit.quality_grade) {
    parts.push(`Grade: ${stockUnit.quality_grade}`);
  }

  if (stockUnit.supplier_number) {
    parts.push(`Supplier #: ${stockUnit.supplier_number}`);
  }

  if (stockUnit.warehouse_location) {
    parts.push(`Location: ${stockUnit.warehouse_location}`);
  }

  if (stockUnit.manufacturing_date) {
    parts.push(`Mfg on: ${formatAbsoluteDate(stockUnit.manufacturing_date)}`);
  }

  return parts.join(" • ");
}

// ============================================================================
// STOCK STATUS CALCULATIONS
// ============================================================================

/**
 * Calculate stock status based on current quantity and minimum threshold
 *
 * Logic:
 * - out_of_stock: quantity is 0
 * - low_stock: quantity > 0 but <= min threshold (if threshold is set)
 * - in_stock: quantity > 0 and above threshold (or no threshold set)
 *
 * Used in: catalog products, inventory dashboards
 */
export function calculateStockStatus(
  currentStock: number,
  minThreshold: number | null,
): "in_stock" | "low_stock" | "out_of_stock" {
  if (currentStock === 0) {
    return "out_of_stock";
  }

  if (minThreshold && currentStock <= minThreshold) {
    return "low_stock";
  }

  return "in_stock";
}
