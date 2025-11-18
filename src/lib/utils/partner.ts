import type { Tables } from '@/types/database/supabase';

type Partner = Tables<'partners'>;

/**
 * Get formatted name for a partner (customer/vendor/agent)
 * Returns company name if available, otherwise first name + last name
 */
export function getPartnerName(partner: Partner | null): string {
	if (!partner) return 'Unknown Partner';
	return partner.company_name || `${partner.first_name} ${partner.last_name}`;
}

/**
 * Get formatted address for a partner
 * Joins non-empty address parts with commas
 */
export function getPartnerAddress(partner: Partner | null): string {
	if (!partner) return '';
	const parts = [
		partner.address_line1,
		partner.address_line2,
		partner.city,
		partner.state,
		partner.pin_code,
	].filter(Boolean);
	return parts.join(', ');
}
