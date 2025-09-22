import { Event } from '@/types'
import {
  DuplicationResult,
  MergeDecision,
  DedupConfig,
  MergeStrategy,
  ProcessingMode,
  BatchDeduplicationResult,
  DeduplicationReport,
  PerformanceMetrics
} from './types'
import { FuzzyMatcher } from './fuzzy-matcher'
import { EventMerger } from './event-merger'
import { ConflictResolver } from './conflict-resolver'
import { MergeHistoryTracker } from './merge-history'
import { PerformanceOptimizer } from './performance-optimizer'

/**
 * Comprehensive intelligent deduplication system
 * Orchestrates all deduplication components for high-accuracy duplicate detection
 */
export class IntelligentDeduplicationSystem {
  private config: DedupConfig
  private fuzzyMatcher: FuzzyMatcher
  private eventMerger: EventMerger
  private conflictResolver: ConflictResolver
  private historyTracker: MergeHistoryTracker
  private performanceOptimizer: PerformanceOptimizer
  private isInitialized: boolean = false

  constructor(config?: Partial<DedupConfig>) {
    this.config = this.createDefaultConfig(config)
    this.fuzzyMatcher = new FuzzyMatcher(this.config)
    this.eventMerger = new EventMerger(this.config)
    this.conflictResolver = new ConflictResolver(this.config)
    this.historyTracker = new MergeHistoryTracker()
    this.performanceOptimizer = new PerformanceOptimizer(this.config, this.fuzzyMatcher)
  }

  private createDefaultConfig(userConfig?: Partial<DedupConfig>): DedupConfig {
    return {
      thresholds: {
        title: 0.85,
        venue: 0.80,
        location: 0.75,
        date: 0.90,
        semantic: 0.75,
        overall: 0.80,
        ...userConfig?.thresholds
      },
      weights: {
        title: 0.35,
        venue: 0.25,
        location: 0.20,
        date: 0.15,
        semantic: 0.05,
        ...userConfig?.weights
      },
      algorithms: {
        stringMatching: 'hybrid',
        semanticMatching: true,
        locationMatching: 'hybrid',
        fuzzyDate: true,
        ...userConfig?.algorithms
      },
      performance: {
        batchSize: 100,
        maxCandidates: 50,
        enableCaching: true,
        parallelProcessing: true,
        ...userConfig?.performance
      },
      quality: {
        minimumQualityScore: 0.7,
        requireManualReview: false,
        autoMergeThreshold: 0.95,
        ...userConfig?.quality
      }
    }
  }

  /**
   * Initialize the deduplication system
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return

    // Initialize data sources for conflict resolver
    this.conflictResolver.registerDataSource('eventbrite', {
      name: 'eventbrite',
      reliability: 0.88,
      lastUpdated: new Date(),
      dataQuality: 0.85
    })

    this.conflictResolver.registerDataSource('ticketmaster', {
      name: 'ticketmaster',
      reliability: 0.85,
      lastUpdated: new Date(),
      dataQuality: 0.82
    })

    this.conflictResolver.registerDataSource('meetup', {
      name: 'meetup',
      reliability: 0.78,
      lastUpdated: new Date(),
      dataQuality: 0.75
    })

    // Enable optimization strategies
    this.performanceOptimizer.toggleOptimizationStrategy('aggressive_caching', true)
    this.performanceOptimizer.toggleOptimizationStrategy('clustering', true)
    this.performanceOptimizer.toggleOptimizationStrategy('batch_processing', true)

    this.isInitialized = true
  }

  /**
   * Check if a single event has duplicates
   */
  public async checkForDuplicates(
    targetEvent: Event,
    candidateEvents: Event[]
  ): Promise<DuplicationResult> {
    await this.initialize()
    
    return this.fuzzyMatcher.checkForDuplicates(targetEvent, candidateEvents)
  }

  /**
   * Process multiple events for deduplication
   */
  public async processEvents(
    events: Event[],
    mode: ProcessingMode = 'batch'
  ): Promise<BatchDeduplicationResult> {
    await this.initialize()
    
    return this.performanceOptimizer.processEventsOptimized(events, mode)
  }

