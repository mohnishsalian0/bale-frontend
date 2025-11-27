/**
 * Generate initials from company name or person name
 * @param name - Company name or person name
 * @returns Initials (max 2 characters)
 * @example
 * - "Loom & Layer" → "LL"
 * - "ABC Industries Pvt Ltd" → "AI"
 * - "John Doe" → "JD"
 */
export function getInitials(name: string): string {
  if (!name) return "??";

  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .filter(
      (word) =>
        !["&", "and", "pvt", "ltd", "llc", "inc"].includes(word.toLowerCase()),
    );

  if (words.length === 0) return "??";
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();

  return (words[0][0] + words[1][0]).toUpperCase();
}
