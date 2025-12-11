/**
 * Database Enums
 * Type definitions for database enum fields
 */

export type UserRole = "admin" | "staff";
export const USER_ROLES = ["admin", "staff"] as const;

export type PartnerType = "customer" | "vendor" | "supplier" | "agent";
export const PARTNER_TYPES = ["customer", "vendor", "supplier", "agent"] as const;

export type AttributeGroup = "material" | "color" | "tag";
export const ATTRIBUTE_GROUPS = ["material", "color", "tag"] as const;

export type ProductStockStatus = "in_stock" | "low_stock" | "out_of_stock";

export type MaterialType =
  // Natural Fibers
  | "Cotton"
  | "Silk"
  | "Wool"
  | "Linen"
  | "Jute"
  | "Hemp"
  | "Cashmere"
  | "Mohair"
  | "Alpaca"
  // Synthetic Fibers
  | "Polyester"
  | "Nylon"
  | "Acrylic"
  | "Spandex"
  | "Lycra"
  | "Rayon"
  | "Viscose"
  | "Modal"
  // Semi-Synthetic
  | "Bamboo"
  | "Tencel"
  | "Cupro"
  // Specialty/Technical
  | "Microfiber"
  | "Fleece"
  | "Denim"
  | "Canvas"
  | "Twill"
  | "Satin"
  | "Chiffon"
  | "Georgette"
  | "Organza"
  | "Taffeta"
  | "Velvet"
  | "Corduroy"
  | "Jacquard"
  | "Brocade"
  // Blends & Custom
  | "Cotton-Polyester"
  | "Cotton-Spandex"
  | "Cotton-Linen"
  | "Poly-Cotton"
  | "Wool-Silk"
  | "Silk-Cotton"
  | "Blend"
  | "Custom";

export type StockType = "roll" | "batch" | "piece";
export const STOCK_TYPES = ["roll", "batch", "piece"] as const;

export type MeasuringUnit = "metre" | "yard" | "kilogram" | "unit" | "piece";
export const MEASURING_UNITS = ["metre", "yard", "kilogram", "unit", "piece"] as const;

export type StockUnitStatus = "full" | "partial" | "empty" | "removed";

export type SalesOrderStatus =
  | "approval_pending"
  | "in_progress"
  | "completed"
  | "cancelled";

export type PurchaseOrderStatus =
  | "approval_pending"
  | "in_progress"
  | "completed"
  | "cancelled";

export type DiscountType = "none" | "percentage" | "flat_amount";

export type JobWorkStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled";

export type InwardLinkToType =
  | "purchase_order"
  | "job_work"
  | "sales_return"
  | "other";

export type OutwardLinkToType =
  | "sales_order"
  | "job_work"
  | "purchase_return"
  | "other";

export type JobWorkItemType = "raw_material" | "finished_goods";

/**
 * Source of order/customer record creation
 */
export type Source =
  | "manual" // Created by staff in app
  | "online_store" // Customer order from e-commerce catalog
  | "import" // Bulk CSV/Excel import
  | "api" // REST API integration
  | "whatsapp" // WhatsApp Business chat
  | "phone" // Phone order taken by staff
  | "email"; // Email order

/**
 * Validate if string is valid Source
 */
export function isValidSource(value: string): value is Source {
  return [
    "manual",
    "online_store",
    "import",
    "api",
    "whatsapp",
    "phone",
    "email",
  ].includes(value);
}
