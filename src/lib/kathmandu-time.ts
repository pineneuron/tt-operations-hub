/**
 * Kathmandu timezone utilities
 *
 * IMPORTANT: All times are stored in UTC in the database.
 * When working with dates and times in this project, always convert to/from Kathmandu time.
 * Kathmandu is UTC+5:45 (Asia/Kathmandu timezone)
 */

const KATHMANDU_TIMEZONE = 'Asia/Kathmandu';
const KATHMANDU_OFFSET_MS = 5.75 * 60 * 60 * 1000; // 5 hours 45 minutes in milliseconds

/**
 * Get hours, minutes, seconds, etc. in Kathmandu timezone from a UTC date
 * This is a helper function that extracts time components in Kathmandu timezone
 */
function getKathmanduTimeParts(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: KATHMANDU_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  return {
    year: parseInt(parts.find((p) => p.type === 'year')?.value || '0'),
    month: parseInt(parts.find((p) => p.type === 'month')?.value || '0'),
    day: parseInt(parts.find((p) => p.type === 'day')?.value || '0'),
    hour: parseInt(parts.find((p) => p.type === 'hour')?.value || '0'),
    minute: parseInt(parts.find((p) => p.type === 'minute')?.value || '0'),
    second: parseInt(parts.find((p) => p.type === 'second')?.value || '0')
  };
}

/**
 * Get hours in Kathmandu timezone from a UTC date
 */
export function getKathmanduHours(date: Date): number {
  return getKathmanduTimeParts(date).hour;
}

/**
 * Get minutes in Kathmandu timezone from a UTC date
 */
export function getKathmanduMinutes(date: Date): number {
  return getKathmanduTimeParts(date).minute;
}

/**
 * Get the date (year, month, day) in Kathmandu timezone
 */
export function getKathmanduDate(date: Date): {
  year: number;
  month: number;
  day: number;
} {
  const parts = getKathmanduTimeParts(date);
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day
  };
}

/**
 * Create a UTC Date object that represents a specific time in Kathmandu timezone
 * @param year - Year in Kathmandu timezone
 * @param month - Month (1-12) in Kathmandu timezone
 * @param day - Day in Kathmandu timezone
 * @param hour - Hour (0-23) in Kathmandu timezone
 * @param minute - Minute (0-59) in Kathmandu timezone
 * @param second - Second (0-59) in Kathmandu timezone
 */
export function createKathmanduDate(
  year: number,
  month: number,
  day: number,
  hour: number = 0,
  minute: number = 0,
  second: number = 0
): Date {
  // Create a date string in ISO format (treating it as UTC)
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}Z`;
  const utcDate = new Date(dateStr);
  // Subtract the Kathmandu offset to convert from Kathmandu time to UTC
  // If it's 10:00 AM in Kathmandu, we need to subtract 5:45 to get the UTC time
  return new Date(utcDate.getTime() - KATHMANDU_OFFSET_MS);
}

/**
 * Get expected check-in time (10 AM Kathmandu) for a given date
 */
export function getExpectedCheckInTime(date: Date): Date {
  const kathmanduDate = getKathmanduDate(date);
  return createKathmanduDate(
    kathmanduDate.year,
    kathmanduDate.month,
    kathmanduDate.day,
    10,
    0,
    0
  );
}

/**
 * Get expected check-out time (6 PM Kathmandu) for a given date
 */
export function getExpectedCheckOutTime(date: Date): Date {
  const kathmanduDate = getKathmanduDate(date);
  return createKathmanduDate(
    kathmanduDate.year,
    kathmanduDate.month,
    kathmanduDate.day,
    18,
    0,
    0
  );
}

/**
 * Check if a given time is late (after 10 AM Kathmandu)
 */
export function isLateCheckIn(date: Date): boolean {
  const hour = getKathmanduHours(date);
  const minute = getKathmanduMinutes(date);
  return hour > 10 || (hour === 10 && minute >= 1);
}

/**
 * Format a date/time to display in Kathmandu timezone
 */
export function formatKathmanduDateTime(
  date: Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: KATHMANDU_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };

  return new Intl.DateTimeFormat('en-US', {
    ...defaultOptions,
    ...options
  }).format(date);
}

/**
 * Get today's date in Kathmandu timezone (at midnight)
 */
export function getTodayInKathmandu(): Date {
  const now = new Date();
  const kathmanduDate = getKathmanduDate(now);
  return createKathmanduDate(
    kathmanduDate.year,
    kathmanduDate.month,
    kathmanduDate.day,
    0,
    0,
    0
  );
}

export { KATHMANDU_TIMEZONE, KATHMANDU_OFFSET_MS };
