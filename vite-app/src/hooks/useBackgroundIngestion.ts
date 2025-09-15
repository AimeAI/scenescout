import { useCallback, useRef } from 'react'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'

interface IngestOptions {
  lat: number
  lng: number
  radius?: number
  sources?: string[]
}

interface IngestResponse {
  success: boolean
  status?: string
  reason?: string
  venuesProcessed?: number
  eventsProcessed?: number
  totalFound?: number
}

export function useBackgroundIngestion() {
  const { user } = useAuthStore()
  const { toast } = useToast()
  const debounceRef = useRef<NodeJS.Timeout>()
  const runningRef = useRef<Set<string>>(new Set())

  const runIngestion = useCallback(async (
    functionName: string, 
    options: IngestOptions
  ): Promise<IngestResponse | null> => {
    // Only run if user is logged in
    if (!user) return null

    const requestKey = `${functionName}-${options.lat}-${options.lng}`
    
    // Prevent duplicate requests
    if (runningRef.current.has(requestKey)) {
      return null
    }

    runningRef.current.add(requestKey)

    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          lat: options.lat,
          lng: options.lng,
          location: `${options.lat},${options.lng}`,
          radius: options.radius || 2000 // Small radius for background fetches
        }
      })

      if (error) {
        console.warn(`Background ingestion failed for ${functionName}:`, error)
        return null
      }

      // Only show toast for successful non-disabled responses
      if (data?.success && data.venuesProcessed > 0) {
        toast({
          title: 'New venues found',
          description: `Found ${data.venuesProcessed} new venues in this area`,
          duration: 3000
        })
      }

      return data
    } catch (error) {
      console.warn(`Background ingestion error for ${functionName}:`, error)
      return null
    } finally {
      runningRef.current.delete(requestKey)
    }
  }, [user, toast])

  const debouncedIngestForLocation = useCallback((
    lat: number, 
    lng: number, 
    radius: number = 2000
  ) => {
    // Only run for logged in users
    if (!user) return

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Set new debounce
    debounceRef.current = setTimeout(async () => {
      const options = { lat, lng, radius }
      
      // Run ingestions for venue-focused sources with small caps
      const sources = [
        'ingest_places_google',
        'ingest_places_yelp'
      ]

      // Run ingestions in parallel but with delay between them
      for (const [index, source] of sources.entries()) {
        setTimeout(() => {
          runIngestion(source, options)
        }, index * 2000) // Stagger by 2 seconds
      }
    }, 1500) // Wait 1.5 seconds after last map movement
  }, [user, runIngestion])

  return {
    runIngestion,
    debouncedIngestForLocation
  }
}