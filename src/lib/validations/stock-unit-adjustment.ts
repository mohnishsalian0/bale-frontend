import { z } from "zod";

/**
 * Stock unit adjustment validation schema
 * Handles both wastage (negative) and found stock (positive) adjustments
 */
export const stockUnitAdjustmentSchema = z.object({
  quantity_adjusted: z.number().refine((val) => val !== 0, {
    message: "Quantity cannot be zero",
  }),
  adjustment_date: z.date(),
  reason: z
    .string()
    .min(3, "Reason must be at least 3 characters")
    .max(500, "Reason must be less than 500 characters")
    .trim(),
});

export type StockUnitAdjustmentFormData = z.infer<
  typeof stockUnitAdjustmentSchema
>;
