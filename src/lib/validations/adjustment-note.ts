import { z } from "zod";
import { positiveNumberSchema } from "./common";

// ============================================================================
// ADJUSTMENT NOTE ITEM SCHEMA
// ============================================================================

/**
 * Schema for adjustment note line item
 */
export const adjustmentNoteItemSchema = z.object({
  product_id: z.string().uuid({ message: "Invalid product" }),
  quantity: positiveNumberSchema,
  rate: positiveNumberSchema,
  gst_rate: z.number().min(0).max(100, "GST rate cannot exceed 100%"),
});

// ============================================================================
// BASE ADJUSTMENT NOTE SCHEMA
// ============================================================================

/**
 * Base schema with common fields for both credit and debit notes
 */
export const baseAdjustmentNoteSchema = z.object({
  invoice_id: z.string().uuid({ message: "Invoice is required" }),
  warehouse_id: z.string().uuid({ message: "Warehouse is required" }),
  adjustment_date: z.date({ message: "Adjustment date is required" }),
  reason: z
    .string()
    .min(1, "Reason is required")
    .max(500, "Reason cannot exceed 500 characters"),
  notes: z.string().max(1000, "Notes cannot exceed 1000 characters").nullable(),
  attachments: z.array(z.string().url()).nullable(),
  items: z
    .array(adjustmentNoteItemSchema)
    .min(1, "At least one item is required"),
});

// ============================================================================
// CREDIT NOTE SCHEMA
// ============================================================================

/**
 * Schema for credit note (reduces invoice outstanding)
 */
export const creditNoteSchema = baseAdjustmentNoteSchema.extend({
  adjustment_type: z.literal("credit"),
});

// ============================================================================
// DEBIT NOTE SCHEMA
// ============================================================================

/**
 * Schema for debit note (increases invoice outstanding)
 */
export const debitNoteSchema = baseAdjustmentNoteSchema.extend({
  adjustment_type: z.literal("debit"),
});

// ============================================================================
// COMBINED SCHEMA (DISCRIMINATED UNION)
// ============================================================================

/**
 * Combined adjustment note schema
 * Discriminated by adjustment_type
 */
export const adjustmentNoteSchema = z.discriminatedUnion("adjustment_type", [
  creditNoteSchema,
  debitNoteSchema,
]);

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type AdjustmentNoteFormData = z.infer<typeof adjustmentNoteSchema>;
export type AdjustmentNoteItemFormData = z.infer<
  typeof adjustmentNoteItemSchema
>;
export type CreditNoteFormData = z.infer<typeof creditNoteSchema>;
export type DebitNoteFormData = z.infer<typeof debitNoteSchema>;
