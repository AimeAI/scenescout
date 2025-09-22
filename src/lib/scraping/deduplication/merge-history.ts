import { Event } from '@/types'
import {
  MergeHistory,
  MergeDecision,
  FieldChange,
  MergeStrategy,
  PerformanceMetrics,
  QualityMetrics
} from './types'

interface HistoryFilter {
  dateRange?: { start: Date; end: Date }
  strategy?: MergeStrategy
  primaryEventId?: string
  minConfidence?: number
  mergedBy?: string
}

interface AnalyticsData {
  mergeFrequency: Record<string, number>
  strategyEffectiveness: Record<MergeStrategy, {
    count: number
    avgConfidence: number
    avgQualityImprovement: number
    successRate: number
  }>
  fieldImpactAnalysis: Record<string, {
    changeFrequency: number
    qualityImprovement: number
    conflictRate: number
  }>
  temporalTrends: Array<{
    date: string
    mergeCount: number
    avgConfidence: number
    qualityScore: number
  }>
}

/**
 * Comprehensive merge history tracking and analytics system
 * Provides audit trails, performance insights, and quality metrics
 */
export class MergeHistoryTracker {
  private mergeHistory: Map<string, MergeHistory>
  private performanceMetrics: PerformanceMetrics[]
  private qualityMetrics: QualityMetrics[]
  private eventRelationships: Map<string, string[]> // eventId -> merged event IDs
  private reverseIndex: Map<string, string> // duplicate eventId -> primary eventId

  constructor() {
    this.mergeHistory = new Map()
    this.performanceMetrics = []
    this.qualityMetrics = []
    this.eventRelationships = new Map()
    this.reverseIndex = new Map()
  }

  /**
   * Record a completed merge operation
   */
  public recordMerge(
    decision: MergeDecision,
    beforeEvent: Event,
    afterEvent: Event,
    mergedBy: string,
    processingTime: number,
    qualityImprovement: number
  ): string {
    const historyId = this.generateHistoryId()
    
    const fieldChanges: FieldChange[] = decision.fieldResolutions.map(resolution => ({
      field: resolution.field,
      beforeValue: beforeEvent[resolution.field as keyof Event],
      afterValue: resolution.selectedValue,
      source: this.getChangeSource(resolution.strategy),
      confidence: resolution.confidence
    }))

    const mergeRecord: MergeHistory = {
      id: historyId,
      primaryEventId: decision.primaryEventId,
      duplicateEventIds: decision.duplicateEventIds,
      mergedAt: new Date(),
      mergedBy,
      strategy: decision.strategy,
      confidence: decision.confidence,
      fieldChanges,
      metadata: {
        beforeEvent,
        afterEvent,
        processingTime,
        qualityImprovement
      }
    }

    this.mergeHistory.set(historyId, mergeRecord)
    this.updateRelationships(decision)
    this.updateMetrics(mergeRecord)
    
    return historyId
  }

