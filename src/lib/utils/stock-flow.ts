import {
  InwardWithStockUnitListView,
  OutwardWithOutwardItemListView,
} from "@/types/stock-flow.types";
import { getPartnerName } from "./partner";

import {
  getMeasuringUnitAbbreviation,
  getMeasuringUnit,
} from "./measuring-units";
import { MeasuringUnit } from "@/types/database/enums";

/**
 * Get formatted movement number based on type
 * Returns "GI-{number}" for inward or "GO-{number}" for outward
 *
 * @example
 * // Returns "GI-123"
 * getMovementNumber("inward", 123)
 *
 * @example
 * // Returns "GO-456"
 * getMovementNumber("outward", 456)
 *
 * @param type - The movement type ("inward" or "outward")
 * @param sequenceNumber - The sequence number of the movement
 * @returns A formatted movement number string
 */
export function getMovementNumber(
  type: "inward" | "outward",
  sequenceNumber: number,
): string {
  const prefix = type === "inward" ? "GI" : "GO";
  return `${prefix}-${sequenceNumber}`;
}

/**
 * Get formatted name for a sender
 * Returns partner name if received from partner, otherwise warehouse name if warehouse transfer
 */
export function getSenderName(
  inward: Pick<InwardWithStockUnitListView, "partner" | "from_warehouse">,
): string {
  let senderName: string = "Unknown sender";
  if (inward.partner) {
    senderName = getPartnerName(inward.partner);
  } else if (inward.from_warehouse) {
    senderName = inward.from_warehouse.name;
  }

  return senderName;
}

/**
 * Get formatted name for a receiver
 * Returns partner name if sent to partner, otherwise warehouse name if warehouse transfer
 */
export function getReceiverName(
  outward: Pick<OutwardWithOutwardItemListView, "partner" | "to_warehouse">,
): string {
  let receiverName: string = "Unknown receiver";
  if (outward.partner) {
    receiverName = getPartnerName(outward.partner);
  } else if (outward.to_warehouse) {
    receiverName = outward.to_warehouse.name;
  }

  return receiverName;
}

/**
 * Aggregates and formats product information for a given goods inward.
 * It groups items by product, sums their dispatched quantities, and
 * returns a comma-separated string.
 *
 * @example
 * // Returns "Cotton Denim (100 m), Polyester (50 units)"
 *
 * @param inward - The goods inward object, containing stock_units.
 * @returns A formatted string summarizing products and quantities.
 */
export function getInwardProductsSummary(
  inward: Pick<InwardWithStockUnitListView, "stock_units">,
): string {
  const stock_units = inward.stock_units || [];

  if (stock_units.length === 0) {
    return "No products";
  }

  // 1. Aggregate quantities by product
  const productQuantities = new Map<
    string,
    { name: string; quantity: number; unit: MeasuringUnit }
  >();

  for (const unit of stock_units) {
    const product = unit?.product;
    const quantity = unit.initial_quantity;

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
 * Aggregates and formats product information for a given goods outward.
 * It groups items by product, sums their dispatched quantities, and
 * returns a comma-separated string.
 *
 * @example
 * // Returns "Cotton Denim (100 m), Polyester (50 units)"
 *
 * @param outward - The goods outward object, containing goods_outward_items.
 * @returns A formatted string summarizing products and quantities.
 */
export function getOutwardProductsSummary(
  outward: Pick<OutwardWithOutwardItemListView, "goods_outward_items">,
): string {
  const items = outward.goods_outward_items || [];

  if (items.length === 0) {
    return "No products";
  }

  // 1. Aggregate quantities by product
  const productQuantities = new Map<
    string,
    { name: string; quantity: number; unit: MeasuringUnit }
  >();

  for (const item of items) {
    const product = item.stock_unit?.product;
    const quantity = item.quantity_dispatched;

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
 * Aggregates quantities by measuring unit for a goods inward.
 * Returns a formatted string like "100 mtr + 50 kg + 25 pcs"
 *
 * @example
 * // Returns "100 mtr + 50 kg"
 *
 * @param inward - The goods inward object, containing stock_units.
 * @returns A formatted string with quantities grouped by measuring unit.
 */
export function getInwardQuantitiesByUnit(
  inward: Pick<InwardWithStockUnitListView, "stock_units">,
): Map<MeasuringUnit, number> {
  const stock_units = inward.stock_units || [];

  if (stock_units.length === 0) {
    return new Map();
  }

  // Aggregate quantities by measuring unit
  const quantitiesMap = new Map<MeasuringUnit, number>();
  stock_units.forEach((unit) => {
    const product = unit?.product;
    if (!product?.measuring_unit) return; // Skip if product or measuring_unit is missing

    const measuringUnit = getMeasuringUnit(product);
    const qty = Number(unit.initial_quantity) || 0;
    quantitiesMap.set(
      measuringUnit,
      (quantitiesMap.get(measuringUnit) || 0) + qty,
    );
  });

  return quantitiesMap;
}

/**
 * Aggregates quantities by measuring unit for a goods outward.
 * Returns a formatted string like "100 mtr + 50 kg + 25 pcs"
 *
 * @example
 * // Returns "100 mtr + 50 kg"
 *
 * @param outward - The goods outward object, containing goods_outward_items.
 * @returns A formatted string with quantities grouped by measuring unit.
 */
export function getOutwardQuantitiesByUnit(
  outward: Pick<OutwardWithOutwardItemListView, "goods_outward_items">,
): Map<MeasuringUnit, number> {
  const items = outward.goods_outward_items || [];

  if (items.length === 0) {
    return new Map();
  }

  // Aggregate quantities by measuring unit
  const quantitiesMap = new Map<MeasuringUnit, number>();
  items.forEach((item) => {
    const product = item.stock_unit?.product;
    if (!product?.measuring_unit) return; // Skip if product or measuring_unit is missing

    const measuringUnit = getMeasuringUnit(product);
    const qty = Number(item.quantity_dispatched) || 0;
    quantitiesMap.set(
      measuringUnit,
      (quantitiesMap.get(measuringUnit) || 0) + qty,
    );
  });

  return quantitiesMap;
}
