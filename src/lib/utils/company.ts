import type { Tables } from "@/types/database/supabase";

type Company = Tables<"companies">;

/**
 * Format website URL by removing protocol and www
 * @example
 * formatWebsiteUrl('https://www.example.com') => 'example.com'
 * formatWebsiteUrl('http://example.com') => 'example.com'
 */
export function formatWebsiteUrl(url: string): string {
  if (!url) return "";
  return url.replace(/^https?:\/\/(www\.)?/, "");
}

/**
 * Get formatted company address as array of lines
 */
export function getFormattedCompanyAddress(company: Company): string[] {
  const lines: string[] = [];

  if (company.address_line1) {
    lines.push(company.address_line1);
  }

  if (company.address_line2) {
    lines.push(company.address_line2);
  }

  // City, State, PIN
  const cityStateParts: string[] = [];
  if (company.city) cityStateParts.push(company.city);
  if (company.state) cityStateParts.push(company.state);
  if (company.pin_code) cityStateParts.push(company.pin_code);

  if (cityStateParts.length > 0) {
    lines.push(cityStateParts.join(", "));
  }

  if (company.country) {
    lines.push(company.country);
  }

  return lines;
}
