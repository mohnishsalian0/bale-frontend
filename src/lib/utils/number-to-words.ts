import { ToWords } from "to-words";

/**
 * Convert a number to Indian English words for currency
 * Example: 95000 → "Ninety Five Thousand Rupees Only"
 */
export function convertAmountToWords(amount: number): string {
  const toWords = new ToWords({
    localeCode: "en-IN",
    converterOptions: {
      currency: true,
      ignoreDecimal: false,
      ignoreZeroCurrency: false,
    },
  });

  return toWords.convert(amount);
}
