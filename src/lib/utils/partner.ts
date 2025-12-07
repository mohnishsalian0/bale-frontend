import type { Tables } from "@/types/database/supabase";

type Partner = Tables<"partners">;

/**
 * Partial partner with only the fields needed for name formatting
 */
type PartnerNameFields = Pick<
  Partner,
  "first_name" | "last_name" | "company_name"
>;

/**
 * Get formatted name for a partner (customer/vendor/agent)
 * Returns company name if available, otherwise first name + last name
 */
export function getPartnerName(partner: PartnerNameFields | null): string {
  if (!partner) return "Unknown Partner";
  return partner.company_name || `${partner.first_name} ${partner.last_name}`;
}

/**
 * Partial partner with only the fields needed for info
 */
type PartnerInfoFields = Pick<
  Partner,
  "first_name" | "last_name" | "phone_number" | "partner_type"
>;

/**
 * Get formatted name for a partner (customer/vendor/agent)
 * Returns company name if available, otherwise first name + last name
 */
export function getPartnerInfo(partner: PartnerInfoFields | null): string {
  let partnerInfo: string = "";

  if (partner?.partner_type) {
    const type = partner.partner_type;
    partnerInfo += `${type[0].toUpperCase()}${partner.partner_type.slice(1)}`;
  }

  if (partner?.first_name) {
    if (partnerInfo) {
      partnerInfo += " • ";
    }
    partnerInfo += `${partner.first_name}`;
  }

  if (partner?.last_name) {
    if (partnerInfo) {
      partnerInfo += " ";
    }
    partnerInfo += `${partner.last_name}`;
  }

  if (partner?.phone_number) {
    if (partnerInfo) {
      partnerInfo += " • ";
    }
    partnerInfo += `${partner.phone_number}`;
  }

  return partnerInfo;
}

/**
 * Address fields interface for flexible address formatting
 */
interface AddressFields {
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pin_code?: string | null;
}

/**
 * Get formatted address with multi-line display
 * Format:
 * - Line 1: address_line1
 * - Line 2: address_line2
 * - Line 3: city, state
 * - Line 4: country - pincode
 */
export function getFormattedAddress(entity: AddressFields | null): string[] {
  if (!entity) return [];

  const lines: string[] = [];

  // Line 1: address_line1
  if (entity.address_line1) {
    lines.push(entity.address_line1);
  }

  // Line 2: address_line2
  if (entity.address_line2) {
    lines.push(entity.address_line2);
  }

  // Line 3: city, state (comma-separated)
  const cityState = [entity.city, entity.state].filter(Boolean).join(", ");
  if (cityState) {
    lines.push(cityState);
  }

  // Line 4: country - pincode (hyphen-separated)
  const countryPincode = [entity.country, entity.pin_code]
    .filter(Boolean)
    .join(" - ");
  if (countryPincode) {
    lines.push(countryPincode);
  }

  return lines;
}
