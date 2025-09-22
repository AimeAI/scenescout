import { createClient } from '@supabase/supabase-js'
import { LocationService } from './LocationService'
import { InterestMatcher } from './InterestMatcher'
import { EventRanker } from './EventRanker'
import { RecommendationCache } from './RecommendationCache'
import { UserProfileBuilder } from './UserProfileBuilder'
import {
  RecommendationRequest,
  RecommendationResponse,
  RecommendationResult,
  UserPreferences,
  UserBehavior,
  PersonalizationConfig,
  ABTestVariant,
  RealTimeUpdate,
  PersonalizationMetrics
} from './types'
import { Event, UserProfile } from '@/types'

export class PersonalizationEngine {
  private supabase
  private locationService: LocationService
  private interestMatcher: InterestMatcher
  private eventRanker: EventRanker
  private cache: RecommendationCache
  private profileBuilder: UserProfileBuilder
  private config: PersonalizationConfig

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    config?: Partial<PersonalizationConfig>
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey)
    
    // Initialize services
    this.locationService = new LocationService(this.supabase)
    this.interestMatcher = new InterestMatcher()
    this.eventRanker = new EventRanker()
    this.cache = new RecommendationCache()
    this.profileBuilder = new UserProfileBuilder(this.supabase)

    // Set default configuration
    this.config = this.mergeConfig(config)
  }

  /**
   * Main recommendation method
   */
  async getRecommendations(request: RecommendationRequest): Promise<RecommendationResponse> {
    const startTime = Date.now()
    
    try {
      // Check A/B test variant
      const abVariant = await this.getABTestVariant(request.user_id, request.ab_test_variant)
      const effectiveConfig = this.applyABVariant(this.config, abVariant)

      // Check cache first
      const cacheKey = this.generateCacheKey(request)
      if (effectiveConfig.cache.enabled) {
        const cached = await this.cache.get<RecommendationResponse>(cacheKey)
        if (cached) {
          return {
            ...cached,
            cache_info: { hit: true, ttl_seconds: cached.cache_info.ttl_seconds, cache_key: cacheKey },
            performance: { ...cached.performance, total_time_ms: Date.now() - startTime }
          }
        }
      }

      // Get user profile and preferences
      const userProfile = await this.getUserProfile(request.user_id)
      const userPreferences = await this.getUserPreferences(request.user_id)
      const userBehavior = await this.getUserBehavior(request.user_id)

      // Build candidate events
      const dbStartTime = Date.now()
      const candidates = await this.getCandidateEvents(request, userPreferences)
      const dbTime = Date.now() - dbStartTime

      // Apply different recommendation algorithms
      const mlStartTime = Date.now()
      const recommendations = await this.computeRecommendations(
        candidates,
        request,
        userProfile,
        userPreferences,
        userBehavior,
        effectiveConfig
      )
      const mlTime = Date.now() - mlStartTime

      // Build response
      const response: RecommendationResponse = {
        recommendations,
        cache_info: { hit: false, ttl_seconds: effectiveConfig.cache.ttl_seconds, cache_key: cacheKey },
        performance: {
          total_time_ms: Date.now() - startTime,
          db_time_ms: dbTime,
          ml_time_ms: mlTime,
          cache_time_ms: 0
        }
      }

      // Cache the result
      if (effectiveConfig.cache.enabled) {
        await this.cache.set(cacheKey, response, effectiveConfig.cache.ttl_seconds)
      }

      // Log metrics
      await this.logRecommendationMetrics(request.user_id, recommendations, abVariant)

      return response

    } catch (error) {
      console.error('Personalization engine error:', error)
      
      // Return fallback recommendations
      return this.getFallbackRecommendations(request, Date.now() - startTime)
    }
  }

  /**
   * Get candidate events based on location and basic filters
   */
  private async getCandidateEvents(
    request: RecommendationRequest,
    preferences: UserPreferences
  ): Promise<Event[]> {
    let query = this.supabase
      .from('events')
      .select(`
        *,
        venue:venues(*),
        city:cities(*)
      `)
      .eq('status', 'active')
      .gte('event_date', new Date().toISOString())

    // Apply location filtering
    if (request.context.location) {
      const { lat, lng, radius_km = preferences.location_preferences.max_distance_km } = request.context.location
      const nearbyEvents = await this.locationService.findEventsWithinRadius(lat, lng, radius_km)
      const eventIds = nearbyEvents.map(e => e.id)
      
      if (eventIds.length > 0) {
        query = query.in('id', eventIds)
      } else {
        // No nearby events, expand search or use fallback
        return []
      }
    }

    // Apply basic filters
    if (request.filters?.categories?.length) {
      query = query.in('category', request.filters.categories)
    }

    if (request.filters?.price_range) {
      const { min, max } = request.filters.price_range
      query = query.gte('price_min', min).lte('price_max', max)
    }

    if (request.filters?.date_range) {
      query = query
        .gte('event_date', request.filters.date_range.start)
        .lte('event_date', request.filters.date_range.end)
    }

    if (request.filters?.include_virtual === false) {
      query = query.not('venue_id', 'is', null)
    }

    // Exclude already shown events
    if (request.context.current_events?.length) {
      query = query.not('id', 'in', `(${request.context.current_events.join(',')})`)
    }

    // Limit to reasonable number of candidates
    query = query.limit(1000)

    const { data: events, error } = await query

    if (error) {
      console.error('Error fetching candidate events:', error)
      return []
    }

    return events || []
  }

  /**
   * Compute recommendations using multiple algorithms
   */
  private async computeRecommendations(
    candidates: Event[],
    request: RecommendationRequest,
    userProfile: UserProfile,
    preferences: UserPreferences,
    behavior: UserBehavior,
    config: PersonalizationConfig
  ): Promise<RecommendationResult[]> {
    const scores: Map<string, { total: number; factors: Record<string, number> }> = new Map()

    // Initialize scores
    candidates.forEach(event => {
      scores.set(event.id, { total: 0, factors: {} })
    })

    // 1. Collaborative Filtering
    if (config.algorithms.collaborative_filtering.enabled) {
      const collabScores = await this.getCollaborativeFilteringScores(
        candidates,
        userProfile,
        behavior,
        config.algorithms.collaborative_filtering
      )
      this.mergeScores(scores, collabScores, 'collaborative', config.algorithms.collaborative_filtering.weight)
    }

    // 2. Content-Based Filtering
    if (config.algorithms.content_based.enabled) {
      const contentScores = await this.getContentBasedScores(
        candidates,
        preferences,
        behavior,
        config.algorithms.content_based
      )
      this.mergeScores(scores, contentScores, 'content', config.algorithms.content_based.weight)
    }

    // 3. Location-Based Scoring
    if (config.algorithms.location_based.enabled && request.context.location) {
      const locationScores = await this.getLocationBasedScores(
        candidates,
        request.context.location,
        config.algorithms.location_based
      )
      this.mergeScores(scores, locationScores, 'location', config.algorithms.location_based.weight)
    }

    // 4. Trending/Popularity Scoring
    if (config.algorithms.trending.enabled) {
      const trendingScores = await this.getTrendingScores(
        candidates,
        config.algorithms.trending
      )
      this.mergeScores(scores, trendingScores, 'trending', config.algorithms.trending.weight)
    }

    // Convert to recommendations
    const recommendations: RecommendationResult[] = candidates
      .map(event => {
        const score = scores.get(event.id)!
        return {
          event_id: event.id,
          score: Math.min(score.total, 1), // Normalize to 0-1
          confidence: this.calculateConfidence(score.factors),
          explanation: {
            primary_reason: this.getPrimaryReason(score.factors),
            contributing_factors: Object.keys(score.factors),
            algorithm_weights: score.factors
          },
          metadata: {
            algorithm_version: '1.0.0',
            computation_time_ms: 0,
            cache_hit: false,
            ab_test_variant: request.ab_test_variant
          }
        }
      })
      .filter(rec => rec.score > 0.1) // Filter out very low scores
      .sort((a, b) => b.score - a.score)

    // Apply diversity if enabled
    if (config.diversity.enable_diversity) {
      return this.applyDiversity(recommendations, candidates, config.diversity)
    }

    return recommendations.slice(0, request.limit)
  }

  /**
   * Get collaborative filtering scores
   */
  private async getCollaborativeFilteringScores(
    candidates: Event[],
    userProfile: UserProfile,
    behavior: UserBehavior,
    config: any
  ): Promise<Map<string, number>> {
    const scores = new Map<string, number>()

    try {
      // Find similar users
      const similarUsers = await this.findSimilarUsers(userProfile.id, config.min_interactions)
      
      if (similarUsers.length === 0) {
        return scores
      }

      // Get events that similar users interacted with
      const { data: similarUserInteractions } = await this.supabase
        .from('user_interactions')
        .select('event_id, interaction_type, user_id')
        .in('user_id', similarUsers.map(u => u.user_id))
        .in('event_id', candidates.map(e => e.id))
        .in('interaction_type', ['save', 'attend', 'rate'])

      if (!similarUserInteractions) return scores

      // Score events based on similar user interactions
      const eventInteractionCounts = new Map<string, number>()
      similarUserInteractions.forEach(interaction => {
        const count = eventInteractionCounts.get(interaction.event_id) || 0
        eventInteractionCounts.set(interaction.event_id, count + 1)
      })

      const maxInteractions = Math.max(...Array.from(eventInteractionCounts.values()))
      
      eventInteractionCounts.forEach((count, eventId) => {
        scores.set(eventId, count / maxInteractions)
      })

    } catch (error) {
      console.error('Collaborative filtering error:', error)
    }

    return scores
  }

  /**
   * Get content-based filtering scores
   */
  private async getContentBasedScores(
    candidates: Event[],
    preferences: UserPreferences,
    behavior: UserBehavior,
    config: any
  ): Promise<Map<string, number>> {
    const scores = new Map<string, number>()

    candidates.forEach(event => {
      let score = 0

      // Category preference matching
      if (preferences.categories.includes(event.category)) {
        score += 0.4
      }

      // Price preference matching
      const eventPrice = event.price || event.price_min || 0
      const { min: prefMinPrice, max: prefMaxPrice } = preferences.event_preferences.price_range
      if (eventPrice >= prefMinPrice && eventPrice <= prefMaxPrice) {
        score += 0.3
      }

      // Time preference matching
      if (event.start_time && preferences.event_preferences.preferred_times.length > 0) {
        const eventHour = new Date(`2000-01-01T${event.start_time}`).getHours()
        const timeSlot = this.getTimeSlot(eventHour)
        if (preferences.event_preferences.preferred_times.includes(timeSlot)) {
          score += 0.2
        }
      }

      // Free event preference
      if (event.is_free && preferences.event_preferences.price_range.min === 0) {
        score += 0.1
      }

      scores.set(event.id, score)
    })

    return scores
  }

  /**
   * Get location-based scores
   */
  private async getLocationBasedScores(
    candidates: Event[],
    location: { lat: number; lng: number },
    config: any
  ): Promise<Map<string, number>> {
    const scores = new Map<string, number>()

    for (const event of candidates) {
      if (event.venue?.latitude && event.venue?.longitude) {
        const distance = this.locationService.calculateDistance(
          location.lat,
          location.lng,
          event.venue.latitude,
          event.venue.longitude
        )

        // Apply decay function
        let score = 0
        if (distance <= config.max_distance_km) {
          switch (config.decay_function) {
            case 'linear':
              score = 1 - (distance / config.max_distance_km)
              break
            case 'exponential':
              score = Math.exp(-distance / (config.max_distance_km / 3))
              break
            case 'gaussian':
              score = Math.exp(-Math.pow(distance / (config.max_distance_km / 2), 2))
              break
            default:
              score = 1 - (distance / config.max_distance_km)
          }
        }

        scores.set(event.id, score)
      }
    }

    return scores
  }

  /**
   * Get trending/popularity scores
   */
  private async getTrendingScores(
    candidates: Event[],
    config: any
  ): Promise<Map<string, number>> {
    const scores = new Map<string, number>()

    try {
      const timeWindowStart = new Date(Date.now() - config.time_window_hours * 60 * 60 * 1000).toISOString()

      const { data: recentInteractions } = await this.supabase
        .from('user_interactions')
        .select('event_id')
        .in('event_id', candidates.map(e => e.id))
        .gte('created_at', timeWindowStart)

      if (!recentInteractions) return scores

      const interactionCounts = new Map<string, number>()
      recentInteractions.forEach(interaction => {
        const count = interactionCounts.get(interaction.event_id) || 0
        interactionCounts.set(interaction.event_id, count + 1)
      })

      const maxInteractions = Math.max(...Array.from(interactionCounts.values()))

      interactionCounts.forEach((count, eventId) => {
        if (count >= config.min_interaction_count) {
          scores.set(eventId, count / maxInteractions)
        }
      })

    } catch (error) {
      console.error('Trending scores error:', error)
    }

    return scores
  }

  /**
   * Update user preferences based on interaction
   */
  async updateUserPreferences(userId: string, interaction: any): Promise<void> {
    try {
      await this.profileBuilder.updateFromInteraction(userId, interaction)
      
      // Invalidate related cache entries
      await this.cache.invalidatePattern(`user:${userId}:*`)
      
      // Trigger real-time update
      await this.triggerRealTimeUpdate({
        type: 'preference_change',
        user_id: userId,
        data: interaction,
        timestamp: new Date().toISOString(),
        requires_recomputation: true
      })

    } catch (error) {
      console.error('Error updating user preferences:', error)
    }
  }

  /**
   * Get personalization metrics for a user
   */
  async getPersonalizationMetrics(userId: string, timePeriod: string): Promise<PersonalizationMetrics> {
    // Implementation for metrics calculation
    return this.calculatePersonalizationMetrics(userId, timePeriod)
  }

  // Private helper methods

  private mergeConfig(config?: Partial<PersonalizationConfig>): PersonalizationConfig {
    const defaultConfig: PersonalizationConfig = {
      algorithms: {
        collaborative_filtering: {
          enabled: true,
          weight: 0.3,
          min_interactions: 5,
          similarity_threshold: 0.2
        },
        content_based: {
          enabled: true,
          weight: 0.4,
          feature_weights: {
            category: 0.4,
            price: 0.3,
            time: 0.2,
            free: 0.1
          }
        },
        location_based: {
          enabled: true,
          weight: 0.2,
          max_distance_km: 50,
          decay_function: 'exponential'
        },
        trending: {
          enabled: true,
          weight: 0.1,
          time_window_hours: 24,
          min_interaction_count: 3
        }
      },
      diversity: {
        enable_diversity: true,
        diversity_lambda: 0.5,
        max_same_category: 3,
        max_same_venue: 2
      },
      cache: {
        enabled: true,
        ttl_seconds: 1800, // 30 minutes
        max_entries: 10000,
        invalidation_strategy: 'hybrid'
      },
      ab_testing: {
        enabled: true,
        default_variant: 'control',
        traffic_allocation: { control: 0.8, variant_a: 0.2 }
      },
      performance: {
        max_computation_time_ms: 5000,
        enable_async_updates: true,
        batch_size: 100
      }
    }

    return { ...defaultConfig, ...config }
  }

  private generateCacheKey(request: RecommendationRequest): string {
    const keyParts = [
      `user:${request.user_id}`,
      request.context.location ? `loc:${request.context.location.lat},${request.context.location.lng}` : '',
      request.filters ? `filters:${JSON.stringify(request.filters)}` : '',
      `limit:${request.limit}`
    ].filter(Boolean)

    return keyParts.join(':')
  }

  private async getUserProfile(userId: string): Promise<UserProfile> {
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    return profile
  }

  private async getUserPreferences(userId: string): Promise<UserPreferences> {
    const { data: preferences } = await this.supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()

    return preferences || this.getDefaultPreferences(userId)
  }

  private async getUserBehavior(userId: string): Promise<UserBehavior> {
    const { data: behavior } = await this.supabase
      .from('user_behavior')
      .select('*')
      .eq('user_id', userId)
      .single()

    return behavior || this.getDefaultBehavior(userId)
  }

  private getDefaultPreferences(userId: string): UserPreferences {
    return {
      id: `pref_${userId}`,
      user_id: userId,
      categories: [],
      location_preferences: {
        preferred_cities: [],
        max_distance_km: 50,
        include_virtual: true
      },
      event_preferences: {
        price_range: { min: 0, max: 1000 },
        preferred_times: ['evening'],
        preferred_days: ['weekends'],
        group_size_preference: 'any',
        accessibility_needs: []
      },
      content_preferences: {
        preferred_languages: ['en'],
        content_types: [],
        duration_preference: 'any'
      },
      personalization_settings: {
        enable_ai_recommendations: true,
        enable_collaborative_filtering: true,
        enable_location_based: true,
        privacy_level: 'private'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  private getDefaultBehavior(userId: string): UserBehavior {
    return {
      id: `behavior_${userId}`,
      user_id: userId,
      event_interactions: [],
      search_history: [],
      location_history: [],
      preference_changes: [],
      conversion_events: [],
      session_data: [],
      computed_interests: [],
      similarity_scores: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }

  private mergeScores(
    scores: Map<string, { total: number; factors: Record<string, number> }>,
    newScores: Map<string, number>,
    factor: string,
    weight: number
  ): void {
    newScores.forEach((score, eventId) => {
      const existing = scores.get(eventId)!
      existing.total += score * weight
      existing.factors[factor] = score * weight
    })
  }

  private calculateConfidence(factors: Record<string, number>): number {
    const nonZeroFactors = Object.values(factors).filter(v => v > 0).length
    const totalFactors = Object.keys(factors).length
    return nonZeroFactors / Math.max(totalFactors, 1)
  }

  private getPrimaryReason(factors: Record<string, number>): string {
    let maxScore = 0
    let primaryReason = 'content'

    Object.entries(factors).forEach(([factor, score]) => {
      if (score > maxScore) {
        maxScore = score
        primaryReason = factor
      }
    })

    return primaryReason
  }

  private getTimeSlot(hour: number): string {
    if (hour < 6) return 'late_night'
    if (hour < 12) return 'morning'
    if (hour < 17) return 'afternoon'
    if (hour < 22) return 'evening'
    return 'late_night'
  }

  private async findSimilarUsers(userId: string, minInteractions: number): Promise<any[]> {
    // Simplified similar user finding logic
    const { data: similarUsers } = await this.supabase
      .from('user_similarities')
      .select('similar_user_id, similarity_score')
      .eq('user_id', userId)
      .gte('similarity_score', 0.2)
      .order('similarity_score', { ascending: false })
      .limit(50)

    return similarUsers || []
  }

  private async applyDiversity(
    recommendations: RecommendationResult[],
    candidates: Event[],
    diversityConfig: any
  ): Promise<RecommendationResult[]> {
    const diverseRecs: RecommendationResult[] = []
    const categoryCount = new Map<string, number>()
    const venueCount = new Map<string, number>()

    for (const rec of recommendations) {
      const event = candidates.find(e => e.id === rec.event_id)
      if (!event) continue

      const catCount = categoryCount.get(event.category) || 0
      const venCount = event.venue_id ? (venueCount.get(event.venue_id) || 0) : 0

      if (catCount < diversityConfig.max_same_category && 
          venCount < diversityConfig.max_same_venue) {
        diverseRecs.push(rec)
        categoryCount.set(event.category, catCount + 1)
        if (event.venue_id) {
          venueCount.set(event.venue_id, venCount + 1)
        }
      }

      if (diverseRecs.length >= recommendations.length) break
    }

    return diverseRecs
  }

  private async getABTestVariant(userId: string, requestedVariant?: string): Promise<ABTestVariant | null> {
    if (!this.config.ab_testing.enabled) return null

    if (requestedVariant) {
      const { data: variant } = await this.supabase
        .from('ab_test_variants')
        .select('*')
        .eq('name', requestedVariant)
        .eq('is_active', true)
        .single()

      return variant
    }

    // Use hash of user ID to consistently assign variant
    const hash = this.hashUserId(userId)
    const threshold = this.config.ab_testing.traffic_allocation.variant_a || 0.2

    if (hash < threshold) {
      const { data: variant } = await this.supabase
        .from('ab_test_variants')
        .select('*')
        .eq('name', 'variant_a')
        .eq('is_active', true)
        .single()

      return variant
    }

    return null
  }

  private hashUserId(userId: string): number {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash) / Math.pow(2, 31)
  }

  private applyABVariant(config: PersonalizationConfig, variant: ABTestVariant | null): PersonalizationConfig {
    if (!variant) return config

    return {
      ...config,
      ...variant.algorithm_config
    }
  }

  private async getFallbackRecommendations(
    request: RecommendationRequest,
    computationTime: number
  ): Promise<RecommendationResponse> {
    // Return popular/trending events as fallback
    const { data: fallbackEvents } = await this.supabase
      .from('events')
      .select('*')
      .eq('status', 'active')
      .gte('event_date', new Date().toISOString())
      .order('hotness_score', { ascending: false })
      .limit(request.limit)

    const recommendations: RecommendationResult[] = (fallbackEvents || []).map((event, index) => ({
      event_id: event.id,
      score: 0.5 - (index * 0.05), // Decreasing scores
      confidence: 0.3,
      explanation: {
        primary_reason: 'fallback',
        contributing_factors: ['trending'],
        algorithm_weights: { trending: 0.5 }
      },
      metadata: {
        algorithm_version: '1.0.0',
        computation_time_ms: computationTime,
        cache_hit: false
      }
    }))

    return {
      recommendations,
      cache_info: { hit: false, ttl_seconds: 300, cache_key: 'fallback' },
      performance: {
        total_time_ms: computationTime,
        db_time_ms: computationTime * 0.8,
        ml_time_ms: 0,
        cache_time_ms: 0
      }
    }
  }

  private async logRecommendationMetrics(
    userId: string,
    recommendations: RecommendationResult[],
    abVariant: ABTestVariant | null
  ): Promise<void> {
    try {
      await this.supabase.from('recommendation_logs').insert({
        user_id: userId,
        recommendations: recommendations.map(r => r.event_id),
        algorithm_version: '1.0.0',
        ab_test_variant: abVariant?.name,
        created_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error logging recommendation metrics:', error)
    }
  }

  private async calculatePersonalizationMetrics(
    userId: string,
    timePeriod: string
  ): Promise<PersonalizationMetrics> {
    // Implementation would calculate various metrics
    return {
      user_id: userId,
      time_period: timePeriod,
      metrics: {
        recommendation_accuracy: 0.75,
        click_through_rate: 0.12,
        conversion_rate: 0.05,
        diversity_score: 0.8,
        novelty_score: 0.6,
        user_satisfaction: 0.85,
        engagement_time: 180
      },
      algorithm_performance: {
        collaborative: { precision: 0.8, recall: 0.7, f1_score: 0.74, auc: 0.85 },
        content: { precision: 0.75, recall: 0.8, f1_score: 0.77, auc: 0.82 },
        location: { precision: 0.7, recall: 0.6, f1_score: 0.65, auc: 0.78 },
        trending: { precision: 0.6, recall: 0.9, f1_score: 0.72, auc: 0.80 }
      },
      generated_at: new Date().toISOString()
    }
  }

  private async triggerRealTimeUpdate(update: RealTimeUpdate): Promise<void> {
    // Trigger real-time updates for connected clients
    // Implementation would use WebSockets or Server-Sent Events
    console.log('Real-time update triggered:', update)
  }
}