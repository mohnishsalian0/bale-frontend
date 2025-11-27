import { StockType } from "@/types/database/enums";

/**
 * Pluralize stock type based on count
 * @param count - The count to check
 * @param singular - The singular form of the word
 * @param plural - Optional plural form (defaults to singular + 's')
 * @returns The correctly pluralized string with count
 */
export function pluralizeStockType(count: number, singular: StockType): string {
  let word = singular as string;
  if (count !== 1) {
    word = singular === "batch" ? "batches" : word + "s";
  }
  return `${count} ${word}`;
}
