import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import type { Database } from "@/types/database";

// ============================================================================
// TYPES
// ============================================================================

export interface EnvironmentConfig {
  env: "local" | "staging";
  supabaseUrl: string;
  supabaseServiceKey: string;
  appUrl: string;
}

export interface PaymentModeDetails {
  instrument_number?: string;
  instrument_date?: string;
  instrument_bank?: string;
  instrument_branch?: string;
  instrument_ifsc?: string;
  transaction_id?: string;
  vpa?: string;
  card_last_four?: string;
}

// ============================================================================
// ENVIRONMENT CONFIGURATION
// ============================================================================

/**
 * Initialize environment configuration based on command line argument
 * Loads credentials from .env.local file
 */
export function initializeEnvironment(): EnvironmentConfig {
  // Load environment variables from .env.local
  dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

  // Parse command line argument for environment
  const args = process.argv.slice(2);
  const env = args[0] as "local" | "staging" | undefined;

  if (!env || !["local", "staging"].includes(env)) {
    console.error(
      "❌ Invalid environment. Use: npx tsx scripts/[script-name].ts [local|staging]",
    );
    process.exit(1);
  }

  let supabaseUrl: string;
  let supabaseServiceKey: string;
  let appUrl: string;

  if (env === "staging") {
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_PROD!;
    supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_PROD!;
    appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Missing staging environment variables!");
      console.error("Make sure these are set in .env.local:");
      console.error("  - NEXT_PUBLIC_SUPABASE_URL_PROD");
      console.error("  - SUPABASE_SERVICE_ROLE_KEY_PROD");
      process.exit(1);
    }
  } else {
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    appUrl = "http://localhost:3000";

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Missing local environment variables!");
      console.error("Make sure these are set in .env.local:");
      console.error("  - NEXT_PUBLIC_SUPABASE_URL");
      console.error("  - SUPABASE_SERVICE_ROLE_KEY");
      process.exit(1);
    }
  }

  console.log(`🔧 Environment: ${env.toUpperCase()}`);
  console.log(`🔗 Supabase URL: ${supabaseUrl}\n`);

  return { env, supabaseUrl, supabaseServiceKey, appUrl };
}

/**
 * Create Supabase client with service role key
 */
export function createSupabaseClient(
  supabaseUrl: string,
  supabaseServiceKey: string,
): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ============================================================================
// DATE & TIME UTILITIES
// ============================================================================

/**
 * Generate a random date within a specific month and year
 */
export function getRandomDate(month: number, year: number): string {
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = Math.floor(Math.random() * daysInMonth) + 1;
  return new Date(year, month - 1, day).toISOString().split("T")[0];
}

/**
 * Calculate financial year from a date (April 1 - March 31)
 * Returns format: 2024-25
 */
export function getFinancialYear(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const month = dateObj.getMonth() + 1; // 0-indexed, so +1
  const year = dateObj.getFullYear();

  if (month >= 4) {
    // Apr-Dec: FY is current year to next year
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    // Jan-Mar: FY is previous year to current year
    return `${year - 1}-${String(year).slice(-2)}`;
  }
}

/**
 * Get seasonal factor for adjusting data volumes
 * Higher values in wedding season (Jan-Mar) and festive season (Sep-Nov)
 */
export function getSeasonalFactor(month: number): number {
  const factors: Record<number, number> = {
    1: 1.3, // Jan - Wedding season
    2: 1.3, // Feb - Wedding season
    3: 1.3, // Mar - Wedding season
    4: 1.0, // Apr
    5: 1.0, // May
    6: 1.0, // Jun
    7: 0.8, // Jul - Monsoon dip
    8: 0.8, // Aug - Monsoon dip
    9: 1.2, // Sep - Festive prep
    10: 1.2, // Oct - Festive season
    11: 1.2, // Nov - Festive season
    12: 0.7, // Dec - Year-end slowdown
  };
  return factors[month] || 1.0;
}

