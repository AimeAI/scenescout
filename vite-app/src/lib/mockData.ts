// Mock data for development when Supabase is unavailable
import type { Event } from '@/types/database.types'

export const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Toronto Jazz Festival',
    description: 'Annual jazz festival featuring local and international artists',
    date: '2025-09-20T19:00:00Z',
    venue_id: '1',
    category: 'music',
    is_featured: true,
    is_free: false,
    price_min: 25,
    price_max: 85,
    currency: 'CAD',
    view_count: 42,
    image_url: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800',
    external_url: 'https://example.com/jazz-festival',
    provider: 'eventbrite',
    source: 'eventbrite',
    external_id: 'mock-1',
    is_approved: true,
    status: 'active',
    hotness_score: 85,
    created_at: '2025-09-15T00:00:00Z',
    updated_at: '2025-09-15T00:00:00Z',
    latitude: 43.6532,
    longitude: -79.3832,
    venue: {
      id: '1',
      name: 'Roy Thomson Hall',
      address: '60 Simcoe St, Toronto, ON',
      latitude: 43.6532,
      longitude: -79.3832,
      city_id: '1'
    },
    city: {
      id: '1',
      name: 'Toronto',
      slug: 'toronto',
      state: 'ON',
      country: 'CA'
    }
  },
  {
    id: '2',
    title: 'Tech Meetup Toronto',
    description: 'Monthly tech networking event',
    date: '2025-09-18T18:30:00Z',
    venue_id: '2',
    category: 'tech',
    is_featured: false,
    is_free: true,
    price_min: 0,
    price_max: 0,
    image_url: 'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=800',
    external_url: 'https://example.com/tech-meetup',
    provider: 'meetup',
    external_id: 'mock-2',
    is_approved: true,
    status: 'active',
    hotness_score: 65,
    created_at: '2025-09-15T00:00:00Z',
    updated_at: '2025-09-15T00:00:00Z',
    latitude: 43.6426,
    longitude: -79.3871,
    venue: {
      id: '2',
      name: 'MaRS Discovery District',
      address: '101 College St, Toronto, ON',
      latitude: 43.6426,
      longitude: -79.3871,
      city_id: '1'
    },
    city: {
      id: '1',
      name: 'Toronto',
      slug: 'toronto',
      state: 'ON',
      country: 'CA'
    }
  },
  {
    id: '3',
    title: 'Food Truck Festival',
    description: 'Street food festival with 50+ vendors',
    date: '2025-09-22T11:00:00Z',
    venue_id: '3',
    category: 'food',
    is_featured: true,
    is_free: false,
    price_min: 5,
    price_max: 20,
    image_url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800',
    external_url: 'https://example.com/food-truck-festival',
    provider: 'yelp',
    external_id: 'mock-3',
    is_approved: true,
    status: 'active',
    hotness_score: 78,
    created_at: '2025-09-15T00:00:00Z',
    updated_at: '2025-09-15T00:00:00Z',
    latitude: 43.6511,
    longitude: -79.3470,
    venue: {
      id: '3',
      name: 'Harbourfront Centre',
      address: '235 Queens Quay W, Toronto, ON',
      latitude: 43.6511,
      longitude: -79.3470,
      city_id: '1'
    },
    city: {
      id: '1',
      name: 'Toronto',
      slug: 'toronto',
      state: 'ON',
      country: 'CA'
    }
  },
  {
    id: '4',
    title: 'Art Gallery Opening',
    description: 'Contemporary art exhibition opening night',
    date: '2025-09-19T19:00:00Z',
    venue_id: '4',
    category: 'arts',
    is_featured: false,
    is_free: true,
    price_min: 0,
    price_max: 0,
    image_url: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800',
    external_url: 'https://example.com/art-opening',
    provider: 'google_places',
    external_id: 'mock-4',
    is_approved: true,
    status: 'active',
    hotness_score: 55,
    created_at: '2025-09-15T00:00:00Z',
    updated_at: '2025-09-15T00:00:00Z',
    latitude: 43.6677,
    longitude: -79.3948,
    venue: {
      id: '4',
      name: 'Art Gallery of Ontario',
      address: '317 Dundas St W, Toronto, ON',
      latitude: 43.6677,
      longitude: -79.3948,
      city_id: '1'
    },
    city: {
      id: '1',
      name: 'Toronto',
      slug: 'toronto',
      state: 'ON',
      country: 'CA'
    }
  },
  {
    id: '5',
    title: 'Raptors vs Lakers',
    description: 'NBA regular season game',
    date: '2025-09-25T19:30:00Z',
    venue_id: '5',
    category: 'sports',
    is_featured: true,
    is_free: false,
    price_min: 45,
    price_max: 250,
    image_url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800',
    external_url: 'https://example.com/raptors-game',
    provider: 'ticketmaster',
    external_id: 'mock-5',
    is_approved: true,
    status: 'active',
    hotness_score: 92,
    created_at: '2025-09-15T00:00:00Z',
    updated_at: '2025-09-15T00:00:00Z',
    latitude: 43.6434,
    longitude: -79.3791,
    venue: {
      id: '5',
      name: 'Scotiabank Arena',
      address: '40 Bay St, Toronto, ON',
      latitude: 43.6434,
      longitude: -79.3791,
      city_id: '1'
    },
    city: {
      id: '1',
      name: 'Toronto',
      slug: 'toronto',
      state: 'ON',
      country: 'CA'
    }
  },
  {
    id: '6',
    title: 'Startup Pitch Night',
    description: 'Local entrepreneurs pitch their startup ideas to investors and community',
    date: '2025-09-22T18:00:00Z',
    venue_id: '6',
    category: 'business',
    is_featured: false,
    is_free: false,
    price_min: 15,
    price_max: 30,
    currency: 'CAD',
    view_count: 28,
    image_url: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?w=800',
    external_url: 'https://example.com/startup-pitch',
    provider: 'eventbrite',
    source: 'eventbrite',
    external_id: 'mock-6',
    is_approved: true,
    status: 'active',
    hotness_score: 72,
    created_at: '2025-09-15T00:00:00Z',
    updated_at: '2025-09-15T00:00:00Z',
    latitude: 43.6426,
    longitude: -79.3871,
    venue: {
      id: '6',
      name: 'MaRS Discovery District',
      address: '101 College St, Toronto, ON',
      latitude: 43.6426,
      longitude: -79.3871,
      city_id: '1'
    },
    city: {
      id: '1',
      name: 'Toronto',
      slug: 'toronto',
      state: 'ON',
      country: 'CA'
    }
  }
]

export const getMockEventsByCategory = (category: string): Event[] => {
  if (category === 'all') return mockEvents
  return mockEvents.filter(event => event.category === category)
}

export const getMockFeaturedEvents = (): Event[] => {
  return mockEvents.filter(event => event.is_featured)
}