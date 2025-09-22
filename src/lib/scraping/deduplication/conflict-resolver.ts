import { Event } from '@/types'
import {
  ConflictResolution,
  ConflictStrategy,
  FieldResolution,
  DedupConfig
} from './types'

interface ConflictRule {
  field: string
  strategy: ConflictStrategy
  priority: number
  conditions?: {
    sourcePreference?: string[]
    qualityThreshold?: number
    recencyWeight?: number
    completenessWeight?: number
  }
}

interface DataSource {
  name: string
  reliability: number
  lastUpdated: Date
  dataQuality: number
}

interface FieldValue {
  value: any
  source: DataSource
  confidence: number
  quality: number
  lastUpdated: Date
  metadata?: Record<string, any>
}

/**
 * Advanced conflict resolution system for handling data discrepancies
 * Implements intelligent strategies for resolving field-level conflicts
 */
export class ConflictResolver {
  private config: DedupConfig
  private conflictRules: Map<string, ConflictRule>
  private sourceRegistry: Map<string, DataSource>
  private resolutionHistory: Map<string, ConflictResolution[]>

  constructor(config: DedupConfig) {
    this.config = config
    this.conflictRules = this.initializeConflictRules()
    this.sourceRegistry = this.initializeSourceRegistry()
    this.resolutionHistory = new Map()
  }

  private initializeConflictRules(): Map<string, ConflictRule> {
    const rules = new Map<string, ConflictRule>()

    // Critical fields - prefer primary or highest quality
    rules.set('title', {
      field: 'title',
      strategy: 'highest_quality',
      priority: 10,
      conditions: {
        qualityThreshold: 0.8,
        completenessWeight: 0.7
      }
    })

    rules.set('start_time', {
      field: 'start_time',
      strategy: 'latest_wins',
      priority: 9,
      conditions: {
        recencyWeight: 0.9,
        sourcePreference: ['primary', 'ticketmaster', 'eventbrite']
      }
    })

    rules.set('venue_name', {
      field: 'venue_name',
      strategy: 'most_complete',
      priority: 8,
      conditions: {
        completenessWeight: 0.8,
        qualityThreshold: 0.7
      }
    })

    // Location fields - prefer coordinates over addresses
    rules.set('latitude', {
      field: 'latitude',
      strategy: 'highest_quality',
      priority: 9,
      conditions: {
        qualityThreshold: 0.9,
        sourcePreference: ['google_places', 'foursquare', 'primary']
      }
    })

    rules.set('longitude', {
      field: 'longitude',
      strategy: 'highest_quality',
      priority: 9,
      conditions: {
        qualityThreshold: 0.9,
        sourcePreference: ['google_places', 'foursquare', 'primary']
      }
    })

    // Pricing fields - prefer most complete range
    rules.set('price_min', {
      field: 'price_min',
      strategy: 'most_complete',
      priority: 7,
      conditions: {
        completenessWeight: 0.8
      }
    })

    rules.set('price_max', {
      field: 'price_max',
      strategy: 'most_complete',
      priority: 7,
      conditions: {
        completenessWeight: 0.8
      }
    })

    // URLs - prefer valid and complete URLs
    rules.set('website_url', {
      field: 'website_url',
      strategy: 'highest_quality',
      priority: 6,
      conditions: {
        qualityThreshold: 0.9
      }
    })

    rules.set('ticket_url', {
      field: 'ticket_url',
      strategy: 'highest_quality',
      priority: 8,
      conditions: {
        qualityThreshold: 0.9,
        sourcePreference: ['ticketmaster', 'eventbrite', 'primary']
      }
    })

    // Description - prefer most complete
    rules.set('description', {
      field: 'description',
      strategy: 'most_complete',
      priority: 6,
      conditions: {
        completenessWeight: 0.9,
        qualityThreshold: 0.6
      }
    })

    // Tags - always merge
    rules.set('tags', {
      field: 'tags',
      strategy: 'merge_values',
      priority: 5
    })

    // Status fields - prefer primary
    rules.set('status', {
      field: 'status',
      strategy: 'primary_wins',
      priority: 8
    })

    rules.set('is_featured', {
      field: 'is_featured',
      strategy: 'primary_wins',
      priority: 7
    })

    // Metrics - aggregate when possible
    rules.set('view_count', {
      field: 'view_count',
      strategy: 'merge_values',
      priority: 4
    })

    rules.set('hotness_score', {
      field: 'hotness_score',
      strategy: 'highest_quality',
      priority: 5
    })

    return rules
  }