  /**
   * Create merge decision for duplicate events
   */
  public createMergeDecision(
    primaryEvent: Event,
    duplicateEvents: Event[],
    strategy: MergeStrategy = 'enhance_primary'
  ): MergeDecision {
    return this.eventMerger.createMergeDecision(primaryEvent, duplicateEvents, strategy)
  }

  /**
   * Execute merge decision
   */
  public async executeMerge(
    decision: MergeDecision,
    mergedBy: string = 'system'
  ): Promise<{
    mergedEvent: Event
    historyId: string
    success: boolean
    errors: string[]
  }> {
    const startTime = Date.now()
    
    // Validate merge decision
    const validation = this.eventMerger.validateMergeDecision(decision)
    if (!validation.isValid) {
      return {
        mergedEvent: decision.preview,
        historyId: '',
        success: false,
        errors: validation.errors
      }
    }

    try {
      // Execute the merge
      const mergeResult = await this.eventMerger.executeMerge(decision)
      
      if (!mergeResult.success) {
        return {
          mergedEvent: decision.preview,
          historyId: '',
          success: false,
          errors: mergeResult.errors
        }
      }

      // Calculate quality improvement
      const qualityImprovement = this.calculateQualityImprovement(
        decision.preview,
        mergeResult.mergedEvent
      )

      // Record in history
      const historyId = this.historyTracker.recordMerge(
        decision,
        decision.preview, // before event
        mergeResult.mergedEvent, // after event
        mergedBy,
        Date.now() - startTime,
        qualityImprovement
      )

      return {
        mergedEvent: mergeResult.mergedEvent,
        historyId,
        success: true,
        errors: []
      }
    } catch (error) {
      return {
        mergedEvent: decision.preview,
        historyId: '',
        success: false,
        errors: [`Merge execution failed: ${error.message}`]
      }
    }
  }

  private calculateQualityImprovement(beforeEvent: Event, afterEvent: Event): number {
    // Simple quality metric based on completeness
    const beforeScore = this.calculateCompletenessScore(beforeEvent)
    const afterScore = this.calculateCompletenessScore(afterEvent)
    
    return afterScore - beforeScore
  }

  private calculateCompletenessScore(event: Event): number {
    const fields = [
      'title', 'description', 'venue_name', 'start_time', 'end_time',
      'price_min', 'price_max', 'website_url', 'ticket_url', 'image_url',
      'category', 'tags', 'latitude', 'longitude'
    ]
    
    let score = 0
    let totalWeight = 0
    
    fields.forEach(field => {
      const value = event[field as keyof Event]
      const weight = this.getFieldWeight(field)
      totalWeight += weight
      
      if (value !== null && value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          score += value.length > 0 ? weight : 0
        } else if (typeof value === 'string') {
          score += value.trim().length > 0 ? weight : 0
        } else {
          score += weight
        }
      }
    })
    
