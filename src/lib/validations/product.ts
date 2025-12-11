import { z } from "zod";
import { STOCK_TYPES, MEASURING_UNITS } from "@/types/database/enums";
import { optionalString, productNameSchema } from "./common";

/**
 * Product form validation schema
 * Used for creating and editing products with conditional validation
 */

export const productSchema = z
  .object({
    // Required fields
    name: productNameSchema,

    stockType: z.enum(STOCK_TYPES, {
      message: "Stock type is required",
    }),

    measuringUnit: z.enum(MEASURING_UNITS).nullable(),

    // Optional catalog display
    showOnCatalog: z.boolean().default(true),

    // Required feature fields
    materials: z
      .array(z.object({ value: z.string(), label: z.string() }))
      .min(1, "Please select atleast 1 material")
      .default([]),
    colors: z
      .array(z.object({ value: z.string(), label: z.string() }))
      .min(1, "Please select atleast 1 color")
      .default([]),

    // Optional tags
    tags: z
      .array(z.object({ value: z.string(), label: z.string() }))
      .default([]),

    // Optional numeric fields with validation
    gsm: z
      .string()
      .trim()
      .transform((val) => (val === "" ? null : parseInt(val)))
      .pipe(
        z
          .number()
          .int()
          .min(50, "GSM must be at least 50")
          .max(500, "GSM must not exceed 500")
          .nullable(),
      )
      .or(z.null()),

    threadCount: z
      .string()
      .trim()
      .transform((val) => (val === "" ? null : parseInt(val)))
      .pipe(
        z.number().int().positive("Thread count must be positive").nullable(),
      )
      .or(z.null()),

    // Optional pricing fields
    costPrice: z
      .string()
      .trim()
      .transform((val) => (val === "" ? null : parseFloat(val)))
      .pipe(
        z.number().nonnegative("Cost price must be 0 or greater").nullable(),
      )
      .or(z.null()),

    sellingPrice: z
      .string()
      .trim()
      .transform((val) => (val === "" ? null : parseFloat(val)))
      .pipe(
        z.number().nonnegative("Selling price must be 0 or greater").nullable(),
      )
      .or(z.null()),

    // Optional stock alert fields
    minStockAlert: z.boolean().default(false),
    minStockThreshold: z
      .string()
      .trim()
      .transform((val) => (val === "" ? null : parseInt(val)))
      .pipe(
        z
          .number()
          .int()
          .nonnegative("Minimum stock threshold must be 0 or greater")
          .nullable(),
      )
      .or(z.null()),

    // Optional additional details
    hsnCode: optionalString,
    notes: optionalString,
  })
  .refine(
    (data) => {
      // Measuring unit is required only when stock type is "roll"
      if (data.stockType === "roll") {
        return data.measuringUnit !== null;
      }
      return true;
    },
    {
      message: "Measuring unit is required for roll type products",
      path: ["measuringUnit"],
    },
  )
  .refine(
    (data) => {
      // If min stock alert is enabled, threshold must be set
      if (data.minStockAlert) {
        return data.minStockThreshold !== null;
      }
      return true;
    },
    {
      message: "Minimum stock threshold is required when alert is enabled",
      path: ["minStockThreshold"],
    },
  );

/**
 * Type inference for product form data
 */
export type ProductFormData = z.infer<typeof productSchema>;
