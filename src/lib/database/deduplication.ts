import { createClient } from '@supabase/supabase-js'
import { Event } from '@/types'

interface DuplicationCheckResult {
  isDuplicate: boolean
  existingEventId?: string
  similarEvents: Array<{
    id: string
    title: string
    similarityScore: number
    reason: string
  }>
  confidence: number
}

interface EventFingerprint {
  titleNormalized: string
  venueNormalized: string
  dateKey: string
  timeWindow: string
  locationKey: string
  contentHash: string
}

export class EventDeduplicator {
  private supabase: any

  constructor(supabase: any) {
    this.supabase = supabase
  }

  /**
   * Generate a normalized fingerprint for an event
   */
  private generateEventFingerprint(event: Partial<Event>): EventFingerprint {
    // Normalize title - remove common prefixes, special chars, extra spaces
    const titleNormalized = this.normalizeTitle(event.title || '')
    
    // Normalize venue name
    const venueNormalized = this.normalizeVenue(event.venue_name || '')
    
    // Create date key (YYYY-MM-DD)
    const startTime = event.start_time || event.date || event.event_date
    const dateKey = startTime ? new Date(startTime).toISOString().split('T')[0] : ''
    
    // Create time window (morning/afternoon/evening/night)
    const timeWindow = this.getTimeWindow(startTime)
    
    // Create location key
    const locationKey = this.createLocationKey(
      event.latitude,
      event.longitude,
      event.address,
      event.city_name
    )
    
    // Generate content hash
    const contentHash = this.generateContentHash(event)
    
    return {
      titleNormalized,
      venueNormalized,
      dateKey,
      timeWindow,
      locationKey,
      contentHash
    }
  }

