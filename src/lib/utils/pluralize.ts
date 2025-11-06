/**
 * Pluralize a word based on count
 * @param count - The count to check
 * @param singular - The singular form of the word
 * @param plural - Optional plural form (defaults to singular + 's')
 * @returns The correctly pluralized string with count
 */
export function pluralize(count: number, singular: string, plural?: string): string {
	const word = count === 1 ? singular : (plural || `${singular}s`);
	return `${count} ${word}`;
}

/**
 * Get just the pluralized word without the count
 */
export function pluralizeWord(count: number, singular: string, plural?: string): string {
	return count === 1 ? singular : (plural || `${singular}s`);
}
