import { ComponentType } from "react";
import { MeasuringUnit, StockType } from "@/types/database/enums";
import { IconCylinder, IconPackage, IconShirt } from "@tabler/icons-react";
import type { ProductWithInventoryListView } from "@/types/products.types";
import { getMeasuringUnitAbbreviation } from "./measuring-units";
import { pluralizeStockType } from "./pluralize";

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
 * Format: PROD-{sequence_number} · Material(s) · Color(s)
 */
export function getProductInfo(
  product:
    | {
        sequence_number?: number | null;
        materials?: ProductAttribute[] | null;
        colors?: ProductAttribute[] | null;
      }
    | null
    | undefined,
): string {
  if (!product) return "";

  const parts: string[] = [];

  if (product.sequence_number) {
    parts.push(`PROD-${product.sequence_number}`);
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

  return parts.join(" · ");
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
 * Format stock unit number with appropriate prefix based on stock type
 * @param sequenceNumber - The stock unit sequence number
 * @returns Formatted string like "PROD-123"
 */
export function formatProductNumber(sequenceNumber: number): string {
  return `PROD-${sequenceNumber}`;
}

/**
 * Helper function to format available stock text
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
    return `${quantity.toFixed(0)} ${unitAbbreviation} avail.`;
  } else if (stockType === "batch") {
    return `${quantity.toFixed(0)} units avail.`;
  } else if (stockType === "piece") {
    return `${pluralizeStockType(units, stockType)} avail.`;
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
