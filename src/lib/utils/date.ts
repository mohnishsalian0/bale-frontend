/**
 * Convert Date object to ISO date string (YYYY-MM-DD)
 */
export function dateToISOString(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Convert ISO date string (YYYY-MM-DD) to Date object
 */
export function isoStringToDate(dateString: string): Date | undefined {
	return dateString ? new Date(dateString) : undefined;
}

/**
 * Format Date object to display format (DD-MM-YYYY)
 */
export function formatDateDisplay(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${day}-${month}-${year}`;
}
