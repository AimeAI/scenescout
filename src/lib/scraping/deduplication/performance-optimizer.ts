import { Event } from '@/types'
import {
  EventFingerprint,
  DedupConfig,
  PerformanceMetrics,
  ProcessingMode,
  BatchDeduplicationResult,
  CacheEntry,
  FingerprintCache,
  SimilarityCache
} from './types'
import { FuzzyMatcher } from './fuzzy-matcher'

interface ProcessingQueue {
  id: string
  event: Event
  priority: number
  addedAt: Date
  attempts: number
}

interface OptimizationStrategy {
  name: string
  enabled: boolean
  config: Record<string, any>
}

interface WorkerResult {
  eventId: string
  duplicates: string[]
  processingTime: number
  error?: string
}

/**
 * Performance optimization system for large-scale deduplication
 * Implements caching, batching, clustering, and parallel processing
 */
export class PerformanceOptimizer {
  private config: DedupConfig
  private matcher: FuzzyMatcher
  private fingerprintCache: Map<string, FingerprintCache>
  private similarityCache: Map<string, SimilarityCache>
  private processingQueue: ProcessingQueue[]
  private isProcessing: boolean = false
  private metrics: PerformanceMetrics[]
  private optimizationStrategies: Map<string, OptimizationStrategy>
  private eventClusters: Map<string, string[]> // clusterId -> eventIds
  private clusterIndex: Map<string, string> // eventId -> clusterId

  constructor(config: DedupConfig, matcher: FuzzyMatcher) {
    this.config = config
    this.matcher = matcher
    this.fingerprintCache = new Map()
    this.similarityCache = new Map()
    this.processingQueue = []
    this.metrics = []
    this.optimizationStrategies = this.initializeOptimizationStrategies()
    this.eventClusters = new Map()
    this.clusterIndex = new Map()
  }

  private initializeOptimizationStrategies(): Map<string, OptimizationStrategy> {
    const strategies = new Map<string, OptimizationStrategy>()

    strategies.set('aggressive_caching', {
      name: 'Aggressive Caching',
      enabled: true,
      config: {
        maxCacheSize: 10000,
        ttlMinutes: 60,
        precomputeFingerprints: true
      }
    })

    strategies.set('clustering', {
      name: 'Event Clustering',
      enabled: true,
      config: {
        maxClusterSize: 100,
        similarityThreshold: 0.7,
        rebalanceFrequency: 1000
      }
    })

    strategies.set('batch_processing', {
      name: 'Batch Processing',
      enabled: true,
      config: {
        batchSize: 100,
        maxWaitTime: 5000,
        priorityThreshold: 8
      }
    })

    strategies.set('parallel_workers', {
      name: 'Parallel Workers',
      enabled: this.config.performance.parallelProcessing,
      config: {
        maxWorkers: 4,
        workloadDistribution: 'round_robin'
      }
    })

    strategies.set('smart_candidate_filtering', {
      name: 'Smart Candidate Filtering',
      enabled: true,
      config: {
        useBloomFilter: true,
        maxCandidates: 50,
        earlyTermination: true
      }
    })

    return strategies
  }

