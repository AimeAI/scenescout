import { rest } from 'msw'

// Mock data for testing
const mockEventbriteEvents = {
  events: [
    {
      id: 'test-event-1',
      name: { text: 'Test Event 1', html: 'Test Event 1' },
      description: { text: 'Test event description', html: 'Test event description' },
      url: 'https://eventbrite.com/test-event-1',
      start: {
        timezone: 'America/Los_Angeles',
        local: '2024-01-01T18:00:00',
        utc: '2024-01-02T02:00:00Z'
      },
      end: {
        timezone: 'America/Los_Angeles',
        local: '2024-01-01T22:00:00',
        utc: '2024-01-02T06:00:00Z'
      },
      is_free: false,
      currency: 'USD',
      status: 'live',
      listed: true,
      capacity: 100,
      venue_id: 'venue-1',
      organizer_id: 'org-1'
    }
  ],
  pagination: {
    object_count: 1,
    page_number: 1,
    page_size: 50,
    page_count: 1,
    has_more_items: false
  }
}

const mockTicketmasterEvents = {
  _embedded: {
    events: [
      {
        id: 'test-tm-event-1',
        name: 'Test Ticketmaster Event',
        url: 'https://ticketmaster.com/test-event',
        dates: {
          start: {
            localDate: '2024-01-01',
            localTime: '19:00:00',
            dateTime: '2024-01-02T03:00:00Z'
          }
        },
        priceRanges: [
          { min: 25, max: 75, currency: 'USD' }
        ],
        classifications: [
          { segment: { name: 'Music' }, genre: { name: 'Rock' } }
        ],
        _embedded: {
          venues: [
            {
              id: 'venue-tm-1',
              name: 'Test Venue',
              address: { line1: '123 Test St' },
              city: { name: 'Test City' },
              state: { name: 'CA' },
              country: { countryCode: 'US' },
              location: { latitude: '37.7749', longitude: '-122.4194' }
            }
          ]
        }
      }
    ]
  },
  page: {
    size: 20,
    totalElements: 1,
    totalPages: 1,
    number: 0
  }
}

export const handlers = [
  // Eventbrite API mocks
  rest.get('https://www.eventbriteapi.com/v3/events/search/', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(mockEventbriteEvents))
  }),

  // Ticketmaster API mocks
  rest.get('https://app.ticketmaster.com/discovery/v2/events.json', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json(mockTicketmasterEvents))
  }),

  // Google Places API mocks
  rest.get('https://maps.googleapis.com/maps/api/place/textsearch/json', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({
      results: [
        {
          place_id: 'test-place-1',
          name: 'Test Venue',
          formatted_address: '123 Test St, Test City, CA 12345',
          geometry: {
            location: { lat: 37.7749, lng: -122.4194 }
          },
          types: ['establishment', 'point_of_interest']
        }
      ],
      status: 'OK'
    }))
  }),

  // Yelp API mocks
  rest.get('https://api.yelp.com/v3/businesses/search', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({
      businesses: [
        {
          id: 'test-yelp-1',
          name: 'Test Business',
          url: 'https://yelp.com/test-business',
          rating: 4.5,
          review_count: 100,
          coordinates: { latitude: 37.7749, longitude: -122.4194 },
          location: {
            address1: '123 Test St',
            city: 'Test City',
            state: 'CA',
            zip_code: '12345'
          }
        }
      ],
      total: 1
    }))
  }),

  // Supabase API mocks
  rest.get('https://test.supabase.co/rest/v1/events', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json([
      {
        id: 'test-event-1',
        title: 'Test Event',
        description: 'Test event description',
        start_time: '2024-01-01T18:00:00Z',
        end_time: '2024-01-01T22:00:00Z',
        category: 'Music',
        price_min: 25,
        price_max: 75,
        is_free: false,
        venue_id: 'venue-1',
        source: 'eventbrite'
      }
    ]))
  }),

  // Supabase functions mocks
  rest.post('https://test.supabase.co/functions/v1/ingest_eventbrite', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({
      success: true,
      eventsProcessed: 1,
      venuesProcessed: 1,
      organizersProcessed: 1
    }))
  }),

  rest.post('https://test.supabase.co/functions/v1/ingest_ticketmaster', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({
      success: true,
      eventsProcessed: 1,
      venuesProcessed: 1,
      organizersProcessed: 1
    }))
  }),

  // Health check endpoints
  rest.get('/api/health', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        eventbrite: 'healthy',
        ticketmaster: 'healthy'
      }
    }))
  }),

  // Ingestion API mocks
  rest.get('/api/ingest', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({
      configured: true,
      database: true,
      sampleEvents: 5,
      message: 'Ready for ingestion'
    }))
  }),

  rest.post('/api/ingest', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({
      source: 'eventbrite',
      success: true,
      eventsProcessed: 10
    }))
  }),
]