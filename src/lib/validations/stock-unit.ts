import { z } from "zod";
import {
  optionalGradeSchema,
  optionalCodeSchema,
  optionalLocationSchema,
} from "./common";
import type { StockType } from "@/types/database/enums";

/**
 * Stock unit form validation schema
 * Validates stock unit creation/edit with quantity validation based on stock type
 */

/**
 * Create stock unit schema with dynamic quantity validation
 * @param stockType - The type of stock (roll, batch, or piece)
 * @returns Zod schema for stock unit form
 */
export const createStockUnitSchema = (stockType: StockType) => {
  // Base quantity validation - must be positive
  let quantitySchema = z
    .number({
      message: "Please enter a valid number",
    })
    .positive({ message: "Quantity must be greater than 0" });

  // For batch and piece types, quantity must be a whole number
  if (stockType === "batch" || stockType === "piece") {
    quantitySchema = quantitySchema.int({
      message: "Quantity must be a whole number for batch/piece items",
    });
  }

  return z.object({
    quantity: quantitySchema,
    supplier_number: optionalCodeSchema,
    grade: optionalGradeSchema,
    manufactured_on: z.date().nullish(),
    location: optionalLocationSchema,
    notes: z.string().trim().optional(),
  });
};

/**
 * Type inference for stock unit form data
 */
export type StockUnitFormData = z.infer<
  ReturnType<typeof createStockUnitSchema>
>;

/**
 * Update stock unit schema - for editing existing stock units
 * Note: initial_quantity is excluded as it cannot be changed if has_outward is true
 * Other fields (grade, supplier_number, location, manufactured_on, notes) can always be edited
 */
export const updateStockUnitSchema = z.object({
  supplier_number: optionalCodeSchema,
  grade: optionalGradeSchema,
  manufactured_on: z.date().nullish(),
  location: optionalLocationSchema,
  notes: z.string().trim().optional(),
});

/**
 * Type inference for stock unit update form data
 */
export type StockUnitUpdateFormData = z.infer<typeof updateStockUnitSchema>;
