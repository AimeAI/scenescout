import { createEvent, EventAttributes } from 'ics'

interface EventData {
  id: string
  title: string
  description?: string
  date?: string
  event_date?: string
  time?: string
  venue_name?: string
  venue?: {
    name?: string
    address?: string
  }
  address?: string
  venue_address?: string
  external_url?: string
  url?: string
}

/**
 * Generate ICS calendar file from event data
 * Downloads a .ics file that can be imported to any calendar app
 */
export function generateICS(event: EventData) {
  try {
    // Parse date and time
    const eventDate = event.date || event.event_date
    if (!eventDate) {
      throw new Error('Event date is required')
    }

    const [year, month, day] = eventDate.split('-').map(Number)

    // Parse time or default to 7:00 PM
    let hour = 19
    let minute = 0

    if (event.time) {
      const [timeStr] = event.time.split(':')
      const parsedHour = parseInt(timeStr, 10)
      const parsedMinute = event.time.includes(':')
        ? parseInt(event.time.split(':')[1], 10)
        : 0

      if (!isNaN(parsedHour)) hour = parsedHour
      if (!isNaN(parsedMinute)) minute = parsedMinute
    }

    // Start time
    const start: [number, number, number, number, number] = [year, month, day, hour, minute]

    // End time (2 hours later)
    const endHour = (hour + 2) % 24
    const end: [number, number, number, number, number] = [
      endHour < hour ? year : year,
      endHour < hour && day === new Date(year, month - 1, 0).getDate() ? month + 1 : month,
      endHour < hour ? day + 1 : day,
      endHour,
      minute
    ]

    // Build location string
    const venueName = event.venue_name || event.venue?.name || ''
    const venueAddress = event.address || event.venue_address || event.venue?.address || ''
    const location = [venueName, venueAddress].filter(Boolean).join(', ')

    // Build description
    const description = event.description || `Check out ${event.title}!`
    const ticketUrl = event.external_url || event.url || ''
    const fullDescription = ticketUrl
      ? `${description}\n\nGet tickets: ${ticketUrl}`
      : description

    // Create event config
    const eventConfig: EventAttributes = {
      start,
      end,
      title: event.title,
      description: fullDescription,
      location: location || 'Location TBA',
      url: ticketUrl,
      status: 'CONFIRMED',
      busyStatus: 'BUSY',
      organizer: { name: 'SceneScout', email: 'events@scenescout.app' },
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