  private generateHistoryId(): string {
    return `merge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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

  private updateRelationships(decision: MergeDecision): void {
    // Track which events were merged into the primary
    const existing = this.eventRelationships.get(decision.primaryEventId) || []
    this.eventRelationships.set(
      decision.primaryEventId, 
      [...existing, ...decision.duplicateEventIds]
    )

    // Create reverse index for quick lookups
    decision.duplicateEventIds.forEach(duplicateId => {
      this.reverseIndex.set(duplicateId, decision.primaryEventId)
    })
  }

  private updateMetrics(mergeRecord: MergeHistory): void {
    // Update performance metrics
    const perfMetric: PerformanceMetrics = {
      processingTime: mergeRecord.metadata.processingTime,
      eventsProcessed: 1 + mergeRecord.duplicateEventIds.length,
      duplicatesFound: mergeRecord.duplicateEventIds.length,
      mergesCompleted: 1,
      qualityImprovement: mergeRecord.metadata.qualityImprovement,
      algorithmsUsed: [mergeRecord.strategy]
    }
    
    this.performanceMetrics.push(perfMetric)
    
    // Keep only recent metrics (last 1000 operations)
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics.shift()
    }
  }

  /**
   * Get merge history for a specific event
   */
  public getEventHistory(eventId: string): MergeHistory[] {
    const history: MergeHistory[] = []
    
    // Check if this event was a primary in any merges
    const relatedIds = this.eventRelationships.get(eventId) || []
    if (relatedIds.length > 0) {
      const primaryMerges = Array.from(this.mergeHistory.values())
        .filter(merge => merge.primaryEventId === eventId)
      history.push(...primaryMerges)
    }
    
    // Check if this event was a duplicate in any merges
    const primaryEventId = this.reverseIndex.get(eventId)
    if (primaryEventId) {
      const duplicateMerges = Array.from(this.mergeHistory.values())
        .filter(merge => merge.duplicateEventIds.includes(eventId))
      history.push(...duplicateMerges)
    }
    
    return history.sort((a, b) => b.mergedAt.getTime() - a.mergedAt.getTime())
  }

  /**
   * Get detailed merge analytics
   */
  public getAnalytics(filter?: HistoryFilter): AnalyticsData {
    const filteredHistory = this.filterHistory(filter)
    
    return {
      mergeFrequency: this.calculateMergeFrequency(filteredHistory),
      strategyEffectiveness: this.analyzeStrategyEffectiveness(filteredHistory),
      fieldImpactAnalysis: this.analyzeFieldImpact(filteredHistory),
      temporalTrends: this.calculateTemporalTrends(filteredHistory)
    }
  }

  private filterHistory(filter?: HistoryFilter): MergeHistory[] {
    let history = Array.from(this.mergeHistory.values())
    
    if (!filter) return history
    
    if (filter.dateRange) {
      history = history.filter(h => 
        h.mergedAt >= filter.dateRange!.start && 
        h.mergedAt <= filter.dateRange!.end
      )
    }
    
    if (filter.strategy) {
      history = history.filter(h => h.strategy === filter.strategy)
    }
    
    if (filter.primaryEventId) {
      history = history.filter(h => h.primaryEventId === filter.primaryEventId)
    }
    
    if (filter.minConfidence) {
      history = history.filter(h => h.confidence >= filter.minConfidence!)
    }
    
    if (filter.mergedBy) {
      history = history.filter(h => h.mergedBy === filter.mergedBy)
    }
    
    return history
  }

  private calculateMergeFrequency(history: MergeHistory[]): Record<string, number> {
    const frequency: Record<string, number> = {}
    
    history.forEach(merge => {
      const dateKey = merge.mergedAt.toISOString().split('T')[0]
      frequency[dateKey] = (frequency[dateKey] || 0) + 1
    })
    
    return frequency
  }

  private analyzeStrategyEffectiveness(history: MergeHistory[]): Record<MergeStrategy, {
    count: number
    avgConfidence: number
    avgQualityImprovement: number
    successRate: number
  }> {
    const effectiveness: Record<string, {
      count: number
      totalConfidence: number
      totalQualityImprovement: number
      successes: number
    }> = {}
    
    history.forEach(merge => {
      const strategy = merge.strategy
      
      if (!effectiveness[strategy]) {
        effectiveness[strategy] = {
          count: 0,
          totalConfidence: 0,
          totalQualityImprovement: 0,
          successes: 0
        }
      }
      
      const stats = effectiveness[strategy]
      stats.count++
      stats.totalConfidence += merge.confidence
      stats.totalQualityImprovement += merge.metadata.qualityImprovement
      
      if (merge.confidence > 0.8) {
        stats.successes++
      }
    })
    
    const result: Record<string, any> = {}
    
    Object.entries(effectiveness).forEach(([strategy, stats]) => {
      result[strategy] = {
        count: stats.count,
        avgConfidence: stats.totalConfidence / stats.count,
        avgQualityImprovement: stats.totalQualityImprovement / stats.count,
        successRate: stats.successes / stats.count
      }
    })
    
    return result as Record<MergeStrategy, any>
  }

  private analyzeFieldImpact(history: MergeHistory[]): Record<string, {
    changeFrequency: number
    qualityImprovement: number
    conflictRate: number
  }> {
    const fieldStats: Record<string, {
      totalChanges: number
      qualityImprovements: number
      conflicts: number
      totalMerges: number
    }> = {}
    
    history.forEach(merge => {
      merge.fieldChanges.forEach(change => {
        const field = change.field
        
        if (!fieldStats[field]) {
          fieldStats[field] = {
            totalChanges: 0,
            qualityImprovements: 0,
            conflicts: 0,
            totalMerges: 0
          }
        }
        
        const stats = fieldStats[field]
        stats.totalMerges++
        
        if (change.beforeValue !== change.afterValue) {
          stats.totalChanges++
          
          if (change.confidence > 0.7) {
            stats.qualityImprovements++
          }
          
          if (change.confidence < 0.6) {
            stats.conflicts++
          }
        }
      })
    })
    
    const result: Record<string, any> = {}
    
    Object.entries(fieldStats).forEach(([field, stats]) => {
      result[field] = {
        changeFrequency: stats.totalChanges / stats.totalMerges,
        qualityImprovement: stats.qualityImprovements / Math.max(1, stats.totalChanges),
        conflictRate: stats.conflicts / Math.max(1, stats.totalChanges)
      }
    })
    
    return result
  }

  private calculateTemporalTrends(history: MergeHistory[]): Array<{
    date: string
    mergeCount: number
    avgConfidence: number
    qualityScore: number
  }> {
    const dailyStats: Record<string, {
      count: number
      totalConfidence: number
      totalQuality: number
    }> = {}
    
    history.forEach(merge => {
      const dateKey = merge.mergedAt.toISOString().split('T')[0]
      
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = {
          count: 0,
          totalConfidence: 0,
          totalQuality: 0
        }
      }
      
      const stats = dailyStats[dateKey]
      stats.count++
      stats.totalConfidence += merge.confidence
      stats.totalQuality += merge.metadata.qualityImprovement
    })
    
    return Object.entries(dailyStats)
      .map(([date, stats]) => ({
        date,
        mergeCount: stats.count,
        avgConfidence: stats.totalConfidence / stats.count,
        qualityScore: stats.totalQuality / stats.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  /**
   * Find potential merge quality issues
   */
  public identifyQualityIssues(): Array<{
    type: 'low_confidence' | 'quality_degradation' | 'frequent_conflicts' | 'strategy_ineffectiveness'
    description: string
    affectedMerges: string[]
    severity: 'low' | 'medium' | 'high'
    recommendations: string[]
  }> {
    const issues: Array<any> = []
    const recentHistory = Array.from(this.mergeHistory.values())
      .filter(h => h.mergedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // Last 7 days
    
    // Low confidence merges
    const lowConfidenceMerges = recentHistory.filter(h => h.confidence < 0.6)
    if (lowConfidenceMerges.length > recentHistory.length * 0.2) {
      issues.push({
        type: 'low_confidence',
        description: `${lowConfidenceMerges.length} merges in the last 7 days had confidence below 60%`,
        affectedMerges: lowConfidenceMerges.map(h => h.id),
        severity: 'high',
        recommendations: [
          'Review merge thresholds and algorithms',
          'Improve data quality at source',
          'Consider manual review for complex cases'
        ]
      })
    }
    
    // Quality degradation
    const qualityDegradations = recentHistory.filter(h => h.metadata.qualityImprovement < 0)
    if (qualityDegradations.length > 0) {
      issues.push({
        type: 'quality_degradation',
        description: `${qualityDegradations.length} merges resulted in quality degradation`,
        affectedMerges: qualityDegradations.map(h => h.id),
        severity: 'high',
        recommendations: [
          'Review merge strategies and field resolution rules',
          'Implement better quality assessment metrics',
          'Add pre-merge quality validation'
        ]
      })
    }
    
    // Strategy effectiveness analysis
    const strategyStats = this.analyzeStrategyEffectiveness(recentHistory)
    Object.entries(strategyStats).forEach(([strategy, stats]) => {
      if (stats.successRate < 0.7 && stats.count > 5) {
        issues.push({
          type: 'strategy_ineffectiveness',
          description: `${strategy} strategy has low success rate (${(stats.successRate * 100).toFixed(1)}%)`,
          affectedMerges: recentHistory
            .filter(h => h.strategy === strategy)
            .map(h => h.id),
          severity: 'medium',
          recommendations: [
            `Review and tune ${strategy} strategy parameters`,
            'Consider alternative strategies for similar cases',
            'Analyze common failure patterns'
          ]
        })
      }
    })
    
    return issues
  }

  /**
   * Generate merge audit report
   */
  public generateAuditReport(filter?: HistoryFilter): {
    summary: {
      totalMerges: number
      dateRange: { start: Date; end: Date }
      avgConfidence: number
      qualityImprovement: number
    }
    analytics: AnalyticsData
    qualityIssues: any[]
    recommendations: string[]
    recentActivity: MergeHistory[]
  } {
    const filteredHistory = this.filterHistory(filter)
    
    if (filteredHistory.length === 0) {
      return {
        summary: {
          totalMerges: 0,
          dateRange: { start: new Date(), end: new Date() },
          avgConfidence: 0,
          qualityImprovement: 0
        },
        analytics: {
          mergeFrequency: {},
          strategyEffectiveness: {} as any,
          fieldImpactAnalysis: {},
          temporalTrends: []
        },
        qualityIssues: [],
        recommendations: [],
        recentActivity: []
      }
    }
    
    const dates = filteredHistory.map(h => h.mergedAt)
    const avgConfidence = filteredHistory.reduce((sum, h) => sum + h.confidence, 0) / filteredHistory.length
    const avgQualityImprovement = filteredHistory.reduce((sum, h) => sum + h.metadata.qualityImprovement, 0) / filteredHistory.length
    
    const analytics = this.getAnalytics(filter)
    const qualityIssues = this.identifyQualityIssues()
    
    // Generate recommendations based on analytics
    const recommendations = this.generateRecommendations(analytics, qualityIssues)
    
    const recentActivity = filteredHistory
      .sort((a, b) => b.mergedAt.getTime() - a.mergedAt.getTime())
      .slice(0, 10)
    
    return {
      summary: {
        totalMerges: filteredHistory.length,
        dateRange: {
          start: new Date(Math.min(...dates.map(d => d.getTime()))),
          end: new Date(Math.max(...dates.map(d => d.getTime())))
        },
        avgConfidence,
        qualityImprovement: avgQualityImprovement
      },
      analytics,
      qualityIssues,
      recommendations,
      recentActivity
    }
  }

  private generateRecommendations(analytics: AnalyticsData, qualityIssues: any[]): string[] {
    const recommendations: string[] = []
    
    // Strategy-based recommendations
    Object.entries(analytics.strategyEffectiveness).forEach(([strategy, stats]) => {
      if (stats.avgConfidence < 0.7) {
        recommendations.push(`Improve ${strategy} strategy - current average confidence is ${(stats.avgConfidence * 100).toFixed(1)}%`)
      }
      
      if (stats.avgQualityImprovement < 0.1) {
        recommendations.push(`${strategy} strategy shows minimal quality improvement - consider alternative approaches`)
      }
    })
    
    // Field-based recommendations
    Object.entries(analytics.fieldImpactAnalysis).forEach(([field, stats]) => {
      if (stats.conflictRate > 0.3) {
        recommendations.push(`High conflict rate for ${field} field (${(stats.conflictRate * 100).toFixed(1)}%) - review resolution rules`)
      }
      
      if (stats.qualityImprovement < 0.5) {
        recommendations.push(`Low quality improvement for ${field} field - enhance data sources or validation`)
      }
    })
    
    // Quality issue recommendations
    if (qualityIssues.length > 0) {
      recommendations.push(`${qualityIssues.length} quality issues identified - review detailed analysis for specific actions`)
    }
    
    // Performance recommendations
    const recentMetrics = this.performanceMetrics.slice(-100)
    if (recentMetrics.length > 0) {
      const avgProcessingTime = recentMetrics.reduce((sum, m) => sum + m.processingTime, 0) / recentMetrics.length
      if (avgProcessingTime > 1000) {
        recommendations.push('High processing times detected - consider performance optimization')
      }
    }
    
    return recommendations
  }

  /**
   * Export merge history
   */
  public exportHistory(format: 'json' | 'csv' = 'json', filter?: HistoryFilter): string {
    const history = this.filterHistory(filter)
    
    if (format === 'csv') {
      const headers = [
        'ID', 'Primary Event ID', 'Duplicate Event IDs', 'Merged At', 'Merged By',
        'Strategy', 'Confidence', 'Processing Time', 'Quality Improvement'
      ]
      
      const rows = history.map(merge => [
        merge.id,
        merge.primaryEventId,
        merge.duplicateEventIds.join(';'),
        merge.mergedAt.toISOString(),
        merge.mergedBy,
        merge.strategy,
        merge.confidence.toFixed(3),
        merge.metadata.processingTime.toString(),
        merge.metadata.qualityImprovement.toFixed(3)
      ])
      
      return [headers, ...rows].map(row => row.join(',')).join('\n')
    }
    
    return JSON.stringify(history, null, 2)
  }

  /**
   * Import merge history
   */
  public importHistory(data: string, format: 'json' | 'csv' = 'json'): { imported: number; errors: string[] } {
    const errors: string[] = []
    let imported = 0
    
    try {
      if (format === 'json') {
        const history: MergeHistory[] = JSON.parse(data)
        
        history.forEach((merge, index) => {
          try {
            // Validate required fields
            if (!merge.id || !merge.primaryEventId || !merge.duplicateEventIds) {
              errors.push(`Invalid merge record at index ${index}: missing required fields`)
              return
            }
            
            // Convert date strings back to Date objects
            merge.mergedAt = new Date(merge.mergedAt)
            
            this.mergeHistory.set(merge.id, merge)
            this.updateRelationships({
              primaryEventId: merge.primaryEventId,
              duplicateEventIds: merge.duplicateEventIds,
              strategy: merge.strategy,
              confidence: merge.confidence,
              reasons: [],
              fieldResolutions: [],
              preview: {} as Event
            })
            
            imported++
          } catch (error) {
            errors.push(`Error importing merge record at index ${index}: ${error.message}`)
          }
        })
      } else {
        errors.push('CSV import not yet implemented')
      }
    } catch (error) {
      errors.push(`Failed to parse import data: ${error.message}`)
    }
    
    return { imported, errors }
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): PerformanceMetrics[] {
    return [...this.performanceMetrics]
  }

  /**
   * Clear history (with optional retention period)
   */
  public clearHistory(retentionDays?: number): { cleared: number; retained: number } {
    const totalCount = this.mergeHistory.size
    
    if (!retentionDays) {
      this.mergeHistory.clear()
      this.eventRelationships.clear()
      this.reverseIndex.clear()
      this.performanceMetrics.splice(0)
      this.qualityMetrics.splice(0)
      
      return { cleared: totalCount, retained: 0 }
    }
    
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
    const toRemove: string[] = []
    
    this.mergeHistory.forEach((merge, id) => {
      if (merge.mergedAt < cutoffDate) {
        toRemove.push(id)
      }
    })
    
    toRemove.forEach(id => {
      const merge = this.mergeHistory.get(id)
      if (merge) {
        this.mergeHistory.delete(id)
        
        // Clean up relationships
        this.eventRelationships.delete(merge.primaryEventId)
        merge.duplicateEventIds.forEach(dupId => {
          this.reverseIndex.delete(dupId)
        })
      }
    })
    
    return { cleared: toRemove.length, retained: this.mergeHistory.size }
  }

  /**
   * Get merge statistics
   */
  public getStatistics(): {
    totalMerges: number
    totalEventsMerged: number
    avgConfidence: number
    avgProcessingTime: number
    topStrategies: Array<{ strategy: string; count: number; success_rate: number }>
    recentActivity: number
  } {
    const allMerges = Array.from(this.mergeHistory.values())
    const totalMerges = allMerges.length
    
    if (totalMerges === 0) {
      return {
        totalMerges: 0,
        totalEventsMerged: 0,
        avgConfidence: 0,
        avgProcessingTime: 0,
        topStrategies: [],
        recentActivity: 0
      }
    }
    
    const totalEventsMerged = allMerges.reduce((sum, merge) => sum + merge.duplicateEventIds.length, 0)
    const avgConfidence = allMerges.reduce((sum, merge) => sum + merge.confidence, 0) / totalMerges
    const avgProcessingTime = allMerges.reduce((sum, merge) => sum + merge.metadata.processingTime, 0) / totalMerges
    
    // Strategy statistics
    const strategyStats: Record<string, { count: number; successes: number }> = {}
    allMerges.forEach(merge => {
      const strategy = merge.strategy
      if (!strategyStats[strategy]) {
        strategyStats[strategy] = { count: 0, successes: 0 }
      }
      strategyStats[strategy].count++
      if (merge.confidence > 0.8) {
        strategyStats[strategy].successes++
      }
    })
    
    const topStrategies = Object.entries(strategyStats)
      .map(([strategy, stats]) => ({
        strategy,
        count: stats.count,
        success_rate: stats.successes / stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
    
    // Recent activity (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentActivity = allMerges.filter(merge => merge.mergedAt > yesterday).length
    
    return {
      totalMerges,
      totalEventsMerged,
      avgConfidence,
      avgProcessingTime,
      topStrategies,
      recentActivity
    }
  }
}
