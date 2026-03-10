import type { ConvertListView } from "@/types/goods-converts.types";
import type { MeasuringUnit } from "@/types/database/enums";
import {
  getMeasuringUnitAbbreviation,
  getMeasuringUnit,
} from "./measuring-units";

/**
 * Get formatted convert number
 * Returns "GC-{number}" for goods convert
 *
 * @example
 * // Returns "GC-123"
 * getConvertNumber(123)
 *
 * @param sequenceNumber - The sequence number of the convert
 * @returns A formatted convert number string
 */
export function getConvertNumber(sequenceNumber: number): string {
  return `GC-${sequenceNumber}`;
}

/**
 * Aggregates and formats input product information for a goods convert.
 * Groups items by product, sums their consumed quantities, and returns
 * a comma-separated string.
 *
 * @example
 * // Returns "Cotton Roll (150 m), Silk Fabric (50 m)"
 *
 * @param convert - The goods convert object, containing input_items with consumed quantities.
 * @returns A formatted string summarizing input products and consumed quantities.
 */
export function getInputProductsSummary(
  convert: Pick<ConvertListView, "input_items">,
): string {
  const input_items = convert.input_items || [];

  if (input_items.length === 0) {
    return "No products";
  }

  // 1. Aggregate quantities by product
  const productQuantities = new Map<
    string,
    { name: string; quantity: number; unit: MeasuringUnit }
  >();

  for (const item of input_items) {
    const product = item.stock_unit?.product;
    const quantity = item.quantity_consumed;

    if (product?.id) {
      const existing = productQuantities.get(product.id);
      if (existing) {
        existing.quantity += quantity;
      } else {
        productQuantities.set(product.id, {
          name: product.name || "Unknown Product",
          quantity: quantity,
          unit: product.measuring_unit as MeasuringUnit,
        });
      }
    }
  }

  // 2. Format the output string
  const productStrings = Array.from(productQuantities.values()).map(
    ({ name, quantity, unit }) => {
      const unitAbbr = getMeasuringUnitAbbreviation(unit);
      return `${name} (${quantity.toFixed(2)} ${unitAbbr})`;
    },
  );

  return productStrings.join(", ");
}

/**
 * Aggregates consumed quantities by measuring unit for a goods convert.
 * Returns a Map of measuring units to total consumed quantities.
 *
 * @example
 * // Returns Map { 'meter' => 150, 'kilogram' => 50 }
 *
 * @param convert - The goods convert object, containing input_items.
 * @returns A Map with consumed quantities grouped by measuring unit.
 */
export function getInputQuantitiesByUnit(
  convert: Pick<ConvertListView, "input_items">,
): Map<MeasuringUnit, number> {
  const input_items = convert.input_items || [];

  if (input_items.length === 0) {
    return new Map();
  }

  // Aggregate quantities by measuring unit
  const quantitiesMap = new Map<MeasuringUnit, number>();
  input_items.forEach((item) => {
    const product = item.stock_unit?.product;
    if (!product?.measuring_unit) return; // Skip if product or measuring_unit is missing

    const measuringUnit = getMeasuringUnit(product);
    const qty = Number(item.quantity_consumed) || 0;
    quantitiesMap.set(
      measuringUnit,
      (quantitiesMap.get(measuringUnit) || 0) + qty,
    );
  });

  return quantitiesMap;
}
