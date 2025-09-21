import { supabase } from './supabaseClient'
import { mockEvents, getMockEventsByCategory, getMockFeaturedEvents } from './mockData'

// Check if Supabase is available (simple connection test)
async function isSupabaseAvailable(): Promise<boolean> {
  try {
    await supabase.from('events').select('id').limit(1)
    return true
  } catch (err) {
    const errorMessage = String(err)
    // Check for DNS/network errors
    if (errorMessage.includes('Failed to fetch') || 
        errorMessage.includes('ERR_NAME_NOT_RESOLVED') ||
        errorMessage.includes('NetworkError')) {
      return false
    }
    return true // Other errors might be recoverable
  }
}

// Safe RPC wrapper that falls back to direct queries when RPCs fail
export async function safeRpc<T = any>(
  rpcName: string,
  params: Record<string, any> = {},
  fallbackQuery?: () => Promise<{ data: T[] | null; error: any }>
): Promise<{ data: T[] | null; error: any }> {
  try {
    // Check if Supabase is available first
    const isAvailable = await isSupabaseAvailable()
    if (!isAvailable) {
      console.warn(`Supabase unavailable - using mock data for ${rpcName}`)
      return await getMockDataForRpc(rpcName, params)
    }

    // Try RPC first
    const { data, error } = await (supabase.rpc as any)(rpcName, params)
    
    if (!error) {
      return { data, error: null }
    }
    
    console.warn(`RPC ${rpcName} failed:`, error)
    
    // If RPC fails and we have a fallback, use it
    if (fallbackQuery) {
      console.log(`Using fallback query for ${rpcName}`)
      return await fallbackQuery()
    }
    
    return { data: null, error }
  } catch (err) {
    console.error(`RPC ${rpcName} error:`, err)
    
    // Try mock data as ultimate fallback
    try {
      console.log(`Using mock data fallback for ${rpcName}`)
      return await getMockDataForRpc(rpcName, params)
    } catch (mockErr) {
      console.error(`Mock data fallback also failed for ${rpcName}:`, mockErr)
    }
    
    // Try fallback query if available
    if (fallbackQuery) {
      try {
        console.log(`Using fallback query for ${rpcName} due to error`)
        return await fallbackQuery()
      } catch (fallbackErr) {
        console.error(`Fallback query also failed for ${rpcName}:`, fallbackErr)
      }
    }
    
    return { data: null, error: err }
  }
}

// Mock data provider for different RPC functions
async function getMockDataForRpc<T = any>(
  rpcName: string,
  params: Record<string, any> = {}
): Promise<{ data: T[] | null; error: any }> {
  await new Promise(resolve => setTimeout(resolve, 100)) // Simulate network delay
  
  switch (rpcName) {
    case 'get_featured_events':
      return { data: getMockFeaturedEvents().slice(0, params.limit_count || 10) as T[], error: null }
    
    case 'get_nearby_events':
      // Return events sorted by proximity to mock location 
      const { latitude, longitude, radius_miles = 50 } = params
      return { data: mockEvents.slice(0, params.limit_count || 20) as T[], error: null }
    
    case 'get_events_by_city':
      return { data: mockEvents.slice(0, params.limit_count || 50) as T[], error: null }
    
    default:
      console.warn(`No mock data available for RPC: ${rpcName}`)
      return { data: [], error: null }
  }
}

// Common fallback queries
export const fallbackQueries = {
  getFeaturedEvents: async (limit = 10) => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          venue:venues(*),
          city:cities(*)
        `)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(limit)
      
      if (error) {
        console.warn('Fallback query failed, using mock data:', error)
        return { data: getMockFeaturedEvents().slice(0, limit), error: null }
      }
      
      return { data: data || [], error: null }
    } catch (err) {
      console.warn('Fallback query failed, using mock data')
      return { data: getMockFeaturedEvents().slice(0, limit), error: null }
    }
  },

  getEventsByCategory: async (category?: string, citySlug?: string, limit = 20) => {
    try {
      let query = supabase
        .from('events')
        .select(`
          *,
          venue:venues(*),
          city:cities(*)
        `)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(limit)
      
      if (category && category !== 'all') {
        query = query.eq('category', category as any)
      }
      
      if (citySlug) {
        // Join with cities to filter by slug
        query = query.eq('city.slug', citySlug)
      }
      
      return await query
    } catch (err) {
      console.warn('Fallback category query failed, using mock data')
      const mockData = category ? getMockEventsByCategory(category) : mockEvents
      return { data: mockData.slice(0, limit), error: null }
    }
  },

  searchEvents: async (searchQuery?: string, filters: any = {}) => {
    let query = supabase
      .from('events')
      .select(`
        *,
        venue:venues(*),
        city:cities(*)
      `)
      .gte('date', new Date().toISOString().split('T')[0])
    
    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
    }
    
    if (filters.category && filters.category !== 'all') {
      query = query.eq('category', filters.category)
    }
    
    if (filters.city_filter) {
      query = query.eq('city.slug', filters.city_filter)
    }
    
    if (filters.is_free_filter !== undefined) {
      query = query.eq('is_free', filters.is_free_filter)
    }
    
    if (filters.date_from) {
      query = query.gte('date', filters.date_from)
    }
    
    if (filters.date_to) {
      query = query.lte('date', filters.date_to)
    }
    
    return await query
      .order('date', { ascending: true })
      .limit(filters.limit_count || 50)
      .range(filters.offset_count || 0, (filters.offset_count || 0) + (filters.limit_count || 50) - 1)
  },

  getNearbyEvents: async (lat: number, lng: number, radius = 10, limit = 20) => {
    // Simple fallback - return all events with coordinates
    // In production, you'd implement proper distance calculation
    console.log(`Fallback nearby search near ${lat}, ${lng} within ${radius} miles`)
    try {
      return await supabase
        .from('events')
        .select(`
          *,
          venue:venues(*),
          city:cities(*)
        `)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(limit)
    } catch (err) {
      console.warn('Fallback nearby query failed, using mock data')
      return { data: mockEvents.slice(0, limit), error: null }
    }
  },

  getUserSavedEvents: async (userId: string) => {
    return await supabase
      .from('user_event_saves')
      .select(`
        event:events(
          *,
          venue:venues(*),
          city:cities(*)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
  }
}