import { z } from "zod";
import { PARTNER_TYPES } from "@/types/database/enums";
import {
  optionalString,
  optionalPhoneSchema,
  optionalEmailSchema,
  optionalPinCodeSchema,
  optionalGstSchema,
  optionalPanSchema,
  optionalPersonalNameSchema,
  companyNameSchema,
} from "./common";

/**
 * Partner form validation schema
 * Used for creating and editing partners (customers, suppliers, vendors, agents)
 */

export const partnerSchema = z
  .object({
    // Required fields
    partnerType: z.enum(PARTNER_TYPES, {
      message: "Partner type is required",
    }),
    firstName: optionalPersonalNameSchema,
    lastName: optionalPersonalNameSchema,
    phoneNumber: optionalPhoneSchema,
    email: optionalEmailSchema,

    // Required business details
    companyName: companyNameSchema,

    // Credit limit
    creditLimitEnabled: z.boolean().default(false),
    creditLimit: z.coerce.number().min(0).default(0),

    // Optional address fields
    addressLine1: optionalString,
    addressLine2: optionalString,
    city: optionalString,
    state: optionalString,
    country: optionalString,
    pinCode: optionalPinCodeSchema,

    // Optional tax details (with format validation)
    gstNumber: optionalGstSchema,
    panNumber: optionalPanSchema,

    // Optional additional details
    notes: optionalString,
  })
  .refine(
    (data) => {
      // If credit limit is enabled, credit limit must be greater than 0
      if (data.creditLimitEnabled && data.creditLimit <= 0) {
        return false;
      }
      return true;
    },
    {
      message: "Credit limit must be greater than 0 when enabled",
      path: ["creditLimit"],
    },
  );

/**
 * Type inference for partner form data
 */
export type PartnerFormData = z.infer<typeof partnerSchema>;