  /**
   * Normalize event title for comparison
   */
  private normalizeTitle(title: string): string {
    if (!title) return ''
    
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove special characters
      .replace(/\b(the|a|an|presents|featuring|feat\.?|ft\.?|with|live|concert|show|event)\b/g, '') // Remove common words
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  /**
   * Normalize venue name for comparison
   */
  private normalizeVenue(venue: string): string {
    if (!venue) return ''
    
    return venue
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\b(the|at|venue|hall|center|centre|theatre|theater|club|bar|pub|restaurant)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Get time window for loose time matching
   */
  private getTimeWindow(dateTime?: string): string {
    if (!dateTime) return 'unknown'
    
    const date = new Date(dateTime)
    const hour = date.getHours()
    
    if (hour < 6) return 'late-night'
    if (hour < 12) return 'morning'
    if (hour < 17) return 'afternoon'
    if (hour < 22) return 'evening'
    return 'night'
  }

  /**
   * Create location key for proximity matching
   */
  private createLocationKey(
    lat?: number,
    lng?: number,
    address?: string,
    city?: string
  ): string {
    if (lat && lng) {
      // Round coordinates to ~1km precision for clustering
      const latRounded = Math.round(lat * 100) / 100
      const lngRounded = Math.round(lng * 100) / 100
      return `${latRounded},${lngRounded}`
    }
    
    if (address) {
      // Normalize address
      return address
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\b(street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|lane|ln)\b/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    }
    
    return city?.toLowerCase() || 'unknown'
  }

  /**
   * Generate SHA-256 hash of key event content
   */
  private generateContentHash(event: Partial<Event>): string {
    const content = [
      this.normalizeTitle(event.title || ''),
      this.normalizeVenue(event.venue_name || ''),
      event.start_time || event.date || '',
      event.description?.slice(0, 200) || ''
    ].join('|')
    
    // Simple hash function (in production, use crypto.subtle.digest)
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16)
  }

  /**
   * Calculate similarity score between two events
   */
  private calculateSimilarity(event1: EventFingerprint, event2: EventFingerprint): number {
    let score = 0
    let factors = 0

    // Title similarity (40% weight)
    if (event1.titleNormalized && event2.titleNormalized) {
      const titleSim = this.stringSimilarity(event1.titleNormalized, event2.titleNormalized)
      score += titleSim * 0.4
      factors += 0.4
    }

    // Venue similarity (25% weight)
    if (event1.venueNormalized && event2.venueNormalized) {
      const venueSim = this.stringSimilarity(event1.venueNormalized, event2.venueNormalized)
      score += venueSim * 0.25
      factors += 0.25
    }

    // Date exact match (20% weight)
    if (event1.dateKey && event2.dateKey) {
      if (event1.dateKey === event2.dateKey) {
        score += 1 * 0.2
      }
      factors += 0.2
    }

    // Time window match (10% weight)
    if (event1.timeWindow && event2.timeWindow) {
      if (event1.timeWindow === event2.timeWindow) {
        score += 1 * 0.1
      }
      factors += 0.1
    }

    // Location similarity (5% weight)
    if (event1.locationKey && event2.locationKey) {
      const locationSim = this.stringSimilarity(event1.locationKey, event2.locationKey)
      score += locationSim * 0.05
      factors += 0.05
    }

    return factors > 0 ? score / factors : 0
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private stringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0
    if (str1 === str2) return 1

    const len1 = str1.length
    const len2 = str2.length
    const maxLen = Math.max(len1, len2)
    
    if (maxLen === 0) return 1

    // Simple similarity based on common substrings
    const minLen = Math.min(len1, len2)
    let commonChars = 0
    
    for (let i = 0; i < minLen; i++) {
      if (str1[i] === str2[i]) {
        commonChars++
      }
    }
    
    // Add bonus for common words
    const words1 = str1.split(' ')
    const words2 = str2.split(' ')
    const commonWords = words1.filter(word => words2.includes(word) && word.length > 2)
    
    const baseScore = commonChars / maxLen
    const wordBonus = commonWords.length / Math.max(words1.length, words2.length) * 0.3
    
    return Math.min(1, baseScore + wordBonus)
  }

  /**
   * Check if an event is a duplicate
   */
  async checkForDuplicates(event: Partial<Event>): Promise<DuplicationCheckResult> {
    try {
      const fingerprint = this.generateEventFingerprint(event)
      
      // First check: exact external ID match
      if (event.external_id && event.source) {
        const { data: exactMatch } = await this.supabase
          .from('events')
          .select('id, title')
          .eq('external_id', event.external_id)
          .eq('source', event.source)
          .single()
        
        if (exactMatch) {
          return {
            isDuplicate: true,
            existingEventId: exactMatch.id,
            similarEvents: [],
            confidence: 1.0
          }
        }
      }

      // Second check: fingerprint-based deduplication
      const dedupKey = this.generateDedupKey(fingerprint)
      const { data: fingerprintMatch } = await this.supabase
        .from('events')
        .select('id, title')
        .eq('dedup_key', dedupKey)
        .single()
      
      if (fingerprintMatch) {
        return {
          isDuplicate: true,
          existingEventId: fingerprintMatch.id,
          similarEvents: [],
          confidence: 0.95
        }
      }

      // Third check: similarity-based detection
      const similarEvents = await this.findSimilarEvents(event, fingerprint)
      
      // Determine if any similar events are likely duplicates
      const highConfidenceMatches = similarEvents.filter(e => e.similarityScore > 0.85)
      
      if (highConfidenceMatches.length > 0) {
        const bestMatch = highConfidenceMatches[0]
        return {
          isDuplicate: true,
          existingEventId: bestMatch.id,
          similarEvents,
          confidence: bestMatch.similarityScore
        }
      }

      return {
        isDuplicate: false,
        similarEvents,
        confidence: 0
      }
    } catch (error) {
      console.error('Error checking for duplicates:', error)
      return {
        isDuplicate: false,
        similarEvents: [],
        confidence: 0
      }
    }
  }

  /**
   * Generate deduplication key
   */
  private generateDedupKey(fingerprint: EventFingerprint): string {
    return [
      fingerprint.titleNormalized.slice(0, 50),
      fingerprint.venueNormalized.slice(0, 30),
      fingerprint.dateKey,
      fingerprint.timeWindow
    ].join('|')
  }

  /**
   * Find similar events using database queries
   */
  private async findSimilarEvents(
    event: Partial<Event>,
    fingerprint: EventFingerprint
  ): Promise<Array<{ id: string; title: string; similarityScore: number; reason: string }>> {
    const similarEvents: Array<{ id: string; title: string; similarityScore: number; reason: string }> = []

    try {
      // Query for events with similar titles and dates
      const titleWords = fingerprint.titleNormalized.split(' ').filter(w => w.length > 3)
      
      if (titleWords.length > 0) {
        const { data: candidates } = await this.supabase
          .from('events')
          .select('id, title, venue_name, start_time, date, content_hash')
          .or(
            titleWords.map(word => `title.ilike.%${word}%`).join(',')
          )
          .eq('status', 'active')
          .gte('start_time', fingerprint.dateKey)
          .lte('start_time', `${fingerprint.dateKey} 23:59:59`)
          .limit(50)

        for (const candidate of candidates || []) {
          const candidateFingerprint = this.generateEventFingerprint(candidate)
          const similarity = this.calculateSimilarity(fingerprint, candidateFingerprint)
          
          if (similarity > 0.3) {
            similarEvents.push({
              id: candidate.id,
              title: candidate.title,
              similarityScore: similarity,
              reason: this.getSimilarityReason(similarity, fingerprint, candidateFingerprint)
            })
          }
        }
      }

      // Sort by similarity score
      return similarEvents
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, 10)
    } catch (error) {
      console.error('Error finding similar events:', error)
      return []
    }
  }

