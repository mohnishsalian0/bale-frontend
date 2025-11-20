/**
 * Calculate total stock value based on quantity and price per unit
 */
export function calculateStockValue(
	quantity: number | null | undefined,
	pricePerUnit: number | null | undefined
): number {
	if (!quantity || !pricePerUnit) return 0;
	return quantity * pricePerUnit;
}

/**
 * Get display name for stock type
 */
export function getStockTypeDisplay(stockType: string | null | undefined): string {
	if (!stockType) return 'Not specified';

	switch (stockType.toLowerCase()) {
		case 'roll':
			return 'Roll';
		case 'batch':
			return 'Batch';
		case 'piece':
			return 'Piece';
		default:
			return stockType.charAt(0).toUpperCase() + stockType.slice(1);
	}
}
