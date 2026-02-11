import { z } from "zod";
import { optionalString, positiveNumberSchema } from "./common";

/**
 * Goods Convert form validation schemas
 * Used for fabric conversion/processing tracking (dyeing, embroidery, printing, etc.)
 */

// =====================================================
// CREATE CONVERT VALIDATION
// =====================================================

export const createConvertSchema = z.object({
  warehouse_id: z.string().uuid({ message: "Warehouse is required" }),
  service_type_attribute_id: z.string().trim().optional(),
  output_product_id: z.string().uuid({ message: "Output product is required" }),
  vendor_id: z.string().uuid({ message: "Vendor is required" }),
  agent_id: z.string().uuid().optional().or(z.literal("")),
  reference_number: z
    .string()
    .trim()
    .max(50, "Reference number must not exceed 50 characters")
    .transform((val) => (val === "" ? undefined : val))
    .optional(),
  job_work_id: z.string().uuid().optional().or(z.literal("")),
  start_date: z.date({ error: "Start date is required" }),
  notes: optionalString,
});

export type CreateConvertFormData = z.infer<typeof createConvertSchema>;

// =====================================================
// UPDATE CONVERT VALIDATION
// =====================================================

export const updateConvertSchema = z.object({
  service_type_attribute_id: z.string().trim().optional(),
  vendor_id: z.string().uuid({ message: "Vendor is required" }),
  agent_id: z.string().uuid().optional().or(z.literal("")),
  reference_number: z
    .string()
    .trim()
    .max(50, "Reference number must not exceed 50 characters")
    .transform((val) => (val === "" ? undefined : val))
    .optional(),
  start_date: z.date({ error: "Start date is required" }),
  notes: optionalString,
});

export type UpdateConvertFormData = z.infer<typeof updateConvertSchema>;

// =====================================================
// COMPLETE CONVERT VALIDATION
// =====================================================

export const completeConvertSchema = z.object({
  completion_date: z.date({ error: "Completion date is required" }),
});

export type CompleteConvertFormData = z.infer<typeof completeConvertSchema>;

// =====================================================
// OUTPUT STOCK UNIT VALIDATION (for completion flow)
// =====================================================

export const convertOutputUnitSchema = z
  .object({
    // Quantity fields
    quantity: positiveNumberSchema,
    wastage_quantity: z.number().min(0).optional(),

    // Stock unit details
    stock_number: optionalString,
    lot_number: optionalString,
    grade: optionalString,
    manufactured_on: z.date().optional(),
    location: optionalString,
    notes: optionalString,

    // Wastage details
    wastage_reason: z
      .string()
      .trim()
      .optional()
      .transform((val) => (val === "" ? undefined : val)),

    // Count for creating multiple identical units
    count: z.number().int().min(1).default(1),
  })
  .refine(
    (data) => {
      // If wastage_quantity is provided, wastage_reason should also be provided
      if (data.wastage_quantity && data.wastage_quantity > 0) {
        return !!data.wastage_reason && data.wastage_reason.trim() !== "";
      }
      return true;
    },
    {
      message: "Wastage reason is required when wastage quantity is specified",
      path: ["wastage_reason"],
    },
  );

export type ConvertOutputUnitFormData = z.infer<typeof convertOutputUnitSchema>;

// =====================================================
// INPUT STOCK UNIT VALIDATION
// =====================================================

export const convertInputItemSchema = z.object({
  stock_unit_id: z.string().uuid({ message: "Vendor is required" }),
  quantity_consumed: positiveNumberSchema,
});

export type ConvertInputItemFormData = z.infer<typeof convertInputItemSchema>;

// =====================================================
// CANCEL CONVERT VALIDATION
// =====================================================

export const cancelConvertSchema = z.object({
  cancellation_reason: z
    .string()
    .trim()
    .min(1, "Cancellation reason is required"),
});

export type CancelConvertFormData = z.infer<typeof cancelConvertSchema>;