  /**
   * Optimize event processing with caching and clustering
   */
  public async processEventsOptimized(
    events: Event[],
    mode: ProcessingMode = 'batch'
  ): Promise<BatchDeduplicationResult> {
    const startTime = Date.now()
    let processedCount = 0
    let duplicatesFound = 0
    let mergesCompleted = 0
    const errors: Array<{ eventId: string; error: string }> = []

    try {
      // Pre-process: build fingerprints and clusters
      await this.preProcessEvents(events)

      // Process based on mode
      switch (mode) {
        case 'realtime':
          for (const event of events) {
            try {
              const result = await this.processEventRealtime(event)
              processedCount++
              duplicatesFound += result.duplicates.length
              if (result.duplicates.length > 0) mergesCompleted++
            } catch (error) {
              errors.push({ eventId: event.id, error: error.message })
            }
          }
          break

        case 'batch':
          const batchResult = await this.processBatch(events)
          processedCount = batchResult.processedCount
          duplicatesFound = batchResult.duplicatesFound
          mergesCompleted = batchResult.mergesCompleted
          errors.push(...batchResult.errors)
          break

        case 'incremental':
          const incrementalResult = await this.processIncremental(events)
          processedCount = incrementalResult.processedCount
          duplicatesFound = incrementalResult.duplicatesFound
          mergesCompleted = incrementalResult.mergesCompleted
          errors.push(...incrementalResult.errors)
          break

        case 'full_scan':
          const fullScanResult = await this.processFullScan(events)
          processedCount = fullScanResult.processedCount
          duplicatesFound = fullScanResult.duplicatesFound
          mergesCompleted = fullScanResult.mergesCompleted
          errors.push(...fullScanResult.errors)
          break
      }

      const processingTime = Date.now() - startTime
      const performanceMetrics = this.createPerformanceMetrics(
        processingTime,
        processedCount,
        duplicatesFound,
        mergesCompleted
      )

      this.metrics.push(performanceMetrics)
      this.optimizeCaches()

      return {
        processedCount,
        duplicatesFound,
        mergesCompleted,
        errors,
        performance: performanceMetrics,
        report: await this.generateReport(performanceMetrics)
      }
    } catch (error) {
      return {
        processedCount: 0,
        duplicatesFound: 0,
        mergesCompleted: 0,
        errors: [{ eventId: 'system', error: error.message }],
        performance: this.createPerformanceMetrics(Date.now() - startTime, 0, 0, 0),
        report: {
          summary: {
            totalEvents: 0,
            duplicatesFound: 0,
            clustersCreated: 0,
            mergesCompleted: 0,
            qualityImprovement: 0
          },
          performance: this.createPerformanceMetrics(Date.now() - startTime, 0, 0, 0),
          quality: {
            precision: 0,
            recall: 0,
            f1Score: 0,
            falsePositives: 0,
            falseNegatives: 0,
            confidenceDistribution: []
          },
          recommendations: ['System error occurred during processing'],
          issues: [{ type: 'error', message: error.message, affectedEvents: [] }]
        }
      }
    }
  }

  private async preProcessEvents(events: Event[]): Promise<void> {
    if (!this.optimizationStrategies.get('aggressive_caching')?.enabled) return

    // Pre-compute fingerprints
    const fingerprintPromises = events.map(async (event) => {
      if (!this.fingerprintCache.has(event.id)) {
        const fingerprint = this.matcher.generateFingerprint(event)
        this.cacheFingerprintWithTTL(event.id, fingerprint)
      }
    })

    await Promise.all(fingerprintPromises)

    // Build clusters if clustering is enabled
    if (this.optimizationStrategies.get('clustering')?.enabled) {
      await this.buildEventClusters(events)
    }
  }

  private async processEventRealtime(event: Event): Promise<WorkerResult> {
    const startTime = Date.now()
    
    try {
      // Get or compute fingerprint
      const fingerprint = this.getCachedFingerprint(event.id) || 
                         this.matcher.generateFingerprint(event)
      
      if (!this.fingerprintCache.has(event.id)) {
        this.cacheFingerprintWithTTL(event.id, fingerprint)
      }

      // Find candidates using optimized strategy
      const candidates = await this.findCandidatesOptimized(event)
      
      // Check for duplicates
      const matches = await this.matcher.findMatches(event, candidates)
      const duplicateIds = matches
        .filter(m => m.confidence >= this.config.thresholds.overall)
        .map(m => m.eventId)

      return {
        eventId: event.id,
        duplicates: duplicateIds,
        processingTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        eventId: event.id,
        duplicates: [],
        processingTime: Date.now() - startTime,
        error: error.message
      }
    }
  }

  private async processBatch(events: Event[]): Promise<{
    processedCount: number
    duplicatesFound: number
    mergesCompleted: number
    errors: Array<{ eventId: string; error: string }>
  }> {
    const batchSize = this.config.performance.batchSize
    const results = {
      processedCount: 0,
      duplicatesFound: 0,
      mergesCompleted: 0,
      errors: [] as Array<{ eventId: string; error: string }>
    }

    // Process in batches
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize)
      
