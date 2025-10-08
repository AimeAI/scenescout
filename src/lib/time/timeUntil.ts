/**
 * Time utilities for human-readable time differences
 */

/**
 * Calculate time until an event starts
 * Returns minutes until start (negative if event has started)
 */
export function minutesUntil(eventDateTime: Date): number {
  const now = new Date()
  const diff = eventDateTime.getTime() - now.getTime()
  return Math.floor(diff / (1000 * 60))
}

/**
 * Format time until event in human-readable format
 */
export function formatTimeUntil(eventDateTime: Date): string {
  const minutes = minutesUntil(eventDateTime)

  // Event has started
  if (minutes < 0) {
    const minutesAgo = Math.abs(minutes)
    if (minutesAgo < 30) {
      return 'Started recently'
    }
    if (minutesAgo < 60) {
      return `Started ${minutesAgo} min ago`
    }
    const hoursAgo = Math.floor(minutesAgo / 60)
    return `Started ${hoursAgo}h ago`
  }

  // Starting now
  if (minutes === 0) {
    return 'Starting NOW'
  }

  // Less than 1 hour
  if (minutes < 60) {
    if (minutes <= 5) return 'Starting in 5 min'
    if (minutes <= 10) return 'Starting in 10 min'
    if (minutes <= 15) return 'Starting in 15 min'
    if (minutes <= 30) return 'Starting in 30 min'
    if (minutes <= 45) return 'Starting in 45 min'
    return `Starting in ${minutes} min`
  }

  // Less than 24 hours
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    if (remainingMinutes === 0) {
      return `In ${hours}h`
    }

    if (hours === 1) {
      return `In 1h ${remainingMinutes}m`
    }

    return `In ${hours}h ${remainingMinutes}m`
  }

  // Days
  const days = Math.floor(minutes / 1440)
  if (days === 1) return 'Tomorrow'
  if (days < 7) return `In ${days} days`

  const weeks = Math.floor(days / 7)
  if (weeks === 1) return 'Next week'
  return `In ${weeks} weeks`
}

/**
 * Check if event is happening now (within 30 min window)
 */
export function isHappeningNow(eventDateTime: Date): boolean {
  const minutes = minutesUntil(eventDateTime)
  return minutes >= -30 && minutes <= 30
}

/**
 * Get time window label
 */
export function getTimeWindowLabel(eventDateTime: Date): string {
  const minutes = minutesUntil(eventDateTime)

  if (minutes < -30) return 'past'
  if (isHappeningNow(eventDateTime)) return 'now'
  if (minutes <= 60) return 'next-hour'
  if (minutes <= 180) return 'next-3-hours'

  const now = new Date()
  const eventDate = new Date(eventDateTime)

  // Check if tonight (5pm-midnight today)
  if (
    eventDate.getDate() === now.getDate() &&
    eventDate.getMonth() === now.getMonth() &&
    eventDate.getFullYear() === now.getFullYear()
  ) {
    const hour = eventDate.getHours()
    if (hour >= 17 || hour <= 1) {
      return 'tonight'
    }
  }

  // Check if this weekend
  const dayOfWeek = eventDate.getDay()
  const daysUntil = Math.floor(minutes / 1440)

  if (daysUntil <= 3 && (dayOfWeek === 0 || dayOfWeek === 6)) {
    return 'weekend'
  }

  return 'future'
}

/**
 * Filter events by time window
 */
export function filterByTimeWindow<T extends { date?: string; start_date?: string; time?: string; start_time?: string }>(
  events: T[],
  window: 'next-hour' | 'next-3-hours' | 'tonight' | 'weekend'
): T[] {
  const now = new Date()

  return events.filter(event => {
    const eventDate = event.date || event.start_date
    const eventTime = event.time || event.start_time || '19:00:00'

    if (!eventDate) return false

    let eventDateTime: Date

    if (eventDate.includes('T')) {
      eventDateTime = new Date(eventDate)
    } else {
      const [year, month, day] = eventDate.split('-').map(Number)
      const timeParts = eventTime.split(':')
      const hour = parseInt(timeParts[0], 10) || 19
      const minute = parseInt(timeParts[1], 10) || 0

      eventDateTime = new Date(year, month - 1, day, hour, minute)
    }

    const minutes = minutesUntil(eventDateTime)

    switch (window) {
      case 'next-hour':
        return minutes >= 0 && minutes <= 60

      case 'next-3-hours':
        return minutes >= 0 && minutes <= 180

      case 'tonight': {
        // Events today between 5pm and midnight
        if (
          eventDateTime.getDate() !== now.getDate() ||
          eventDateTime.getMonth() !== now.getMonth() ||
          eventDateTime.getFullYear() !== now.getFullYear()
        ) {
          return false
        }

        const hour = eventDateTime.getHours()
        return hour >= 17 || hour <= 1
      }

      case 'weekend': {
        const dayOfWeek = eventDateTime.getDay()
        const daysUntil = Math.floor(minutes / 1440)

        // Events on Sat or Sun within next 3 days
        return daysUntil >= 0 && daysUntil <= 3 && (dayOfWeek === 0 || dayOfWeek === 6)
      }

      default:
        return true
    }
  })
}

/**
 * Parse event datetime from various formats
 */
export function parseEventDateTime(
  date?: string,
  time?: string
): Date | null {
  if (!date) return null

  if (date.includes('T')) {
    return new Date(date)
  }

  const [year, month, day] = date.split('-').map(Number)
  const eventTime = time || '19:00:00'
  const timeParts = eventTime.split(':')
  const hour = parseInt(timeParts[0], 10) || 19
  const minute = parseInt(timeParts[1], 10) || 0

  return new Date(year, month - 1, day, hour, minute)
}
