import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTicketmasterEvents, useTicketmasterEventsByLocation } from '@/hooks/useTicketmaster';
import { createTicketmasterClient } from '@/lib/api/ticketmaster-client';

// Mock the client
jest.mock('@/lib/api/ticketmaster-client');

const mockClient = {
  searchEvents: jest.fn(),
  getEvent: jest.fn(),
  searchVenues: jest.fn(),
  getVenue: jest.fn(),
  convertEventToSceneScout: jest.fn(),
  getRequestStats: jest.fn(() => ({
    totalRequests: 0,
    dailyRequests: 0,
    lastRequestTime: 0,
    dailyLimitRemaining: 5000
  }))
};

(createTicketmasterClient as jest.Mock).mockReturnValue(mockClient);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useTicketmaster hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useTicketmasterEvents', () => {
    it('should fetch events successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          _embedded: {
            events: [
              {
                id: 'event-1',
                name: 'Test Event',
                dates: {
                  start: { dateTime: '2024-12-01T19:00:00' },
                  status: { code: 'onsale' }
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
      };

      mockClient.searchEvents.mockResolvedValue(mockResponse);

      const { result } = renderHook(
        () => useTicketmasterEvents({ city: 'San Francisco', stateCode: 'CA' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse.data);
      expect(mockClient.searchEvents).toHaveBeenCalledWith({
        city: 'San Francisco',
        stateCode: 'CA'
      });
    });

    it('should handle API errors', async () => {
      mockClient.searchEvents.mockResolvedValue({
        success: false,
        error: 'API Error'
      });

      const { result } = renderHook(
        () => useTicketmasterEvents({ city: 'Invalid City' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeInstanceOf(Error);
    });

    it('should be disabled when enabled is false', () => {
      const { result } = renderHook(
        () => useTicketmasterEvents(
          { city: 'San Francisco' },
          { enabled: false }
        ),
        { wrapper: createWrapper() }
      );

      expect(result.current.isFetching).toBe(false);
      expect(mockClient.searchEvents).not.toHaveBeenCalled();
    });
  });

  describe('useTicketmasterEventsByLocation', () => {
    it('should fetch and convert events', async () => {
      const mockApiResponse = {
        success: true,
        data: {
          _embedded: {
            events: [
              {
                id: 'event-1',
                name: 'Test Event',
                dates: {
                  start: { dateTime: '2024-12-01T19:00:00' },
                  status: { code: 'onsale' }
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
      };

      const mockConvertedEvent = {
        id: 'event-1',
        title: 'Test Event',
        source: 'ticketmaster',
        externalId: 'event-1'
      };

      mockClient.searchEvents.mockResolvedValue(mockApiResponse);
      mockClient.convertEventToSceneScout.mockReturnValue(mockConvertedEvent);

      const { result } = renderHook(
        () => useTicketmasterEventsByLocation('San Francisco', 'CA'),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.sceneScoutEvents).toHaveLength(1);
      expect(result.current.data?.sceneScoutEvents[0]).toEqual(mockConvertedEvent);
      expect(mockClient.convertEventToSceneScout).toHaveBeenCalledWith(
        mockApiResponse.data._embedded.events[0]
      );
    });

    it('should include search parameters', async () => {
      mockClient.searchEvents.mockResolvedValue({
        success: true,
        data: { _embedded: { events: [] } }
      });

      const { result } = renderHook(
        () => useTicketmasterEventsByLocation(
          'Los Angeles',
          'CA',
          {
            size: 50,
            keyword: 'concert',
            genre: 'Rock'
          }
        ),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockClient.searchEvents).toHaveBeenCalledWith({
        city: 'Los Angeles',
        stateCode: 'CA',
        size: 50,
        keyword: 'concert',
        genreName: 'Rock',
        sort: 'date,asc'
      });
    });

    it('should be disabled when city is not provided', () => {
      const { result } = renderHook(
        () => useTicketmasterEventsByLocation(''),
        { wrapper: createWrapper() }
      );

      expect(result.current.isFetching).toBe(false);
      expect(mockClient.searchEvents).not.toHaveBeenCalled();
    });
  });
});