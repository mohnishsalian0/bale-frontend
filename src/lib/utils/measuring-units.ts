import type { MeasuringUnit } from "@/types/database/enums";

/**
 * Map measuring units to their abbreviated forms
 */
export const MEASURING_UNIT_ABBREVIATIONS: Record<MeasuringUnit, string> = {
  metre: "mtr",
  yard: "yd",
  kilogram: "kg",
  unit: "unit",
};

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
 * Format a Map of unit quantities as a string with "+" separator
 * Example: "100 m + 50 kg + 20 pc"
 * @param unitMap - Map of unit -> quantity
 * @param hideZeros - Whether to hide units with zero quantity (default: true)
 */
export function formatQuantitiesByUnit(
  unitMap: Map<string, number>,
  hideZeros: boolean = true,
): string {
  const entries = Array.from(unitMap.entries())
    .filter(([_, qty]) => !hideZeros || qty > 0) // Hide zero values if requested
    .map(([unit, qty]) => `${qty.toFixed(2)} ${unit}`);

  return entries.length > 0 ? entries.join(" + ") : "0";
}