  /**
   * Get human-readable reason for similarity
   */
  private getSimilarityReason(
    score: number,
    fp1: EventFingerprint,
    fp2: EventFingerprint
  ): string {
    const reasons: string[] = []
    
    if (fp1.titleNormalized && fp2.titleNormalized) {
      const titleSim = this.stringSimilarity(fp1.titleNormalized, fp2.titleNormalized)
      if (titleSim > 0.7) reasons.push('similar title')
    }
    
    if (fp1.venueNormalized && fp2.venueNormalized) {
      const venueSim = this.stringSimilarity(fp1.venueNormalized, fp2.venueNormalized)
      if (venueSim > 0.7) reasons.push('same venue')
    }
    
    if (fp1.dateKey === fp2.dateKey) {
      reasons.push('same date')
    }
    
    if (fp1.timeWindow === fp2.timeWindow) {
      reasons.push('same time')
    }

    if (fp1.contentHash === fp2.contentHash) {
      reasons.push('identical content')
    }
    
    return reasons.join(', ') || 'overall similarity'
  }

  /**
   * Merge duplicate events
   */
  async mergeDuplicateEvents(primaryEventId: string, duplicateEventId: string): Promise<void> {
    try {
      // Record the merge in deduplication table
      await this.supabase
        .from('event_deduplication')
        .insert({
          primary_event_id: primaryEventId,
          duplicate_event_id: duplicateEventId,
          similarity_score: 1.0,
          merge_strategy: 'manual_merge'
        })

      // Update the duplicate event status
      await this.supabase
        .from('events')
        .update({ 
          status: 'merged',
          metadata: { merged_into: primaryEventId }
        })
        .eq('id', duplicateEventId)

      console.log(`Merged event ${duplicateEventId} into ${primaryEventId}`)
    } catch (error) {
      console.error('Error merging duplicate events:', error)
      throw error
    }
  }

  /**
   * Get deduplication statistics
   */
  async getDeduplicationStats(): Promise<{
    totalEvents: number
    duplicatesFound: number
    mergedEvents: number
    averageSimilarity: number
  }> {
    try {
      const [totalEventsResult, duplicatesResult, mergedResult] = await Promise.all([
        this.supabase
          .from('events')
          .select('id', { count: 'exact' }),
        this.supabase
          .from('event_deduplication')
          .select('similarity_score', { count: 'exact' }),
        this.supabase
          .from('events')
          .select('id', { count: 'exact' })
          .eq('status', 'merged')
      ])

      const duplicatesData = duplicatesResult.data || []
      const averageSimilarity = duplicatesData.length > 0
        ? duplicatesData.reduce((sum, d) => sum + Number(d.similarity_score), 0) / duplicatesData.length
        : 0

      return {
        totalEvents: totalEventsResult.count || 0,
        duplicatesFound: duplicatesResult.count || 0,
        mergedEvents: mergedResult.count || 0,
        averageSimilarity
      }
    } catch (error) {
      console.error('Error getting deduplication stats:', error)
      return {
        totalEvents: 0,
        duplicatesFound: 0,
        mergedEvents: 0,
        averageSimilarity: 0
      }
    }
  }
}

// Export utility functions
export const deduplicationUtils = {
  /**
   * Create a new deduplicator instance
   */
  create: (supabase: any) => new EventDeduplicator(supabase),

  /**
   * Quick duplicate check for simple cases
   */
  quickDuplicateCheck: async (
    supabase: any,
    externalId: string,
    source: string
  ): Promise<string | null> => {
    try {
      const { data } = await supabase
        .from('events')
        .select('id')
        .eq('external_id', externalId)
        .eq('source', source)
        .single()
      
      return data?.id || null
    } catch (error) {
      return null
    }
  },

  /**
   * Generate content hash for an event
   */
  generateContentHash: (event: Partial<Event>): string => {
    const deduplicator = new EventDeduplicator(null)
    return deduplicator['generateContentHash'](event)
  }
}