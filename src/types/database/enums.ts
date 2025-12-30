/**
 * Database Enums
 * Type definitions for database enum fields
 */

import type { Database } from "./supabase";

export type UserRole = "admin" | "staff";
export const USER_ROLES = ["admin", "staff"] as const;

export type PartnerType = "customer" | "vendor" | "supplier" | "agent";
export const PARTNER_TYPES = [
  "customer",
  "vendor",
  "supplier",
  "agent",
] as const;

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
export const MEASURING_UNITS = [
  "metre",
  "yard",
  "kilogram",
  "unit",
  "piece",
] as const;

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
export const DISCOUNT_TYPES = ["none", "percentage", "flat_amount"] as const;

export const PAYMENT_TERMS = [
  "Due on receipt",
  "NET 7",
  "NET 15",
  "NET 30",
  "NET 45",
  "NET 60",
  "NET 90",
] as const;

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

export type TransportType = "road" | "rail" | "air" | "sea" | "courier";
export const TRANSPORT_TYPES = [
  "road",
  "rail",
  "air",
  "sea",
  "courier",
] as const;

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

// =====================================================
// ACCOUNTING/INVOICE ENUMS
// =====================================================

/**
 * Invoice type (sales or purchase)
 */
export type InvoiceType = Database["public"]["Enums"]["invoice_type_enum"];
export const INVOICE_TYPES: readonly InvoiceType[] = [
  "sales",
  "purchase",
] as const;

/**
 * Invoice tax type (determines how GST is split)
 * - no_tax: No tax applied on entire invoice
 * - gst: Tax split into CGST + SGST (same state)
 * - igst: Tax applied as IGST (different state)
 */
export type InvoiceTaxType = Database["public"]["Enums"]["tax_type_enum"];
export const INVOICE_TAX_TYPES: readonly InvoiceTaxType[] = [
  "no_tax",
  "gst",
  "igst",
] as const;

/**
 * Product-level tax type
 * - no_tax: Product has no GST
 * - gst: Product has GST (rate stored in gst_rate field)
 */
export type TaxType = Database["public"]["Enums"]["tax_type_enum"];
export const TAX_TYPES: readonly TaxType[] = ["no_tax", "gst"] as const;

/**
 * GST Rate percentages
 * Common GST rates in India
 */
export type GSTRate = 0 | 5 | 12 | 18 | 28;
export const GST_RATES = [0, 5, 12, 18, 28] as const;

/**
 * Adjustment note type
 */
export type AdjustmentType =
  Database["public"]["Enums"]["adjustment_type_enum"];
export const ADJUSTMENT_TYPES: readonly AdjustmentType[] = [
  "credit",
  "debit",
] as const;

/**
 * Payment voucher type
 */
export type VoucherType = Database["public"]["Enums"]["voucher_type_enum"];
export const VOUCHER_TYPES: readonly VoucherType[] = [
  "payment",
  "receipt",
] as const;

/**
 * Payment mode
 */
export type PaymentMode = Database["public"]["Enums"]["payment_mode_enum"];
export const PAYMENT_MODES: readonly PaymentMode[] = [
  "cash",
  "cheque",
  "neft",
  "rtgs",
  "upi",
  "card",
  "other",
] as const;

/**
 * Payment allocation type
 */
export type AllocationType =
  Database["public"]["Enums"]["allocation_type_enum"];
export const ALLOCATION_TYPES: readonly AllocationType[] = [
  "against_ref",
  "advance",
] as const;

/**
 * Invoice status (computed based on outstanding amount, stored in database as VARCHAR)
 */
export type InvoiceStatus = "open" | "partially_paid" | "settled" | "cancelled";
export const INVOICE_STATUSES = ["open", "partially_paid", "settled"] as const;