  private initializeSourceRegistry(): Map<string, DataSource> {
    const sources = new Map<string, DataSource>()

    // Primary sources (user-submitted or manually curated)
    sources.set('primary', {
      name: 'primary',
      reliability: 0.95,
      lastUpdated: new Date(),
      dataQuality: 0.9
    })

    sources.set('manual', {
      name: 'manual',
      reliability: 0.98,
      lastUpdated: new Date(),
      dataQuality: 0.95
    })

    // External API sources
    sources.set('eventbrite', {
      name: 'eventbrite',
      reliability: 0.88,
      lastUpdated: new Date(),
      dataQuality: 0.85
    })

    sources.set('ticketmaster', {
      name: 'ticketmaster',
      reliability: 0.85,
      lastUpdated: new Date(),
      dataQuality: 0.82
    })

    sources.set('meetup', {
      name: 'meetup',
      reliability: 0.78,
      lastUpdated: new Date(),
      dataQuality: 0.75
    })

    sources.set('facebook', {
      name: 'facebook',
      reliability: 0.72,
      lastUpdated: new Date(),
      dataQuality: 0.70
    })

    // Venue/location sources
    sources.set('google_places', {
      name: 'google_places',
      reliability: 0.92,
      lastUpdated: new Date(),
      dataQuality: 0.90
    })

    sources.set('foursquare', {
      name: 'foursquare',
      reliability: 0.85,
      lastUpdated: new Date(),
      dataQuality: 0.80
    })

    sources.set('yelp', {
      name: 'yelp',
      reliability: 0.80,
      lastUpdated: new Date(),
      dataQuality: 0.78
    })

    return sources
  }

  /**
   * Resolve conflicts for a single field across multiple events
   */
  public resolveFieldConflict(
    fieldName: string,
    values: Array<{
      value: any
      event: Event
      source?: string
    }>
  ): ConflictResolution {
    const rule = this.conflictRules.get(fieldName) || this.getDefaultRule(fieldName)
    
    // Convert to FieldValue format
    const fieldValues: FieldValue[] = values.map(({ value, event, source }) => {
      const sourceName = source || this.inferSource(event)
      const sourceData = this.sourceRegistry.get(sourceName) || this.getDefaultSource()
      
      return {
        value,
        source: sourceData,
        confidence: this.calculateValueConfidence(value, fieldName, sourceData),
        quality: this.assessValueQuality(value, fieldName),
        lastUpdated: new Date(event.updated_at || event.created_at || Date.now()),
        metadata: {
          eventId: event.id,
          externalId: event.external_id
        }
      }
    }).filter(fv => fv.value !== null && fv.value !== undefined)

    if (fieldValues.length === 0) {
      return this.createEmptyResolution(fieldName, rule.strategy)
    }

    if (fieldValues.length === 1) {
      return this.createSingleValueResolution(fieldName, fieldValues[0], rule.strategy)
    }

    return this.resolveMultipleValues(fieldName, fieldValues, rule)
  }

  private getDefaultRule(fieldName: string): ConflictRule {
    return {
      field: fieldName,
      strategy: 'primary_wins',
      priority: 5
    }
  }

  private inferSource(event: Event): string {
    return event.source || event.provider || 'unknown'
  }

  private getDefaultSource(): DataSource {
    return {
      name: 'unknown',
      reliability: 0.5,
      lastUpdated: new Date(),
      dataQuality: 0.5
    }
  }

  private calculateValueConfidence(
    value: any,
    fieldName: string,
    source: DataSource
  ): number {
    let confidence = source.reliability
    
    // Adjust based on value quality
    const quality = this.assessValueQuality(value, fieldName)
    confidence = (confidence * 0.7) + (quality * 0.3)
    
    // Field-specific adjustments
    switch (fieldName) {
      case 'title':
        if (typeof value === 'string' && value.length > 5) confidence += 0.1
        break
      case 'latitude':
      case 'longitude':
        if (typeof value === 'number' && !isNaN(value)) confidence += 0.15
        break
      case 'start_time':
        if (this.isValidDate(value)) confidence += 0.1
        break
    }
    
    return Math.min(1.0, confidence)
  }

  private assessValueQuality(value: any, fieldName: string): number {
    if (value === null || value === undefined) return 0
    
    let quality = 0.5 // Base quality
    
    // Type-specific quality assessment
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed.length === 0) return 0
      
      quality += Math.min(0.3, trimmed.length / 100) // Length bonus
      
