import { createTicketmasterClient, TicketmasterApiClient } from '@/lib/api/ticketmaster-client';

// Mock environment variable
process.env.TICKETMASTER_API_KEY = 'test-api-key';

describe('TicketmasterApiClient', () => {
  let client: TicketmasterApiClient;

  beforeEach(() => {
    client = createTicketmasterClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Client Creation', () => {
    it('should create client with API key from environment', () => {
      expect(client).toBeInstanceOf(TicketmasterApiClient);
    });

    it('should throw error if no API key provided', () => {
      delete process.env.TICKETMASTER_API_KEY;
      expect(() => createTicketmasterClient()).toThrow('Ticketmaster API key not found');
      process.env.TICKETMASTER_API_KEY = 'test-api-key'; // Restore for other tests
    });
  });

  describe('Rate Limiting', () => {
    it('should track request count', () => {
      const stats = client.getRequestStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.dailyRequests).toBe(0);
    });

    it('should have daily limit remaining', () => {
      const stats = client.getRequestStats();
      expect(stats.dailyLimitRemaining).toBe(5000);
    });
  });

  describe('Event Search', () => {
    beforeEach(() => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            _embedded: {
              events: [
                {
                  id: 'test-event-1',
                  name: 'Test Event',
                  url: 'https://test.com',
                  dates: {
                    start: {
                      localDate: '2024-12-01',
                      localTime: '19:00:00',
                      dateTime: '2024-12-01T19:00:00'
                    },
                    timezone: 'America/Los_Angeles',
                    status: { code: 'onsale' }
                  },
                  classifications: [{
                    primary: true,
                    segment: { id: '1', name: 'Music' },
                    genre: { id: '1', name: 'Rock' },
                    subGenre: { id: '1', name: 'Alternative Rock' }
                  }],
                  images: [{
                    ratio: '16_9',
                    url: 'https://test.com/image.jpg',
                    width: 640,
                    height: 360,
                    fallback: false
                  }],
                  _embedded: {
                    venues: [{
                      id: 'venue-1',
                      name: 'Test Venue',
                      city: { name: 'San Francisco' },
                      state: { name: 'California', stateCode: 'CA' },
                      country: { name: 'United States', countryCode: 'US' },
                      address: { line1: '123 Test St' },
                      location: { latitude: '37.7749', longitude: '-122.4194' },
                      timezone: 'America/Los_Angeles',
                      type: 'venue'
                    }]
                  }
                }
              ]
            },
            page: {
              size: 20,
              totalElements: 1,
              totalPages: 1,
              number: 0
            },
            _links: {
              self: { href: 'https://test.com' }
            }
          })
        })
      ) as jest.Mock;
    });

    it('should search events with default parameters', async () => {
      const response = await client.searchEvents();
      
      expect(response.success).toBe(true);
      expect(response.data._embedded?.events).toHaveLength(1);
      expect(response.data._embedded?.events[0].name).toBe('Test Event');
    });

    it('should search events with custom parameters', async () => {
      const params = {
        city: 'Los Angeles',
        stateCode: 'CA',
        keyword: 'concert',
        size: 10
      };

      await client.searchEvents(params);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('city=Los%20Angeles'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('stateCode=CA'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('keyword=concert'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('size=10'),
        expect.any(Object)
      );
    });

    it('should include API key in request', async () => {
      await client.searchEvents();

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('apikey=test-api-key'),
        expect.any(Object)
      );
    });
  });

  describe('Event Conversion', () => {
    const mockEvent = {
      id: 'test-event-1',
      name: 'Test Concert',
      info: 'A great concert',
      url: 'https://ticketmaster.com/event/123',
      dates: {
        start: {
          localDate: '2024-12-01',
          localTime: '19:00:00',
          dateTime: '2024-12-01T19:00:00'
        },
        timezone: 'America/Los_Angeles',
        status: { code: 'onsale' }
      },
      classifications: [{
        primary: true,
        segment: { id: '1', name: 'Music' },
        genre: { id: '1', name: 'Rock' },
        subGenre: { id: '1', name: 'Alternative Rock' }
      }],
      images: [{
        ratio: '16_9',
        url: 'https://test.com/image.jpg',
        width: 640,
        height: 360,
        fallback: false
      }],
      priceRanges: [{
        type: 'standard',
        currency: 'USD',
        min: 25,
        max: 150
      }],
      ageRestrictions: {
        legalAgeEnforced: true
      },
      _embedded: {
        venues: [{
          id: 'venue-1',
          name: 'Test Venue',
          city: { name: 'San Francisco' },
          state: { name: 'California', stateCode: 'CA' },
          country: { name: 'United States', countryCode: 'US' },
          address: { line1: '123 Test St' },
          location: { latitude: '37.7749', longitude: '-122.4194' },
          timezone: 'America/Los_Angeles',
          type: 'venue'
        }]
      }
    };

    it('should convert Ticketmaster event to SceneScout format', () => {
      const converted = client.convertEventToSceneScout(mockEvent);

      expect(converted.id).toBe('test-event-1');
      expect(converted.title).toBe('Test Concert');
      expect(converted.description).toBe('A great concert');
      expect(converted.source).toBe('ticketmaster');
      expect(converted.externalId).toBe('test-event-1');
      expect(converted.category).toBe('Music');
      expect(converted.subcategory).toBe('Rock');
      expect(converted.priceMin).toBe(25);
      expect(converted.priceMax).toBe(150);
      expect(converted.priceCurrency).toBe('USD');
      expect(converted.ageRestriction).toBe('21+');
      expect(converted.status).toBe('active');
      expect(converted.venueId).toBe('venue-1');
      expect(converted.tags).toEqual(['Rock', 'Alternative Rock']);
    });

    it('should handle missing venue', () => {
      const eventWithoutVenue = { ...mockEvent };
      delete eventWithoutVenue._embedded;

      const converted = client.convertEventToSceneScout(eventWithoutVenue);
      expect(converted.venueId).toBeNull();
    });

    it('should handle missing price ranges', () => {
      const eventWithoutPricing = { ...mockEvent };
      delete eventWithoutPricing.priceRanges;

      const converted = client.convertEventToSceneScout(eventWithoutPricing);
      expect(converted.priceMin).toBeNull();
      expect(converted.priceMax).toBeNull();
      expect(converted.priceCurrency).toBe('USD');
    });

    it('should handle missing age restrictions', () => {
      const eventWithoutAgeRestriction = { ...mockEvent };
      delete eventWithoutAgeRestriction.ageRestrictions;

      const converted = client.convertEventToSceneScout(eventWithoutAgeRestriction);
      expect(converted.ageRestriction).toBeNull();
    });
  });

  describe('Venue Conversion', () => {
    const mockVenue = {
      id: 'venue-1',
      name: 'Test Venue',
      type: 'stadium',
      url: 'https://venue.com',
      city: { name: 'San Francisco' },
      state: { name: 'California', stateCode: 'CA' },
      country: { name: 'United States', countryCode: 'US' },
      address: { line1: '123 Test St' },
      location: { latitude: '37.7749', longitude: '-122.4194' },
      postalCode: '94105',
      timezone: 'America/Los_Angeles',
      boxOfficeInfo: {
        phoneNumberDetail: '(555) 123-4567',
        openHoursDetail: 'Mon-Fri 9AM-5PM',
        acceptedPaymentDetail: 'Cash, Credit Cards',
        willCallDetail: 'Available 1 hour before show'
      },
      parkingDetail: 'Street parking available',
      accessibleSeatingDetail: 'Wheelchair accessible seating available',
      generalInfo: {
        generalRule: 'No outside food or drinks',
        childRule: 'Children under 12 must be accompanied by adult'
      }
    };

    it('should convert Ticketmaster venue to SceneScout format', () => {
      const converted = client.convertVenueToSceneScout(mockVenue);

      expect(converted.id).toBe('venue-1');
      expect(converted.name).toBe('Test Venue');
      expect(converted.address).toBe('123 Test St');
      expect(converted.city).toBe('San Francisco');
      expect(converted.state).toBe('California');
      expect(converted.postalCode).toBe('94105');
      expect(converted.country).toBe('United States');
      expect(converted.latitude).toBe(37.7749);
      expect(converted.longitude).toBe(-122.4194);
      expect(converted.phone).toBe('(555) 123-4567');
      expect(converted.website).toBe('https://venue.com');
      expect(converted.timezone).toBe('America/Los_Angeles');
      expect(converted.venueType).toBe('stadium');
      expect(converted.source).toBe('ticketmaster');
      expect(converted.externalId).toBe('venue-1');
      expect(converted.parkingInfo).toBe('Street parking available');
      expect(converted.accessibilityFeatures).toEqual(['Wheelchair accessible seating available']);
    });

    it('should handle missing optional fields', () => {
      const minimalVenue = {
        id: 'venue-2',
        name: 'Minimal Venue',
        city: { name: 'Los Angeles' },
        state: { name: 'California', stateCode: 'CA' },
        country: { name: 'United States', countryCode: 'US' },
        address: { line1: '456 Simple St' },
        location: { latitude: '34.0522', longitude: '-118.2437' },
        timezone: 'America/Los_Angeles',
        type: 'venue'
      };

      const converted = client.convertVenueToSceneScout(minimalVenue);

      expect(converted.id).toBe('venue-2');
      expect(converted.name).toBe('Minimal Venue');
      expect(converted.phone).toBeNull();
      expect(converted.website).toBeNull();
      expect(converted.postalCode).toBe('');
      expect(converted.parkingInfo).toBeNull();
      expect(converted.accessibilityFeatures).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          json: () => Promise.resolve({ error: 'Rate limit exceeded' })
        })
      ) as jest.Mock;
    });

    it('should handle API errors gracefully', async () => {
      const response = await client.searchEvents();

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });
  });

  describe('Batch Operations', () => {
    beforeEach(() => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            _embedded: {
              events: [
                {
                  id: 'batch-event-1',
                  name: 'Batch Event 1',
                  dates: {
                    start: { dateTime: '2024-12-01T19:00:00' },
                    status: { code: 'onsale' }
                  },
                  classifications: [{ segment: { name: 'Music' } }],
                  images: [{ url: 'https://test.com/image1.jpg' }]
                }
              ]
            }
          })
        })
      ) as jest.Mock;
    });

    it('should batch search events for multiple cities', async () => {
      const cities = ['San Francisco', 'Los Angeles', 'New York'];
      const events = await client.batchSearchEvents(cities);

      expect(events).toHaveLength(3); // One event per city
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });
});