import { useEffect, useState } from "react";

/**
 * Custom hook to debounce a value
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns The debounced value
 *
 * @example
 * const [searchQuery, setSearchQuery] = useState("");
 * const debouncedSearchQuery = useDebounce(searchQuery, 500);
 *
 * // Use debouncedSearchQuery in your API calls
 * useEffect(() => {
 *   if (debouncedSearchQuery) {
 *     fetchResults(debouncedSearchQuery);
 *   }
 * }, [debouncedSearchQuery]);
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up the timeout
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timeout if value changes before delay expires
    return () => {
      clearTimeout(timeoutId);
    };
  }, [value, delay]);

  return debouncedValue;
}
