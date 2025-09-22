import { Event } from '@/types'

// Core deduplication interfaces
export interface SimilarityScore {
  title: number
  venue: number
  date: number
  location: number
  semantic: number
  overall: number
}

export interface MatchResult {
  eventId: string
  event: Event
  similarityScore: SimilarityScore
  confidence: number
  reasons: string[]
  riskFactors: string[]
}

export interface DuplicationResult {
  isDuplicate: boolean
  primaryEventId?: string
  duplicateEventIds: string[]
  matches: MatchResult[]
  confidence: number
  recommendations: string[]
  metadata: {
    processingTime: number
    algorithmsUsed: string[]
    threshold: number
  }
}

export interface EventFingerprint {
  id: string
  titleTokens: string[]
  titleEmbedding?: number[]
  venueNormalized: string
  locationKey: string
  coordinates?: { lat: number; lng: number }
  dateKey: string
  timeWindow: string
  contentHash: string
  semanticHash: string
  categoryNormalized: string
  priceRange?: { min: number; max: number }
}

export interface LocationMatch {
  type: 'exact' | 'venue' | 'coordinates' | 'address' | 'city'
  similarity: number
  distance?: number // in meters
  confidence: number
}

export interface MergeDecision {
  primaryEventId: string
  duplicateEventIds: string[]
  strategy: MergeStrategy
  confidence: number
  reasons: string[]
  fieldResolutions: FieldResolution[]
  preview: Event
}

export interface FieldResolution {
  field: string
  primaryValue: any
  duplicateValues: any[]
  selectedValue: any
  strategy: 'primary' | 'latest' | 'most_complete' | 'highest_quality' | 'merge' | 'manual'
  confidence: number
}

export interface MergeHistory {
  id: string
  primaryEventId: string
  duplicateEventIds: string[]
  mergedAt: Date
  mergedBy: string
  strategy: MergeStrategy
  confidence: number
  fieldChanges: FieldChange[]
  metadata: {
    beforeEvent: Event
    afterEvent: Event
    processingTime: number
    qualityImprovement: number
  }
}

export interface FieldChange {
  field: string
  beforeValue: any
  afterValue: any
  source: 'primary' | 'duplicate' | 'merged' | 'enhanced'
  confidence: number
}

export interface ConflictResolution {
  field: string
  values: Array<{
    value: any
    source: string
    confidence: number
    quality: number
    lastUpdated: Date
  }>
  resolvedValue: any
  strategy: ConflictStrategy
  confidence: number
  needsManualReview: boolean
}

export interface DedupConfig {
  thresholds: {
    title: number
    venue: number
    location: number
    date: number
    semantic: number
    overall: number
  }
  weights: {
    title: number
    venue: number
    location: number
    date: number
    semantic: number
  }
  algorithms: {
    stringMatching: 'levenshtein' | 'jaro_winkler' | 'cosine' | 'hybrid'
    semanticMatching: boolean
    locationMatching: 'coordinates' | 'address' | 'venue' | 'hybrid'
    fuzzyDate: boolean
  }
  performance: {
    batchSize: number
    maxCandidates: number
    enableCaching: boolean
    parallelProcessing: boolean
  }
  quality: {
    minimumQualityScore: number
    requireManualReview: boolean
    autoMergeThreshold: number
  }
}

export interface PerformanceMetrics {
  processingTime: number
  eventsProcessed: number
  duplicatesFound: number
  mergesCompleted: number
  qualityImprovement: number
  algorithmsUsed: string[]
  memoryUsage?: number
  cacheHitRate?: number
}

export interface QualityMetrics {
  precision: number
  recall: number
  f1Score: number
  falsePositives: number
  falseNegatives: number
  confidenceDistribution: number[]
}

// Enums and types
export type MergeStrategy = 
  | 'keep_primary' 
  | 'merge_fields' 
  | 'enhance_primary' 
  | 'quality_based'
  | 'temporal_priority'
  | 'source_priority'

export type ConflictStrategy = 
  | 'primary_wins'
  | 'latest_wins' 
  | 'most_complete'
  | 'highest_quality'
  | 'manual_review'
  | 'merge_values'

export type MatchAlgorithm = 
  | 'exact_match'
  | 'fuzzy_title'
  | 'semantic_similarity'
  | 'location_proximity'
  | 'temporal_proximity'
  | 'content_fingerprint'

export type ProcessingMode = 
  | 'realtime'
  | 'batch'
  | 'incremental'
  | 'full_scan'

// Advanced feature interfaces
export interface SemanticEmbedding {
  eventId: string
  titleEmbedding: number[]
  descriptionEmbedding?: number[]
  categoryEmbedding?: number[]
  lastUpdated: Date
}

export interface ClusterResult {
  clusterId: string
  eventIds: string[]
  centroid: EventFingerprint
  cohesion: number
  confidence: number
}

export interface DeduplicationReport {
  summary: {
    totalEvents: number
    duplicatesFound: number
    clustersCreated: number
    mergesCompleted: number
    qualityImprovement: number
  }
  performance: PerformanceMetrics
  quality: QualityMetrics
  recommendations: string[]
  issues: Array<{
    type: 'warning' | 'error'
    message: string
    affectedEvents: string[]
  }>
}

export interface BatchDeduplicationResult {
  processedCount: number
  duplicatesFound: number
  mergesCompleted: number
  errors: Array<{
    eventId: string
    error: string
  }>
  performance: PerformanceMetrics
  report: DeduplicationReport
}

// Cache interfaces
export interface CacheEntry<T> {
  data: T
  expiry: Date
  accessCount: number
  lastAccessed: Date
}

export interface FingerprintCache extends CacheEntry<EventFingerprint> {}
export interface SimilarityCache extends CacheEntry<SimilarityScore> {}
export interface EmbeddingCache extends CacheEntry<SemanticEmbedding> {}

// Database types
export interface DeduplicationRecord {
  id: string
  primary_event_id: string
  duplicate_event_ids: string[]
  similarity_scores: Record<string, SimilarityScore>
  confidence: number
  merge_strategy: MergeStrategy
  field_resolutions: FieldResolution[]
  created_at: Date
  created_by: string
  status: 'pending' | 'completed' | 'rejected' | 'manual_review'
  metadata: Record<string, any>
}

export interface EventCluster {
  id: string
  event_ids: string[]
  centroid_fingerprint: EventFingerprint
  cohesion_score: number
  last_updated: Date
  status: 'active' | 'merged' | 'split'
}

export interface ProcessingQueue {
  id: string
  event_id: string
  priority: number
  scheduled_at: Date
  attempts: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message?: string
  metadata: Record<string, any>
}