// ============================================================================
// RANDOM NUMBER UTILITIES
// ============================================================================

/**
 * Generate random number between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random float between min and max with specified decimals
 */
export function randomFloat(
  min: number,
  max: number,
  decimals: number = 2,
): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

/**
 * Round amount to 2 decimal places to avoid floating point precision issues
 */
export function roundTo2(num: number): number {
  return Math.round(num * 100) / 100;
}

// ============================================================================
// ARRAY UTILITIES
// ============================================================================

/**
 * Select random items from array
 */
export function selectRandom<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, array.length));
}

// ============================================================================
// PAYMENT UTILITIES
// ============================================================================

/**
 * Generate realistic payment instrument/transaction details based on payment mode
 */
export function generatePaymentModeDetails(
  paymentMode: string,
  paymentDate: Date,
): PaymentModeDetails {
  const details: PaymentModeDetails = {};

  const banks = [
    "State Bank of India",
    "HDFC Bank",
    "ICICI Bank",
    "Axis Bank",
    "Kotak Mahindra Bank",
    "Punjab National Bank",
    "Bank of Baroda",
    "Canara Bank",
    "Union Bank of India",
    "IDFC First Bank",
  ];

  const branches = [
    "MG Road Branch",
    "Jayanagar Branch",
    "Indiranagar Branch",
    "Koramangala Branch",
    "Whitefield Branch",
    "Electronic City Branch",
    "HSR Layout Branch",
    "Malleshwaram Branch",
  ];

  const ifscPrefixes = [
    "SBIN",
    "HDFC",
    "ICIC",
    "UTIB",
    "KKBK",
    "PUNB",
    "BARB",
    "CNRB",
    "UBIN",
    "IDFB",
  ];

  switch (paymentMode) {
    case "cheque":
    case "demand_draft":
      // Cheque/DD details - 80% filled, 20% only number
      if (Math.random() < 0.8) {
        details.instrument_number = `${randomInt(100000, 999999)}`;
        // Instrument date is 1-3 days before payment date
        const instrumentDate = new Date(paymentDate);
        instrumentDate.setDate(instrumentDate.getDate() - randomInt(1, 3));
        details.instrument_date = instrumentDate.toISOString().split("T")[0];
        details.instrument_bank = banks[randomInt(0, banks.length - 1)];
        details.instrument_branch = branches[randomInt(0, branches.length - 1)];
        details.instrument_ifsc = `${ifscPrefixes[randomInt(0, ifscPrefixes.length - 1)]}0${String(randomInt(100000, 999999)).substring(0, 6)}`;
      } else {
        details.instrument_number = `${randomInt(100000, 999999)}`;
      }
      break;

    case "neft":
    case "rtgs":
    case "imps":
      // Bank transfer details - 90% have transaction ID
      if (Math.random() < 0.9) {
        const prefix = paymentMode.toUpperCase();
        details.transaction_id = `${prefix}${randomInt(10000000000, 99999999999)}`;
      }
      break;

    case "upi":
      // UPI details - 70% have VPA, 60% have transaction ID
      if (Math.random() < 0.7) {
        const handles = ["@paytm", "@phonepe", "@googlepay", "@ybl", "@axl"];
        const userName = `user${randomInt(1000, 9999)}`;
        details.vpa = `${userName}${handles[randomInt(0, handles.length - 1)]}`;
      }
      if (Math.random() < 0.6) {
        details.transaction_id = `${randomInt(100000000000, 999999999999)}`;
      }
      break;

    case "card":
      // Card details - 80% have last 4 digits, 50% have transaction ID
      if (Math.random() < 0.8) {
        details.card_last_four = `${randomInt(1000, 9999)}`;
      }
      if (Math.random() < 0.5) {
        details.transaction_id = `TXN${randomInt(10000000000, 99999999999)}`;
      }
      break;

    case "cash":
      // Cash has no additional fields
      break;
  }

  return details;
}
