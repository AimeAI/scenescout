// Direct API ingestion service for real-time data fetching
import { supabase } from '@/lib/supabase'

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY || 'AIzaSyCrsauxxAb2nqLsfhr4UqSeJIFkssLHjNE'
const YELP_API_KEY = import.meta.env.VITE_YELP_API_KEY || 'tpNEPYv1OdDlphvD--672xPJKCr3KGFNLsJ5Q1Hbq12xA0suztjs8dYxFr_sUGD8a5Pp2fPej32Xeh0uvxh6wYvF2tgAoedhXJ2fNqnrpq4Rme_m6bTptrxuJajHaHYx'

interface LocationBounds {
  lat: number
  lng: number
  radius?: number
}

class ApiIngestionService {
  private ingestionCache = new Map<string, number>()
  private readonly CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

  private getCacheKey(lat: number, lng: number, radius: number): string {
    const roundedLat = Math.round(lat * 100) / 100
    const roundedLng = Math.round(lng * 100) / 100
    return `${roundedLat}-${roundedLng}-${radius}`
  }

  private shouldIngest(cacheKey: string): boolean {
    const lastIngestion = this.ingestionCache.get(cacheKey)
    if (!lastIngestion) return true
    return Date.now() - lastIngestion > this.CACHE_DURATION
  }

  async ingestNearbyVenues(bounds: LocationBounds): Promise<{success: boolean, venues: number}> {
    const { lat, lng, radius = 2000 } = bounds
    const cacheKey = this.getCacheKey(lat, lng, radius)
    
    if (!this.shouldIngest(cacheKey)) {
      return { success: true, venues: 0 }
    }

    try {
      console.log(`🔍 Ingesting venues near ${lat}, ${lng}`)
      
      // Fetch from Google Places nearby search
      const googleVenues = await this.fetchGooglePlaces(lat, lng, radius)
      
      // Insert new venues
      let insertedCount = 0
      
      if (googleVenues.length > 0) {
        const { data: city } = await supabase
          .from('cities')
          .select('id')
          .eq('slug', 'toronto-on')
          .single()

        if (city) {
          for (const venue of googleVenues) {
            try {
              // Check if venue already exists
              const { data: existing } = await supabase
                .from('venues')
                .select('id')
                .eq('external_id', venue.place_id)
                .single()

              if (!existing) {
                const { error } = await supabase
                  .from('venues')
                  .insert({
                    name: venue.name,
                    address: venue.vicinity || venue.formatted_address,
                    latitude: venue.geometry.location.lat,
                    longitude: venue.geometry.location.lng,
                    venue_type: venue.types?.[0] || 'other',
                    external_id: venue.place_id,
                    city_id: city.id,
                    images: venue.photos ? [
                      `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${venue.photos[0].photo_reference}&key=${GOOGLE_API_KEY}`
                    ] : []
                  })

                if (!error) {
                  insertedCount++
                }
              }
            } catch (err) {
              console.error('Error inserting venue:', err)
            }
          }
        }
      }

      // Mark this area as ingested
      this.ingestionCache.set(cacheKey, Date.now())
      
      console.log(`✅ Ingested ${insertedCount} new venues`)
      return { success: true, venues: insertedCount }
      
    } catch (error) {
      console.error('Ingestion failed:', error)
      return { success: false, venues: 0 }
    }
  }

  private async fetchGooglePlaces(lat: number, lng: number, radius: number) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=point_of_interest&key=${GOOGLE_API_KEY}`
      )
      
      if (!response.ok) {
        throw new Error(`Google Places API error: ${response.status}`)
      }
      
      const data = await response.json()
      return data.results || []
      
    } catch (error) {
      console.error('Google Places fetch failed:', error)
      return []
    }
  }

  // Check if we have venues in a given area
  async hasVenuesInArea(lat: number, lng: number, radius: number = 2000): Promise<boolean> {
    try {
      const { count } = await supabase
        .from('venues')
        .select('*', { count: 'exact', head: true })
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)

      // Simple check - if we have any venues, assume coverage
      // In production, you'd implement proper geographic bounds checking
      return (count || 0) > 0
      
    } catch (error) {
      console.error('Error checking venue coverage:', error)
      return false
    }
  }
}

export const apiIngestionService = new ApiIngestionService()