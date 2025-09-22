import { Event } from '@/types'
import {
  MergeDecision,
  FieldResolution,
  MergeStrategy,
  ConflictResolution,
  ConflictStrategy,
  FieldChange,
  DedupConfig
} from './types'

interface MergeContext {
  primaryEvent: Event
  duplicateEvents: Event[]
  strategy: MergeStrategy
  config: DedupConfig
  timestamp: Date
}

interface FieldMergeRule {
  strategy: ConflictStrategy
  weight: number
  validator?: (value: any) => boolean
  transformer?: (value: any) => any
}

/**
 * Advanced event merging system for combining duplicate events
 * Handles data conflicts and preserves data quality
 */
export class EventMerger {
  private config: DedupConfig
  private fieldRules: Map<string, FieldMergeRule>

  constructor(config: DedupConfig) {
    this.config = config
    this.fieldRules = this.initializeFieldRules()
  }

  private initializeFieldRules(): Map<string, FieldMergeRule> {
    const rules = new Map<string, FieldMergeRule>()

    // Core identification fields - prefer primary
    rules.set('id', { strategy: 'primary_wins', weight: 1.0 })
    rules.set('external_id', { strategy: 'primary_wins', weight: 1.0 })
    rules.set('source', { strategy: 'primary_wins', weight: 1.0 })

    // Title - prefer most complete and accurate
    rules.set('title', {
      strategy: 'most_complete',
      weight: 0.9,
      validator: (value) => typeof value === 'string' && value.length > 0
    })

    // Description - merge or prefer most complete
    rules.set('description', {
      strategy: 'most_complete',
      weight: 0.8,
      transformer: (value) => value?.trim()
    })

    // Venue information - prefer most complete
    rules.set('venue_name', { strategy: 'most_complete', weight: 0.85 })
    rules.set('venue_id', { strategy: 'most_complete', weight: 0.85 })
    
    // Location - prefer coordinates over addresses
    rules.set('latitude', {
      strategy: 'highest_quality',
      weight: 0.9,
      validator: (value) => typeof value === 'number' && value >= -90 && value <= 90
    })
    rules.set('longitude', {
      strategy: 'highest_quality',
      weight: 0.9,
      validator: (value) => typeof value === 'number' && value >= -180 && value <= 180
    })
    
    // Date/time - prefer most recent or most precise
    rules.set('start_time', { strategy: 'latest_wins', weight: 0.95 })
    rules.set('end_time', { strategy: 'latest_wins', weight: 0.85 })
    rules.set('date', { strategy: 'latest_wins', weight: 0.9 })
    rules.set('event_date', { strategy: 'latest_wins', weight: 0.9 })
    rules.set('timezone', { strategy: 'most_complete', weight: 0.7 })

    // Pricing - prefer most complete range
    rules.set('price', { strategy: 'most_complete', weight: 0.8 })
    rules.set('price_min', { strategy: 'most_complete', weight: 0.8 })
    rules.set('price_max', { strategy: 'most_complete', weight: 0.8 })
    rules.set('price_currency', { strategy: 'most_complete', weight: 0.7 })
    rules.set('is_free', { strategy: 'highest_quality', weight: 0.8 })

    // URLs and media - prefer most complete and valid
    rules.set('website_url', {
      strategy: 'highest_quality',
      weight: 0.8,
      validator: (value) => this.isValidUrl(value)
    })
    rules.set('ticket_url', {
      strategy: 'highest_quality',
      weight: 0.9,
      validator: (value) => this.isValidUrl(value)
    })
    rules.set('image_url', {
      strategy: 'highest_quality',
      weight: 0.7,
      validator: (value) => this.isValidUrl(value)
    })
    rules.set('video_url', {
      strategy: 'highest_quality',
      weight: 0.7,
      validator: (value) => this.isValidUrl(value)
    })

    // Categorization - prefer primary or most specific
    rules.set('category', { strategy: 'primary_wins', weight: 0.8 })
    rules.set('subcategory', { strategy: 'most_complete', weight: 0.7 })
    rules.set('tags', { strategy: 'merge_values', weight: 0.6 })

    // Status and flags - prefer primary or most recent
    rules.set('status', { strategy: 'primary_wins', weight: 0.9 })
    rules.set('is_featured', { strategy: 'highest_quality', weight: 0.7 })

    // Metrics - aggregate or prefer highest
    rules.set('view_count', { strategy: 'merge_values', weight: 0.5 })
    rules.set('hotness_score', { strategy: 'highest_quality', weight: 0.6 })

    // Timestamps - prefer latest
    rules.set('created_at', { strategy: 'primary_wins', weight: 1.0 })
    rules.set('updated_at', { strategy: 'latest_wins', weight: 0.9 })
    rules.set('last_updated', { strategy: 'latest_wins', weight: 0.9 })

    return rules
  }

