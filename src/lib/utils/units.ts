/**
 * Convert measuring unit names to their standard abbreviations
 */
export function getUnitAbbreviation(unit: string): string {
	const unitMap: Record<string, string> = {
		'meter': 'm',
		'meters': 'm',
		'kilogram': 'kg',
		'kilograms': 'kg',
		'yard': 'yd',
		'yards': 'yd',
		'piece': 'pcs',
		'pieces': 'pcs',
	};
	return unitMap[unit.toLowerCase()] || unit;
}
