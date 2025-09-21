/**
 * Event Pipeline Orchestrator
 * Coordinates the complete event discovery and processing workflow
 */

import { EventEmitter } from 'events'
import { EventbriteClient } from '../api/eventbrite-client'
import { YelpClient } from '../api/yelp-client'
import { eventNormalizer } from '../event-normalizer'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types'
import type { Event, EventFilters } from '@/types'

export interface PipelineConfig {
  // API Configurations
  eventbrite?: {
    apiKey: string
    enabled: boolean
    rateLimits: { requests: number; windowMs: number }
  }
  yelp?: {
    apiKey: string
    enabled: boolean
    rateLimits: { requests: number; windowMs: number }
  }
  
  // Processing Configuration
  processing: {
    batchSize: number
    maxConcurrency: number
    dedupEnabled: boolean
    qualityThreshold: number
    retryAttempts: number
  }
  
  // Real-time Configuration
  realtime: {
    enabled: boolean
    websocketUrl?: string
    updateIntervalMs: number
  }
  
  // Caching Configuration
  cache: {
    enabled: boolean
    ttlSeconds: number
    strategy: 'redis' | 'memory' | 'supabase'
  }
  
  // Monitoring Configuration
  monitoring: {
    enabled: boolean
    alertWebhook?: string
    healthCheckIntervalMs: number
  }
}

export interface PipelineMetrics {
  discovery: {
    totalRequests: number
    successfulRequests: number
    failedRequests: number
    eventsDiscovered: number
    averageResponseTime: number
  }
  processing: {
    eventsProcessed: number
    eventsNormalized: number
    eventsFiltered: number
    duplicatesRemoved: number
    qualityScore: number
  }
  storage: {
    eventsStored: number
    storageErrors: number
    duplicatesSkipped: number
  }
  realtime: {
    activeConnections: number
    messagesSent: number
    averageLatency: number
  }
}

export interface PipelineJob {
  id: string
  type: 'discovery' | 'processing' | 'cleanup' | 'monitoring'
  source?: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  startedAt?: Date
  completedAt?: Date
  error?: string
  metadata?: Record<string, any>
  results?: {
    eventsFound: number
    eventsProcessed: number
    qualityScore: number
    duration: number
  }
}

export class EventPipelineOrchestrator extends EventEmitter {
  private config: PipelineConfig
  private supabase: ReturnType<typeof createClient<Database>>
  private clients: Map<string, any> = new Map()
  private activeJobs: Map<string, PipelineJob> = new Map()
  private metrics: PipelineMetrics
  private isRunning = false
  private healthCheckInterval?: NodeJS.Timeout
  private cache = new Map<string, { data: any; expiresAt: number }>()

  constructor(config: PipelineConfig) {
    super()
    this.config = config
    this.metrics = this.initializeMetrics()
    
    // Initialize Supabase client
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    this.initializeClients()
    this.setupHealthChecks()
  }

