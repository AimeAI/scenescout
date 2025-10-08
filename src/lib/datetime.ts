/**
 * DateTime utilities for event formatting
 */

/**
 * Format a date and optional time into a readable string
 * Examples:
 * - "Sat, Dec 31 at 7:00 PM"
 * - "Mon, Jan 1, 2024"
 */
export function formatDateTime(date?: string | Date, time?: string): string {
  if (!date) return 'Date TBA'

  try {
    const d = typeof date === 'string' ? new Date(date) : date

    // Format date part
    const dateStr = d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })

    // Format time part if provided
    if (time && time !== '19:00:00') {
      try {
        const [hours, minutes] = time.split(':').map(Number)
        const timeDate = new Date()
        timeDate.setHours(hours, minutes)
        const timeStr = timeDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
        return `${dateStr} at ${timeStr}`
      } catch {
        return dateStr
      }
    }

    return dateStr
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid date'
  }
}

/**
 * Format a date range
 * Examples:
 * - "Dec 31 - Jan 2"
 * - "Jan 1 at 2:00 PM - 5:00 PM"
 */
export function formatDateRange(
  startDate?: string | Date,
  endDate?: string | Date,
  startTime?: string,
  endTime?: string
): string {
  if (!startDate) return 'Date TBA'

  try {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate

    if (!endDate) {
      return formatDateTime(start, startTime)
    }

    const end = typeof endDate === 'string' ? new Date(endDate) : endDate

    // Same day event
    if (start.toDateString() === end.toDateString()) {
      const dateStr = start.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      })

      if (startTime && endTime) {
        const formatTime = (time: string) => {
          const [hours, minutes] = time.split(':').map(Number)
          const d = new Date()
          d.setHours(hours, minutes)
          return d.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
        }
        return `${dateStr} at ${formatTime(startTime)} - ${formatTime(endTime)}`
      }

      return dateStr
    }

    // Multi-day event
    const startStr = start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
    const endStr = end.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })

    return `${startStr} - ${endStr}`
  } catch (error) {
    console.error('Error formatting date range:', error)
    return 'Invalid date range'
  }
}

/**
 * Get relative time string (e.g., "in 3 days", "tomorrow", "today")
 */
export function getRelativeTime(date?: string | Date): string {
  if (!date) return ''

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffMs = d.getTime() - now.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays < 0) return 'Past event'
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays < 7) return `in ${diffDays} days`
    if (diffDays < 30) return `in ${Math.floor(diffDays / 7)} weeks`

    return `in ${Math.floor(diffDays / 30)} months`
  } catch (error) {
    return ''
  }
}

/**
 * Check if an event is happening soon (within next 7 days)
 */
export function isHappeningSoon(date?: string | Date): boolean {
  if (!date) return false

  try {
    const d = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffMs = d.getTime() - now.getTime()
    const diffDays = diffMs / (1000 * 60 * 60 * 24)

    return diffDays >= 0 && diffDays <= 7
  } catch {
    return false
  }
}

/**
 * Check if event is within a certain number of hours from now
 */
export function isWithinHours(isoUtc: string, tz: string, hours: number): boolean {
  if (!isoUtc) return false

  try {
    const now = Date.now()
    const start = new Date(isoUtc).getTime()
    const diffH = (start - now) / (1000 * 60 * 60)

    return diffH >= 0 && diffH <= hours
  } catch {
    return false
  }
}
