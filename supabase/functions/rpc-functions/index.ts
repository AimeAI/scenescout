import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface RpcRequest {
  function: string
  params: Record<string, any>
}

interface GeoSearchParams {
  latitude: number
  longitude: number
  radius_km: number
  event_types?: string[]
  date_range?: {
    start: string
    end: string
  }
  limit?: number
  offset?: number
}

interface PersonalizationParams {
  user_id: string
  location?: {
    latitude: number
    longitude: number
  }
  preferences?: {
    categories: string[]
    price_range?: {
      min: number
      max: number
    }
    time_preferences?: string[]
  }
  limit?: number
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

class RpcFunctions {
  // Geo-spatial event search
  async searchEventsNearby(params: GeoSearchParams): Promise<any> {
    const {
      latitude,
      longitude,
      radius_km,
      event_types,
      date_range,
      limit = 50,
      offset = 0
    } = params

    try {
      let query = supabase
        .from('events')
        .select(`
          *,
          venues!inner (
            id,
            name,
            address,
            latitude,
            longitude,
            venue_type
          )
        `)
        .gte('start_time', date_range?.start || new Date().toISOString())
        .order('start_time', { ascending: true })
        .range(offset, offset + limit - 1)

      // Add date range filter
      if (date_range?.end) {
        query = query.lte('start_time', date_range.end)
      }

      // Add event type filter
      if (event_types && event_types.length > 0) {
        query = query.in('category', event_types)
      }

      const { data: events, error } = await query

      if (error) {
        throw error
      }

      // Filter by distance (since PostGIS might not be available)
      const filteredEvents = events?.filter(event => {
        const venue = event.venues
        if (!venue?.latitude || !venue?.longitude) return false
        
        const distance = this.calculateDistance(
          latitude,
          longitude,
          venue.latitude,
          venue.longitude
        )
        
        return distance <= radius_km
      }) || []

      // Add distance to each event
      const eventsWithDistance = filteredEvents.map(event => ({
        ...event,
        distance_km: this.calculateDistance(
          latitude,
          longitude,
          event.venues.latitude,
          event.venues.longitude
        )
      }))

      // Sort by distance
      eventsWithDistance.sort((a, b) => a.distance_km - b.distance_km)

      return {
        success: true,
        events: eventsWithDistance,
        total: eventsWithDistance.length,
        radius_km,
        center: { latitude, longitude }
      }

    } catch (error) {
      console.error('Geo search error:', error)
      return {
        success: false,
        error: error.message,
        events: [],
        total: 0
      }
    }
  }

  // Personalized event recommendations
  async getPersonalizedEvents(params: PersonalizationParams): Promise<any> {
    const {
      user_id,
      location,
      preferences,
      limit = 20
    } = params

    try {
      // Get user interaction history
      const { data: userHistory } = await supabase
        .from('user_event_interactions')
        .select('event_id, interaction_type, created_at')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(100)

      // Get user's preferred categories from history
      const { data: categoryPreferences } = await supabase
        .from('events')
        .select('category')
        .in('id', userHistory?.map(h => h.event_id) || [])

      const preferredCategories = this.extractTopCategories(
        categoryPreferences || [],
        preferences?.categories || []
      )

      // Build personalized query
      let query = supabase
        .from('events')
        .select(`
          *,
          venues!inner (
            id,
            name,
            address,
            latitude,
            longitude,
            venue_type
          )
        `)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })

      // Filter by preferred categories
      if (preferredCategories.length > 0) {
        query = query.in('category', preferredCategories)
      }

      // Filter by price range
      if (preferences?.price_range) {
        if (preferences.price_range.min !== undefined) {
          query = query.gte('price_min', preferences.price_range.min)
        }
        if (preferences.price_range.max !== undefined) {
          query = query.lte('price_max', preferences.price_range.max)
        }
      }

      const { data: events, error } = await query.limit(limit * 2) // Get more to filter

      if (error) {
        throw error
      }

      let personalizedEvents = events || []

      // Apply location filtering if provided
      if (location) {
        personalizedEvents = personalizedEvents.filter(event => {
          const venue = event.venues
          if (!venue?.latitude || !venue?.longitude) return true
          
          const distance = this.calculateDistance(
            location.latitude,
            location.longitude,
            venue.latitude,
            venue.longitude
          )
          
          return distance <= 50 // 50km radius
        })
      }

