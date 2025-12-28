import { PartnerType } from "@/types/database/enums";
import type { Tables } from "@/types/database/supabase";

type Partner = Tables<"partners">;

/**
 * Partial partner with only the fields needed for name formatting
 */
export type PartnerNameFields = Pick<Partner, "display_name">;

/**
 * Get formatted name for a partner (customer/vendor/agent)
 * Uses the computed display_name field from database
 */
export function getPartnerName(partner: PartnerNameFields | null): string {
  if (!partner) return "Unknown Partner";
  return partner.display_name || "Unknown Partner";
}

/**
 * Partial partner with only the fields needed for info
 */
type PartnerInfoFields = Pick<
  Partner,
  "first_name" | "last_name" | "phone_number" | "partner_type"
>;

/**
 * Get formatted info for a partner (customer/vendor/agent)
 * Displays: Type • Contact Name • Phone
 */
export function getPartnerInfo(partner: PartnerInfoFields | null): string {
  let partnerInfo: string = "";

  if (partner?.partner_type) {
    const type = partner.partner_type;
    partnerInfo += `${type[0].toUpperCase()}${partner.partner_type.slice(1)}`;
  }

  // Build contact person name (both fields optional)
  const contactPerson = [partner?.first_name, partner?.last_name]
    .filter(Boolean)
    .join(" ");

  if (contactPerson) {
    if (partnerInfo) {
      partnerInfo += " • ";
    }
    partnerInfo += contactPerson;
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

/**
 * Display format for partner types.
 * Example: customer -> Customer
 */
export function getPartnerTypeLabel(type: PartnerType): string {
  switch (type) {
    case "customer":
      return "Customer";
    case "supplier":
      return "Supplier";
    case "vendor":
      return "Vendor";
    case "agent":
      return "Agent";
    default:
      return type;
  }
}
