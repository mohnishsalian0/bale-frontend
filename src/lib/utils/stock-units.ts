import type {
  ScannedStockUnit,
  StockUnitActivity,
  StockUnitActivityEventType,
  StockUnitWithProductDetailView,
} from "@/types/stock-units.types";
import type { ProductActivityEventType } from "@/types/products.types";

// ============================================================================
// ACTIVITY EVENT CONFIG
// ============================================================================

type BadgeColor = "blue" | "green" | "yellow" | "orange" | "red" | "gray";

/**
 * All activity event types across both product-level and stock-unit-level views.
 */
export type ActivityEventType =
  | ProductActivityEventType
  | StockUnitActivityEventType;

/**
 * Display config for a single activity event type.
 * titlePrefix is prepended to the counterparty name when building the row title
 * (e.g. "From", "To", "At"). Empty string means the name is shown as-is or
 * the title is derived specially (transfer → "{from} → {to}").
 */
export interface ActivityEventConfig {
  label: string;
  badgeColor: BadgeColor;
  quantityLabel: string;
  /** Tailwind text colour class for the quantity value. */
  quantityColor: string;
  /**
   * Prefix shown before the counterparty name.
   * e.g. "From Acme Textiles", "To Raj Fabrics", "At Rajan Weaving"
   * Leave empty ("") for event types with no fixed counterparty (transfer, adjustment).
   */
  titlePrefix: string;
}

/**
 * Single source-of-truth config covering every activity event type used across
 * product activity and stock unit activity views.
 *
 * Used in:
 * - products/[product_number]/activity page  (ProductActivityEventType keys)
 * - stock unit details panel                 (StockUnitActivityEventType keys)
 */
export const ACTIVITY_EVENT_CONFIG: Record<
  ActivityEventType,
  ActivityEventConfig
> = {
  // ── Shared event types ────────────────────────────────────────────────────
  inward: {
    label: "Inward",
    badgeColor: "orange",
    quantityLabel: "In",
    quantityColor: "text-yellow-600",
    titlePrefix: "From",
  },
  outward: {
    label: "Outward",
    badgeColor: "green",
    quantityLabel: "Out",
    quantityColor: "text-green-600",
    titlePrefix: "To",
  },
  convert_in: {
    label: "Convert in",
    badgeColor: "blue",
    quantityLabel: "Produced",
    quantityColor: "text-primary-600",
    titlePrefix: "At",
  },
  convert_out: {
    label: "Convert out",
    badgeColor: "blue",
    quantityLabel: "Used",
    quantityColor: "text-primary-600",
    titlePrefix: "At",
  },
  // ── Product-activity-only ─────────────────────────────────────────────────
  transfer_out: {
    label: "Transfer to",
    badgeColor: "gray",
    quantityLabel: "Sent",
    quantityColor: "text-gray-600",
    titlePrefix: "To",
  },
  transfer_in: {
    label: "Transfer from",
    badgeColor: "gray",
    quantityLabel: "Received",
    quantityColor: "text-gray-600",
    titlePrefix: "From",
  },
  // ── Stock-unit-activity-only ──────────────────────────────────────────────
  transfer: {
    label: "Transfer",
    badgeColor: "gray",
    quantityLabel: "Transferred",
    quantityColor: "text-gray-600",
    titlePrefix: "", // special — title is "{from} → {to}", built in helper below
  },
  adjustment: {
    label: "Adjustment",
    badgeColor: "gray",
    quantityLabel: "Adjusted",
    quantityColor: "text-gray-600", // overridden dynamically in component (±)
    titlePrefix: "",
  },
};

/**
 * Build a display title for a product activity row.
 * Applies the titlePrefix from config to counterparty_name.
 * e.g. "From Raj Fabrics", "To Acme", "At Rajan Weaving"
 */
export function getProductActivityTitle(
  eventType: ProductActivityEventType,
  counterpartyName: string | null,
): string {
  const prefix = ACTIVITY_EVENT_CONFIG[eventType]?.titlePrefix;
  if (!counterpartyName) return "—";
  return prefix ? `${prefix} ${counterpartyName}` : counterpartyName;
}

/**
 * Build a display title for a stock unit activity row.
 * - transfer: "{from_warehouse} → {to_warehouse}"
 * - outward:  "To {to_name}"
 * - inward / convert_in / convert_out: applies titlePrefix to from_name
 * - adjustment: "—"
 */
export function getStockUnitActivityTitle(activity: StockUnitActivity): string {
  const eventType = activity.event_type as StockUnitActivityEventType;
  if (eventType === "transfer") {
    return activity.to_name ? `To ${activity.to_name}` : "—";
  }
  const config = ACTIVITY_EVENT_CONFIG[eventType];
  const name = eventType === "outward" ? activity.to_name : activity.from_name;
  if (!name) return "—";
  return config?.titlePrefix ? `${config.titlePrefix} ${name}` : name;
}

// ============================================================================
// SCANNER UTILS
// ============================================================================

/**
 * Transforms StockUnitWithProductDetailView to ScannedStockUnit["stockUnit"]
 * Extracts only the fields needed for scanning flows
 */
export function toScannedStockUnit(
  stockUnit: StockUnitWithProductDetailView,
): ScannedStockUnit["stockUnit"] {
  if (!stockUnit.product) {
    throw new Error("Stock unit must have a product");
  }

  return {
    id: stockUnit.id,
    product_id: stockUnit.product_id,
    remaining_quantity: stockUnit.remaining_quantity,
    stock_number: stockUnit.stock_number,
    product: {
      id: stockUnit.product.id,
      name: stockUnit.product.name,
      stock_type: stockUnit.product.stock_type,
      measuring_unit: stockUnit.product.measuring_unit,
      product_images: stockUnit.product.product_images,
      selling_price_per_unit: stockUnit.product.selling_price_per_unit,
    },
  };
}