      // Calculate personalization score
      const scoredEvents = personalizedEvents.map(event => ({
        ...event,
        personalization_score: this.calculatePersonalizationScore(
          event,
          userHistory || [],
          preferences
        )
      }))

      // Sort by personalization score
      scoredEvents.sort((a, b) => b.personalization_score - a.personalization_score)

      return {
        success: true,
        events: scoredEvents.slice(0, limit),
        total: scoredEvents.length,
        user_id,
        preferred_categories: preferredCategories
      }

    } catch (error) {
      console.error('Personalization error:', error)
      return {
        success: false,
        error: error.message,
        events: [],
        total: 0
      }
    }
  }

  // Get trending events
  async getTrendingEvents(params: { limit?: number; time_window?: string }): Promise<any> {
    const { limit = 20, time_window = '7d' } = params

    try {
      // Calculate time window
      const now = new Date()
      const windowStart = new Date()
      
      switch (time_window) {
        case '24h':
          windowStart.setHours(windowStart.getHours() - 24)
          break
        case '7d':
          windowStart.setDate(windowStart.getDate() - 7)
          break
        case '30d':
          windowStart.setDate(windowStart.getDate() - 30)
          break
        default:
          windowStart.setDate(windowStart.getDate() - 7)
      }

      // Get events with interaction counts
      const { data: trendingData, error } = await supabase
        .rpc('get_trending_events', {
          window_start: windowStart.toISOString(),
          event_limit: limit
        })

      if (error) {
        // Fallback query if RPC function doesn't exist
        const { data: events } = await supabase
          .from('events')
          .select(`
            *,
            venues!inner (
              id,
              name,
              address,
              latitude,
              longitude
            )
          `)
          .gte('start_time', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(limit)

        return {
          success: true,
          events: events || [],
          total: events?.length || 0,
          time_window
        }
      }

      return {
        success: true,
        events: trendingData || [],
        total: trendingData?.length || 0,
        time_window
      }

    } catch (error) {
      console.error('Trending events error:', error)
      return {
        success: false,
        error: error.message,
        events: [],
        total: 0
      }
    }
  }

  // Get venue recommendations
  async getVenueRecommendations(params: {
    user_id?: string
    location?: { latitude: number; longitude: number }
    venue_types?: string[]
    limit?: number
  }): Promise<any> {
    const { user_id, location, venue_types, limit = 20 } = params

    try {
      let query = supabase
        .from('venues')
        .select(`
          *,
          events!inner (
            id,
            title,
            start_time,
            category
          )
        `)
        .limit(limit)

      // Filter by venue types
      if (venue_types && venue_types.length > 0) {
        query = query.in('venue_type', venue_types)
      }

      const { data: venues, error } = await query

      if (error) {
        throw error
      }

      let recommendedVenues = venues || []

      // Apply location filtering
      if (location) {
        recommendedVenues = recommendedVenues.filter(venue => {
          if (!venue.latitude || !venue.longitude) return true
          
          const distance = this.calculateDistance(
            location.latitude,
            location.longitude,
            venue.latitude,
            venue.longitude
          )
          
          return distance <= 25 // 25km radius
        })
      }

      // Calculate venue scores based on upcoming events
      const scoredVenues = recommendedVenues.map(venue => {
        const upcomingEvents = venue.events?.filter(
          (event: any) => new Date(event.start_time) > new Date()
        ).length || 0
        
        return {
          ...venue,
          upcoming_events_count: upcomingEvents,
          recommendation_score: upcomingEvents * 10 + Math.random() * 5
        }
      })

      // Sort by recommendation score
      scoredVenues.sort((a, b) => b.recommendation_score - a.recommendation_score)

      return {
        success: true,
        venues: scoredVenues,
        total: scoredVenues.length
      }

    } catch (error) {
      console.error('Venue recommendations error:', error)
      return {
        success: false,
        error: error.message,
        venues: [],
        total: 0
      }
    }
  }

  // Event analytics
  async getEventAnalytics(params: {
    event_id?: string
    venue_id?: string
    time_period?: string
  }): Promise<any> {
    const { event_id, venue_id, time_period = '30d' } = params

    try {
      const analytics: any = {
        views: 0,
        saves: 0,
        shares: 0,
        tickets_clicked: 0,
        conversion_rate: 0
      }

      // Get interaction counts
      let interactionQuery = supabase
        .from('user_event_interactions')
        .select('interaction_type')

      if (event_id) {
        interactionQuery = interactionQuery.eq('event_id', event_id)
      }
      
      if (venue_id) {
        // Get events for this venue first
        const { data: venueEvents } = await supabase
          .from('events')
          .select('id')
          .eq('venue_id', venue_id)
        
        const eventIds = venueEvents?.map(e => e.id) || []
        if (eventIds.length > 0) {
          interactionQuery = interactionQuery.in('event_id', eventIds)
        }
      }

      // Apply time filter
      const timeStart = new Date()
      switch (time_period) {
        case '7d':
          timeStart.setDate(timeStart.getDate() - 7)
          break
        case '30d':
          timeStart.setDate(timeStart.getDate() - 30)
          break
        case '90d':
          timeStart.setDate(timeStart.getDate() - 90)
          break
      }
      
      interactionQuery = interactionQuery.gte('created_at', timeStart.toISOString())

      const { data: interactions, error } = await interactionQuery

      if (error) {
        throw error
      }

      // Count interactions by type
      interactions?.forEach(interaction => {
        switch (interaction.interaction_type) {
          case 'view':
            analytics.views++
            break
          case 'save':
            analytics.saves++
            break
          case 'share':
            analytics.shares++
            break
          case 'ticket_click':
            analytics.tickets_clicked++
            break
        }
      })

      // Calculate conversion rate
      if (analytics.views > 0) {
        analytics.conversion_rate = (analytics.tickets_clicked / analytics.views) * 100
      }

      return {
        success: true,
        analytics,
        time_period,
        event_id,
        venue_id
      }

    } catch (error) {
      console.error('Analytics error:', error)
      return {
        success: false,
        error: error.message,
        analytics: null
      }
    }
  }

  // Utility methods
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1)
    const dLon = this.toRadians(lon2 - lon1)
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }

  private extractTopCategories(categoryData: any[], preferredCategories: string[]): string[] {
    const categoryCounts = new Map<string, number>()
    
    // Count categories from user history
    categoryData.forEach(item => {
      const count = categoryCounts.get(item.category) || 0
      categoryCounts.set(item.category, count + 1)
    })
    
    // Add preferred categories
    preferredCategories.forEach(category => {
      const count = categoryCounts.get(category) || 0
      categoryCounts.set(category, count + 5) // Boost preferred categories
    })
    
    // Sort by count and return top categories
    return Array.from(categoryCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => entry[0])
  }

  private calculatePersonalizationScore(
    event: any, 
    userHistory: any[], 
    preferences: any
  ): number {
    let score = 0
    
    // Category preference score
    if (preferences?.categories?.includes(event.category)) {
      score += 10
    }
    
    // Historical interaction score
    const categoryInteractions = userHistory.filter(
      h => h.event_category === event.category
    ).length
    score += categoryInteractions * 2
    
    // Price preference score
    if (preferences?.price_range) {
      const eventPrice = event.price_min || 0
      if (eventPrice >= (preferences.price_range.min || 0) && 
          eventPrice <= (preferences.price_range.max || 1000)) {
        score += 5
      }
    }
    
    // Time preference score (placeholder)
    // This could be enhanced with actual time preference logic
    score += Math.random() * 3
    
    return score
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { function: functionName, params }: RpcRequest = await req.json()
    
    if (!functionName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Function name is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    const rpcFunctions = new RpcFunctions()
    let result: any

    switch (functionName) {
      case 'search_events_nearby':
        result = await rpcFunctions.searchEventsNearby(params)
        break
      case 'get_personalized_events':
        result = await rpcFunctions.getPersonalizedEvents(params)
        break
      case 'get_trending_events':
        result = await rpcFunctions.getTrendingEvents(params)
        break
      case 'get_venue_recommendations':
        result = await rpcFunctions.getVenueRecommendations(params)
        break
      case 'get_event_analytics':
        result = await rpcFunctions.getEventAnalytics(params)
        break
      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown function: ${functionName}` }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 500
      }
    )
    
  } catch (error) {
    console.error('RPC function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})