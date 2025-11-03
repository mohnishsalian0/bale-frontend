import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek, isThisMonth, isThisYear } from 'date-fns';

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

/**
 * Format a date as a relative time string with smart formatting
 * Examples: "today", "1 day ago", "this week", "this month", "on August", "2024"
 */
export function formatRelativeDate(date: Date | string): string {
	const dateObj = typeof date === 'string' ? new Date(date) : date;

	if (isToday(dateObj)) {
		return 'today';
	}

	if (isYesterday(dateObj)) {
		return 'yesterday';
	}

	if (isThisWeek(dateObj, { weekStartsOn: 1 })) {
		return formatDistanceToNow(dateObj, { addSuffix: true });
	}

	if (isThisMonth(dateObj)) {
		return 'this month';
	}

	if (isThisYear(dateObj)) {
		// Return month name like "on Aug"
		return `on ${format(dateObj, 'MMM')}`;
	}

	// For older dates, just return the year
	return format(dateObj, 'MMM yy');
}

/**
 * Format a date as an absolute date string for tooltips
 * Example: "15 Jan, 2025"
 */
export function formatAbsoluteDate(date: Date | string): string {
	const dateObj = typeof date === 'string' ? new Date(date) : date;
	return format(dateObj, 'd MMM, yyyy');
}

/**
 * Format a date for display with "Created" prefix
 */
export function formatCreatedAt(date: Date | string): string {
	return `Created ${formatRelativeDate(date)}`;
}
