import fs from 'fs/promises'
import path from 'path'

const EVENTS_DIR = path.join(process.cwd(), 'data', 'events')
const EVENTS_FILE = path.join(EVENTS_DIR, 'events.json')

export class FileEventRepository {
  async ensureDataDir() {
    try {
      await fs.mkdir(EVENTS_DIR, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }
  }

  async saveEvents(events: any[]) {
    if (events.length === 0) return { saved: 0, skipped: 0 }

    await this.ensureDataDir()

    try {
      // Load existing events
      const existingEvents = await this.loadAllEvents()
      const eventMap = new Map()

      // Add existing events to map
      existingEvents.forEach(event => {
        const key = this.generateEventKey(event)
        eventMap.set(key, event)
      })

      let saved = 0
      let skipped = 0

      // Add new events
      for (const event of events) {
        const key = this.generateEventKey(event)
        
        if (!eventMap.has(key)) {
          const eventData = {
            ...event,
            id: key,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          eventMap.set(key, eventData)
          saved++
        } else {
          skipped++
        }
      }

      // Save all events back to file
      const allEvents = Array.from(eventMap.values())
      await fs.writeFile(EVENTS_FILE, JSON.stringify(allEvents, null, 2))

      console.log(`💾 File Repository: Saved ${saved} events, skipped ${skipped}, total ${allEvents.length}`)
      return { saved, skipped, total: allEvents.length }

    } catch (error) {
      console.error('Failed to save events to file:', error)
      return { saved: 0, skipped: events.length }
    }
  }

  async getEvents(filters: {
    category?: string
    limit?: number
    offset?: number
    searchQuery?: string
  } = {}) {
    try {
      const allEvents = await this.loadAllEvents()
      
      // Filter events
      let filteredEvents = allEvents.filter(event => {
        // Only future events
        const eventDate = new Date(event.date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        if (eventDate < today) return false

        // Category filter
        if (filters.category && filters.category !== 'all' && event.category !== filters.category) {
          return false
        }

        // Search filter
        if (filters.searchQuery) {
          const query = filters.searchQuery.toLowerCase()
          const searchText = `${event.title} ${event.description} ${event.venue_name}`.toLowerCase()
          if (!searchText.includes(query)) return false
        }

        return true
      })

      // Sort by date
      filteredEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      // Apply pagination
      const offset = filters.offset || 0
      const limit = filters.limit || 25
      const paginatedEvents = filteredEvents.slice(offset, offset + limit)

      return paginatedEvents

    } catch (error) {
      console.error('Failed to load events from file:', error)
      return []
    }
  }

  async getEventCount(category?: string) {
    try {
      const allEvents = await this.loadAllEvents()
      
      const filteredEvents = allEvents.filter(event => {
        const eventDate = new Date(event.date)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        if (eventDate < today) return false
        if (category && category !== 'all' && event.category !== category) return false
        
        return true
      })

      return filteredEvents.length
    } catch (error) {
      return 0
    }
  }

  async cleanupOldEvents() {
    try {
      const allEvents = await this.loadAllEvents()
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - 7)

      const futureEvents = allEvents.filter(event => {
        const eventDate = new Date(event.date)
        return eventDate >= cutoffDate
      })

      await fs.writeFile(EVENTS_FILE, JSON.stringify(futureEvents, null, 2))
      console.log(`🧹 Cleaned up old events: ${allEvents.length - futureEvents.length} removed`)

    } catch (error) {
      console.error('Failed to cleanup old events:', error)
    }
  }

  private async loadAllEvents(): Promise<any[]> {
    try {
      const data = await fs.readFile(EVENTS_FILE, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      // File doesn't exist or is empty
      return []
    }
  }

  private generateEventKey(event: any): string {
    const title = event.title?.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20) || 'event'
    const date = event.date || new Date().toISOString().split('T')[0]
    const venue = event.venue_name?.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10) || 'venue'
    return `${title}-${date}-${venue}`
  }
}