    return totalWeight > 0 ? score / totalWeight : 0
  }

  private getFieldWeight(field: string): number {
    const weights: Record<string, number> = {
      title: 10,
      description: 8,
      venue_name: 9,
      start_time: 10,
      end_time: 6,
      price_min: 7,
      price_max: 7,
      website_url: 5,
      ticket_url: 8,
      image_url: 4,
      category: 6,
      tags: 3,
      latitude: 7,
      longitude: 7
    }
    
    return weights[field] || 1
  }

  /**
   * Resolve field conflicts for multiple events
   */
  public resolveConflicts(
    events: Event[],
    fieldNames: string[]
  ): Map<string, any> {
    const resolutions = this.conflictResolver.resolveBatchConflicts(events, fieldNames)
    const resolvedValues = new Map<string, any>()
    
    resolutions.forEach((resolution, fieldName) => {
      resolvedValues.set(fieldName, resolution.resolvedValue)
    })
    
    return resolvedValues
  }

  /**
   * Get merge history for an event
   */
  public getEventHistory(eventId: string) {
    return this.historyTracker.getEventHistory(eventId)
  }

  /**
   * Generate comprehensive deduplication report
   */
  public async generateReport(filter?: {
    dateRange?: { start: Date; end: Date }
    strategy?: MergeStrategy
    minConfidence?: number
  }): Promise<DeduplicationReport> {
    const auditReport = this.historyTracker.generateAuditReport(filter)
    const performanceStats = this.performanceOptimizer.getPerformanceStats()
    const conflictStats = this.conflictResolver.getResolutionStats()
    
    return {
      summary: auditReport.summary,
      performance: {
        processingTime: 0, // Would aggregate from metrics
        eventsProcessed: auditReport.summary.totalMerges,
        duplicatesFound: 0, // Would calculate from metrics
        mergesCompleted: auditReport.summary.totalMerges,
        qualityImprovement: auditReport.summary.qualityImprovement,
        algorithmsUsed: ['fuzzy_matching', 'conflict_resolution', 'clustering'],
        memoryUsage: performanceStats.processingStats.memoryUsage,
        cacheHitRate: performanceStats.cacheStats.fingerprintCache.hitRate
      },
      quality: {
        precision: 0.85, // Would calculate from validation data
        recall: 0.80,
        f1Score: 0.825,
        falsePositives: 0,
        falseNegatives: 0,
        confidenceDistribution: []
      },
      recommendations: [
        ...auditReport.recommendations,
        ...(conflictStats.manualReviewRate > 0.2 ? 
          ['High manual review rate - consider tuning conflict resolution rules'] : []),
        ...(performanceStats.cacheStats.fingerprintCache.hitRate < 0.7 ?
          ['Low cache hit rate - consider increasing cache size or TTL'] : [])
      ],
      issues: auditReport.qualityIssues
    }
  }

  /**
   * Update system configuration
   */
  public updateConfiguration(updates: Partial<DedupConfig>): void {
    this.config = { ...this.config, ...updates }
    
    // Propagate config updates to components
    this.fuzzyMatcher.updateConfig(this.config)
    
    // Clear caches if thresholds changed
    if (updates.thresholds || updates.weights) {
      this.fuzzyMatcher.clearCache()
      this.performanceOptimizer.clearCaches()
    }
  }

  /**
   * Get current configuration
   */
  public getConfiguration(): DedupConfig {
    return { ...this.config }
  }

  /**
   * Get system performance metrics
   */
  public getPerformanceMetrics(): {
    fuzzyMatcher: any
    conflictResolver: any
    performanceOptimizer: any
    historyTracker: any
  } {
    return {
      fuzzyMatcher: this.fuzzyMatcher.getCacheStats(),
      conflictResolver: this.conflictResolver.getResolutionStats(),
      performanceOptimizer: this.performanceOptimizer.getPerformanceStats(),
      historyTracker: this.historyTracker.getStatistics()
    }
  }

  /**
   * Export system data
   */
  public exportData(format: 'json' | 'csv' = 'json'): {
    mergeHistory: string
    configuration: string
    performance: string
  } {
    return {
      mergeHistory: this.historyTracker.exportHistory(format),
      configuration: JSON.stringify(this.config, null, 2),
      performance: JSON.stringify(this.getPerformanceMetrics(), null, 2)
    }
  }

  /**
   * Import system data
   */
  public importData(data: {
    mergeHistory?: string
    configuration?: string
  }): {
    imported: { mergeHistory: number; configuration: boolean }
    errors: string[]
  } {
    const errors: string[] = []
    const imported = { mergeHistory: 0, configuration: false }
    
    // Import merge history
    if (data.mergeHistory) {
      try {
        const historyResult = this.historyTracker.importHistory(data.mergeHistory)
        imported.mergeHistory = historyResult.imported
        errors.push(...historyResult.errors)
      } catch (error) {
        errors.push(`Failed to import merge history: ${error.message}`)
      }
    }
    
    // Import configuration
    if (data.configuration) {
      try {
        const config = JSON.parse(data.configuration)
        this.updateConfiguration(config)
        imported.configuration = true
      } catch (error) {
        errors.push(`Failed to import configuration: ${error.message}`)
      }
    }
    
    return { imported, errors }
  }

  /**
   * Cleanup system resources
   */
  public cleanup(): void {
    this.fuzzyMatcher.clearCache()
    this.performanceOptimizer.clearCaches()
    this.conflictResolver.clearHistory()
    this.historyTracker.clearHistory()
    this.isInitialized = false
  }

  /**
   * Health check for the system
   */
  public healthCheck(): {
    status: 'healthy' | 'warning' | 'error'
    components: Record<string, { status: string; details?: string }>
    recommendations: string[]
  } {
    const components: Record<string, { status: string; details?: string }> = {}
    const recommendations: string[] = []
    
    // Check fuzzy matcher
    const matcherStats = this.fuzzyMatcher.getCacheStats()
    components.fuzzyMatcher = {
      status: 'healthy',
      details: `Cache size: ${matcherStats.similarityCache.size}`
    }
    
    // Check conflict resolver
    const resolverStats = this.conflictResolver.getResolutionStats()
    components.conflictResolver = {
      status: resolverStats.manualReviewRate > 0.3 ? 'warning' : 'healthy',
      details: `Manual review rate: ${(resolverStats.manualReviewRate * 100).toFixed(1)}%`
    }
    
    if (resolverStats.manualReviewRate > 0.3) {
      recommendations.push('High manual review rate - consider tuning conflict resolution')
    }
    
    // Check performance optimizer
    const perfStats = this.performanceOptimizer.getPerformanceStats()
    const memoryUsage = perfStats.processingStats.memoryUsage
    components.performanceOptimizer = {
      status: memoryUsage > 100000000 ? 'warning' : 'healthy', // 100MB threshold
      details: `Memory usage: ${(memoryUsage / 1000000).toFixed(1)}MB`
    }
    
    if (memoryUsage > 100000000) {
      recommendations.push('High memory usage - consider cache optimization')
    }
    
    // Check history tracker
    const historyStats = this.historyTracker.getStatistics()
    components.historyTracker = {
      status: 'healthy',
      details: `Total merges: ${historyStats.totalMerges}`
    }
    
    // Overall status
    const hasErrors = Object.values(components).some(c => c.status === 'error')
    const hasWarnings = Object.values(components).some(c => c.status === 'warning')
    
    const status = hasErrors ? 'error' : hasWarnings ? 'warning' : 'healthy'
    
    return {
      status,
      components,
      recommendations
    }
  }
}

