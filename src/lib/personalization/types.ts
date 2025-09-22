// Personalization system types
export interface UserPreferences {
  id: string
  user_id: string
  categories: string[]
  location_preferences: {
    preferred_cities: string[]
    max_distance_km: number
    include_virtual: boolean
  }
  event_preferences: {
    price_range: { min: number; max: number }
    preferred_times: string[] // ['morning', 'afternoon', 'evening', 'late_night']
    preferred_days: string[] // ['weekdays', 'weekends', 'specific_days']
    group_size_preference: 'solo' | 'small_group' | 'large_group' | 'any'
    accessibility_needs: string[]
  }
  content_preferences: {
    preferred_languages: string[]
    content_types: string[] // ['music', 'video', 'interactive', 'presentation']
    duration_preference: 'short' | 'medium' | 'long' | 'any'
  }
  personalization_settings: {
    enable_ai_recommendations: boolean
    enable_collaborative_filtering: boolean
    enable_location_based: boolean
    privacy_level: 'public' | 'friends' | 'private'
  }
  created_at: string
  updated_at: string
}

export interface UserBehavior {
  id: string
  user_id: string
  event_interactions: EventInteraction[]
  search_history: SearchQuery[]
  location_history: LocationHistory[]
  preference_changes: PreferenceChange[]
  conversion_events: ConversionEvent[]
  session_data: SessionData[]
  computed_interests: ComputedInterest[]
  similarity_scores: UserSimilarity[]
  created_at: string
  updated_at: string
}

export interface EventInteraction {
  event_id: string
  interaction_type: 'view' | 'click' | 'save' | 'share' | 'attend' | 'rate' | 'review'
  duration_seconds?: number
  context: {
    source: 'recommendation' | 'search' | 'browse' | 'social' | 'notification'
    position?: number
    algorithm_version?: string
    ab_test_variant?: string
  }
  metadata: Record<string, any>
  timestamp: string
}

export interface SearchQuery {
  query: string
  filters: Record<string, any>
  results_count: number
  clicked_results: string[]
  location?: { lat: number; lng: number }
  timestamp: string
}

export interface LocationHistory {
  latitude: number
  longitude: number
  city_id?: string
  accuracy: number
  timestamp: string
  source: 'gps' | 'ip' | 'manual'
}

export interface PreferenceChange {
  field: string
  old_value: any
  new_value: any
  change_reason: 'explicit' | 'inferred' | 'feedback'
  timestamp: string
}

export interface ConversionEvent {
  event_id: string
  conversion_type: 'ticket_purchase' | 'calendar_add' | 'share' | 'review'
  value?: number
  attribution: {
    recommendation_id?: string
    algorithm_version?: string
    ab_test_variant?: string
  }
  timestamp: string
}

export interface SessionData {
  session_id: string
  device_type: 'mobile' | 'tablet' | 'desktop'
  duration_minutes: number
  pages_visited: string[]
  events_viewed: string[]
  search_queries: string[]
  timestamp: string
}

export interface ComputedInterest {
  category: string
  subcategory?: string
  score: number // 0-1
  confidence: number // 0-1
  evidence: {
    interaction_count: number
    time_spent: number
    positive_signals: number
    negative_signals: number
  }
  last_updated: string
}

export interface UserSimilarity {
  similar_user_id: string
  similarity_score: number // 0-1
  similarity_type: 'collaborative' | 'content' | 'demographic' | 'behavioral'
  shared_interests: string[]
  computed_at: string
}

export interface RecommendationRequest {
  user_id: string
  context: {
    location?: { lat: number; lng: number; radius_km?: number }
    time_range?: { start: string; end: string }
    current_events?: string[] // Events already shown
    session_context?: {
      current_page: string
      time_on_page: number
      previous_events: string[]
    }
  }
  filters?: {
    categories?: string[]
    price_range?: { min: number; max: number }
    date_range?: { start: string; end: string }
    include_virtual?: boolean
  }
  algorithm_config?: {
    enable_collaborative: boolean
    enable_content_based: boolean
    enable_location_based: boolean
    enable_trending: boolean
    diversity_factor: number // 0-1, higher = more diverse
    novelty_factor: number // 0-1, higher = more novel recommendations
  }
  limit: number
  ab_test_variant?: string
}

export interface RecommendationResult {
  event_id: string
  score: number // 0-1
  confidence: number // 0-1
  explanation: {
    primary_reason: string
    contributing_factors: string[]
    algorithm_weights: Record<string, number>
  }
  metadata: {
    algorithm_version: string
    computation_time_ms: number
    cache_hit: boolean
    ab_test_variant?: string
  }
}

export interface RecommendationResponse {
  recommendations: RecommendationResult[]
  debug_info?: {
    user_profile_version: string
    algorithms_used: string[]
    fallback_applied: boolean
    total_candidates: number
    filtering_steps: string[]
  }
  cache_info: {
    hit: boolean
    ttl_seconds: number
    cache_key: string
  }
  performance: {
    total_time_ms: number
    db_time_ms: number
    ml_time_ms: number
    cache_time_ms: number
  }
}

