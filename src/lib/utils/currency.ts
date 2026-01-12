/**
 * Round a number to 2 decimal places for currency calculations
 * This matches the backend's ROUND(value, 2) precision for financial calculations
 * @param amount - The amount to round
 * @returns Number rounded to 2 decimal places
 * @example
 * roundCurrency(123.456) // 123.46
 * roundCurrency(123.454) // 123.45
 * roundCurrency(100 * 0.18 / 100) // 18.00 (not 18.000000000000004)
 */
export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Format a number as Indian currency (INR)
 * @param amount - The amount to format (can be null)
 * @returns Formatted currency string (e.g., "₹1,234.56") or "₹0.00" for null
 */
export function formatCurrency(amount: number | null): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
}
