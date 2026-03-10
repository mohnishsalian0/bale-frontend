/**
 * Goods Converts Configuration
 * Settings for generating goods convert test data
 *
 * totalConverts is NOT part of this config — it is passed directly
 * by the caller in basic-setup.ts.
 */

export interface GoodsConvertsConfig {
  completedRatio: number; // 0.0 – 1.0
  cancelledRatio: number; // 0.0 – 1.0  (in_progress = remainder)
  /**
   * Number of input stock units per convert.
   * Output unit count always matches input unit count (1:1).
   */
  unitsPerConvert: { min: number; max: number };
  completionDaysAfterStart: { min: number; max: number };
  /** Output quantity as a fraction of total input quantity consumed */
  outputQuantityRatio: { min: number; max: number };
  /** Ratio of in_progress job works to link converts to (0.0-1.0) */
  jobWorkLinkRate: number;
}

export const GOODS_CONVERTS_CONFIG: GoodsConvertsConfig = {
  completedRatio: 0.7,
  cancelledRatio: 0.1,
  // in_progress = 0.2
  unitsPerConvert: { min: 3, max: 5 },
  completionDaysAfterStart: { min: 7, max: 30 },
  outputQuantityRatio: { min: 0.8, max: 0.95 },
  jobWorkLinkRate: 0.8,
} as const;

/**
 * Maps factory warehouse name keywords to service type labels.
 * Used to derive a realistic service type for each convert
 * based on the factory it occurs at.
 */
export const FACTORY_SERVICE_TYPE_MAP: Array<{
  keyword: string;
  serviceType: string;
}> = [
  { keyword: "dyeing", serviceType: "Dyeing" },
  { keyword: "knitting", serviceType: "Knitting" },
  { keyword: "weaving", serviceType: "Weaving" },
  { keyword: "processing", serviceType: "Processing" },
  { keyword: "embroidery", serviceType: "Embroidery" },
  { keyword: "printing", serviceType: "Printing" },
];

/** Fallback service type when no keyword matches */
export const DEFAULT_SERVICE_TYPE = "Processing";

/** Cancellation reasons for cancelled converts */
export const CONVERT_CANCELLATION_REASONS = [
  "Quality standards not met by vendor",
  "Customer order cancelled — conversion no longer required",
  "Vendor capacity unavailable",
  "Raw material found unsuitable for processing",
  "Cost overrun — decision to outsource reversed",
];
