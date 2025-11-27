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
export function getWarehouseFormattedAddress(
  warehouse: AddressFields | null,
): string {
  // Build address string
  const addressParts = [
    warehouse?.address_line1,
    warehouse?.address_line2,
    warehouse?.city && warehouse?.state
      ? `${warehouse.city}, ${warehouse.state}`
      : warehouse?.city || warehouse?.state,
    warehouse?.pin_code,
  ].filter(Boolean);

  return addressParts.join(", ") || "No address";
}
