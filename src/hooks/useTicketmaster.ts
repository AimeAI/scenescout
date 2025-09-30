import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createTicketmasterClient, EventSearchParams, VenueSearchParams, AttractionSearchParams } from '@/lib/api/ticketmaster-client';
import type { BaseEvent, BaseVenue } from '@/lib/api/base-client';

/**
 * React hooks for Ticketmaster API integration
 */

const ticketmasterClient = createTicketmasterClient();

// Query keys for React Query
export const ticketmasterKeys = {
  all: ['ticketmaster'] as const,
  events: () => [...ticketmasterKeys.all, 'events'] as const,
  event: (id: string) => [...ticketmasterKeys.events(), id] as const,
  eventSearch: (params: EventSearchParams) => [...ticketmasterKeys.events(), 'search', params] as const,
  venues: () => [...ticketmasterKeys.all, 'venues'] as const,
  venue: (id: string) => [...ticketmasterKeys.venues(), id] as const,
  venueSearch: (params: VenueSearchParams) => [...ticketmasterKeys.venues(), 'search', params] as const,
  attractions: () => [...ticketmasterKeys.all, 'attractions'] as const,
  attraction: (id: string) => [...ticketmasterKeys.attractions(), id] as const,
  attractionSearch: (params: AttractionSearchParams) => [...ticketmasterKeys.attractions(), 'search', params] as const,
  classifications: () => [...ticketmasterKeys.all, 'classifications'] as const,
};

/**
 * Hook to search Ticketmaster events
 */
export function useTicketmasterEvents(
  params: EventSearchParams,
  options: {
    enabled?: boolean;
    staleTime?: number;
    cacheTime?: number;
  } = {}
) {
  return useQuery({
    queryKey: ticketmasterKeys.eventSearch(params),
    queryFn: async () => {
      const response = await ticketmasterClient.searchEvents(params);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch events');
      }
      return response.data;
    },
    enabled: options.enabled ?? true,
    staleTime: options.staleTime ?? 5 * 60 * 1000, // 5 minutes
    cacheTime: options.cacheTime ?? 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Hook to get a specific Ticketmaster event
 */
export function useTicketmasterEvent(
  eventId: string,
  options: {
    enabled?: boolean;
    locale?: string;
  } = {}
) {
  return useQuery({
    queryKey: ticketmasterKeys.event(eventId),
    queryFn: async () => {
      const response = await ticketmasterClient.getEvent(eventId, options.locale);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch event');
      }
      return response.data;
    },
    enabled: options.enabled ?? !!eventId,
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
  });
}

/**
 * Hook to search Ticketmaster venues
 */
export function useTicketmasterVenues(
  params: VenueSearchParams,
  options: {
    enabled?: boolean;
    staleTime?: number;
  } = {}
) {
  return useQuery({
    queryKey: ticketmasterKeys.venueSearch(params),
    queryFn: async () => {
      const response = await ticketmasterClient.searchVenues(params);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch venues');
      }
      return response.data;
    },
    enabled: options.enabled ?? true,
    staleTime: options.staleTime ?? 60 * 60 * 1000, // 1 hour
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

/**
 * Hook to get a specific Ticketmaster venue
 */
export function useTicketmasterVenue(
  venueId: string,
  options: {
    enabled?: boolean;
    locale?: string;
  } = {}
) {
  return useQuery({
    queryKey: ticketmasterKeys.venue(venueId),
    queryFn: async () => {
      const response = await ticketmasterClient.getVenue(venueId, options.locale);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch venue');
      }
      return response.data;
    },
    enabled: options.enabled ?? !!venueId,
    staleTime: 60 * 60 * 1000, // 1 hour
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

/**
 * Hook to search Ticketmaster attractions
 */
export function useTicketmasterAttractions(
  params: AttractionSearchParams,
  options: {
    enabled?: boolean;
  } = {}
) {
  return useQuery({
    queryKey: ticketmasterKeys.attractionSearch(params),
    queryFn: async () => {
      const response = await ticketmasterClient.searchAttractions(params);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch attractions');
      }
      return response.data;
    },
    enabled: options.enabled ?? true,
    staleTime: 60 * 60 * 1000, // 1 hour
    cacheTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

/**
 * Hook to get Ticketmaster classifications
 */
export function useTicketmasterClassifications(
  locale: string = 'en',
  options: {
    enabled?: boolean;
  } = {}
) {
  return useQuery({
    queryKey: ticketmasterKeys.classifications(),
    queryFn: async () => {
      const response = await ticketmasterClient.getClassifications(locale);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch classifications');
      }
      return response.data;
    },
    enabled: options.enabled ?? true,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    cacheTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

/**
 * Hook to search events by location with automatic conversion to SceneScout format
 */
export function useTicketmasterEventsByLocation(
  city: string,
  stateCode?: string,
  options: {
    enabled?: boolean;
    size?: number;
    startDateTime?: string;
    keyword?: string;
    genre?: string;
  } = {}
) {
  const params: EventSearchParams = {
    city,
    stateCode,
    size: options.size || 20,
    startDateTime: options.startDateTime,
    keyword: options.keyword,
    genreName: options.genre,
    sort: 'date,asc'
  };

  return useQuery({
    queryKey: ticketmasterKeys.eventSearch(params),
    queryFn: async () => {
      const response = await ticketmasterClient.searchEvents(params);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch events');
      }

      const events = response.data._embedded?.events || [];
      return {
        ...response.data,
        sceneScoutEvents: events.map(event => 
          ticketmasterClient.convertEventToSceneScout(event)
        )
      };
    },
    enabled: options.enabled ?? !!city,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Mutation hook to ingest Ticketmaster events into SceneScout database
 */
export function useIngestTicketmasterEvents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      city: string;
      stateCode?: string;
      size?: number;
      keyword?: string;
    }) => {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'ticketmaster',
          ...params
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to ingest events');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ['events']
      });
      queryClient.invalidateQueries({
        queryKey: ['venues']
      });
      
      console.log(`Successfully ingested ${data.eventsProcessed} events from Ticketmaster`);
    },
    onError: (error) => {
      console.error('Failed to ingest Ticketmaster events:', error);
    }
  });
}

/**
 * Hook to get Ticketmaster API usage statistics
 */
export function useTicketmasterStats() {
  return useQuery({
    queryKey: ['ticketmaster', 'stats'],
    queryFn: () => ticketmasterClient.getRequestStats(),
    refetchInterval: 60 * 1000, // Refetch every minute
    staleTime: 30 * 1000, // Consider stale after 30 seconds
  });
}

/**
 * Custom hook for batch event searches across multiple cities
 */
export function useBatchTicketmasterEvents(
  cities: string[],
  params: Omit<EventSearchParams, 'city'> = {},
  options: {
    enabled?: boolean;
  } = {}
) {
  return useQuery({
    queryKey: ['ticketmaster', 'batch-events', cities, params],
    queryFn: async () => {
      const events = await ticketmasterClient.batchSearchEvents(cities, params);
      return {
        events,
        sceneScoutEvents: events.map(event => 
          ticketmasterClient.convertEventToSceneScout(event)
        ),
        totalEvents: events.length,
        citiesSearched: cities.length
      };
    },
    enabled: options.enabled ?? cities.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
}