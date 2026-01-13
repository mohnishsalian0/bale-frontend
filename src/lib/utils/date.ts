import {
  formatDistanceToNow,
  format,
  isToday,
  isYesterday,
  isThisWeek,
  isThisMonth,
  isThisYear,
} from "date-fns";

/**
 * Convert Date object to ISO date string (YYYY-MM-DD)
 */
export function dateToISOString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
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
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${day}-${month}-${year}`;
}

/**
 * Format a date as a relative time string with smart formatting
 * Examples: "today", "1 day ago", "this week", "this month", "on August", "2024"
 */
export function formatRelativeDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (isToday(dateObj)) {
    return "today";
  }

  if (isYesterday(dateObj)) {
    return "yesterday";
  }

  if (isThisWeek(dateObj, { weekStartsOn: 1 })) {
    return formatDistanceToNow(dateObj, { addSuffix: true });
  }

  if (isThisMonth(dateObj)) {
    return "this month";
  }

  if (isThisYear(dateObj)) {
    // Return month name like "on Aug"
    return `on ${format(dateObj, "MMM")}`;
  }

  // For older dates, just return the year
  return format(dateObj, "MMM yy");
}

/**
 * Format a date as an absolute date string for tooltips
 * Example: "15 Jan, 2025"
 */
export function formatAbsoluteDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "d MMM, yyyy");
}

/**
 * Format a date for display with "Created on" prefix
 */
export function formatCreatedAt(date: Date | string): string {
  return `Created on ${formatRelativeDate(date)}`;
}

/**
 * Format expiry date with relative time
 * Returns object with text and status for styling
 * Examples: "Expires today", "Expires tomorrow", "Expires in 5 days", "Expired"
 */
export function formatExpiryDate(expiryDate: Date | string): {
  text: string;
  status: "expired" | "urgent" | "normal";
} {
  const dateObj =
    typeof expiryDate === "string" ? new Date(expiryDate) : expiryDate;
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: "Expired", status: "expired" };
  }

  if (diffDays === 0) {
    return { text: "Expires today", status: "urgent" };
  }

  if (diffDays === 1) {
    return { text: "Expires tomorrow", status: "urgent" };
  }

  return { text: `Expires in ${diffDays} days`, status: "normal" };
}

/**
 * Format month header for pagination month grouping
 * Shows only month name if within 12 months from today, else "Month Year"
 * Examples: "December" (recent), "December 2023" (older than 12 months)
 */
export function formatMonthHeader(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();

  // Calculate 12 months ago from today
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(now.getMonth() - 12);
  twelveMonthsAgo.setDate(32);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  // If date is within 12 months, show only month name
  if (dateObj >= twelveMonthsAgo) {
    return format(dateObj, "MMMM");
  }

  // Otherwise, show "Month Year"
  return format(dateObj, "MMMM yyyy");
}

/**
 * Format due date with relative time for business documents
 * Shows "Due in X time" when within 14 days, otherwise returns null (to show original status)
 * Examples: "Due today", "Due in 5 days", "Due 2 days ago"
 *
 * @param dueDate - The due date to format
 * @returns Formatted text or null if more than 14 days away
 */
export function getDueTimeForStatus(dueDate: Date | string): string | null {
  const dateObj = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const now = new Date();

  // Set both dates to start of day for accurate day comparison
  const dueDateStart = new Date(dateObj);
  dueDateStart.setHours(0, 0, 0, 0);

  const nowStart = new Date(now);
  nowStart.setHours(0, 0, 0, 0);

  const diffMs = dueDateStart.getTime() - nowStart.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // Overdue (past due date)
  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);

    if (absDays === 1) {
      return "Due 1 day ago";
    }

    if (absDays < 7) {
      return `Due ${absDays} days ago`;
    }

    if (absDays < 30) {
      const weeks = Math.floor(absDays / 7);
      return weeks === 1 ? "Due 1 week ago" : `Due ${weeks} weeks ago`;
    }

    if (absDays < 365) {
      const months = Math.floor(absDays / 30);
      return months === 1 ? "Due 1 month ago" : `Due ${months} months ago`;
    }

    const years = Math.floor(absDays / 365);
    return years === 1 ? "Due 1 year ago" : `Due ${years} years ago`;
  }

  // Due today
  if (diffDays === 0) {
    return "Due today";
  }

  // Due tomorrow
  if (diffDays === 1) {
    return "Due tomorrow";
  }

  // Due within 14 days
  if (diffDays <= 14) {
    return `Due in ${diffDays} days`;
  }

  // More than 14 days away - return null to indicate should show original status
  return null;
}

/**
 * Format due date with relative time for business documents
 * Shows "Due in X time"
 * Examples: "Due today", "Due in 5 days", "Due 2 days ago"
 *
 * @param dueDate - The due date to format
 * @returns Formatted text or null if more than 14 days away
 */
export function getDueTimeForDisplay(dueDate: Date | string): string | null {
  const dateObj = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const now = new Date();

  // Set both dates to start of day for accurate day comparison
  const dueDateStart = new Date(dateObj);
  dueDateStart.setHours(0, 0, 0, 0);

  const nowStart = new Date(now);
  nowStart.setHours(0, 0, 0, 0);

  const diffMs = dueDateStart.getTime() - nowStart.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // Overdue (past due date)
  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);

    if (absDays === 1) {
      return "Due 1 day ago";
    }

    if (absDays < 7) {
      return `Due ${absDays} days ago`;
    }

    if (absDays < 30) {
      const weeks = Math.floor(absDays / 7);
      return weeks === 1 ? "Due 1 week ago" : `Due ${weeks} weeks ago`;
    }

    if (absDays < 365) {
      const months = Math.floor(absDays / 30);
      return months === 1 ? "Due 1 month ago" : `Due ${months} months ago`;
    }

    const years = Math.floor(absDays / 365);
    return years === 1 ? "Due 1 year ago" : `Due ${years} years ago`;
  }

  // Due today
  if (diffDays === 0) {
    return "Due today";
  }

  // Due tomorrow
  if (diffDays === 1) {
    return "Due tomorrow";
  }

  // Due within 14 days
  if (diffDays <= 7) {
    return `Due in ${diffDays} days`;
  }

  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? "Due next week" : `Due in ${weeks} weeks`;
  }

  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return months === 1 ? "Due next month" : `Due in ${months} months`;
  }

  const years = Math.floor(diffDays / 365);
  return years === 1 ? "Due next year" : `Due in ${years} years`;
}
