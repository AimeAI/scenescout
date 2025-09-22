import { Event } from '@/types'
import {
  EventFingerprint,
  SimilarityScore,
  MatchResult,
  DuplicationResult,
  LocationMatch,
  DedupConfig,
  MatchAlgorithm,
  SemanticEmbedding
} from './types'

interface StringDistance {
  levenshtein(a: string, b: string): number
  jaroWinkler(a: string, b: string): number
  cosine(a: string, b: string): number
  hybrid(a: string, b: string): number
}

/**
 * Advanced fuzzy matching system for event deduplication
 * Combines multiple algorithms for high-accuracy duplicate detection
 */
export class FuzzyMatcher {
  private config: DedupConfig
  private stringDistance: StringDistance
  private cache = new Map<string, SimilarityScore>()
  private embeddingCache = new Map<string, SemanticEmbedding>()

  constructor(config: Partial<DedupConfig> = {}) {
    this.config = this.mergeWithDefaults(config)
    this.stringDistance = this.initializeStringDistance()
  }

  private mergeWithDefaults(config: Partial<DedupConfig>): DedupConfig {
    return {
      thresholds: {
        title: 0.85,
        venue: 0.80,
        location: 0.75,
        date: 0.90,
        semantic: 0.75,
        overall: 0.80,
        ...config.thresholds
      },
      weights: {
        title: 0.35,
        venue: 0.25,
        location: 0.20,
        date: 0.15,
        semantic: 0.05,
        ...config.weights
      },
      algorithms: {
        stringMatching: 'hybrid',
        semanticMatching: true,
        locationMatching: 'hybrid',
        fuzzyDate: true,
        ...config.algorithms
      },
      performance: {
        batchSize: 100,
        maxCandidates: 50,
        enableCaching: true,
        parallelProcessing: true,
        ...config.performance
      },
      quality: {
        minimumQualityScore: 0.7,
        requireManualReview: false,
        autoMergeThreshold: 0.95,
        ...config.quality
      }
    }
  }

  private initializeStringDistance(): StringDistance {
    return {
      levenshtein: (a: string, b: string): number => {
        if (!a || !b) return 0
        if (a === b) return 1
        
        const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null))
        
        for (let i = 0; i <= a.length; i++) matrix[0][i] = i
        for (let j = 0; j <= b.length; j++) matrix[j][0] = j
        
        for (let j = 1; j <= b.length; j++) {
          for (let i = 1; i <= a.length; i++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1
            matrix[j][i] = Math.min(
              matrix[j][i - 1] + 1,
              matrix[j - 1][i] + 1,
              matrix[j - 1][i - 1] + cost
            )
          }
        }
        
        const maxLength = Math.max(a.length, b.length)
        return 1 - (matrix[b.length][a.length] / maxLength)
      },

      jaroWinkler: (a: string, b: string): number => {
        if (!a || !b) return 0
        if (a === b) return 1
        
        const aLen = a.length
        const bLen = b.length
        const matchWindow = Math.floor(Math.max(aLen, bLen) / 2) - 1
        
        if (matchWindow < 0) return 0
        
        const aMatches = new Array(aLen).fill(false)
        const bMatches = new Array(bLen).fill(false)
        
        let matches = 0
        let transpositions = 0
        
        // Find matches
        for (let i = 0; i < aLen; i++) {
          const start = Math.max(0, i - matchWindow)
          const end = Math.min(i + matchWindow + 1, bLen)
          
          for (let j = start; j < end; j++) {
            if (bMatches[j] || a[i] !== b[j]) continue
            aMatches[i] = bMatches[j] = true
            matches++
            break
          }
        }
        
        if (matches === 0) return 0
        
        // Count transpositions
        let k = 0
        for (let i = 0; i < aLen; i++) {
          if (!aMatches[i]) continue
          while (!bMatches[k]) k++
          if (a[i] !== b[k]) transpositions++
          k++
        }
        
        const jaro = (matches / aLen + matches / bLen + (matches - transpositions / 2) / matches) / 3
        
        // Jaro-Winkler prefix bonus
        let prefix = 0
        for (let i = 0; i < Math.min(4, Math.min(aLen, bLen)); i++) {
          if (a[i] === b[i]) prefix++
          else break
        }
        
        return jaro + (0.1 * prefix * (1 - jaro))
      },

