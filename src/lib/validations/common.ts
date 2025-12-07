import { z } from "zod";

/**
 * Shared validation patterns and schemas
 * Used across multiple forms for consistency
 */

// Regex patterns for Indian formats
export const PHONE_REGEX = /^[6-9]\d{9}$/; // Indian mobile: starts with 6-9, 10 digits
export const PIN_CODE_REGEX = /^\d{6}$/; // 6 digits
export const GST_REGEX =
  /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/; // 15 chars GST format
export const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]{1}$/; // 10 chars PAN format
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email format

/**
 * Transform empty strings to null
 * Useful for optional fields that should be stored as null instead of empty string
 */
export const optionalString = z
  .string()
  .trim()
  .transform((val) => (val === "" ? null : val))
  .nullable();

/**
 * Phone number validation (Indian format)
 * 10 digits starting with 6-9
 */
export const phoneNumberSchema = z.string().trim().regex(PHONE_REGEX, {
  message: "Please enter a valid 10-digit phone number",
});

/**
 * Optional phone number (empty string becomes null)
 */
export const optionalPhoneSchema = z
  .string()
  .trim()
  .transform((val) => (val === "" ? null : val))
  .nullable()
  .refine(
    (val) => val === null || PHONE_REGEX.test(val),
    "Please enter a valid 10-digit phone number",
  );

/**
 * Email validation
 */
export const emailSchema = z
  .string()
  .trim()
  .regex(EMAIL_REGEX, { message: "Please enter a valid email address" });

/**
 * Optional email (empty string becomes null)
 */
export const optionalEmailSchema = z
  .string()
  .trim()
  .transform((val) => (val === "" ? null : val))
  .nullable()
  .refine(
    (val) => val === null || EMAIL_REGEX.test(val),
    "Please enter a valid email address",
  );

/**
 * PIN code validation (Indian 6-digit format)
 */
export const pinCodeSchema = z
  .string()
  .trim()
  .regex(PIN_CODE_REGEX, { message: "Please enter a valid 6-digit PIN code" });

/**
 * Optional PIN code
 */
export const optionalPinCodeSchema = z
  .string()
  .trim()
  .transform((val) => (val === "" ? null : val))
  .nullable()
  .refine(
    (val) => val === null || PIN_CODE_REGEX.test(val),
    "Please enter a valid 6-digit PIN code",
  );

/**
 * GST number validation (15-character format)
 */
export const gstSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(GST_REGEX, { message: "Please enter a valid GST number" });

/**
 * Optional GST number
 */
export const optionalGstSchema = z
  .string()
  .trim()
  .toUpperCase()
  .transform((val) => (val === "" ? null : val))
  .nullable()
  .refine(
    (val) => val === null || GST_REGEX.test(val),
    "Please enter a valid GST number",
  );

/**
 * PAN number validation (10-character format)
 */
export const panSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(PAN_REGEX, { message: "Please enter a valid PAN number" });

/**
 * Optional PAN number
 */
export const optionalPanSchema = z
  .string()
  .trim()
  .toUpperCase()
  .transform((val) => (val === "" ? null : val))
  .nullable()
  .refine(
    (val) => val === null || PAN_REGEX.test(val),
    "Please enter a valid PAN number",
  );

/**
 * Address schema (reusable across forms)
 * All fields are optional
 */
export const addressSchema = z.object({
  addressLine1: optionalString,
  addressLine2: optionalString,
  city: optionalString,
  state: optionalString,
  country: optionalString,
  pinCode: optionalPinCodeSchema,
});

/**
 * Positive number validation
 * Used for prices, quantities, etc.
 */
export const positiveNumberSchema = z
  .number()
  .positive({ message: "Must be a positive number" });

/**
 * Optional positive number (empty becomes null)
 */
export const optionalPositiveNumberSchema = z
  .string()
  .trim()
  .transform((val) => (val === "" ? null : parseFloat(val)))
  .pipe(z.number().positive().nullable())
  .or(z.null());

// =============================================================================
// Name and Text Field Validation with Regex Patterns
// =============================================================================

/**
 * Personal name validation (First name, Last name, Contact person)
 * Allows: Letters, spaces, hyphens, apostrophes, periods
 * Blocks: Numbers, special symbols
 */
export const personalNameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(50, "Name must not exceed 50 characters")
  .regex(/^[a-zA-Z\s'.-]+$/, {
    message:
      "Name can only contain letters, spaces, hyphen (-), apostrophe ('), and period (.)",
  })
  .transform((val) => val.replace(/\s+/g, " ")); // Collapse multiple spaces

/**
 * Optional personal name validation
 */
