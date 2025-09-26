// Direct API ingestion service for real-time data fetching
import { supabase } from '@/lib/supabase'

// Google Places API removed - using alternative data sources
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
      console.log(`🔍 Venue ingestion disabled - Google Places API removed`)
      
      // Mark this area as checked (to prevent repeated attempts)
      this.ingestionCache.set(cacheKey, Date.now())
      
      // Return success with 0 venues ingested
      return { success: true, venues: 0 }
      
    } catch (error) {
      console.error('Ingestion failed:', error)
      return { success: false, venues: 0 }
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