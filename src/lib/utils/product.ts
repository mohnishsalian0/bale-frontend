import { ComponentType } from "react";
import { MeasuringUnit, StockType } from "@/types/database/enums";
import { IconCylinder, IconPackage } from "@tabler/icons-react";
import type {
  ProductWithInventoryListView,
  ProductAttribute,
} from "@/types/products.types";
import { getMeasuringUnitAbbreviation } from "./measuring-units";
import { formatAbsoluteDate } from "./date";
import { StockUnitListView } from "@/types/stock-units.types";

// Re-export ProductAttribute for convenience
export type { ProductAttribute };

// ============================================================================
// ATTRIBUTE TRANSFORMATION
// ============================================================================

/**
 * Transform attributes from nested assignments array to grouped arrays
 * Groups attributes by group_name into materials, colors, and tags arrays
 * Used in: products, catalog, and other product-related queries
 */
export function transformAttributes(product: {
  attributes: ProductAttribute[] | null;
}) {
  const allAttributes = (product.attributes || []).filter(
    (attr): attr is ProductAttribute => attr !== null,
  );

  const materials = allAttributes.filter(
    (attr) => attr.group_name === "material",
  );
  const colors = allAttributes.filter((attr) => attr.group_name === "color");
  const tags = allAttributes.filter((attr) => attr.group_name === "tag");

  return { materials, colors, tags };
}

// ============================================================================
// PRODUCT DISPLAY UTILITIES
// ============================================================================

/**
 * Get icon component for a product based on stock type
 */
export function getProductIcon(
  stock_type: StockType | null | undefined,
): ComponentType<{ className?: string }> {
  if (stock_type === "roll") return IconCylinder;
  if (stock_type === "batch") return IconPackage;
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
  const quantity = product.inventory.available_quantity as number;
  const unitAbbreviation = getMeasuringUnitAbbreviation(
    product.measuring_unit as MeasuringUnit | null,
  );

  if (stockType === "roll") {
    return `${quantity.toFixed(0)} ${unitAbbreviation}`;
  } else if (stockType === "batch") {
    return `${quantity.toFixed(0)} units`;
  } else {
    return "";
  }
}

// ============================================================================
// STOCK UNIT UTIL FUNCTIONS
// ============================================================================

/**
 * Get formatted stock unit info string
 * Format: Grade: {quality_grade} • Stock #: {stock_number} • Location: {warehouse_location}
 */
export function getStockUnitInfo(
  stockUnit:
    | Pick<
        StockUnitListView,
        | "lot_number"
        | "quality_grade"
        | "warehouse_location"
        | "manufacturing_date"
      >
    | null
    | undefined,
): string {
  if (!stockUnit) return "";

  const parts: string[] = [];

  if (stockUnit.lot_number?.name) {
    parts.push(`Lot #: ${stockUnit.lot_number.name}`);
  }

  if (stockUnit.quality_grade) {
    parts.push(`Grade: ${stockUnit.quality_grade}`);
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
