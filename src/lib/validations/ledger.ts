import { z } from "zod";
import { optionalString } from "./common";
import { LEDGER_TYPES, DR_CR_TYPES } from "@/types/database/enums";

// IFSC code validation (11 characters: 4 letters, 0, 6 alphanumeric)
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const optionalIfscCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .transform((val) => (val === "" ? null : val))
  .nullable()
  .refine(
    (val) => val === null || IFSC_REGEX.test(val),
    "Invalid IFSC format (e.g., SBIN0001234)",
  );

const optionalPositiveDecimalSchema = z
  .number()
  .nonnegative({ message: "Must be a non-negative number" })
  .optional();

export const ledgerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Ledger name is required")
      .max(200, "Ledger name must not exceed 200 characters"),
    parent_group_id: z.string().uuid("Parent group is required"),
    ledger_type: z.enum(LEDGER_TYPES),

    // Opening balance
    opening_balance: optionalPositiveDecimalSchema,
    dr_cr: z.enum(DR_CR_TYPES).optional(),

    // GST configuration
    gst_applicable: z.boolean().optional(),
    gst_rate: optionalPositiveDecimalSchema,
    gst_type: z.enum(["CGST", "SGST", "IGST", "CESS"]).optional(),

    // TDS configuration
    tds_applicable: z.boolean().optional(),
    tds_rate: optionalPositiveDecimalSchema,

    // Bank details
    bank_name: optionalString.refine(
      (val) => !val || val.length <= 200,
      "Bank name must not exceed 200 characters",
    ),
    account_number: optionalString.refine(
      (val) => !val || val.length <= 50,
      "Account number must not exceed 50 characters",
    ),
    ifsc_code: optionalIfscCodeSchema,
    branch_name: optionalString.refine(
      (val) => !val || val.length <= 200,
      "Branch name must not exceed 200 characters",
    ),
  })
  .refine(
    (data) => {
      // GST rate/type required if gst_applicable
      if (data.gst_applicable) {
        return data.gst_rate !== undefined && data.gst_type !== undefined;
      }
      return true;
    },
    {
      message: "GST rate and type are required when GST is applicable",
      path: ["gst_rate"],
    },
  )
  .refine(
    (data) => {
      // TDS rate required if tds_applicable
      if (data.tds_applicable) {
        return data.tds_rate !== undefined;
      }
      return true;
    },
    {
      message: "TDS rate is required when TDS is applicable",
      path: ["tds_rate"],
    },
  )
  .refine(
    (data) => {
      // Bank account number required if any bank field is filled
      if (data.ledger_type === "bank") {
        const hasBankInfo =
          data.bank_name || data.ifsc_code || data.branch_name;
        if (hasBankInfo && !data.account_number) {
          return false;
        }
      }
      return true;
    },
    {
      message: "Account number is required when bank details are provided",
      path: ["account_number"],
    },
  );

export type LedgerFormData = z.infer<typeof ledgerSchema>;