export const optionalPersonalNameSchema = z
  .string()
  .trim()
  .transform((val) => (val === "" ? null : val))
  .nullable()
  .refine(
    (val) =>
      val === null ||
      (val.length >= 2 && val.length <= 50 && /^[a-zA-Z\s'.-]+$/.test(val)),
    "Name can only contain letters, spaces, hyphen (-), apostrophe ('), and period (.) (2-50 chars)",
  )
  .transform((val) => (val ? val.replace(/\s+/g, " ") : null));

/**
 * Company/Business name validation
 * Allows: Letters, numbers, spaces, common business punctuation (&, -, ., ,, ')
 * Blocks: Most special symbols
 */
export const companyNameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name must not exceed 100 characters")
  .regex(/^[a-zA-Z0-9\s&,'.-]+$/, {
    message:
      "Name can only contain letters, numbers, ampersand (&), comma (,), apostrophe ('), period (.) and hyphen (-)",
  })
  .transform((val) => val.replace(/\s+/g, " "));

/**
 * Optional company/business name validation
 */
export const optionalCompanyNameSchema = z
  .string()
  .trim()
  .transform((val) => (val === "" ? null : val))
  .nullable()
  .refine(
    (val) =>
      val === null ||
      (val.length >= 2 &&
        val.length <= 100 &&
        /^[a-zA-Z0-9\s&,'.-]+$/.test(val)),
    "Name can only contain letters, numbers, ampersand (&), comma (,), apostrophe ('), period (.) and hyphen (-) (2-100 chars)",
  )
  .transform((val) => (val ? val.replace(/\s+/g, " ") : null));

/**
 * Warehouse name validation
 * Allows: Letters, numbers, spaces, hyphens, underscores
 */
export const warehouseNameSchema = z
  .string()
  .trim()
  .min(2, "Warehouse name must be at least 2 characters")
  .max(100, "Warehouse name must not exceed 100 characters")
  .regex(/^[a-zA-Z0-9\s_-]+$/, {
    message:
      "Warehouse name can only contain letters, numbers, spaces, hyphen (-), and underscore (_)",
  })
  .transform((val) => val.replace(/\s+/g, " "));

/**
 * Product name validation
 * Allows: Letters, numbers, spaces, hyphens, slashes, parentheses
 */
export const productNameSchema = z
  .string()
  .trim()
  .min(2, "Product name must be at least 2 characters")
  .max(100, "Product name must not exceed 100 characters")
  .regex(/^[a-zA-Z0-9\s/()-]+$/, {
    message:
      "Product name can only contain letters, numbers, slash (/), hyphen (-), parentheses (())",
  })
  .transform((val) => val.replace(/\s+/g, " "));

/**
 * Code/Identifier validation (Supplier numbers, location codes without spaces)
 * Allows: Letters, numbers, hyphens, slashes, underscores
 */
export const codeSchema = z
  .string()
  .trim()
  .max(50, "Code must not exceed 50 characters")
  .regex(/^[a-zA-Z0-9/_-]+$/, {
    message:
      "Code can only contain letters, numbers, hyphen (-), slash (/), and underscore (_)",
  });

/**
 * Optional code validation
 */
export const optionalCodeSchema = z
  .string()
  .trim()
  .transform((val) => (val === "" ? undefined : val))
  .optional()
  .refine(
    (val) => val === undefined || /^[a-zA-Z0-9/_-]+$/.test(val),
    "Code can only contain letters, numbers, hyphen (-), slash (/), and underscore (_)",
  );

/**
 * Location validation (allows spaces and commas for "Aisle 5, Bin 3")
 * Allows: Letters, numbers, spaces, hyphens, slashes, commas
 */
export const locationSchema = z
  .string()
  .trim()
  .max(100, "Location must not exceed 100 characters")
  .regex(/^[a-zA-Z0-9\s,/-]+$/, {
    message:
      "Location can only contain letters, numbers, spaces, comma (,), hyphen (-), and slash (/)",
  })
  .transform((val) => val.replace(/\s+/g, " "));

/**
 * Optional location validation
 */
export const optionalLocationSchema = z
  .string()
  .trim()
  .transform((val) => (val === "" ? undefined : val))
  .optional()
  .refine(
    (val) => val === undefined || /^[a-zA-Z0-9\s,/-]+$/.test(val),
    "Location can only contain letters, numbers, spaces, comma (,), hyphen (-), and slash (/)",
  )
  .transform((val) => (val ? val.replace(/\s+/g, " ") : undefined));

/**
 * Quality/Grade validation
 * Allows: Letters, numbers, spaces, plus, minus
 */
export const gradeSchema = z
  .string()
  .trim()
  .max(50, "Grade must not exceed 50 characters")
  .regex(/^[a-zA-Z0-9\s+-]+$/, {
    message:
      "Grade can only contain letters, numbers, spaces, plus (+), and minus (-)",
  })
  .transform((val) => val.replace(/\s+/g, " "));

/**
 * Optional grade validation
 */
export const optionalGradeSchema = z
  .string()
  .trim()
  .transform((val) => (val === "" ? undefined : val))
  .optional()
  .refine(
    (val) => val === undefined || /^[a-zA-Z0-9\s+-]+$/.test(val),
    "Grade can only contain letters, numbers, spaces, plus (+), and minus (-)",
  )
  .transform((val) => (val ? val.replace(/\s+/g, " ") : undefined));
