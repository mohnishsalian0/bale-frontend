import { z } from "zod";
import { TRANSPORT_TYPES } from "@/types/database/enums";
import { optionalString } from "./common";

/**
 * Goods Transfer form validation schema
 * Used for warehouse-to-warehouse stock unit transfers
 */

export const goodsTransferSchema = z
  .object({
    // Warehouse selection
    fromWarehouseId: z.string().uuid("Invalid source warehouse"),
    toWarehouseId: z.string().uuid("Invalid destination warehouse"),

    // Stock units (array of IDs)
    stockUnitIds: z
      .array(z.string().uuid())
      .min(1, "Please select at least one stock unit to transfer"),

    // Transfer details
    transferDate: z.string().min(1, "Transfer date is required"),
    expectedDeliveryDate: optionalString,
    transportType: z.enum(TRANSPORT_TYPES).nullable(),
    transportReferenceNumber: z
      .string()
      .trim()
      .max(50, "Reference number must not exceed 50 characters")
      .transform((val) => (val === "" ? null : val))
      .nullable()
      .refine(
        (val) => val === null || /^[a-zA-Z0-9/_-]+$/.test(val),
        "Reference number can only contain letters, numbers, hyphen (-), slash (/), and underscore (_)",
      ),
    notes: optionalString,
  })
  .refine((data) => data.fromWarehouseId !== data.toWarehouseId, {
    message: "Source and destination warehouses must be different",
    path: ["toWarehouseId"],
  });

/**
 * Type inference for goods transfer form data
 */
export type GoodsTransferFormData = z.infer<typeof goodsTransferSchema>;