export interface ABTestVariant {
  id: string
  name: string
  description: string
  algorithm_config: Record<string, any>
  traffic_percentage: number
  is_active: boolean
  metrics: {
    click_through_rate: number
    conversion_rate: number
    engagement_score: number
    user_satisfaction: number
  }
  created_at: string
  updated_at: string
}

export interface PersonalizationMetrics {
  user_id: string
  time_period: string
  metrics: {
    recommendation_accuracy: number
    click_through_rate: number
    conversion_rate: number
    diversity_score: number
    novelty_score: number
    user_satisfaction: number
    engagement_time: number
  }
  algorithm_performance: Record<string, {
    precision: number
    recall: number
    f1_score: number
    auc: number
  }>
  generated_at: string
}

export interface LocationContext {
  latitude: number
  longitude: number
  accuracy: number
  city_id?: string
  neighborhood?: string
  timezone: string
  country_code: string
  source: 'gps' | 'ip' | 'manual'
  timestamp: string
}

export interface EventFeatures {
  event_id: string
  features: {
    category_vector: number[]
    price_tier: number // 0-1 normalized
    popularity_score: number // 0-1
    temporal_features: {
      hour_of_day: number
      day_of_week: number
      season: number
      is_weekend: boolean
      is_holiday: boolean
    }
    venue_features: {
      capacity_tier: number
      venue_type: string
      accessibility_score: number
    }
    content_features: {
      has_video: boolean
      has_images: boolean
      description_length: number
      language: string
    }
    social_features: {
      attendee_count: number
      rating_average: number
      review_count: number
      share_count: number
    }
  }
  embeddings: {
    content_embedding: number[]
    categorical_embedding: number[]
    user_interaction_embedding: number[]
  }
  computed_at: string
}

export interface SimilarUser {
  user_id: string
  similarity_score: number
  shared_preferences: {
    categories: string[]
    locations: string[]
    time_preferences: string[]
  }
  interaction_overlap: number
  demographic_similarity: number
  behavioral_similarity: number
}

export interface RecommendationExplanation {
  primary_reason: 'similar_users' | 'past_preferences' | 'location_based' | 'trending' | 'content_similarity'
  confidence_score: number
  evidence: {
    similar_events_attended: string[]
    matching_categories: string[]
    location_relevance: number
    social_proof: {
      friends_interested: number
      similar_users_attended: number
    }
  }
  human_readable: string
}

export interface CacheEntry<T> {
  key: string
  value: T
  ttl: number
  created_at: number
  hit_count: number
  last_accessed: number
  metadata?: Record<string, any>
}

export interface CacheMetrics {
  hit_rate: number
  miss_rate: number
  eviction_rate: number
  average_ttl: number
  memory_usage: number
  entry_count: number
  popular_keys: string[]
}

export interface MLModelConfig {
  model_type: 'collaborative_filtering' | 'content_based' | 'hybrid' | 'deep_learning'
  version: string
  hyperparameters: Record<string, any>
  training_data_version: string
  performance_metrics: {
    precision_at_k: Record<number, number>
    recall_at_k: Record<number, number>
    ndcg_at_k: Record<number, number>
    auc: number
    loss: number
  }
  created_at: string
  is_active: boolean
}

export interface FeatureImportance {
  feature_name: string
  importance_score: number
  feature_type: 'categorical' | 'numerical' | 'embedding' | 'temporal'
  explanation: string
}

export interface RealTimeUpdate {
  type: 'user_interaction' | 'preference_change' | 'new_event' | 'cache_invalidation'
  user_id?: string
  event_id?: string
  data: Record<string, any>
  timestamp: string
  requires_recomputation: boolean
}

export interface PersonalizationConfig {
  algorithms: {
    collaborative_filtering: {
      enabled: boolean
      weight: number
      min_interactions: number
      similarity_threshold: number
    }
    content_based: {
      enabled: boolean
      weight: number
      feature_weights: Record<string, number>
    }
    location_based: {
      enabled: boolean
      weight: number
      max_distance_km: number
      decay_function: 'linear' | 'exponential' | 'gaussian'
    }
    trending: {
      enabled: boolean
      weight: number
      time_window_hours: number
      min_interaction_count: number
    }
  }
  diversity: {
    enable_diversity: boolean
    diversity_lambda: number
    max_same_category: number
    max_same_venue: number
  }
  cache: {
    enabled: boolean
    ttl_seconds: number
    max_entries: number
    invalidation_strategy: 'time_based' | 'event_based' | 'hybrid'
  }
  ab_testing: {
    enabled: boolean
    default_variant: string
    traffic_allocation: Record<string, number>
  }
  performance: {
    max_computation_time_ms: number
    enable_async_updates: boolean
    batch_size: number
  }
}