// Export all types and components
export * from './types'
export { FuzzyMatcher } from './fuzzy-matcher'
export { EventMerger } from './event-merger'
export { ConflictResolver } from './conflict-resolver'
export { MergeHistoryTracker } from './merge-history'
export { PerformanceOptimizer } from './performance-optimizer'

// Default export
export default IntelligentDeduplicationSystem

/**
 * Factory function for creating a configured deduplication system
 */
export function createDeduplicationSystem(config?: Partial<DedupConfig>): IntelligentDeduplicationSystem {
  return new IntelligentDeduplicationSystem(config)
}

/**
 * Utility function for quick duplicate checking
 */
export async function quickDuplicateCheck(
  targetEvent: Event,
  candidateEvents: Event[],
  threshold: number = 0.8
): Promise<{ isDuplicate: boolean; matches: any[] }> {
  const system = createDeduplicationSystem({
    thresholds: { overall: threshold }
  })
  
  const result = await system.checkForDuplicates(targetEvent, candidateEvents)
  
  return {
    isDuplicate: result.isDuplicate,
    matches: result.matches
  }
}

/**
 * Utility function for batch processing events
 */
export async function batchProcessEvents(
  events: Event[],
  mode: ProcessingMode = 'batch'
): Promise<BatchDeduplicationResult> {
  const system = createDeduplicationSystem()
  return system.processEvents(events, mode)
}
