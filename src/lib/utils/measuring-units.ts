import type { MeasuringUnit } from "@/types/database/enums";
import { Product } from "@/types/products.types";

/**
 * Map measuring units to their abbreviated forms
 */
export const MEASURING_UNIT_ABBREVIATIONS: Record<MeasuringUnit, string> = {
  metre: "mtr",
  yard: "yd",
  kilogram: "kg",
  unit: "unit",
  piece: "pc",
};
/**
 * Get the measuring unit from a product
 * Now simply returns the measuring_unit field (single source of truth)
 */
export function getMeasuringUnit(
  product: Pick<Product, "measuring_unit"> | null,
): MeasuringUnit {
  if (!product?.measuring_unit) {
    throw new Error("Product or measuring_unit is missing");
  }
  return product.measuring_unit as MeasuringUnit;
}

/**
 * Get the abbreviated form of a measuring unit
 */
export function getMeasuringUnitAbbreviation(
  unit: MeasuringUnit | null | undefined,
): string {
  if (!unit) return "pc";
  return MEASURING_UNIT_ABBREVIATIONS[unit] || unit;
}

/**
 * Pluralize an abbreviated measuring unit based on quantity
 * Only 'pc' (piece) and 'unit' get pluralized
 */
export function pluralizeMeasuringUnitAbbreviation(
  quantity: number,
  abbreviation: string,
): string {
  if (quantity === 1) return abbreviation;

  // Handle special cases that need pluralization
  if (abbreviation === "pc") return "pcs";
  if (abbreviation === "unit") return "units";

  // Other abbreviations (m, yd, kg) don't change
  return abbreviation;
}

/**
 * Interface for items with unit and quantity
 */
export interface QuantityByUnitItem {
  unit: string;
  quantity: number;
}

/**
 * Aggregate quantities by unit type
 * Takes an array of items with unit and quantity, returns a Map of unit -> total quantity
 */
export function aggregateQuantitiesByUnit(
  items: QuantityByUnitItem[],
): Map<string, number> {
  const unitMap = new Map<string, number>();
  items.forEach((item) => {
    const currentTotal = unitMap.get(item.unit) || 0;
    unitMap.set(item.unit, currentTotal + item.quantity);
  });
  return unitMap;
}

/**
 * Format quantities Map with full MeasuringUnit enum keys
 * Converts to abbreviated display format: "100 mtr + 50 kg"
 */
export function formatMeasuringUnitQuantities(
  unitMap: Map<MeasuringUnit, number>,
): string {
  const unitOrder: MeasuringUnit[] = [
    "metre",
    "yard",
    "kilogram",
    "unit",
    "piece",
  ];

  const sortedUnits = Array.from(unitMap.entries())
    .filter(([_, qty]) => qty > 0)
    .sort(([a], [b]) => {
      const indexA = unitOrder.indexOf(a);
      const indexB = unitOrder.indexOf(b);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

  const formatted = sortedUnits
    .map(
      ([unit, qty]) =>
        `${qty.toFixed(0)} ${getMeasuringUnitAbbreviation(unit)}`,
    )
    .join(" + ");

  return formatted || "0";
}
