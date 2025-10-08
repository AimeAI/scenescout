'use client'

import { useMemo } from 'react'

interface Event {
  id: string
  title: string
  date?: string
  start_date?: string
  time?: string
  start_time?: string
  venue_name?: string
  image_url?: string
  category?: string
  category_id?: string
  price_min?: number
  price_max?: number
  distance?: number
  [key: string]: any
}

interface EventStartingSoon extends Event {
  minutesUntilStart: number
  timeLabel: string
  isHappeningNow: boolean
}

/**
 * Filter events starting within the next X hours
 * Returns events sorted by start time with helpful time labels
 */
export function useEventsStartingSoon(
  allEvents: Event[],
  hoursWindow: number = 3
): EventStartingSoon[] {
  return useMemo(() => {
    const now = new Date()
    const windowEnd = new Date(now.getTime() + hoursWindow * 60 * 60 * 1000)

    const eventsWithTiming = allEvents
      .map(event => {
        const eventDate = event.date || event.start_date
        const eventTime = event.time || event.start_time || '19:00:00'

        if (!eventDate) return null

        // Parse event datetime
        let eventDateTime: Date

        if (eventDate.includes('T')) {
          // ISO format with time
          eventDateTime = new Date(eventDate)
        } else {
          // Separate date and time
          const [year, month, day] = eventDate.split('-').map(Number)
          const timeParts = eventTime.split(':')
          const hour = parseInt(timeParts[0], 10) || 19
          const minute = parseInt(timeParts[1], 10) || 0

          eventDateTime = new Date(year, month - 1, day, hour, minute)
        }

        // Calculate minutes until start
        const minutesUntilStart = Math.floor(
          (eventDateTime.getTime() - now.getTime()) / (1000 * 60)
        )

        // Skip if event is in the past or beyond our window
        if (minutesUntilStart < -30 || eventDateTime > windowEnd) {
          return null
        }

        // Generate time label
        const timeLabel = getTimeLabel(minutesUntilStart)
        const isHappeningNow = minutesUntilStart <= 30 && minutesUntilStart >= -30

        return {
          ...event,
          minutesUntilStart,
          timeLabel,
          isHappeningNow
        } as EventStartingSoon
      })
      .filter((e): e is EventStartingSoon => e !== null)

    // Sort by start time (soonest first)
    eventsWithTiming.sort((a, b) => a.minutesUntilStart - b.minutesUntilStart)

    return eventsWithTiming
  }, [allEvents, hoursWindow])
}

/**
 * Generate human-friendly time labels
 */
function getTimeLabel(minutesUntilStart: number): string {
  if (minutesUntilStart <= -5) {
    return 'Started recently'
  }

  if (minutesUntilStart <= 0) {
    return 'Starting now!'
  }

  if (minutesUntilStart <= 5) {
    return 'Starting in 5 min'
  }

  if (minutesUntilStart <= 15) {
    return 'Starting in 15 min'
  }

  if (minutesUntilStart <= 30) {
    return 'Starting in 30 min'
  }

  if (minutesUntilStart <= 45) {
    return 'Starting in 45 min'
  }

  if (minutesUntilStart <= 60) {
    return 'Starting in 1 hour'
  }

  if (minutesUntilStart <= 90) {
    return 'Starting in 1.5 hours'
  }

  if (minutesUntilStart <= 120) {
    return 'Starting in 2 hours'
  }

  if (minutesUntilStart <= 150) {
    return 'Starting in 2.5 hours'
  }

  return 'Starting in 3 hours'
}

/**
 * Format distance to human-friendly string
 */
export function formatDistance(distanceMiles?: number): string {
  if (!distanceMiles) return ''

  if (distanceMiles < 0.1) {
    return 'Very close'
  }

  if (distanceMiles < 1) {
    return `${(distanceMiles * 5280).toFixed(0)} ft away`
  }

  if (distanceMiles < 5) {
    return `${distanceMiles.toFixed(1)} mi away`
  }

  // Estimate walk time (3 mph average)
  const walkMinutes = Math.round((distanceMiles / 3) * 60)

  if (walkMinutes < 60) {
    return `${walkMinutes} min walk`
  }

  return `${(walkMinutes / 60).toFixed(1)} hr walk`
}