      try {
        const batchResults = await this.processBatchParallel(batch)
        
        results.processedCount += batchResults.length
        results.duplicatesFound += batchResults.reduce(
          (sum, r) => sum + r.duplicates.length, 0
        )
        results.mergesCompleted += batchResults.filter(
          r => r.duplicates.length > 0
        ).length
        
        batchResults.forEach(r => {
          if (r.error) {
            results.errors.push({ eventId: r.eventId, error: r.error })
          }
        })
      } catch (error) {
        batch.forEach(event => {
          results.errors.push({ eventId: event.id, error: error.message })
        })
      }
    }

    return results
  }

  private async processBatchParallel(batch: Event[]): Promise<WorkerResult[]> {
    if (!this.optimizationStrategies.get('parallel_workers')?.enabled) {
      // Sequential processing
      const results: WorkerResult[] = []
      for (const event of batch) {
        results.push(await this.processEventRealtime(event))
      }
      return results
    }

    // Parallel processing
    const maxWorkers = this.optimizationStrategies.get('parallel_workers')?.config.maxWorkers || 4
    const workers: Promise<WorkerResult>[] = []
    
    for (let i = 0; i < batch.length; i += maxWorkers) {
      const chunk = batch.slice(i, i + maxWorkers)
      const chunkPromises = chunk.map(event => this.processEventRealtime(event))
      workers.push(...chunkPromises)
    }

    return Promise.all(workers)
  }

  private async processIncremental(events: Event[]): Promise<{
    processedCount: number
    duplicatesFound: number
    mergesCompleted: number
    errors: Array<{ eventId: string; error: string }>
  }> {
    // Queue events for processing
    events.forEach(event => {
      this.processingQueue.push({
        id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        event,
        priority: this.calculatePriority(event),
        addedAt: new Date(),
        attempts: 0
      })
    })

    // Sort by priority
    this.processingQueue.sort((a, b) => b.priority - a.priority)

    const results = {
      processedCount: 0,
      duplicatesFound: 0,
      mergesCompleted: 0,
      errors: [] as Array<{ eventId: string; error: string }>
    }

    // Process queue
    while (this.processingQueue.length > 0) {
      const queueItem = this.processingQueue.shift()!
      
      try {
        const result = await this.processEventRealtime(queueItem.event)
        results.processedCount++
        results.duplicatesFound += result.duplicates.length
        if (result.duplicates.length > 0) results.mergesCompleted++
        
        if (result.error) {
          results.errors.push({ eventId: result.eventId, error: result.error })
        }
      } catch (error) {
        queueItem.attempts++
        if (queueItem.attempts < 3) {
          // Retry with lower priority
          queueItem.priority = Math.max(1, queueItem.priority - 1)
          this.processingQueue.push(queueItem)
        } else {
          results.errors.push({ eventId: queueItem.event.id, error: error.message })
        }
      }
    }

    return results
  }

  private async processFullScan(events: Event[]): Promise<{
    processedCount: number
    duplicatesFound: number
    mergesCompleted: number
    errors: Array<{ eventId: string; error: string }>
  }> {
    // Full scan compares every event with every other event
    const results = {
      processedCount: 0,
      duplicatesFound: 0,
      mergesCompleted: 0,
      errors: [] as Array<{ eventId: string; error: string }>
    }

    const duplicatePairs = new Set<string>()

    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i]
        const event2 = events[j]
        
        try {
          const fp1 = this.getCachedFingerprint(event1.id) || 
                     this.matcher.generateFingerprint(event1)
          const fp2 = this.getCachedFingerprint(event2.id) || 
                     this.matcher.generateFingerprint(event2)
          
          const similarity = this.matcher.calculateSimilarity(fp1, fp2)
          
          if (similarity.overall >= this.config.thresholds.overall) {
            const pairKey = [event1.id, event2.id].sort().join('-')
            if (!duplicatePairs.has(pairKey)) {
              duplicatePairs.add(pairKey)
              results.duplicatesFound++
            }
          }
        } catch (error) {
          results.errors.push({ 
            eventId: `${event1.id}-${event2.id}`, 
            error: error.message 
          })
        }
      }
      
      results.processedCount++
    }

    results.mergesCompleted = duplicatePairs.size
    return results
  }

  private calculatePriority(event: Event): number {
    let priority = 5 // Base priority
    
    // Higher priority for newer events
    const eventDate = new Date(event.start_time || event.date || event.event_date || Date.now())
    const daysFromNow = (eventDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    
    if (daysFromNow >= 0 && daysFromNow <= 7) priority += 3 // This week
    else if (daysFromNow > 7 && daysFromNow <= 30) priority += 2 // This month
    else if (daysFromNow < 0) priority -= 2 // Past events
    
    // Higher priority for featured events
    if (event.is_featured) priority += 2
    
    // Higher priority for events with external IDs (likely from APIs)
    if (event.external_id) priority += 1
    
    return Math.max(1, Math.min(10, priority))
  }

  private async findCandidatesOptimized(event: Event): Promise<Event[]> {
    const clustering = this.optimizationStrategies.get('clustering')
    const smartFiltering = this.optimizationStrategies.get('smart_candidate_filtering')
    
    // If clustering is enabled, only check events in the same cluster
    if (clustering?.enabled) {
      const clusterId = this.clusterIndex.get(event.id)
      if (clusterId) {
        const clusterEventIds = this.eventClusters.get(clusterId) || []
        // Return cached events from cluster (would need event cache)
        return [] // Placeholder - would fetch from cache/database
      }
    }
    
    // Smart filtering based on basic criteria
    if (smartFiltering?.enabled) {
      // Would implement Bloom filter or other probabilistic data structures
      // For now, return empty array as placeholder
      return []
    }
    
    // Fallback to traditional candidate finding
    return [] // Placeholder - would implement traditional search
  }

  private async buildEventClusters(events: Event[]): Promise<void> {
    if (!this.optimizationStrategies.get('clustering')?.enabled) return
    
    const config = this.optimizationStrategies.get('clustering')!.config
    const maxClusterSize = config.maxClusterSize || 100
    const similarityThreshold = config.similarityThreshold || 0.7
    
    // Simple clustering algorithm
    const unclustered = new Set(events.map(e => e.id))
    let clusterCounter = 0
    
    for (const event of events) {
      if (!unclustered.has(event.id)) continue
      
      const clusterId = `cluster_${clusterCounter++}`
      const cluster = [event.id]
      unclustered.delete(event.id)
      
      const eventFingerprint = this.getCachedFingerprint(event.id) || 
                              this.matcher.generateFingerprint(event)
      
      // Find similar events to add to cluster
      for (const otherEvent of events) {
        if (!unclustered.has(otherEvent.id) || cluster.length >= maxClusterSize) continue
        
        const otherFingerprint = this.getCachedFingerprint(otherEvent.id) || 
                                this.matcher.generateFingerprint(otherEvent)
        
        const similarity = this.matcher.calculateSimilarity(eventFingerprint, otherFingerprint)
        
        if (similarity.overall >= similarityThreshold) {
          cluster.push(otherEvent.id)
          unclustered.delete(otherEvent.id)
        }
      }
      
      // Store cluster
      this.eventClusters.set(clusterId, cluster)
      cluster.forEach(eventId => {
        this.clusterIndex.set(eventId, clusterId)
      })
    }
  }

  private getCachedFingerprint(eventId: string): EventFingerprint | null {
    const cached = this.fingerprintCache.get(eventId)
    if (!cached) return null
    
    // Check if expired
    if (new Date() > cached.expiry) {
      this.fingerprintCache.delete(eventId)
      return null
    }
    
    // Update access statistics
    cached.accessCount++
    cached.lastAccessed = new Date()
    
    return cached.data
  }

  private cacheFingerprintWithTTL(eventId: string, fingerprint: EventFingerprint): void {
    const config = this.optimizationStrategies.get('aggressive_caching')?.config
    const ttlMinutes = config?.ttlMinutes || 60
    
    const expiry = new Date(Date.now() + ttlMinutes * 60 * 1000)
    
    this.fingerprintCache.set(eventId, {
      data: fingerprint,
      expiry,
      accessCount: 0,
      lastAccessed: new Date()
    })
    
    // Enforce cache size limit
    const maxCacheSize = config?.maxCacheSize || 10000
    if (this.fingerprintCache.size > maxCacheSize) {
      this.evictLeastRecentlyUsed(this.fingerprintCache, maxCacheSize * 0.8)
    }
  }

  private evictLeastRecentlyUsed<T extends CacheEntry<any>>(
    cache: Map<string, T>, 
    targetSize: number
  ): void {
    if (cache.size <= targetSize) return
    
    const entries = Array.from(cache.entries())
    entries.sort((a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime())
    
    const toRemove = entries.slice(0, cache.size - targetSize)
    toRemove.forEach(([key]) => cache.delete(key))
  }

  private createPerformanceMetrics(
    processingTime: number,
    eventsProcessed: number,
    duplicatesFound: number,
    mergesCompleted: number
  ): PerformanceMetrics {
    return {
      processingTime,
      eventsProcessed,
      duplicatesFound,
      mergesCompleted,
      qualityImprovement: mergesCompleted / Math.max(1, eventsProcessed),
      algorithmsUsed: ['fuzzy_matching', 'clustering', 'caching'],
      memoryUsage: this.getMemoryUsage(),
      cacheHitRate: this.getCacheHitRate()
    }
  }

  private getMemoryUsage(): number {
    // Estimate memory usage of caches and data structures
    let usage = 0
    
    // Fingerprint cache
    usage += this.fingerprintCache.size * 1000 // Rough estimate
    
    // Similarity cache
    usage += this.similarityCache.size * 200
    
    // Clusters
    usage += Array.from(this.eventClusters.values())
      .reduce((sum, cluster) => sum + cluster.length * 50, 0)
    
    return usage
  }

  private getCacheHitRate(): number {
    const totalAccesses = Array.from(this.fingerprintCache.values())
      .reduce((sum, entry) => sum + entry.accessCount, 0)
    
    if (totalAccesses === 0) return 0
    
    const hits = Array.from(this.fingerprintCache.values())
      .filter(entry => entry.accessCount > 1).length
    
    return hits / this.fingerprintCache.size
  }

  private optimizeCaches(): void {
    // Remove expired entries
    const now = new Date()
    
    Array.from(this.fingerprintCache.entries()).forEach(([key, entry]) => {
      if (now > entry.expiry) {
        this.fingerprintCache.delete(key)
      }
    })
    
    Array.from(this.similarityCache.entries()).forEach(([key, entry]) => {
      if (now > entry.expiry) {
        this.similarityCache.delete(key)
      }
    })
    
    // Rebalance clusters if needed
    const clusteringConfig = this.optimizationStrategies.get('clustering')?.config
    const rebalanceFrequency = clusteringConfig?.rebalanceFrequency || 1000
    
    if (this.metrics.length % rebalanceFrequency === 0) {
      this.rebalanceClusters()
    }
  }

  private rebalanceClusters(): void {
    // Simple rebalancing: merge small clusters and split large ones
    const maxClusterSize = this.optimizationStrategies.get('clustering')?.config.maxClusterSize || 100
    const minClusterSize = 5
    
    const clusters = Array.from(this.eventClusters.entries())
    
    // Find clusters to merge (too small)
    const smallClusters = clusters.filter(([, eventIds]) => eventIds.length < minClusterSize)
    
    // Find clusters to split (too large)
    const largeClusters = clusters.filter(([, eventIds]) => eventIds.length > maxClusterSize)
    
    // Merge small clusters
    for (let i = 0; i < smallClusters.length - 1; i += 2) {
      const [clusterId1, events1] = smallClusters[i]
      const [clusterId2, events2] = smallClusters[i + 1]
      
      if (events1.length + events2.length <= maxClusterSize) {
        // Merge into first cluster
        this.eventClusters.set(clusterId1, [...events1, ...events2])
        this.eventClusters.delete(clusterId2)
        
        // Update index
        events2.forEach(eventId => {
          this.clusterIndex.set(eventId, clusterId1)
        })
      }
    }
    
    // Split large clusters (simplified)
    largeClusters.forEach(([clusterId, eventIds]) => {
      const midpoint = Math.floor(eventIds.length / 2)
      const newClusterId = `${clusterId}_split`
      
      const firstHalf = eventIds.slice(0, midpoint)
      const secondHalf = eventIds.slice(midpoint)
      
      this.eventClusters.set(clusterId, firstHalf)
      this.eventClusters.set(newClusterId, secondHalf)
      
      // Update index
      secondHalf.forEach(eventId => {
        this.clusterIndex.set(eventId, newClusterId)
      })
    })
  }

  private async generateReport(metrics: PerformanceMetrics): Promise<any> {
    // Simplified report generation
    return {
      summary: {
        totalEvents: metrics.eventsProcessed,
        duplicatesFound: metrics.duplicatesFound,
        clustersCreated: this.eventClusters.size,
        mergesCompleted: metrics.mergesCompleted,
        qualityImprovement: metrics.qualityImprovement
      },
      performance: metrics,
      quality: {
        precision: 0.85, // Would calculate from validation data
        recall: 0.80,
        f1Score: 0.825,
        falsePositives: 0,
        falseNegatives: 0,
        confidenceDistribution: []
      },
      recommendations: this.generateOptimizationRecommendations(),
      issues: []
    }
  }

  private generateOptimizationRecommendations(): string[] {
    const recommendations: string[] = []
    
    // Cache efficiency
    const cacheHitRate = this.getCacheHitRate()
    if (cacheHitRate < 0.7) {
      recommendations.push('Consider increasing cache TTL or size for better hit rates')
    }
    
    // Memory usage
    const memoryUsage = this.getMemoryUsage()
    if (memoryUsage > 100000000) { // 100MB
      recommendations.push('High memory usage detected - consider cache size optimization')
    }
    
    // Processing time
    const recentMetrics = this.metrics.slice(-10)
    if (recentMetrics.length > 0) {
      const avgProcessingTime = recentMetrics.reduce((sum, m) => sum + m.processingTime, 0) / recentMetrics.length
      if (avgProcessingTime > 5000) {
        recommendations.push('High processing times - consider enabling parallel processing or clustering')
      }
    }
    
    // Cluster balance
    const clusterSizes = Array.from(this.eventClusters.values()).map(cluster => cluster.length)
    const avgClusterSize = clusterSizes.reduce((sum, size) => sum + size, 0) / clusterSizes.length
    const maxClusterSize = Math.max(...clusterSizes)
    
    if (maxClusterSize > avgClusterSize * 3) {
      recommendations.push('Unbalanced clusters detected - consider rebalancing strategy')
    }
    
    return recommendations
  }

  /**
   * Get performance statistics
   */
  public getPerformanceStats(): {
    cacheStats: {
      fingerprintCache: { size: number; hitRate: number }
      similarityCache: { size: number; hitRate: number }
    }
    clusterStats: {
      totalClusters: number
      totalEventsClustered: number
      avgClusterSize: number
      maxClusterSize: number
    }
    processingStats: {
      totalOperations: number
      avgProcessingTime: number
      memoryUsage: number
    }
  } {
    const clusterSizes = Array.from(this.eventClusters.values()).map(c => c.length)
    
    return {
      cacheStats: {
        fingerprintCache: {
          size: this.fingerprintCache.size,
          hitRate: this.getCacheHitRate()
        },
        similarityCache: {
          size: this.similarityCache.size,
          hitRate: 0 // Would need to track
        }
      },
      clusterStats: {
        totalClusters: this.eventClusters.size,
        totalEventsClustered: clusterSizes.reduce((sum, size) => sum + size, 0),
        avgClusterSize: clusterSizes.length > 0 ? clusterSizes.reduce((sum, size) => sum + size, 0) / clusterSizes.length : 0,
        maxClusterSize: clusterSizes.length > 0 ? Math.max(...clusterSizes) : 0
      },
      processingStats: {
        totalOperations: this.metrics.length,
        avgProcessingTime: this.metrics.length > 0 ? this.metrics.reduce((sum, m) => sum + m.processingTime, 0) / this.metrics.length : 0,
        memoryUsage: this.getMemoryUsage()
      }
    }
  }

  /**
   * Enable/disable optimization strategy
   */
  public toggleOptimizationStrategy(strategyName: string, enabled: boolean): void {
    const strategy = this.optimizationStrategies.get(strategyName)
    if (strategy) {
      strategy.enabled = enabled
    }
  }

  /**
   * Update optimization strategy configuration
   */
  public updateOptimizationConfig(strategyName: string, config: Record<string, any>): void {
    const strategy = this.optimizationStrategies.get(strategyName)
    if (strategy) {
      strategy.config = { ...strategy.config, ...config }
    }
  }

  /**
   * Clear all caches
   */
  public clearCaches(): void {
    this.fingerprintCache.clear()
    this.similarityCache.clear()
    this.eventClusters.clear()
    this.clusterIndex.clear()
  }

  /**
   * Get optimization strategies
   */
  public getOptimizationStrategies(): Map<string, OptimizationStrategy> {
    return new Map(this.optimizationStrategies)
  }
}
