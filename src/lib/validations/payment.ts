import { z } from "zod";
import {
  VOUCHER_TYPES,
  PAYMENT_MODES,
  ALLOCATION_TYPES,
} from "@/types/database/enums";
import { positiveNumberSchema } from "./common";

// ============================================================================
// PAYMENT ALLOCATION SCHEMAS
// ============================================================================

/**
 * Schema for payment allocation (against reference or advance)
 */
export const paymentAllocationSchema = z.object({
  allocation_type: z.enum(ALLOCATION_TYPES, {
    message: "Allocation type is required",
  }),
  invoice_id: z.string().uuid().nullable(),
  amount_applied: positiveNumberSchema,
});

/**
 * Schema for advance allocation (no invoice)
 */
export const advanceAllocationSchema = paymentAllocationSchema.extend({
  allocation_type: z.literal("advance"),
  invoice_id: z.null(),
});

/**
 * Schema for against reference allocation (requires invoice)
 */
export const againstReferenceAllocationSchema = paymentAllocationSchema.extend({
  allocation_type: z.literal("against_ref"),
  invoice_id: z.string().uuid({
    message: "Invoice is required for against reference allocation",
  }),
});

/**
 * Union schema for all allocation types
 */
export const allocationSchema = z.discriminatedUnion("allocation_type", [
  advanceAllocationSchema,
  againstReferenceAllocationSchema,
]);

// ============================================================================
// PAYMENT SCHEMAS
// ============================================================================

/**
 * Base payment schema (common fields for both payment and receipt)
 */
export const basePaymentSchema = z.object({
  voucher_type: z.enum(VOUCHER_TYPES, {
    message: "Voucher type is required",
  }),
  party_ledger_id: z.string().uuid({
    message: "Party is required",
  }),
  counter_ledger_id: z.string().uuid({
    message: "Bank/Cash account is required",
  }),
  payment_date: z.date({
    message: "Payment date is required",
  }),
  payment_mode: z.enum(PAYMENT_MODES, {
    message: "Payment mode is required",
  }),
  total_amount: positiveNumberSchema,
  reference_number: z.string().max(50).nullable(),
  reference_date: z.date().nullable(),
  notes: z.string().max(1000).nullable(),
});

/**
 * Schema for payment without TDS
 */
export const paymentWithoutTDSSchema = basePaymentSchema.extend({
  tds_applicable: z.literal(false),
  tds_rate: z.null(),
  tds_ledger_id: z.null(),
});

/**
 * Schema for payment with TDS
 */
export const paymentWithTDSSchema = basePaymentSchema.extend({
  tds_applicable: z.literal(true),
  tds_rate: z
    .number()
    .min(0, "TDS rate must be at least 0%")
    .max(100, "TDS rate cannot exceed 100%"),
  tds_ledger_id: z.string().uuid({
    message: "TDS ledger is required when TDS is applicable",
  }),
});

/**
 * Union schema for payment with or without TDS
 */
export const paymentTDSSchema = z.discriminatedUnion("tds_applicable", [
  paymentWithoutTDSSchema,
  paymentWithTDSSchema,
]);

/**
 * Complete payment creation schema with allocations
 */
export const createPaymentSchema = paymentTDSSchema.and(
  z.object({
    allocations: z.array(allocationSchema).min(0),
    attachments: z.array(z.string().url()).nullable(),
  }),
);

/**
 * Type inference for forms
 */
export type PaymentFormData = z.infer<typeof createPaymentSchema>;
export type AllocationFormData = z.infer<typeof allocationSchema>;
