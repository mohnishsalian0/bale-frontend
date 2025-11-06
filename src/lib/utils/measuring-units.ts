import type { MeasuringUnit } from '@/types/database/enums';

/**
 * Map measuring units to their abbreviated forms
 */
export const MEASURING_UNIT_ABBREVIATIONS: Record<MeasuringUnit, string> = {
	metre: 'm',
	yard: 'yd',
	kilogram: 'kg',
	unit: 'unit',
};

/**
 * Get the abbreviated form of a measuring unit
 */
export function getMeasuringUnitAbbreviation(unit: MeasuringUnit | null | undefined): string {
	if (!unit) return 'pieces';
	return MEASURING_UNIT_ABBREVIATIONS[unit] || unit;
}