  private isValidUrl(url: any): boolean {
    if (typeof url !== 'string') return false
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  /**
   * Create merge decision for duplicate events
   */
  public createMergeDecision(
    primaryEvent: Event,
    duplicateEvents: Event[],
    strategy: MergeStrategy = 'enhance_primary'
  ): MergeDecision {
    const context: MergeContext = {
      primaryEvent,
      duplicateEvents,
      strategy,
      config: this.config,
      timestamp: new Date()
    }

    const fieldResolutions = this.resolveAllFields(context)
    const preview = this.generateMergedEvent(context, fieldResolutions)
    const confidence = this.calculateMergeConfidence(fieldResolutions)
    const reasons = this.generateMergeReasons(fieldResolutions)

    return {
      primaryEventId: primaryEvent.id,
      duplicateEventIds: duplicateEvents.map(e => e.id),
      strategy,
      confidence,
      reasons,
      fieldResolutions,
      preview
    }
  }

  private resolveAllFields(context: MergeContext): FieldResolution[] {
    const resolutions: FieldResolution[] = []
    const allFields = this.collectAllFields([context.primaryEvent, ...context.duplicateEvents])

    for (const field of allFields) {
      const resolution = this.resolveField(field, context)
      if (resolution) {
        resolutions.push(resolution)
      }
    }

    return resolutions
  }

  private collectAllFields(events: Event[]): string[] {
    const fields = new Set<string>()
    
    events.forEach(event => {
      Object.keys(event).forEach(key => fields.add(key))
    })

    return Array.from(fields)
  }

  private resolveField(fieldName: string, context: MergeContext): FieldResolution | null {
    const primaryValue = context.primaryEvent[fieldName as keyof Event]
    const duplicateValues = context.duplicateEvents.map(e => e[fieldName as keyof Event])
    
    // Skip if no values present
    if (!primaryValue && duplicateValues.every(v => !v)) {
      return null
    }

    const rule = this.fieldRules.get(fieldName) || { strategy: 'primary_wins', weight: 0.5 }
    const conflictResolution = this.resolveConflict({
      field: fieldName,
      values: [
        {
          value: primaryValue,
          source: 'primary',
          confidence: 1.0,
          quality: this.assessFieldQuality(primaryValue, fieldName),
          lastUpdated: new Date(context.primaryEvent.updated_at || context.primaryEvent.created_at || Date.now())
        },
        ...duplicateValues.map((value, index) => ({
          value,
          source: `duplicate_${index}`,
          confidence: 0.8,
          quality: this.assessFieldQuality(value, fieldName),
          lastUpdated: new Date(context.duplicateEvents[index].updated_at || context.duplicateEvents[index].created_at || Date.now())
        }))
      ].filter(v => v.value !== null && v.value !== undefined),
      resolvedValue: null,
      strategy: rule.strategy,
      confidence: 0,
      needsManualReview: false
    })

    const selectedValue = this.applyResolutionStrategy(conflictResolution, rule)
    const confidence = this.calculateFieldConfidence(conflictResolution, rule)

    return {
      field: fieldName,
      primaryValue,
      duplicateValues,
      selectedValue,
      strategy: conflictResolution.strategy,
      confidence
    }
  }

  private assessFieldQuality(value: any, fieldName: string): number {
    if (!value) return 0

    let quality = 0.5 // Base quality

    // Length-based quality for strings
    if (typeof value === 'string') {
      const length = value.trim().length
      if (length === 0) return 0
      if (length > 10) quality += 0.2
      if (length > 50) quality += 0.2
      if (length > 200) quality += 0.1
    }

    // Type-specific quality checks
    switch (fieldName) {
      case 'title':
        if (typeof value === 'string' && value.length > 5) quality += 0.3
        break
      case 'description':
        if (typeof value === 'string' && value.length > 20) quality += 0.3
        break
      case 'latitude':
      case 'longitude':
        if (typeof value === 'number' && !isNaN(value)) quality += 0.4
        break
      case 'price':
      case 'price_min':
      case 'price_max':
        if (typeof value === 'number' && value >= 0) quality += 0.4
        break
      case 'website_url':
      case 'ticket_url':
      case 'image_url':
        if (this.isValidUrl(value)) quality += 0.4
        break
    }

    const rule = this.fieldRules.get(fieldName)
    if (rule?.validator && rule.validator(value)) {
      quality += 0.2
    }

    return Math.min(1.0, quality)
  }

  private resolveConflict(conflict: ConflictResolution): ConflictResolution {
    const { strategy, values } = conflict
    let resolvedValue: any
    let confidence: number
    let needsManualReview = false

    switch (strategy) {
      case 'primary_wins':
        resolvedValue = values.find(v => v.source === 'primary')?.value
        confidence = 0.9
        break

      case 'latest_wins':
        const latestValue = values.reduce((latest, current) => 
          current.lastUpdated > latest.lastUpdated ? current : latest
        )
        resolvedValue = latestValue.value
        confidence = 0.8
        break

      case 'most_complete':
        const mostComplete = values.reduce((best, current) => {
          const currentCompleteness = this.assessCompleteness(current.value)
          const bestCompleteness = this.assessCompleteness(best.value)
          return currentCompleteness > bestCompleteness ? current : best
        })
        resolvedValue = mostComplete.value
        confidence = 0.85
        break

      case 'highest_quality':
        const highestQuality = values.reduce((best, current) => 
          current.quality > best.quality ? current : best
        )
        resolvedValue = highestQuality.value
        confidence = highestQuality.quality
        break

      case 'merge_values':
        resolvedValue = this.mergeValues(values.map(v => v.value), conflict.field)
        confidence = 0.7
        break

      case 'manual_review':
      default:
        resolvedValue = values.find(v => v.source === 'primary')?.value
        confidence = 0.5
        needsManualReview = true
        break
    }

    return {
      ...conflict,
      resolvedValue,
      confidence,
      needsManualReview
    }
  }

  private assessCompleteness(value: any): number {
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

  private mergeValues(values: any[], fieldName: string): any {
    const nonNullValues = values.filter(v => v !== null && v !== undefined)
    
    if (nonNullValues.length === 0) return null
    if (nonNullValues.length === 1) return nonNullValues[0]

    // Field-specific merging
    switch (fieldName) {
      case 'tags':
        return this.mergeTags(nonNullValues)
      
      case 'view_count':
        return nonNullValues.reduce((sum, val) => sum + (Number(val) || 0), 0)
      
      case 'description':
        return this.mergeDescriptions(nonNullValues)
      
      default:
        // For most fields, return the longest/most complete value
        return nonNullValues.reduce((best, current) => {
          if (typeof current === 'string' && typeof best === 'string') {
            return current.length > best.length ? current : best
          }
          return this.assessCompleteness(current) > this.assessCompleteness(best) ? current : best
        })
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
    const longest = descriptions.reduce((best, current) => 
      current.length > best.length ? current : best
    )
    
    // TODO: Could implement smart merging to combine unique information
    return longest
  }

  private applyResolutionStrategy(resolution: ConflictResolution, rule: FieldMergeRule): any {
    let value = resolution.resolvedValue
    
    // Apply transformer if specified
    if (rule.transformer && value) {
      try {
        value = rule.transformer(value)
      } catch (error) {
        console.warn(`Transform failed for field ${resolution.field}:`, error)
      }
    }
    
    return value
  }

  private calculateFieldConfidence(resolution: ConflictResolution, rule: FieldMergeRule): number {
    let confidence = resolution.confidence
    
    // Apply rule weight
    confidence *= rule.weight
    
    // Reduce confidence if validation fails
    if (rule.validator && !rule.validator(resolution.resolvedValue)) {
      confidence *= 0.5
    }
    
    // Reduce confidence for manual review needs
    if (resolution.needsManualReview) {
      confidence *= 0.6
    }
    
    return Math.max(0, Math.min(1, confidence))
  }

  private generateMergedEvent(context: MergeContext, resolutions: FieldResolution[]): Event {
    const mergedEvent = { ...context.primaryEvent }
    
    resolutions.forEach(resolution => {
      mergedEvent[resolution.field as keyof Event] = resolution.selectedValue
    })
    
    // Ensure timestamps are updated
    mergedEvent.updated_at = context.timestamp.toISOString()
    
    return mergedEvent
  }

  private calculateMergeConfidence(resolutions: FieldResolution[]): number {
    if (resolutions.length === 0) return 0
    
    const totalConfidence = resolutions.reduce((sum, res) => sum + res.confidence, 0)
    const averageConfidence = totalConfidence / resolutions.length
    
    // Weight by field importance
    const importantFields = ['title', 'start_time', 'venue_name', 'location']
    const importantResolutions = resolutions.filter(r => importantFields.includes(r.field))
    
    if (importantResolutions.length > 0) {
      const importantConfidence = importantResolutions.reduce((sum, res) => sum + res.confidence, 0) / importantResolutions.length
      return (averageConfidence * 0.6) + (importantConfidence * 0.4)
    }
    
    return averageConfidence
  }

  private generateMergeReasons(resolutions: FieldResolution[]): string[] {
    const reasons: string[] = []
    
    const strategyCounts = resolutions.reduce((counts, res) => {
      counts[res.strategy] = (counts[res.strategy] || 0) + 1
      return counts
    }, {} as Record<string, number>)
    
    Object.entries(strategyCounts).forEach(([strategy, count]) => {
      switch (strategy) {
        case 'primary_wins':
          reasons.push(`Kept ${count} fields from primary event`)
          break
        case 'most_complete':
          reasons.push(`Enhanced ${count} fields with more complete data`)
          break
        case 'latest_wins':
          reasons.push(`Updated ${count} fields with latest information`)
          break
        case 'highest_quality':
          reasons.push(`Improved ${count} fields with higher quality data`)
          break
        case 'merge_values':
          reasons.push(`Combined ${count} fields from multiple sources`)
          break
      }
    })
    
    const highConfidenceFields = resolutions.filter(r => r.confidence > 0.8).length
    if (highConfidenceFields > 0) {
      reasons.push(`${highConfidenceFields} high-confidence field merges`)
    }
    
    return reasons
  }

  /**
   * Execute merge decision
   */
  public async executeMerge(decision: MergeDecision): Promise<{
    mergedEvent: Event
    changes: FieldChange[]
    success: boolean
    errors: string[]
  }> {
    const errors: string[] = []
    const changes: FieldChange[] = []
    
    try {
      // Create the merged event
      const mergedEvent = { ...decision.preview }
      
      // Track changes
      decision.fieldResolutions.forEach(resolution => {
        const originalValue = mergedEvent[resolution.field as keyof Event]
        if (originalValue !== resolution.selectedValue) {
          changes.push({
            field: resolution.field,
            beforeValue: originalValue,
            afterValue: resolution.selectedValue,
            source: this.getChangeSource(resolution.strategy),
            confidence: resolution.confidence
          })
        }
      })
      
      return {
        mergedEvent,
        changes,
        success: true,
        errors
      }
    } catch (error) {
      errors.push(`Merge execution failed: ${error.message}`)
      return {
        mergedEvent: decision.preview,
        changes,
        success: false,
        errors
      }
    }
  }

  private getChangeSource(strategy: string): 'primary' | 'duplicate' | 'merged' | 'enhanced' {
    switch (strategy) {
      case 'primary_wins': return 'primary'
      case 'latest_wins':
      case 'most_complete':
      case 'highest_quality': return 'duplicate'
      case 'merge_values': return 'merged'
      default: return 'enhanced'
    }
  }

  /**
   * Update field rules
   */
  public updateFieldRule(fieldName: string, rule: Partial<FieldMergeRule>): void {
    const existingRule = this.fieldRules.get(fieldName) || { strategy: 'primary_wins', weight: 0.5 }
    this.fieldRules.set(fieldName, { ...existingRule, ...rule })
  }

  /**
   * Get field rules
   */
  public getFieldRules(): Map<string, FieldMergeRule> {
    return new Map(this.fieldRules)
  }

  /**
   * Validate merge decision
   */
  public validateMergeDecision(decision: MergeDecision): {
    isValid: boolean
    warnings: string[]
    errors: string[]
  } {
    const warnings: string[] = []
    const errors: string[] = []
    
    // Check confidence threshold
    if (decision.confidence < this.config.quality.minimumQualityScore) {
      warnings.push(`Merge confidence (${(decision.confidence * 100).toFixed(1)}%) below minimum threshold`)
    }
    
    // Check for manual review requirements
    const manualReviewFields = decision.fieldResolutions.filter(r => 
      r.strategy === 'manual_review' || r.confidence < 0.5
    )
    
    if (manualReviewFields.length > 0 && this.config.quality.requireManualReview) {
      warnings.push(`${manualReviewFields.length} fields require manual review`)
    }
    
    // Validate required fields
    const requiredFields = ['title', 'start_time', 'category']
    const missingRequired = requiredFields.filter(field => 
      !decision.preview[field as keyof Event]
    )
    
    if (missingRequired.length > 0) {
      errors.push(`Missing required fields after merge: ${missingRequired.join(', ')}`)
    }
    
    return {
      isValid: errors.length === 0,
      warnings,
      errors
    }
  }
}
