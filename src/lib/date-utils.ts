/**
 * Date Utilities
 * Robust date parsing and validation for external API data
 */

import { format, parse, parseISO, isValid, isPast, isFuture, addDays, startOfDay, endOfDay } from 'date-fns'
import { toZonedTime, formatInTimeZone } from 'date-fns-tz'

export interface ParsedDate {
  date: string // YYYY-MM-DD
  time?: string // HH:mm:ss
  datetime: Date
  isValid: boolean
  timezone?: string
}

/**
 * Parse date from various formats used by external APIs
 */
export function parseEventDate(
  dateInput: string | Date | undefined,
  timeInput?: string,
  timezone: string = 'America/Toronto'
): ParsedDate | null {
  if (!dateInput) {
    return null
  }

  try {
    let datetime: Date

    // Handle Date objects
    if (dateInput instanceof Date) {
      datetime = dateInput
    }
    // Handle ISO 8601 format (2024-10-20T19:00:00Z or 2024-10-20T19:00:00-04:00)
    else if (typeof dateInput === 'string' && dateInput.includes('T')) {
      datetime = parseISO(dateInput)
    }
    // Handle YYYY-MM-DD format
    else if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      // Combine with time if provided
      if (timeInput) {
        const combinedString = `${dateInput}T${timeInput}`
        datetime = parse(combinedString, "yyyy-MM-dd'T'HH:mm:ss", new Date())
      } else {
        // Default to noon if no time specified
        datetime = parse(`${dateInput}T12:00:00`, "yyyy-MM-dd'T'HH:mm:ss", new Date())
      }
    }
    // Handle MM/DD/YYYY format
    else if (typeof dateInput === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateInput)) {
      datetime = parse(dateInput, 'MM/dd/yyyy', new Date())
    }
    // Handle DD/MM/YYYY format
    else if (typeof dateInput === 'string' && /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(dateInput)) {
      datetime = parse(dateInput, 'dd.MM.yyyy', new Date())
    }
    // Handle "Month DD, YYYY" format
    else if (typeof dateInput === 'string' && /^[A-Za-z]+\s+\d{1,2},\s+\d{4}$/.test(dateInput)) {
      datetime = parse(dateInput, 'MMMM dd, yyyy', new Date())
    }
    else {
      // Try generic parsing as fallback
      datetime = new Date(dateInput)
    }

    // Validate the parsed date
    if (!isValid(datetime)) {
      console.warn(`⚠️  Invalid date parsed from: ${dateInput}`)
      return null
    }

    // Extract components
    const date = format(datetime, 'yyyy-MM-dd')
    const time = timeInput || (dateInput.includes('T') ? format(datetime, 'HH:mm:ss') : undefined)

    return {
      date,
      time,
      datetime,
      isValid: true,
      timezone
    }
  } catch (error) {
    console.error(`❌ Error parsing date: ${dateInput}`, error)
    return null
  }
}

/**
 * Check if an event date is in the future
 */
export function isEventUpcoming(eventDate: string | Date, eventTime?: string): boolean {
  try {
    let datetime: Date

    if (eventDate instanceof Date) {
      datetime = eventDate
    } else if (eventTime) {
      datetime = new Date(`${eventDate}T${eventTime}`)
    } else {
      datetime = new Date(eventDate)
    }

    return isValid(datetime) && isFuture(datetime)
  } catch {
    return false
  }
}

/**
 * Check if an event has already passed
 */
export function isEventPast(eventDate: string | Date, eventTime?: string): boolean {
  try {
    let datetime: Date

    if (eventDate instanceof Date) {
      datetime = eventDate
    } else if (eventTime) {
      // For past events, consider events past if the day has ended
      datetime = endOfDay(new Date(`${eventDate}T${eventTime}`))
    } else {
      datetime = endOfDay(new Date(eventDate))
    }

    return isValid(datetime) && isPast(datetime)
  } catch {
    return false
  }
}

