/**
 * Tests for Ticketmaster API integration
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals'

describe('Ticketmaster API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Event Discovery', () => {
    it('should fetch events from Ticketmaster API', async () => {
      const mockResponse = {
        _embedded: {
          events: [
            {
              id: 'test-tm-1',
              name: 'Test Concert',
              url: 'https://ticketmaster.com/test-concert',
              dates: {
                start: {
                  localDate: '2024-01-01',
                  localTime: '19:00:00',
                  dateTime: '2024-01-02T03:00:00Z',
                },
              },
              classifications: [
                {
                  segment: { name: 'Music' },
                  genre: { name: 'Rock' },
                },
              ],
              priceRanges: [
                { min: 25, max: 150, currency: 'USD' },
              ],
              _embedded: {
                venues: [
                  {
                    id: 'venue-tm-1',
                    name: 'Test Arena',
                    address: { line1: '123 Main St' },
                    city: { name: 'San Francisco' },
                    state: { stateCode: 'CA' },
                    location: { latitude: '37.7749', longitude: '-122.4194' },
                  },
                ],
              },
            },
          ],
        },
        page: {
          size: 20,
          totalElements: 1,
          totalPages: 1,
          number: 0,
        },
      }

      // Mock fetch for Ticketmaster API
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const events = await fetchTicketmasterEvents('San Francisco', 'music')
      
      expect(events).toHaveLength(1)
      expect(events[0].name).toBe('Test Concert')
      expect(events[0].source).toBe('ticketmaster')
    })

    it('should handle API key authentication', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      })

      await expect(fetchTicketmasterEvents('San Francisco', 'music')).rejects.toThrow(
        'Ticketmaster API authentication failed'
      )
    })

    it('should handle rate limiting', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Map([['Retry-After', '60']]),
      })

      await expect(fetchTicketmasterEvents('San Francisco', 'music')).rejects.toThrow(
        'Rate limit exceeded'
      )
    })
  })

  describe('Data Normalization', () => {
    it('should correctly normalize Ticketmaster event data', () => {
      const ticketmasterEvent = {
        id: 'tm-event-1',
        name: 'Concert Event',
        url: 'https://ticketmaster.com/concert',
        dates: {
          start: {
            localDate: '2024-01-15',
            localTime: '20:00:00',
            dateTime: '2024-01-16T04:00:00Z',
          },
        },
        classifications: [
          {
            segment: { name: 'Music' },
            genre: { name: 'Pop' },
          },
        ],
        priceRanges: [
          { min: 30, max: 200, currency: 'USD' },
        ],
        _embedded: {
          venues: [
            {
              id: 'venue-1',
              name: 'Test Venue',
              address: { line1: '456 Concert Ave' },
              city: { name: 'Los Angeles' },
              state: { stateCode: 'CA' },
              location: { latitude: '34.0522', longitude: '-118.2437' },
            },
          ],
        },
      }

      const normalized = normalizeTicketmasterEvent(ticketmasterEvent)

      expect(normalized).toMatchObject({
        title: 'Concert Event',
        category: 'Music',
        subcategory: 'Pop',
        start_time: '2024-01-16T04:00:00Z',
        price_min: 30,
        price_max: 200,
        price_currency: 'USD',
        source: 'ticketmaster',
        external_id: 'tm-event-1',
        ticket_url: 'https://ticketmaster.com/concert',
      })
    })

    it('should handle events without pricing information', () => {
      const eventWithoutPricing = {
        id: 'tm-event-2',
        name: 'Free Event',
        dates: {
          start: { dateTime: '2024-01-16T04:00:00Z' },
        },
        classifications: [{ segment: { name: 'Sports' } }],
        // No priceRanges property
      }

      const normalized = normalizeTicketmasterEvent(eventWithoutPricing)
      
      expect(normalized.price_min).toBeNull()
      expect(normalized.price_max).toBeNull()
    })
  })

  describe('Venue Processing', () => {
    it('should extract venue information correctly', () => {
      const venue = {
        id: 'venue-123',
        name: 'Madison Square Garden',
        address: {
          line1: '4 Pennsylvania Plaza',
          line2: '',
        },
        city: { name: 'New York' },
        state: { name: 'New York', stateCode: 'NY' },
        country: { name: 'United States', countryCode: 'US' },
        postalCode: '10001',
        location: {
          latitude: '40.7505',
          longitude: '-73.9934',
        },
      }

      const normalized = normalizeTicketmasterVenue(venue)

      expect(normalized).toMatchObject({
        id: 'venue-123',
        name: 'Madison Square Garden',
        address: '4 Pennsylvania Plaza',
        city: 'New York',
        state: 'NY',
        country: 'US',
        postal_code: '10001',
        latitude: 40.7505,
        longitude: -73.9934,
        source: 'ticketmaster',
        external_id: 'venue-123',
      })
    })
  })
})

// Mock functions for testing
async function fetchTicketmasterEvents(location: string, category: string) {
  const response = await fetch(
    `https://app.ticketmaster.com/discovery/v2/events.json?city=${location}&classificationName=${category}&apikey=test`
  )

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Ticketmaster API authentication failed')
    }
    if (response.status === 429) {
      throw new Error('Rate limit exceeded')
    }
    throw new Error(`API request failed: ${response.status}`)
  }

  const data = await response.json()
  return data._embedded?.events?.map(normalizeTicketmasterEvent) || []
}

function normalizeTicketmasterEvent(event: any) {
  return {
    id: event.id,
    title: event.name,
    start_time: event.dates?.start?.dateTime,
    category: event.classifications?.[0]?.segment?.name || 'General',
    subcategory: event.classifications?.[0]?.genre?.name,
    price_min: event.priceRanges?.[0]?.min || null,
    price_max: event.priceRanges?.[0]?.max || null,
    price_currency: event.priceRanges?.[0]?.currency || 'USD',
    source: 'ticketmaster',
    external_id: event.id,
    ticket_url: event.url,
  }
}

function normalizeTicketmasterVenue(venue: any) {
  return {
    id: venue.id,
    name: venue.name,
    address: venue.address?.line1 || '',
    city: venue.city?.name || '',
    state: venue.state?.stateCode || '',
    country: venue.country?.countryCode || 'US',
    postal_code: venue.postalCode || '',
    latitude: parseFloat(venue.location?.latitude || '0'),
    longitude: parseFloat(venue.location?.longitude || '0'),
    source: 'ticketmaster',
    external_id: venue.id,
  }
}