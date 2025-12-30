import { z } from "zod";
import {
  INVOICE_TYPES,
  INVOICE_TAX_TYPES,
  DISCOUNT_TYPES,
} from "@/types/database/enums";
import { positiveNumberSchema, optionalString } from "./common";

/**
 * Invoice item validation schema
 * Each line item in an invoice
 * Tax type and GST rate are pulled from product record
 */
export const invoiceItemSchema = z.object({
  product_id: z.string().uuid({ message: "Product is required" }),
  quantity: positiveNumberSchema,
  rate: positiveNumberSchema,
});

export type InvoiceItemFormData = z.infer<typeof invoiceItemSchema>;

/**
 * Base invoice validation schema
 * Common fields for both sales and purchase invoices
 */
export const baseInvoiceSchema = z.object({
  invoice_type: z.enum(INVOICE_TYPES, {
    message: "Invoice type is required",
  }),
  party_ledger_id: z
    .string()
    .uuid({ message: "Customer/Supplier is required" }),
  warehouse_id: z.string().uuid({ message: "Warehouse is required" }),
  invoice_date: z.date({ message: "Invoice date is required" }),
  payment_terms: optionalString,
  due_date: z.date().nullable(),
  tax_type: z.enum(INVOICE_TAX_TYPES, {
    message: "Tax type is required",
  }),
  discount_type: z.enum(DISCOUNT_TYPES, {
    message: "Discount type is required",
  }),
  discount_value: z.number().min(0).nullable(),
  notes: optionalString,
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
});

/**
 * Sales invoice validation schema
 * Does not require supplier invoice details
 */
export const salesInvoiceSchema = baseInvoiceSchema.extend({
  invoice_type: z.literal("sales"),
});

export type SalesInvoiceFormData = z.infer<typeof salesInvoiceSchema>;

/**
 * Purchase invoice validation schema
 * Supplier invoice number and date are optional
 */
export const purchaseInvoiceSchema = baseInvoiceSchema.extend({
  invoice_type: z.literal("purchase"),
  supplier_invoice_number: optionalString,
  supplier_invoice_date: z.date().nullable(),
});

export type PurchaseInvoiceFormData = z.infer<typeof purchaseInvoiceSchema>;

/**
 * Combined invoice schema
 * Validates based on invoice_type
 */
export const invoiceSchema = z.discriminatedUnion("invoice_type", [
  salesInvoiceSchema,
  purchaseInvoiceSchema,
]);

export type InvoiceFormData = z.infer<typeof invoiceSchema>;
