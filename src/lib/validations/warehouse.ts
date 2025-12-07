import { z } from "zod";
import {
  optionalString,
  optionalPhoneSchema,
  optionalPinCodeSchema,
  warehouseNameSchema,
  optionalPersonalNameSchema,
} from "./common";

/**
 * Warehouse form validation schema
 * Used for creating and editing warehouses
 */

export const warehouseSchema = z.object({
  // Required fields
  name: warehouseNameSchema,

  // Optional contact fields
  contactName: optionalPersonalNameSchema,
  contactNumber: optionalPhoneSchema,

  // Optional address fields (using shared address schema)
  addressLine1: optionalString,
  addressLine2: optionalString,
  city: optionalString,
  state: optionalString,
  country: optionalString,
  pinCode: optionalPinCodeSchema,
});

/**
 * Type inference for warehouse form data
 */
export type WarehouseFormData = z.infer<typeof warehouseSchema>;
