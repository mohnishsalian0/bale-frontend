import type { StockType } from '@/types/database/enums';

/**
 * Format stock unit number with appropriate prefix based on stock type
 * @param sequenceNumber - The stock unit sequence number
 * @param stockType - The type of stock (roll, batch, piece)
 * @returns Formatted string like "ROLL-123", "BATCH-456", "PIECE-789"
 * @example
 * formatStockUnitNumber(123, 'roll') // "ROLL-123"
 * formatStockUnitNumber(456, 'batch') // "BATCH-456"
 * formatStockUnitNumber(789, 'piece') // "PIECE-789"
 * formatStockUnitNumber(111, null) // "SU-111"
 */
export function formatStockUnitNumber(
	sequenceNumber: number,
	stockType: StockType | null | undefined
): string {
	const prefix = stockType === 'roll' ? 'ROLL'
		: stockType === 'batch' ? 'BATCH'
		: stockType === 'piece' ? 'PIECE'
		: 'SU'; // fallback to generic SU if type unknown

	return `${prefix}-${sequenceNumber}`;
}
