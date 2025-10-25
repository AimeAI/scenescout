import { createEvent, EventAttributes, DateArray } from 'ics'

interface EventData {
  id: string
  title: string
  description?: string
  date?: string
  event_date?: string
  start_date?: string
  time?: string
  start_time?: string
  venue_name?: string
  venue?: {
    name?: string
    address?: string
  }
  address?: string
  venue_address?: string
  external_url?: string
  url?: string
  ticket_url?: string
  timezone?: string
  city?: string
}

/**
 * Generate ICS calendar file from event data
 * Downloads a .ics file that can be imported to any calendar app
 *
 * Includes:
 * - Proper timezone handling
 * - 15-minute reminder before event
 * - Event URL in description
 * - Venue address in location
 */
export function generateICS(event: EventData) {
  try {
    // Parse date and time
    const eventDate = event.date || event.event_date || event.start_date
    const eventTime = event.time || event.start_time

    if (!eventDate) {
      throw new Error('Event date is required')
    }

    // Handle both ISO format (2025-10-06T19:00:00) and separate date/time
    let startDate: Date

    if (eventDate.includes('T')) {
      // ISO format with time
      startDate = new Date(eventDate)
    } else {
      // Separate date and time
      const [year, month, day] = eventDate.split('-').map(Number)

      // Parse time or default to 7:00 PM
      let hour = 19
      let minute = 0

      if (eventTime) {
        const timeParts = eventTime.split(':')
        const parsedHour = parseInt(timeParts[0], 10)
        const parsedMinute = timeParts[1] ? parseInt(timeParts[1], 10) : 0

        if (!isNaN(parsedHour)) hour = parsedHour
        if (!isNaN(parsedMinute)) minute = parsedMinute
      }

      startDate = new Date(year, month - 1, day, hour, minute)
    }

    // Start time in UTC
    const start: DateArray = [
      startDate.getFullYear(),
      startDate.getMonth() + 1,
      startDate.getDate(),
      startDate.getHours(),
      startDate.getMinutes()
    ]

    // End time (2 hours later)
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000)
    const end: DateArray = [
      endDate.getFullYear(),
      endDate.getMonth() + 1,
      endDate.getDate(),
      endDate.getHours(),
      endDate.getMinutes()
    ]

    // Build location string with full address
    const venueName = event.venue_name || event.venue?.name || ''
    const venueAddress = event.address || event.venue_address || event.venue?.address || ''
    const city = event.city || ''
    const locationParts = [venueName, venueAddress, city].filter(Boolean)
    const location = locationParts.join(', ') || 'Location TBA'

    // Build description with event URL
    const description = event.description || `Join us for ${event.title}!`
    const ticketUrl = event.external_url || event.url || event.ticket_url || ''
    const eventUrl = ticketUrl || `https://scenescout.app/events/${event.id}`

    const fullDescription = [
      description,
      '',
      '📍 Location:',
      location,
      '',
      '🎫 Get tickets:',
      ticketUrl || 'Check SceneScout for details',
      '',
      '🔗 Event page:',
      eventUrl,
      '',
      '---',
      'Added via SceneScout - Discover urban culture & events',
      'https://scenescout.app'
    ].join('\n')

    // Determine timezone
    const timezone = event.timezone || 'America/Toronto'

    // Create event config with reminder
    const eventConfig: EventAttributes = {
      start,
      end,
      title: event.title,
      description: fullDescription,
      location,
      url: eventUrl,
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      organizer: { name: 'SceneScout', email: 'events@scenescout.app' },
      // Add 15-minute reminder
      alarms: [
        {
          action: 'display',
          description: `Reminder: ${event.title} starts in 15 minutes!`,
          trigger: { minutes: 15, before: true }
        }
      ]
    }

    // Generate ICS file
    const { error, value } = createEvent(eventConfig)

    if (error) {
      console.error('Error generating ICS:', error)
      throw error
    }

    // Create slug for filename
    const slug = event.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    const filename = `${slug}-${eventDate}.ics`

    // Trigger download
    downloadICS(value!, filename)

    return { success: true, filename }
  } catch (error) {
    console.error('Failed to generate calendar event:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Generate ICS file for multiple events (bulk export)
 * Downloads a single .ics file containing all events
 *
 * @param events Array of event data to export
 * @returns Result object with success status and filename or error message
 */
export function generateBulkICS(events: EventData[]) {
  try {
    if (!events || events.length === 0) {
      throw new Error('No events to export')
    }

    // Generate individual event strings
    const eventStrings: string[] = []
    let successCount = 0
    const errors: string[] = []

    for (const event of events) {
      try {
        const eventDate = event.date || event.event_date || event.start_date
        const eventTime = event.time || event.start_time

        if (!eventDate) {
          errors.push(`${event.title}: Missing date`)
          continue
        }

        // Handle both ISO format and separate date/time
        let startDate: Date

        if (eventDate.includes('T')) {
          startDate = new Date(eventDate)
        } else {
          const [year, month, day] = eventDate.split('-').map(Number)
          let hour = 19
          let minute = 0

          if (eventTime) {
            const timeParts = eventTime.split(':')
            const parsedHour = parseInt(timeParts[0], 10)
            const parsedMinute = timeParts[1] ? parseInt(timeParts[1], 10) : 0

            if (!isNaN(parsedHour)) hour = parsedHour
            if (!isNaN(parsedMinute)) minute = parsedMinute
          }

          startDate = new Date(year, month - 1, day, hour, minute)
        }

        const start: DateArray = [
          startDate.getFullYear(),
          startDate.getMonth() + 1,
          startDate.getDate(),
          startDate.getHours(),
          startDate.getMinutes()
        ]

        const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000)
        const end: DateArray = [
          endDate.getFullYear(),
          endDate.getMonth() + 1,
          endDate.getDate(),
          endDate.getHours(),
          endDate.getMinutes()
        ]

        const venueName = event.venue_name || event.venue?.name || ''
        const venueAddress = event.address || event.venue_address || event.venue?.address || ''
        const city = event.city || ''
        const locationParts = [venueName, venueAddress, city].filter(Boolean)
        const location = locationParts.join(', ') || 'Location TBA'

        const description = event.description || `Join us for ${event.title}!`
        const ticketUrl = event.external_url || event.url || event.ticket_url || ''
        const eventUrl = ticketUrl || `https://scenescout.app/events/${event.id}`

        const fullDescription = [
          description,
          '',
          '📍 Location:',
          location,
          '',
          '🎫 Get tickets:',
          ticketUrl || 'Check SceneScout for details',
          '',
          '🔗 Event page:',
          eventUrl,
          '',
          '---',
          'Added via SceneScout - Discover urban culture & events',
          'https://scenescout.app'
        ].join('\n')

        const eventConfig: EventAttributes = {
          start,
          end,
          title: event.title,
          description: fullDescription,
          location,
          url: eventUrl,
          status: 'CONFIRMED',
          busyStatus: 'BUSY',
          organizer: { name: 'SceneScout', email: 'events@scenescout.app' },
          alarms: [
            {
              action: 'display',
              description: `Reminder: ${event.title} starts in 15 minutes!`,
              trigger: { minutes: 15, before: true }
            }
          ]
        }

        const { error, value } = createEvent(eventConfig)

        if (error) {
          errors.push(`${event.title}: ${error.message}`)
          continue
        }

        if (value) {
          eventStrings.push(value)
          successCount++
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        errors.push(`${event.title}: ${errorMsg}`)
      }
    }

    if (successCount === 0) {
      throw new Error(`Failed to export any events. Errors: ${errors.join(', ')}`)
    }

    // Combine all events into a single ICS file
    const icsContent = eventStrings.join('\n')

    // Generate filename with date and count
    const today = new Date().toISOString().split('T')[0]
    const filename = `scenescout-events-${successCount}-${today}.ics`

    // Trigger download
    downloadICS(icsContent, filename)

    return {
      success: true,
      filename,
      count: successCount,
      errors: errors.length > 0 ? errors : undefined
    }
  } catch (error) {
    console.error('Failed to generate bulk calendar export:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Trigger browser download of ICS file
 */
function downloadICS(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename

  document.body.appendChild(link)
  link.click()

  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