      cosine: (a: string, b: string): number => {
        if (!a || !b) return 0
        if (a === b) return 1
        
        const aTokens = this.tokenize(a)
        const bTokens = this.tokenize(b)
        
        const allTokens = new Set([...aTokens, ...bTokens])
        const aVector = Array.from(allTokens).map(token => aTokens.filter(t => t === token).length)
        const bVector = Array.from(allTokens).map(token => bTokens.filter(t => t === token).length)
        
        const dotProduct = aVector.reduce((sum, a, i) => sum + a * bVector[i], 0)
        const aMagnitude = Math.sqrt(aVector.reduce((sum, a) => sum + a * a, 0))
        const bMagnitude = Math.sqrt(bVector.reduce((sum, b) => sum + b * b, 0))
        
        return aMagnitude && bMagnitude ? dotProduct / (aMagnitude * bMagnitude) : 0
      },

      hybrid: (a: string, b: string): number => {
        const lev = this.levenshtein(a, b)
        const jaro = this.jaroWinkler(a, b)
        const cos = this.cosine(a, b)
        
        // Weighted combination favoring different aspects
        return (lev * 0.4) + (jaro * 0.4) + (cos * 0.2)
      }
    }
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2)
  }

  /**
   * Generate event fingerprint for matching
   */
  public generateFingerprint(event: Event): EventFingerprint {
    const titleTokens = this.tokenize(event.title || '')
    
    return {
      id: event.id,
      titleTokens,
      venueNormalized: this.normalizeVenue(event.venue_name || ''),
      locationKey: this.createLocationKey(event),
      coordinates: event.venue?.latitude && event.venue?.longitude ? {
        lat: event.venue.latitude,
        lng: event.venue.longitude
      } : undefined,
      dateKey: this.createDateKey(event.start_time || event.date || event.event_date),
      timeWindow: this.getTimeWindow(event.start_time || event.date || event.event_date),
      contentHash: this.generateContentHash(event),
      semanticHash: this.generateSemanticHash(event),
      categoryNormalized: event.category?.toLowerCase() || 'other',
      priceRange: this.extractPriceRange(event)
    }
  }

  private normalizeVenue(venue: string): string {
    if (!venue) return ''
    
    return venue
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\b(the|at|venue|hall|center|centre|theatre|theater|club|bar|pub|restaurant)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private createLocationKey(event: Event): string {
    if (event.venue?.latitude && event.venue?.longitude) {
      // Round to ~100m precision for clustering
      const lat = Math.round(event.venue.latitude * 1000) / 1000
      const lng = Math.round(event.venue.longitude * 1000) / 1000
      return `${lat},${lng}`
    }
    
    if (event.venue?.address) {
      return this.normalizeAddress(event.venue.address)
    }
    
    return event.city_name?.toLowerCase() || 'unknown'
  }

  private normalizeAddress(address: string): string {
    return address
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\b(street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd|lane|ln)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private createDateKey(dateStr?: string): string {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0]
  }

  private getTimeWindow(dateStr?: string): string {
    if (!dateStr) return 'unknown'
    
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return 'unknown'
    
    const hour = date.getHours()
    if (hour < 6) return 'late-night'
    if (hour < 12) return 'morning'
    if (hour < 17) return 'afternoon'
    if (hour < 22) return 'evening'
    return 'night'
  }

  private generateContentHash(event: Event): string {
    const content = [
      event.title || '',
      event.venue_name || '',
      event.description?.substring(0, 200) || '',
      event.start_time || event.date || ''
    ].join('|').toLowerCase()
    
    // Simple hash function
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16)
  }

  private generateSemanticHash(event: Event): string {
    // Extract key semantic features
    const features = [
      ...this.tokenize(event.title || ''),
      event.category || '',
      event.subcategory || '',
      ...this.tokenize(event.description?.substring(0, 100) || '')
    ].filter(f => f.length > 2)
    
    return features.sort().join('|')
  }

  private extractPriceRange(event: Event): { min: number; max: number } | undefined {
    const min = event.price_min ?? event.price ?? 0
    const max = event.price_max ?? event.price ?? 0
    
    if (min === 0 && max === 0) return undefined
    return { min, max }
  }

  /**
   * Calculate similarity between two events
   */
  public calculateSimilarity(fp1: EventFingerprint, fp2: EventFingerprint): SimilarityScore {
    const cacheKey = `${fp1.id}-${fp2.id}`
    
    if (this.config.performance.enableCaching && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }
    
    const score: SimilarityScore = {
      title: this.calculateTitleSimilarity(fp1, fp2),
      venue: this.calculateVenueSimilarity(fp1, fp2),
      date: this.calculateDateSimilarity(fp1, fp2),
      location: this.calculateLocationSimilarity(fp1, fp2),
      semantic: this.calculateSemanticSimilarity(fp1, fp2),
      overall: 0
    }
    
    // Calculate weighted overall score
    score.overall = (
      score.title * this.config.weights.title +
      score.venue * this.config.weights.venue +
      score.location * this.config.weights.location +
      score.date * this.config.weights.date +
      score.semantic * this.config.weights.semantic
    )
    
    if (this.config.performance.enableCaching) {
      this.cache.set(cacheKey, score)
    }
    
    return score
  }

  private calculateTitleSimilarity(fp1: EventFingerprint, fp2: EventFingerprint): number {
    const title1 = fp1.titleTokens.join(' ')
    const title2 = fp2.titleTokens.join(' ')
    
    if (!title1 || !title2) return 0
    if (title1 === title2) return 1
    
    // Use configured string matching algorithm
    const algorithm = this.config.algorithms.stringMatching
    const stringSim = this.stringDistance[algorithm](title1, title2)
    
    // Boost for exact token matches
    const commonTokens = fp1.titleTokens.filter(token => fp2.titleTokens.includes(token))
    const tokenBonus = commonTokens.length / Math.max(fp1.titleTokens.length, fp2.titleTokens.length) * 0.2
    
    return Math.min(1, stringSim + tokenBonus)
  }

  private calculateVenueSimilarity(fp1: EventFingerprint, fp2: EventFingerprint): number {
    if (!fp1.venueNormalized || !fp2.venueNormalized) return 0
    if (fp1.venueNormalized === fp2.venueNormalized) return 1
    
    return this.stringDistance[this.config.algorithms.stringMatching](
      fp1.venueNormalized,
      fp2.venueNormalized
    )
  }

  private calculateDateSimilarity(fp1: EventFingerprint, fp2: EventFingerprint): number {
    if (!fp1.dateKey || !fp2.dateKey) return 0
    if (fp1.dateKey === fp2.dateKey) return 1
    
    if (!this.config.algorithms.fuzzyDate) return 0
    
    // Allow for small date differences (within 1 day)
    const date1 = new Date(fp1.dateKey)
    const date2 = new Date(fp2.dateKey)
    const diffDays = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24)
    
    if (diffDays <= 1) {
      // Check time windows for same-day events
      if (fp1.timeWindow === fp2.timeWindow) return 0.9
      return 0.7
    }
    
    return diffDays <= 7 ? 0.3 : 0
  }

  private calculateLocationSimilarity(fp1: EventFingerprint, fp2: EventFingerprint): number {
    if (!fp1.locationKey || !fp2.locationKey) return 0
    if (fp1.locationKey === fp2.locationKey) return 1
    
    // Coordinate-based similarity
    if (fp1.coordinates && fp2.coordinates) {
      const distance = this.calculateDistance(fp1.coordinates, fp2.coordinates)
      if (distance <= 100) return 1 // Same location
      if (distance <= 500) return 0.8 // Very close
      if (distance <= 1000) return 0.6 // Close
      if (distance <= 5000) return 0.3 // Same area
      return 0
    }
    
    // Fallback to string similarity
    return this.stringDistance.hybrid(fp1.locationKey, fp2.locationKey)
  }

  private calculateDistance(coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number {
    const R = 6371000 // Earth's radius in meters
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180
    const dLng = (coord2.lng - coord1.lng) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private calculateSemanticSimilarity(fp1: EventFingerprint, fp2: EventFingerprint): number {
    if (!this.config.algorithms.semanticMatching) return 0
    
    // Category similarity
    const categorySim = fp1.categoryNormalized === fp2.categoryNormalized ? 1 : 0
    
    // Content hash similarity
    const contentSim = fp1.contentHash === fp2.contentHash ? 1 : 0
    
    // Semantic hash similarity (token overlap)
    const semanticSim = this.stringDistance.cosine(fp1.semanticHash, fp2.semanticHash)
    
    return (categorySim * 0.3) + (contentSim * 0.4) + (semanticSim * 0.3)
  }

  /**
   * Find potential matches for an event
   */
  public async findMatches(targetEvent: Event, candidates: Event[]): Promise<MatchResult[]> {
    const targetFingerprint = this.generateFingerprint(targetEvent)
    const results: MatchResult[] = []
    
    for (const candidate of candidates) {
      if (candidate.id === targetEvent.id) continue
      
      const candidateFingerprint = this.generateFingerprint(candidate)
      const similarity = this.calculateSimilarity(targetFingerprint, candidateFingerprint)
      
      if (similarity.overall >= this.config.thresholds.overall) {
        const confidence = this.calculateConfidence(similarity)
        const reasons = this.generateMatchReasons(similarity)
        const riskFactors = this.identifyRiskFactors(targetFingerprint, candidateFingerprint)
        
        results.push({
          eventId: candidate.id,
          event: candidate,
          similarityScore: similarity,
          confidence,
          reasons,
          riskFactors
        })
      }
    }
    
    return results.sort((a, b) => b.confidence - a.confidence)
  }

  private calculateConfidence(similarity: SimilarityScore): number {
    // Confidence based on how many thresholds are exceeded
    let thresholdsPassed = 0
    let totalThresholds = 0
    
    Object.keys(this.config.thresholds).forEach(key => {
      if (key === 'overall') return
      totalThresholds++
      if (similarity[key as keyof SimilarityScore] >= this.config.thresholds[key as keyof typeof this.config.thresholds]) {
        thresholdsPassed++
      }
    })
    
    const baseConfidence = thresholdsPassed / totalThresholds
    const overallBonus = Math.max(0, similarity.overall - this.config.thresholds.overall) * 2
    
    return Math.min(1, baseConfidence + overallBonus)
  }

  private generateMatchReasons(similarity: SimilarityScore): string[] {
    const reasons: string[] = []
    
    if (similarity.title >= this.config.thresholds.title) {
      reasons.push(`High title similarity (${(similarity.title * 100).toFixed(1)}%)`)
    }
    
    if (similarity.venue >= this.config.thresholds.venue) {
      reasons.push(`Same or similar venue (${(similarity.venue * 100).toFixed(1)}%)`)
    }
    
    if (similarity.date >= this.config.thresholds.date) {
      reasons.push(`Same or similar date (${(similarity.date * 100).toFixed(1)}%)`)
    }
    
    if (similarity.location >= this.config.thresholds.location) {
      reasons.push(`Same location (${(similarity.location * 100).toFixed(1)}%)`)
    }
    
    if (similarity.semantic >= this.config.thresholds.semantic) {
      reasons.push(`Similar content and category (${(similarity.semantic * 100).toFixed(1)}%)`)
    }
    
    return reasons
  }

  private identifyRiskFactors(fp1: EventFingerprint, fp2: EventFingerprint): string[] {
    const risks: string[] = []
    
    // Different time windows on same date
    if (fp1.dateKey === fp2.dateKey && fp1.timeWindow !== fp2.timeWindow) {
      risks.push('Different time windows on same date')
    }
    
    // Very different price ranges
    if (fp1.priceRange && fp2.priceRange) {
      const priceDiff = Math.abs(fp1.priceRange.min - fp2.priceRange.min)
      if (priceDiff > 50) {
        risks.push('Significant price difference')
      }
    }
    
    // Different categories
    if (fp1.categoryNormalized !== fp2.categoryNormalized) {
      risks.push('Different event categories')
    }
    
    return risks
  }

  /**
   * Determine if events are duplicates
   */
  public async checkForDuplicates(targetEvent: Event, candidates: Event[]): Promise<DuplicationResult> {
    const startTime = Date.now()
    const matches = await this.findMatches(targetEvent, candidates)
    
    const highConfidenceMatches = matches.filter(m => m.confidence >= this.config.quality.autoMergeThreshold)
    const isDuplicate = highConfidenceMatches.length > 0
    
    const recommendations: string[] = []
    
    if (isDuplicate) {
      if (highConfidenceMatches.length === 1) {
        recommendations.push('Single high-confidence match found - safe to merge automatically')
      } else {
        recommendations.push('Multiple high-confidence matches - review cluster for best merge strategy')
      }
    } else if (matches.length > 0) {
      recommendations.push('Potential matches found but confidence too low - consider manual review')
    }
    
    return {
      isDuplicate,
      primaryEventId: isDuplicate ? highConfidenceMatches[0].eventId : undefined,
      duplicateEventIds: highConfidenceMatches.map(m => m.eventId),
      matches,
      confidence: isDuplicate ? Math.max(...highConfidenceMatches.map(m => m.confidence)) : 0,
      recommendations,
      metadata: {
        processingTime: Date.now() - startTime,
        algorithmsUsed: [this.config.algorithms.stringMatching, 'location_proximity', 'temporal_proximity'],
        threshold: this.config.thresholds.overall
      }
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<DedupConfig>): void {
    this.config = { ...this.config, ...updates }
    
    // Clear cache if thresholds or weights changed
    if (updates.thresholds || updates.weights) {
      this.cache.clear()
    }
  }

  /**
   * Get current configuration
   */
  public getConfig(): DedupConfig {
    return { ...this.config }
  }

  /**
   * Clear internal caches
   */
  public clearCache(): void {
    this.cache.clear()
    this.embeddingCache.clear()
  }

  /**
   * Get cache statistics
   */
  public getCacheStats() {
    return {
      similarityCache: {
        size: this.cache.size,
        hitRate: 0 // Would need to track hits/misses
      },
      embeddingCache: {
        size: this.embeddingCache.size,
        hitRate: 0
      }
    }
  }
}