/**
 * Filter out events that have already passed
 */
export function filterUpcomingEvents<T extends { date: string; time?: string }>(
  events: T[]
): T[] {
  return events.filter(event => {
    // If event has no date, keep it (let DB handle it)
    if (!event.date) {
      return true
    }

    // Check if event is upcoming
    return isEventUpcoming(event.date, event.time)
  })
}

/**
 * Normalize date for consistent storage
 * Ensures dates are always in YYYY-MM-DD format
 */
export function normalizeDateForStorage(dateInput: string | Date | undefined): string | null {
  if (!dateInput) {
    return null
  }

  const parsed = parseEventDate(dateInput)
  return parsed?.date || null
}

/**
 * Normalize time for consistent storage
 * Ensures times are always in HH:mm:ss format
 */
export function normalizeTimeForStorage(timeInput: string | undefined): string | null {
  if (!timeInput) {
    return null
  }

  try {
    // Handle HH:mm format
    if (/^\d{1,2}:\d{2}$/.test(timeInput)) {
      return `${timeInput}:00`
    }

    // Handle HH:mm:ss format
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(timeInput)) {
      // Pad hours if needed
      const [hours, minutes, seconds] = timeInput.split(':')
      return `${hours.padStart(2, '0')}:${minutes}:${seconds}`
    }

    // Try parsing as date and extract time
    const date = new Date(`2000-01-01T${timeInput}`)
    if (isValid(date)) {
      return format(date, 'HH:mm:ss')
    }

    return null
  } catch {
    return null
  }
}

/**
 * Get date range for queries (today + X days)
 */
export function getUpcomingDateRange(daysAhead: number = 90): {
  start: string
  end: string
} {
  const start = startOfDay(new Date())
  const end = endOfDay(addDays(new Date(), daysAhead))

  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd')
  }
}

/**
 * Format date for display
 */
export function formatEventDate(
  date: string | Date,
  formatStr: string = 'MMM dd, yyyy'
): string {
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date
    return isValid(parsedDate) ? format(parsedDate, formatStr) : 'Date TBA'
  } catch {
    return 'Date TBA'
  }
}

/**
 * Format time for display
 */
export function formatEventTime(time: string | undefined): string {
  if (!time) {
    return 'Time TBA'
  }

  try {
    const date = parse(time, 'HH:mm:ss', new Date())
    return isValid(date) ? format(date, 'h:mm a') : 'Time TBA'
  } catch {
    return 'Time TBA'
  }
}

/**
 * Combine date and time into a single datetime string
 */
export function combineDateAndTime(date: string, time?: string): string {
  if (!time) {
    return `${date}T12:00:00` // Default to noon
  }

  // Ensure time is in HH:mm:ss format
  const normalizedTime = normalizeTimeForStorage(time) || '12:00:00'
  return `${date}T${normalizedTime}`
}

/**
 * Validate and sanitize event dates from external APIs
 */
export function sanitizeEventDates(event: {
  date?: string
  time?: string
  start_time?: string
  event_date?: string
}): {
  date: string | null
  time: string | null
} {
  // Try to extract date from various possible fields
  const dateStr = event.date || event.event_date
  const timeStr = event.time || event.start_time

  const date = normalizeDateForStorage(dateStr)
  const time = normalizeTimeForStorage(timeStr)

  return { date, time }
}

/**
 * Check if date is within acceptable range (not too far in future, not in past)
 */
export function isDateWithinValidRange(
  date: string | Date,
  maxDaysAhead: number = 365
): boolean {
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date

    if (!isValid(parsedDate)) {
      return false
    }

    // Check not in the past (with 1 day grace period)
    const oneDayAgo = addDays(new Date(), -1)
    if (parsedDate < oneDayAgo) {
      return false
    }

    // Check not too far in future
    const maxDate = addDays(new Date(), maxDaysAhead)
    if (parsedDate > maxDate) {
      return false
    }

    return true
  } catch {
    return false
  }
}
