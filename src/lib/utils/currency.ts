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
