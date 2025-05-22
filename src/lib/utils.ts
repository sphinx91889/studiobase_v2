import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parse } from 'date-fns';
import { formatInTimeZone, utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(time: string | Date) {
  return new Date(time).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Format timezone for display
export function formatTimezone(timezone: string): string {
  try {
    // Try to get a more readable format
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'long'
    }).formatToParts(new Date())
      .find(part => part.type === 'timeZoneName')?.value || timezone;
  } catch (err) {
    // Fallback to the raw timezone if formatting fails
    console.error(`Error formatting timezone: ${timezone}`, err);
    return timezone;
  }
}

// Convert time from one timezone to another
export function convertTimeToUserTimezone(
  timeString: string,
  date: string,
  fromTimezone: string,
  toTimezone: string
): string {
  try {
    // Create a date object in the source timezone
    const dateTimeString = `${date}T${timeString}`;
    const sourceDate = zonedTimeToUtc(dateTimeString, fromTimezone);
    
    // Convert to target timezone
    const targetDate = utcToZonedTime(sourceDate, toTimezone);
    
    // Format the time in the target timezone
    return format(targetDate, 'HH:mm');
  } catch (err) {
    console.error('Error converting timezone:', err);
    return timeString; // Return original if conversion fails
  }
}

// Format time slot for display (e.g., "14:30" to "2:30 PM")
export function formatTimeSlot(timeSlot: string): string {
  try {
    return format(parse(timeSlot, 'HH:mm', new Date()), 'h:mm a');
  } catch (err) {
    console.error('Invalid time slot format:', timeSlot);
    return 'Invalid time';
  }
}

// Convert and format time slot for display in user's timezone
export function convertAndFormatTimeSlot(
  timeSlot: string,
  date: string,
  fromTimezone: string,
  toTimezone: string
): string {
  try {
    const convertedTime = convertTimeToUserTimezone(timeSlot, date, fromTimezone, toTimezone);
    return formatTimeSlot(convertedTime);
  } catch (err) {
    console.error('Error converting and formatting time slot:', err);
    return formatTimeSlot(timeSlot); // Fallback to original format
  }
}

// Check if a time in one timezone is in the past in another timezone
export function isTimeInPast(
  timeString: string,
  dateString: string,
  timezone: string
): boolean {
  try {
    const dateTime = new Date(`${dateString}T${timeString}`);
    const now = new Date();
    
    // Convert both to the same timezone for comparison
    const dateTimeInTimezone = utcToZonedTime(dateTime, timezone);
    const nowInTimezone = utcToZonedTime(now, timezone);
    
    return dateTimeInTimezone < nowInTimezone;
  } catch (err) {
    console.error('Error checking if time is in past:', err);
    return false; // Default to not in past if there's an error
  }
}
