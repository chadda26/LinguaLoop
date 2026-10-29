/**
 * Date utility functions for calendar-day spaced repetition.
 * Uses strictly normalized 'YYYY-MM-DD' calendar date strings to ensure
 * deterministic scheduling free from UTC offsets and daylight-saving shifts.
 */

/**
 * Validates whether a string matches the 'YYYY-MM-DD' calendar date format.
 */
export function isValidDateFormat(dateStr: string): boolean {
  if (typeof dateStr !== 'string') return false;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Formats a given Date instance into a local calendar date string 'YYYY-MM-DD'.
 *
 * @param date - Date instance (defaults to current system date)
 * @returns Local calendar date formatted as 'YYYY-MM-DD'
 */
export function formatLocalDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns today's local calendar date formatted as 'YYYY-MM-DD'.
 */
export function getTodayLocalDate(): string {
  return formatLocalDate(new Date());
}

/**
 * Adds an integer number of days to a 'YYYY-MM-DD' calendar date string.
 * Uses local calendar date arithmetic to prevent UTC/DST skew.
 *
 * @param baseDateStr - Starting calendar date in 'YYYY-MM-DD' format
 * @param days - Integer number of days to add (must be non-negative)
 * @returns Resulting calendar date in 'YYYY-MM-DD' format
 */
export function addDaysToDate(baseDateStr: string, days: number): string {
  if (!isValidDateFormat(baseDateStr)) {
    throw new Error(`Invalid baseDateStr format. Expected 'YYYY-MM-DD', received: "${baseDateStr}"`);
  }

  if (!Number.isFinite(days)) {
    throw new Error(`Invalid days argument. Expected finite number, received: ${days}`);
  }

  const [yearStr, monthStr, dayStr] = baseDateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  // Construct local date and advance day
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + Math.trunc(days));

  return formatLocalDate(date);
}

/**
 * Safely compares two calendar date strings in 'YYYY-MM-DD' format.
 *
 * @returns Negative number if dateA < dateB,
 *          Zero if dateA === dateB,
 *          Positive number if dateA > dateB
 */
export function compareCalendarDates(dateA: string, dateB: string): number {
  if (!isValidDateFormat(dateA)) {
    throw new Error(`Invalid dateA format. Expected 'YYYY-MM-DD', received: "${dateA}"`);
  }
  if (!isValidDateFormat(dateB)) {
    throw new Error(`Invalid dateB format. Expected 'YYYY-MM-DD', received: "${dateB}"`);
  }

  return dateA.localeCompare(dateB);
}

/**
 * Determines whether a flashcard is due on or before a given reference date.
 *
 * @param nextReviewDate - The card's scheduled review date ('YYYY-MM-DD')
 * @param referenceDateStr - The evaluation date ('YYYY-MM-DD', defaults to today)
 */
export function isCardDue(nextReviewDate: string, referenceDateStr: string = getTodayLocalDate()): boolean {
  return compareCalendarDates(nextReviewDate, referenceDateStr) <= 0;
}