  private initializeMetrics(): PipelineMetrics {
    return {
      discovery: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        eventsDiscovered: 0,
        averageResponseTime: 0
      },
      processing: {
        eventsProcessed: 0,
        eventsNormalized: 0,
        eventsFiltered: 0,
        duplicatesRemoved: 0,
        qualityScore: 0
      },
      storage: {
        eventsStored: 0,
        storageErrors: 0,
        duplicatesSkipped: 0
      },
      realtime: {
        activeConnections: 0,
        messagesSent: 0,
        averageLatency: 0
      }
    }
  }

  private initializeClients(): void {
    // Initialize API clients based on configuration
    if (this.config.eventbrite?.enabled && this.config.eventbrite.apiKey) {
      this.clients.set('eventbrite', new EventbriteClient({
        apiKey: this.config.eventbrite.apiKey,
        baseUrl: 'https://www.eventbriteapi.com/v3',
        rateLimit: this.config.eventbrite.rateLimits,
        timeout: 30000,
        retryOptions: { retries: 3, retryDelay: 1000 }
      }))
    }

    if (this.config.yelp?.enabled && this.config.yelp.apiKey) {
      this.clients.set('yelp', new YelpClient({
        apiKey: this.config.yelp.apiKey,
        baseUrl: 'https://api.yelp.com/v3',
        rateLimit: this.config.yelp.rateLimits,
        timeout: 30000,
        retryOptions: { retries: 3, retryDelay: 1000 }
      }))
    }
  }

  private setupHealthChecks(): void {
    if (this.config.monitoring.enabled) {
      this.healthCheckInterval = setInterval(
        () => this.performHealthCheck(),
        this.config.monitoring.healthCheckIntervalMs
      )
    }
  }

  /**
   * Start the pipeline orchestrator
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Pipeline is already running')
    }

    this.isRunning = true
    this.emit('pipeline:started')
    
    console.log('🚀 Event Pipeline Orchestrator started')
    console.log(`📊 Monitoring: ${this.config.monitoring.enabled ? 'enabled' : 'disabled'}`)
    console.log(`⚡ Real-time: ${this.config.realtime.enabled ? 'enabled' : 'disabled'}`)
    console.log(`💾 Cache: ${this.config.cache.enabled ? this.config.cache.strategy : 'disabled'}`)
  }

  /**
   * Stop the pipeline orchestrator
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return

    this.isRunning = false
    
    // Cancel all active jobs
    for (const [jobId, job] of this.activeJobs) {
      if (job.status === 'running') {
        job.status = 'cancelled'
        job.completedAt = new Date()
      }
    }

    // Clear health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    this.emit('pipeline:stopped')
    console.log('🛑 Event Pipeline Orchestrator stopped')
  }

  /**
   * Orchestrate event discovery across all sources
   */
  async orchestrateDiscovery(params: {
    sources: string[]
    locations: string[]
    categories?: string[]
    dateRange?: { start: string; end: string }
    maxEventsPerSource?: number
  }): Promise<PipelineJob> {
    const job: PipelineJob = {
      id: `discovery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'discovery',
      status: 'pending',
      progress: 0,
      metadata: params
    }

    this.activeJobs.set(job.id, job)
    this.emit('job:created', job)

    try {
      job.status = 'running'
      job.startedAt = new Date()
      this.emit('job:started', job)

      const discoveryResults = await this.executeParallelDiscovery(params, job)
      
      job.status = 'completed'
      job.progress = 100
      job.completedAt = new Date()
      job.results = discoveryResults
      
      this.emit('job:completed', job)
      return job

    } catch (error) {
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : 'Unknown error'
      job.completedAt = new Date()
      
      this.emit('job:failed', job)
      throw error
    }
  }

  private async executeParallelDiscovery(
    params: any, 
    job: PipelineJob
  ): Promise<any> {
    const { sources, locations, categories, dateRange, maxEventsPerSource = 50 } = params
    const allResults: Event[] = []
    const sourceResults = new Map<string, any>()

    // Execute discovery for each source in parallel
    const discoveryPromises = sources.map(async (source: string) => {
      const client = this.clients.get(source)
      if (!client) {
        console.warn(`⚠️  No client available for source: ${source}`)
        return { source, events: [], error: 'Client not available' }
      }

      try {
        this.metrics.discovery.totalRequests++
        const startTime = Date.now()

        // Discovery per location for this source
        const locationPromises = locations.map(async (location: string) => {
          try {
            const searchParams = {
              location: { address: location },
              categories,
              dateRange,
              limit: Math.floor(maxEventsPerSource / locations.length)
            }

            const response = await client.searchEvents(searchParams)
            return response.data || []
          } catch (error) {
            console.error(`❌ Discovery failed for ${source} in ${location}:`, error)
            return []
          }
        })

        const locationResults = await Promise.all(locationPromises)
        const events = locationResults.flat()

        const responseTime = Date.now() - startTime
        this.metrics.discovery.averageResponseTime = 
          (this.metrics.discovery.averageResponseTime + responseTime) / 2

        this.metrics.discovery.successfulRequests++
        this.metrics.discovery.eventsDiscovered += events.length

        return { source, events, responseTime }

      } catch (error) {
        this.metrics.discovery.failedRequests++
        console.error(`❌ Discovery failed for source ${source}:`, error)
        return { source, events: [], error: error.message }
      }
    })

    const results = await Promise.all(discoveryPromises)
    
    // Process and normalize all discovered events
    let processedCount = 0
    for (const result of results) {
      if (result.events.length > 0) {
        // Normalize events from this source
        const normalized = await this.processEventBatch(result.events, result.source)
        allResults.push(...normalized.events)
        
        sourceResults.set(result.source, {
          found: result.events.length,
          processed: normalized.events.length,
          quality: normalized.summary.qualityScore
        })
      }
      
      processedCount++
      job.progress = (processedCount / sources.length) * 100
      this.emit('job:progress', job)
    }

    // Store processed events
    if (allResults.length > 0) {
      await this.storeEvents(allResults)
    }

    return {
      eventsFound: allResults.length,
      eventsProcessed: allResults.length,
      qualityScore: this.metrics.processing.qualityScore,
      duration: Date.now() - (job.startedAt?.getTime() || 0),
      sourceResults: Object.fromEntries(sourceResults)
    }
  }

  /**
   * Process a batch of events with normalization and quality checks
   */
  async processEventBatch(events: any[], source: string): Promise<{
    events: Event[]
    summary: any
  }> {
    // Normalize events
    const normalized = eventNormalizer.batchNormalize(events)
    
    // Apply quality filtering
    const qualityFiltered = normalized.events.filter(event => {
      const quality = eventNormalizer.assessQuality(event, [])
      return quality.overall >= this.config.processing.qualityThreshold
    })

    // Deduplicate if enabled
    let deduplicated = qualityFiltered
    if (this.config.processing.dedupEnabled) {
      deduplicated = await this.deduplicateEvents(qualityFiltered)
      this.metrics.processing.duplicatesRemoved += 
        qualityFiltered.length - deduplicated.length
    }

    this.metrics.processing.eventsProcessed += events.length
    this.metrics.processing.eventsNormalized += normalized.events.length
    this.metrics.processing.eventsFiltered += deduplicated.length
    this.metrics.processing.qualityScore = normalized.summary.qualityScore

    return {
      events: deduplicated,
      summary: {
        ...normalized.summary,
        duplicatesRemoved: qualityFiltered.length - deduplicated.length
      }
    }
  }

  /**
   * Deduplicate events based on title, venue, and date
   */
  private async deduplicateEvents(events: Event[]): Promise<Event[]> {
    const seen = new Set<string>()
    const unique: Event[] = []

    for (const event of events) {
      // Create a deduplication key
      const key = this.createDeduplicationKey(event)
      
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(event)
      }
    }

    return unique
  }

  private createDeduplicationKey(event: Event): string {
    const title = event.title?.toLowerCase().trim() || ''
    const venue = event.venue_name?.toLowerCase().trim() || ''
    const date = event.start_time || event.date || ''
    
    return `${title}|${venue}|${date.split('T')[0]}`
  }

  /**
   * Store events in the database
   */
  private async storeEvents(events: Event[]): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('events')
        .upsert(events, {
          onConflict: 'external_id,source',
          ignoreDuplicates: false
        })

      if (error) {
        this.metrics.storage.storageErrors++
        throw error
      }

      this.metrics.storage.eventsStored += events.length
      
      // Emit real-time update if enabled
      if (this.config.realtime.enabled) {
        this.emit('events:updated', {
          type: 'batch_insert',
          count: events.length,
          timestamp: new Date()
        })
      }

    } catch (error) {
      this.metrics.storage.storageErrors++
      console.error('❌ Failed to store events:', error)
      throw error
    }
  }

  /**
   * Real-time event streaming
   */
  async setupRealtimeStream(): Promise<void> {
    if (!this.config.realtime.enabled) return

    // Subscribe to database changes
    const channel = this.supabase
      .channel('events_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'events' },
        (payload) => {
          this.handleRealtimeUpdate(payload)
        }
      )
      .subscribe()

    console.log('📡 Real-time event stream initialized')
  }

  private handleRealtimeUpdate(payload: any): void {
    this.metrics.realtime.messagesSent++
    this.emit('realtime:update', {
      eventType: payload.eventType,
      table: payload.table,
      new: payload.new,
      old: payload.old,
      timestamp: new Date()
    })
  }

  /**
   * Get events with advanced filtering and caching
   */
  async getEvents(filters: EventFilters & {
    useCache?: boolean
    includeMetrics?: boolean
  }): Promise<{
    events: Event[]
    metadata: {
      total: number
      cached: boolean
      queryTime: number
      qualityScore?: number
    }
  }> {
    const cacheKey = this.createCacheKey(filters)
    const startTime = Date.now()

    // Check cache first if enabled
    if (filters.useCache && this.config.cache.enabled) {
      const cached = this.getCachedData(cacheKey)
      if (cached) {
        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            cached: true,
            queryTime: Date.now() - startTime
          }
        }
      }
    }

    // Query database
    let query = this.supabase
      .from('events')
      .select('*')
      .gte('start_time', new Date().toISOString()) // Only future events
      .order('start_time', { ascending: true })

    // Apply filters
    if (filters.city) {
      query = query.eq('city_name', filters.city)
    }
    
    if (filters.category) {
      query = query.eq('category', filters.category)
    }
    
    if (filters.categories && filters.categories.length > 0) {
      query = query.in('category', filters.categories)
    }
    
    if (filters.dateFrom) {
      query = query.gte('start_time', filters.dateFrom)
    }
    
    if (filters.dateTo) {
      query = query.lte('start_time', filters.dateTo)
    }
    
    if (filters.isFree) {
      query = query.eq('is_free', true)
    }
    
    if (filters.priceMin !== undefined) {
      query = query.gte('price_min', filters.priceMin)
    }
    
    if (filters.priceMax !== undefined) {
      query = query.lte('price_max', filters.priceMax)
    }

    const { data: events, error } = await query

    if (error) {
      console.error('❌ Failed to fetch events:', error)
      throw error
    }

    const result = {
      events: events || [],
      metadata: {
        total: events?.length || 0,
        cached: false,
        queryTime: Date.now() - startTime,
        qualityScore: filters.includeMetrics ? this.calculateQualityScore(events || []) : undefined
      }
    }

    // Cache result if enabled
    if (this.config.cache.enabled) {
      this.setCachedData(cacheKey, result)
    }

    return result
  }

  private createCacheKey(filters: any): string {
    return `events:${JSON.stringify(filters)}`
  }

  private getCachedData(key: string): any {
    if (!this.config.cache.enabled) return null
    
    const cached = this.cache.get(key)
    if (!cached) return null
    
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data
  }

  private setCachedData(key: string, data: any): void {
    if (!this.config.cache.enabled) return
    
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (this.config.cache.ttlSeconds * 1000)
    })
  }

  private calculateQualityScore(events: Event[]): number {
    if (events.length === 0) return 0
    
    const scores = events.map(event => {
      const quality = eventNormalizer.assessQuality(event, [])
      return quality.overall
    })
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length
  }

  /**
   * Health check for all pipeline components
   */
  async performHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    components: Record<string, any>
    metrics: PipelineMetrics
  }> {
    const components: Record<string, any> = {}
    let overallHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

    // Check API clients
    for (const [source, client] of this.clients) {
      try {
        const health = await client.healthCheck()
        components[source] = health
        
        if (health.status !== 'healthy') {
          overallHealth = overallHealth === 'healthy' ? 'degraded' : 'unhealthy'
        }
      } catch (error) {
        components[source] = { status: 'unhealthy', error: error.message }
        overallHealth = 'unhealthy'
      }
    }

    // Check database connectivity
    try {
      const { error } = await this.supabase.from('events').select('id').limit(1)
      components.database = error ? 
        { status: 'unhealthy', error: error.message } : 
        { status: 'healthy' }
    } catch (error) {
      components.database = { status: 'unhealthy', error: error.message }
      overallHealth = 'unhealthy'
    }

    // Check active jobs
    const runningJobs = Array.from(this.activeJobs.values())
      .filter(job => job.status === 'running')
    
    components.jobs = {
      status: runningJobs.length > 10 ? 'degraded' : 'healthy',
      active: runningJobs.length,
      total: this.activeJobs.size
    }

    const healthReport = {
      status: overallHealth,
      components,
      metrics: this.metrics
    }

    this.emit('health:check', healthReport)
    
    // Send alert if unhealthy
    if (overallHealth === 'unhealthy' && this.config.monitoring.alertWebhook) {
      await this.sendHealthAlert(healthReport)
    }

    return healthReport
  }

  private async sendHealthAlert(healthReport: any): Promise<void> {
    try {
      await fetch(this.config.monitoring.alertWebhook!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 SceneScout Pipeline Health Alert`,
          attachments: [{
            color: 'danger',
            title: 'Pipeline Status: UNHEALTHY',
            text: JSON.stringify(healthReport, null, 2)
          }]
        })
      })
    } catch (error) {
      console.error('❌ Failed to send health alert:', error)
    }
  }

  /**
   * Get pipeline status and metrics
   */
  getStatus(): {
    isRunning: boolean
    activeJobs: PipelineJob[]
    metrics: PipelineMetrics
    config: PipelineConfig
  } {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.activeJobs.values()),
      metrics: this.metrics,
      config: this.config
    }
  }

  /**
   * Get job details
   */
  getJob(jobId: string): PipelineJob | undefined {
    return this.activeJobs.get(jobId)
  }

  /**
   * Cancel a running job
   */
  cancelJob(jobId: string): boolean {
    const job = this.activeJobs.get(jobId)
    if (!job || job.status !== 'running') return false

    job.status = 'cancelled'
    job.completedAt = new Date()
    
    this.emit('job:cancelled', job)
    return true
  }

  /**
   * Clean up completed jobs
   */
  cleanupJobs(olderThanHours = 24): void {
    const cutoff = Date.now() - (olderThanHours * 60 * 60 * 1000)
    
    for (const [jobId, job] of this.activeJobs) {
      if (job.completedAt && job.completedAt.getTime() < cutoff) {
        this.activeJobs.delete(jobId)
      }
    }
  }
}

// Export singleton instance
export const pipelineOrchestrator = new EventPipelineOrchestrator({
  eventbrite: {
    apiKey: process.env.EVENTBRITE_TOKEN || '',
    enabled: !!process.env.EVENTBRITE_TOKEN,
    rateLimits: { requests: 1000, windowMs: 60 * 60 * 1000 }
  },
  yelp: {
    apiKey: process.env.YELP_API_KEY || '',
    enabled: !!process.env.YELP_API_KEY,
    rateLimits: { requests: 5000, windowMs: 24 * 60 * 60 * 1000 }
  },
  processing: {
    batchSize: 50,
    maxConcurrency: 5,
    dedupEnabled: true,
    qualityThreshold: 0.7,
    retryAttempts: 3
  },
  realtime: {
    enabled: true,
    updateIntervalMs: 5000
  },
  cache: {
    enabled: true,
    ttlSeconds: 300,
    strategy: 'memory'
  },
  monitoring: {
    enabled: true,
    healthCheckIntervalMs: 60000
  }
})