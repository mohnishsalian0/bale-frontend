/**
 * Job Works Configuration
 * Settings for generating job work test data
 *
 * totalOrders and year are NOT part of this config — they are passed directly
 * by the caller in basic-setup.ts / load-setup.ts.
 */

export interface JobWorksConfig {
  /** Ratio of job works to transition to in_progress (0.0-1.0) */
  inProgressRatio: number;
  /** Ratio of remaining approval_pending job works to cancel (0.0-1.0) */
  cancelledRatio: number;
  /** Expected quantity range per line item */
  expectedQuantity: { min: number; max: number };
  /** Unit rate range for line items */
  unitRate: { min: number; max: number };
  /** Due date offset in days from start date */
  dueDateDaysAfterStart: { min: number; max: number };
}

export const JOB_WORKS_CONFIG: JobWorksConfig = {
  inProgressRatio: 0.8,
  cancelledRatio: 0.1,
  expectedQuantity: { min: 50, max: 500 },
  unitRate: { min: 50, max: 500 },
  dueDateDaysAfterStart: { min: 14, max: 60 },
} as const;

/** Cancellation reasons for cancelled job works */
export const JOB_WORK_CANCELLATION_REASONS = [
  "Vendor unable to process due to capacity constraints",
  "Raw material quality not suitable for processing",
  "Customer order cancelled, job work no longer needed",
  "Cost revised beyond budget, seeking alternative vendor",
  "Delivery timeline incompatible with project schedule",
];
