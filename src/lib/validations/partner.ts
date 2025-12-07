import { z } from "zod";
import { PARTNER_TYPES } from "@/types/database/enums";
import {
  optionalString,
  phoneNumberSchema,
  optionalEmailSchema,
  optionalPinCodeSchema,
  optionalGstSchema,
  optionalPanSchema,
  personalNameSchema,
  optionalCompanyNameSchema,
} from "./common";

/**
 * Partner form validation schema
 * Used for creating and editing partners (customers, suppliers, vendors, agents)
 */

export const partnerSchema = z.object({
  // Required fields
  partnerType: z.enum(PARTNER_TYPES, {
    message: "Partner type is required",
  }),
  firstName: personalNameSchema,
  lastName: personalNameSchema,
  phoneNumber: phoneNumberSchema,
  email: optionalEmailSchema,

  // Optional business details
  businessType: optionalCompanyNameSchema,
  companyName: optionalCompanyNameSchema,

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
});

/**
 * Type inference for partner form data
 */
export type PartnerFormData = z.infer<typeof partnerSchema>;