      // Field-specific string quality
      switch (fieldName) {
        case 'title':
          if (trimmed.length > 10) quality += 0.2
          if (!/^(test|sample|placeholder)/i.test(trimmed)) quality += 0.1
          break
        case 'description':
          if (trimmed.length > 50) quality += 0.2
          if (trimmed.split(' ').length > 10) quality += 0.1
          break
        case 'website_url':
        case 'ticket_url':
        case 'image_url':
          if (this.isValidUrl(value)) quality += 0.4
          break
      }
    }
    
    if (typeof value === 'number') {
      if (!isNaN(value)) quality += 0.3
      
      switch (fieldName) {
        case 'latitude':
          if (value >= -90 && value <= 90) quality += 0.2
          break
        case 'longitude':
          if (value >= -180 && value <= 180) quality += 0.2
          break
        case 'price':
        case 'price_min':
        case 'price_max':
          if (value >= 0) quality += 0.2
          break
      }
    }
    
    if (Array.isArray(value)) {
      quality += Math.min(0.3, value.length / 10)
    }
    
    return Math.min(1.0, quality)
  }

  private isValidDate(value: any): boolean {
    if (!value) return false
    const date = new Date(value)
    return !isNaN(date.getTime())
  }

  private isValidUrl(value: any): boolean {
    if (typeof value !== 'string') return false
    try {
      new URL(value)
      return true
    } catch {
      return false
    }
  }

  private createEmptyResolution(fieldName: string, strategy: ConflictStrategy): ConflictResolution {
    return {
      field: fieldName,
      values: [],
      resolvedValue: null,
      strategy,
      confidence: 0,
      needsManualReview: false
    }
  }

  private createSingleValueResolution(
    fieldName: string,
    fieldValue: FieldValue,
    strategy: ConflictStrategy
  ): ConflictResolution {
    return {
      field: fieldName,
      values: [{
        value: fieldValue.value,
        source: fieldValue.source.name,
        confidence: fieldValue.confidence,
        quality: fieldValue.quality,
        lastUpdated: fieldValue.lastUpdated
      }],
      resolvedValue: fieldValue.value,
      strategy,
      confidence: fieldValue.confidence,
      needsManualReview: fieldValue.confidence < 0.6
    }
  }

  private resolveMultipleValues(
    fieldName: string,
    fieldValues: FieldValue[],
    rule: ConflictRule
  ): ConflictResolution {
    let resolvedValue: any
    let confidence: number
    let needsManualReview = false
    
    const sortedValues = this.sortValuesByStrategy(fieldValues, rule)
    
    switch (rule.strategy) {
      case 'primary_wins':
        const primaryValue = this.findPrimaryValue(fieldValues)
        resolvedValue = primaryValue?.value || sortedValues[0].value
        confidence = primaryValue?.confidence || sortedValues[0].confidence
        break
        
      case 'latest_wins':
        const latestValue = this.findLatestValue(fieldValues)
        resolvedValue = latestValue.value
        confidence = latestValue.confidence
        break
        
      case 'most_complete':
        const mostComplete = this.findMostCompleteValue(fieldValues)
        resolvedValue = mostComplete.value
        confidence = mostComplete.confidence
        break
        
      case 'highest_quality':
        const highestQuality = this.findHighestQualityValue(fieldValues, rule)
        resolvedValue = highestQuality.value
        confidence = highestQuality.confidence
        break
        
      case 'merge_values':
        const mergeResult = this.mergeFieldValues(fieldValues, fieldName)
        resolvedValue = mergeResult.value
        confidence = mergeResult.confidence
        break
        
      case 'manual_review':
      default:
        resolvedValue = sortedValues[0].value
        confidence = 0.5
        needsManualReview = true
        break
    }
    
    // Check if manual review is needed
    if (!needsManualReview) {
      needsManualReview = this.shouldRequireManualReview(fieldValues, rule, confidence)
    }
    
    // Record resolution history
    this.recordResolution(fieldName, {
      field: fieldName,
      values: fieldValues.map(fv => ({
        value: fv.value,
        source: fv.source.name,
        confidence: fv.confidence,
        quality: fv.quality,
        lastUpdated: fv.lastUpdated
      })),
      resolvedValue,
      strategy: rule.strategy,
      confidence,
      needsManualReview
    })
    
    return {
      field: fieldName,
      values: fieldValues.map(fv => ({
        value: fv.value,
        source: fv.source.name,
        confidence: fv.confidence,
        quality: fv.quality,
        lastUpdated: fv.lastUpdated
      })),
      resolvedValue,
      strategy: rule.strategy,
      confidence,
      needsManualReview
    }
  }

  private sortValuesByStrategy(fieldValues: FieldValue[], rule: ConflictRule): FieldValue[] {
    switch (rule.strategy) {
      case 'latest_wins':
        return [...fieldValues].sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
      case 'highest_quality':
        return [...fieldValues].sort((a, b) => b.quality - a.quality)
      case 'most_complete':
        return [...fieldValues].sort((a, b) => this.getCompleteness(b.value) - this.getCompleteness(a.value))
      default:
        return [...fieldValues].sort((a, b) => b.confidence - a.confidence)
    }
  }

  private findPrimaryValue(fieldValues: FieldValue[]): FieldValue | null {
    return fieldValues.find(fv => fv.source.name === 'primary' || fv.source.name === 'manual') || null
  }

  private findLatestValue(fieldValues: FieldValue[]): FieldValue {
    return fieldValues.reduce((latest, current) => 
      current.lastUpdated > latest.lastUpdated ? current : latest
    )
  }

  private findMostCompleteValue(fieldValues: FieldValue[]): FieldValue {
    return fieldValues.reduce((best, current) => {
      const currentCompleteness = this.getCompleteness(current.value)
      const bestCompleteness = this.getCompleteness(best.value)
      return currentCompleteness > bestCompleteness ? current : best
    })
  }

  private findHighestQualityValue(fieldValues: FieldValue[], rule: ConflictRule): FieldValue {
    // Apply source preferences if specified
    if (rule.conditions?.sourcePreference) {
      for (const preferredSource of rule.conditions.sourcePreference) {
        const preferred = fieldValues.find(fv => fv.source.name === preferredSource)
        if (preferred && preferred.quality >= (rule.conditions.qualityThreshold || 0.7)) {
          return preferred
        }
      }
    }
    
    // Fall back to highest quality
    return fieldValues.reduce((best, current) => 
      current.quality > best.quality ? current : best
    )
  }

  private mergeFieldValues(fieldValues: FieldValue[], fieldName: string): { value: any; confidence: number } {
    const values = fieldValues.map(fv => fv.value)
    const avgConfidence = fieldValues.reduce((sum, fv) => sum + fv.confidence, 0) / fieldValues.length
    
    let mergedValue: any
    
    switch (fieldName) {
      case 'tags':
        mergedValue = this.mergeTags(values)
        break
      case 'view_count':
        mergedValue = values.reduce((sum, val) => sum + (Number(val) || 0), 0)
        break
      case 'description':
        mergedValue = this.mergeDescriptions(values)
        break
      default:
        // For most fields, use the highest quality value
        const bestValue = fieldValues.reduce((best, current) => 
          current.quality > best.quality ? current : best
        )
        mergedValue = bestValue.value
        break
    }
    
    return {
      value: mergedValue,
      confidence: Math.min(avgConfidence, 0.9) // Cap confidence for merged values
    }
  }

  private mergeTags(tagArrays: any[]): string[] {
    const allTags = new Set<string>()
    
    tagArrays.forEach(tags => {
      if (Array.isArray(tags)) {
        tags.forEach(tag => {
          if (typeof tag === 'string' && tag.trim()) {
            allTags.add(tag.trim().toLowerCase())
          }
        })
      }
    })
    
    return Array.from(allTags)
  }

  private mergeDescriptions(descriptions: string[]): string {
    // Find the most comprehensive description
    const stringDescriptions = descriptions.filter(d => typeof d === 'string' && d.trim())
    if (stringDescriptions.length === 0) return ''
    
    return stringDescriptions.reduce((best, current) => 
      current.length > best.length ? current : best
    )
  }

  private getCompleteness(value: any): number {
    if (!value) return 0
    
    if (typeof value === 'string') {
      return Math.min(1, value.trim().length / 100)
    }
    
    if (Array.isArray(value)) {
      return Math.min(1, value.length / 10)
    }
    
    if (typeof value === 'object') {
      const keys = Object.keys(value).filter(k => value[k] !== null && value[k] !== undefined)
      return Math.min(1, keys.length / 5)
    }
    
    return 0.8 // Non-null primitive value
  }

  private shouldRequireManualReview(
    fieldValues: FieldValue[],
    rule: ConflictRule,
    confidence: number
  ): boolean {
    // Low confidence threshold
    if (confidence < 0.6) return true
    
    // High priority fields with conflicting values
    if (rule.priority >= 8 && fieldValues.length > 2) {
      const qualityVariance = this.calculateQualityVariance(fieldValues)
      if (qualityVariance > 0.3) return true
    }
    
    // Conflicting high-quality values
    const highQualityValues = fieldValues.filter(fv => fv.quality > 0.8)
    if (highQualityValues.length > 1) {
      const uniqueValues = new Set(highQualityValues.map(fv => JSON.stringify(fv.value)))
      if (uniqueValues.size > 1) return true
    }
    
    return false
  }

  private calculateQualityVariance(fieldValues: FieldValue[]): number {
    const qualities = fieldValues.map(fv => fv.quality)
    const mean = qualities.reduce((sum, q) => sum + q, 0) / qualities.length
    const variance = qualities.reduce((sum, q) => sum + Math.pow(q - mean, 2), 0) / qualities.length
    return Math.sqrt(variance)
  }

  private recordResolution(fieldName: string, resolution: ConflictResolution): void {
    if (!this.resolutionHistory.has(fieldName)) {
      this.resolutionHistory.set(fieldName, [])
    }
    
    const history = this.resolutionHistory.get(fieldName)!
    history.push(resolution)
    
    // Keep only last 100 resolutions per field
    if (history.length > 100) {
      history.splice(0, history.length - 100)
    }
  }

  /**
   * Resolve conflicts for multiple fields in a batch
   */
  public resolveBatchConflicts(
    events: Event[],
    fieldNames: string[]
  ): Map<string, ConflictResolution> {
    const resolutions = new Map<string, ConflictResolution>()
    
    for (const fieldName of fieldNames) {
      const values = events.map(event => ({
        value: event[fieldName as keyof Event],
        event,
        source: event.source || event.provider
      })).filter(v => v.value !== null && v.value !== undefined)
      
      if (values.length > 1) {
        const resolution = this.resolveFieldConflict(fieldName, values)
        resolutions.set(fieldName, resolution)
      }
    }
    
    return resolutions
  }

  /**
   * Get resolution statistics
   */
  public getResolutionStats(): {
    totalResolutions: number
    strategyCounts: Record<ConflictStrategy, number>
    manualReviewRate: number
    avgConfidence: number
    fieldStats: Record<string, { count: number; avgConfidence: number }>
  } {
    const allResolutions = Array.from(this.resolutionHistory.values()).flat()
    const totalResolutions = allResolutions.length
    
    if (totalResolutions === 0) {
      return {
        totalResolutions: 0,
        strategyCounts: {} as Record<ConflictStrategy, number>,
        manualReviewRate: 0,
        avgConfidence: 0,
        fieldStats: {}
      }
    }
    
    // Strategy counts
    const strategyCounts = allResolutions.reduce((counts, resolution) => {
      counts[resolution.strategy] = (counts[resolution.strategy] || 0) + 1
      return counts
    }, {} as Record<ConflictStrategy, number>)
    
    // Manual review rate
    const manualReviews = allResolutions.filter(r => r.needsManualReview).length
    const manualReviewRate = manualReviews / totalResolutions
    
    // Average confidence
    const avgConfidence = allResolutions.reduce((sum, r) => sum + r.confidence, 0) / totalResolutions
    
    // Field-specific stats
    const fieldStats: Record<string, { count: number; avgConfidence: number }> = {}
    
    this.resolutionHistory.forEach((resolutions, fieldName) => {
      const count = resolutions.length
      const avgFieldConfidence = resolutions.reduce((sum, r) => sum + r.confidence, 0) / count
      fieldStats[fieldName] = { count, avgConfidence: avgFieldConfidence }
    })
    
    return {
      totalResolutions,
      strategyCounts,
      manualReviewRate,
      avgConfidence,
      fieldStats
    }
  }

  /**
   * Update conflict rule
   */
  public updateConflictRule(fieldName: string, rule: Partial<ConflictRule>): void {
    const existingRule = this.conflictRules.get(fieldName) || this.getDefaultRule(fieldName)
    this.conflictRules.set(fieldName, { ...existingRule, ...rule })
  }

  /**
   * Register new data source
   */
  public registerDataSource(name: string, source: DataSource): void {
    this.sourceRegistry.set(name, source)
  }

  /**
   * Update data source properties
   */
  public updateDataSource(name: string, updates: Partial<DataSource>): void {
    const existing = this.sourceRegistry.get(name)
    if (existing) {
      this.sourceRegistry.set(name, { ...existing, ...updates })
    }
  }

  /**
   * Get conflict rules
   */
  public getConflictRules(): Map<string, ConflictRule> {
    return new Map(this.conflictRules)
  }

  /**
   * Get data sources
   */
  public getDataSources(): Map<string, DataSource> {
    return new Map(this.sourceRegistry)
  }

  /**
   * Clear resolution history
   */
  public clearHistory(): void {
    this.resolutionHistory.clear()
  }
}
