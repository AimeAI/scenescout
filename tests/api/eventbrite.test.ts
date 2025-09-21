/**
 * Tests for Eventbrite API integration
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase client
jest.mock('@supabase/supabase-js')
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

describe('Eventbrite API Integration', () => {
  const mockSupabase = {
    functions: {
      invoke: jest.fn(),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateClient.mockReturnValue(mockSupabase as any)
  })

  describe('Event Ingestion', () => {
    it('should successfully ingest events from Eventbrite', async () => {
      // Mock successful response
      mockSupabase.functions.invoke.mockResolvedValue({
        data: {
          success: true,
          eventsProcessed: 10,
          venuesProcessed: 5,
          organizersProcessed: 3,
        },
        error: null,
      })

      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'eventbrite' }),
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.eventsProcessed).toBeGreaterThan(0)
    })

    it('should handle API rate limits gracefully', async () => {
      // Mock rate limit response
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: {
          message: 'Rate limit exceeded',
          code: 429,
        },
      })

      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'eventbrite' }),
      })

      expect(response.status).toBe(500)
      
      const data = await response.json()
      expect(data.error).toContain('Failed to call ingest_eventbrite')
    })

    it('should validate required parameters', async () => {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(400)
    })
  })

  describe('Event Data Quality', () => {
    it('should properly normalize event data from Eventbrite format', () => {
      const eventbriteEvent = {
        id: 'test-event-1',
        name: { text: 'Test Event' },
        description: { text: 'Test description' },
        start: { utc: '2024-01-01T18:00:00Z', timezone: 'America/Los_Angeles' },
        end: { utc: '2024-01-01T22:00:00Z', timezone: 'America/Los_Angeles' },
        is_free: false,
        currency: 'USD',
        url: 'https://eventbrite.com/test',
        capacity: 100,
      }

      const normalized = normalizeEventbriteEvent(eventbriteEvent)

      expect(normalized).toEqual({
        id: 'test-event-1',
        title: 'Test Event',
        description: 'Test description',
        start_time: '2024-01-01T18:00:00Z',
        end_time: '2024-01-01T22:00:00Z',
        timezone: 'America/Los_Angeles',
        source: 'eventbrite',
        external_id: 'test-event-1',
        ticket_url: 'https://eventbrite.com/test',
        capacity: 100,
        price_currency: 'USD',
      })
    })

    it('should handle missing venue data gracefully', () => {
      const eventWithoutVenue = {
        id: 'test-event-2',
        name: { text: 'Online Event' },
        venue_id: null,
        start: { utc: '2024-01-01T18:00:00Z' },
      }

      const normalized = normalizeEventbriteEvent(eventWithoutVenue)
      expect(normalized.venue_id).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('should handle network timeouts', async () => {
      mockSupabase.functions.invoke.mockRejectedValue(new Error('Network timeout'))

      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'eventbrite' }),
      })

      expect(response.status).toBe(500)
    })

    it('should handle invalid API responses', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Invalid API key' },
      })

      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'eventbrite' }),
      })

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toContain('Invalid API key')
    })
  })
})

// Helper function to normalize Eventbrite events
function normalizeEventbriteEvent(eventbriteEvent: any) {
  return {
    id: eventbriteEvent.id,
    title: eventbriteEvent.name?.text || 'Untitled Event',
    description: eventbriteEvent.description?.text || '',
    start_time: eventbriteEvent.start?.utc,
    end_time: eventbriteEvent.end?.utc,
    timezone: eventbriteEvent.start?.timezone,
    venue_id: eventbriteEvent.venue_id || null,
    source: 'eventbrite',
    external_id: eventbriteEvent.id,
    ticket_url: eventbriteEvent.url,
    capacity: eventbriteEvent.capacity,
    price_currency: eventbriteEvent.currency || 'USD',
  }
}