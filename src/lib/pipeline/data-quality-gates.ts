/**
 * Data Quality Gates and Validation Pipeline
 * Ensures data quality standards before events reach the application
 */

import { z } from 'zod'
import { eventNormalizer } from '../event-normalizer'
import type { Event, EventCategory } from '@/types'

export interface QualityGate {
  id: string
  name: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  enabled: boolean
  threshold: number // 0-1, minimum score to pass
  weight: number // Impact on overall score
  validator: (data: any) => QualityResult
}

export interface QualityResult {
  passed: boolean
  score: number // 0-1
  errors: string[]
  warnings: string[]
  metadata?: Record<string, any>
}

export interface QualityReport {
  overall: {
    passed: boolean
    score: number
    grade: 'A' | 'B' | 'C' | 'D' | 'F'
  }
  gates: Array<{
    gateId: string
    name: string
    passed: boolean
    score: number
    errors: string[]
    warnings: string[]
  }>
  recommendations: string[]
  processingTime: number
}

export interface QualityMetrics {
  totalValidations: number
  passedValidations: number
  failedValidations: number
  averageScore: number
  commonErrors: Array<{ error: string; count: number }>
  processingTimeMs: number
}

export class DataQualityGates {
  private gates: Map<string, QualityGate> = new Map()
  private metrics: QualityMetrics = {
    totalValidations: 0,
    passedValidations: 0,
    failedValidations: 0,
    averageScore: 0,
    commonErrors: [],
    processingTimeMs: 0
  }

  constructor() {
    this.initializeStandardGates()
  }

  /**
   * Initialize standard quality gates
   */
  private initializeStandardGates(): void {
    // Core Data Completeness Gate
    this.addGate({
      id: 'core_completeness',
      name: 'Core Data Completeness',
      description: 'Validates presence of essential event data',
      priority: 'critical',
      enabled: true,
      threshold: 0.8,
      weight: 0.3,
      validator: (event: Event) => this.validateCoreCompleteness(event)
    })

    // Data Format Accuracy Gate
    this.addGate({
      id: 'format_accuracy',
      name: 'Data Format Accuracy',
      description: 'Validates data types and formats',
      priority: 'high',
      enabled: true,
      threshold: 0.85,
      weight: 0.25,
      validator: (event: Event) => this.validateDataFormats(event)
    })

    // Business Logic Consistency Gate
    this.addGate({
      id: 'business_consistency',
      name: 'Business Logic Consistency',
      description: 'Validates business rules and logical consistency',
      priority: 'high',
      enabled: true,
      threshold: 0.8,
      weight: 0.2,
      validator: (event: Event) => this.validateBusinessLogic(event)
    })

    // Geographic Data Gate
    this.addGate({
      id: 'geographic_data',
      name: 'Geographic Data Quality',
      description: 'Validates location and geographic information',
      priority: 'medium',
      enabled: true,
      threshold: 0.7,
      weight: 0.15,
      validator: (event: Event) => this.validateGeographicData(event)
    })

    // Content Quality Gate
    this.addGate({
      id: 'content_quality',
      name: 'Content Quality',
      description: 'Validates text content quality and appropriateness',
      priority: 'medium',
      enabled: true,
      threshold: 0.6,
      weight: 0.1,
      validator: (event: Event) => this.validateContentQuality(event)
    })
  }

  /**
   * Add a quality gate
   */
  addGate(gate: QualityGate): void {
    this.gates.set(gate.id, gate)
  }

  /**
   * Remove a quality gate
   */
  removeGate(gateId: string): boolean {
    return this.gates.delete(gateId)
  }

  /**
   * Enable/disable a quality gate
   */
  toggleGate(gateId: string, enabled: boolean): boolean {
    const gate = this.gates.get(gateId)
    if (!gate) return false
    
    gate.enabled = enabled
    return true
  }

  /**
   * Validate event through all quality gates
   */
  async validateEvent(event: Event): Promise<QualityReport> {
    const startTime = Date.now()
    const gateResults: QualityReport['gates'] = []
    const allErrors: string[] = []
    const allWarnings: string[] = []

    let totalWeightedScore = 0
    let totalWeight = 0

    // Run through each enabled gate
    for (const gate of this.gates.values()) {
      if (!gate.enabled) continue

      try {
        const result = gate.validator(event)
        
        gateResults.push({
          gateId: gate.id,
          name: gate.name,
          passed: result.passed && result.score >= gate.threshold,
          score: result.score,
          errors: result.errors,
          warnings: result.warnings
        })

        totalWeightedScore += result.score * gate.weight
        totalWeight += gate.weight
        
        allErrors.push(...result.errors)
        allWarnings.push(...result.warnings)

      } catch (error) {
        gateResults.push({
          gateId: gate.id,
          name: gate.name,
          passed: false,
          score: 0,
          errors: [`Gate validation failed: ${error.message}`],
          warnings: []
        })

        allErrors.push(`Gate ${gate.name} failed: ${error.message}`)
      }
    }

    const overallScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0
    const overallPassed = gateResults.every(result => result.passed)
    const processingTime = Date.now() - startTime

    // Update metrics
    this.updateMetrics(overallPassed, overallScore, allErrors, processingTime)

    const report: QualityReport = {
      overall: {
        passed: overallPassed,
        score: overallScore,
        grade: this.calculateGrade(overallScore)
      },
      gates: gateResults,
      recommendations: this.generateRecommendations(gateResults),
      processingTime
    }

    return report
  }

  /**
   * Validate multiple events in batch
   */
  async validateEventBatch(events: Event[]): Promise<{
    reports: QualityReport[]
    summary: {
      total: number
      passed: number
      failed: number
      averageScore: number
      averageProcessingTime: number
    }
  }> {
    const reports = await Promise.all(events.map(event => this.validateEvent(event)))
    
    const passed = reports.filter(report => report.overall.passed).length
    const failed = reports.length - passed
    const averageScore = reports.reduce((sum, report) => sum + report.overall.score, 0) / reports.length
    const averageProcessingTime = reports.reduce((sum, report) => sum + report.processingTime, 0) / reports.length

    return {
      reports,
      summary: {
        total: reports.length,
        passed,
        failed,
        averageScore,
        averageProcessingTime
      }
    }
  }

  /**
   * Core data completeness validation
   */
  private validateCoreCompleteness(event: Event): QualityResult {
    const errors: string[] = []
    const warnings: string[] = []
    let score = 1.0

    // Required fields
    const requiredFields = ['title', 'category', 'start_time']
    const missingRequired = requiredFields.filter(field => !event[field])
    
    if (missingRequired.length > 0) {
      errors.push(`Missing required fields: ${missingRequired.join(', ')}`)
      score -= 0.5
    }

    // Recommended fields
    const recommendedFields = ['description', 'venue_name', 'city_name']
    const missingRecommended = recommendedFields.filter(field => !event[field])
    
    if (missingRecommended.length > 0) {
      warnings.push(`Missing recommended fields: ${missingRecommended.join(', ')}`)
      score -= missingRecommended.length * 0.1
    }

    // Pricing information
    if (!event.is_free && !event.price_min && !event.price_max) {
      warnings.push('No pricing information available for paid event')
      score -= 0.1
    }

    return {
      passed: errors.length === 0,
      score: Math.max(0, score),
      errors,
      warnings
    }
  }

  /**
   * Data format accuracy validation
   */
  private validateDataFormats(event: Event): QualityResult {
    const errors: string[] = []
    const warnings: string[] = []
    let score = 1.0

    // Date format validation
    if (event.start_time) {
      const startDate = new Date(event.start_time)
      if (isNaN(startDate.getTime())) {
        errors.push('Invalid start_time format')
        score -= 0.3
      } else if (startDate < new Date('1900-01-01') || startDate > new Date('2100-01-01')) {
        warnings.push('Start time seems unrealistic')
        score -= 0.1
      }
    }

    if (event.end_time) {
      const endDate = new Date(event.end_time)
      if (isNaN(endDate.getTime())) {
        errors.push('Invalid end_time format')
        score -= 0.2
      }
    }

    // Coordinate validation
    if (event.venue?.latitude !== undefined) {
      if (typeof event.venue.latitude !== 'number' || 
          event.venue.latitude < -90 || event.venue.latitude > 90) {
        errors.push('Invalid latitude value')
        score -= 0.2
      }
    }

    if (event.venue?.longitude !== undefined) {
      if (typeof event.venue.longitude !== 'number' || 
          event.venue.longitude < -180 || event.venue.longitude > 180) {
        errors.push('Invalid longitude value')
        score -= 0.2
      }
    }

    // Price validation
    if (event.price_min !== undefined && (typeof event.price_min !== 'number' || event.price_min < 0)) {
      errors.push('Invalid price_min value')
      score -= 0.1
    }

    if (event.price_max !== undefined && (typeof event.price_max !== 'number' || event.price_max < 0)) {
      errors.push('Invalid price_max value')
      score -= 0.1
    }

    // URL validation
    const urlFields = ['website_url', 'ticket_url', 'image_url']
    urlFields.forEach(field => {
      if (event[field]) {
        try {
          new URL(event[field])
        } catch {
          warnings.push(`Invalid URL format for ${field}`)
          score -= 0.05
        }
      }
    })

    return {
      passed: errors.length === 0,
      score: Math.max(0, score),
      errors,
      warnings
    }
  }

  /**
   * Business logic consistency validation
   */
  private validateBusinessLogic(event: Event): QualityResult {
    const errors: string[] = []
    const warnings: string[] = []
    let score = 1.0

    // Free vs paid consistency
    if (event.is_free && (event.price_min > 0 || event.price_max > 0)) {
      errors.push('Event marked as free but has non-zero price')
      score -= 0.3
    }

    // Price range consistency
    if (event.price_min !== undefined && event.price_max !== undefined && 
        event.price_min > event.price_max) {
      errors.push('price_min is greater than price_max')
      score -= 0.2
    }

    // Date logic
    if (event.start_time && event.end_time) {
      const start = new Date(event.start_time)
      const end = new Date(event.end_time)
      
      if (end <= start) {
        errors.push('End time is not after start time')
        score -= 0.3
      }

      const duration = end.getTime() - start.getTime()
      const maxDuration = 7 * 24 * 60 * 60 * 1000 // 7 days
      
      if (duration > maxDuration) {
        warnings.push('Event duration exceeds 7 days')
        score -= 0.1
      }
    }

    // Category validation
    const validCategories: EventCategory[] = [
      'music', 'sports', 'arts', 'food', 'tech', 'social', 
      'business', 'education', 'health', 'family', 'other'
    ]
    
    if (!validCategories.includes(event.category as EventCategory)) {
      errors.push(`Invalid category: ${event.category}`)
      score -= 0.2
    }

    // Past event check
    if (event.start_time) {
      const eventDate = new Date(event.start_time)
      const now = new Date()
      const daysAgo = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60 * 24)
      
      if (daysAgo > 1) {
        warnings.push(`Event is ${Math.floor(daysAgo)} days in the past`)
        score -= 0.1
      }
    }

    return {
      passed: errors.length === 0,
      score: Math.max(0, score),
      errors,
      warnings
    }
  }

  /**
   * Geographic data validation
   */
  private validateGeographicData(event: Event): QualityResult {
    const errors: string[] = []
    const warnings: string[] = []
    let score = 1.0

    // Coordinate consistency
    if (event.venue?.latitude && event.venue?.longitude) {
      // Check if coordinates are realistic (not 0,0 or other common default values)
      if (event.venue.latitude === 0 && event.venue.longitude === 0) {
        warnings.push('Coordinates appear to be default values (0,0)')
        score -= 0.3
      }

      // Check coordinate precision (too many decimal places might indicate fake data)
      const latPrecision = event.venue.latitude.toString().split('.')[1]?.length || 0
      const lngPrecision = event.venue.longitude.toString().split('.')[1]?.length || 0
      
      if (latPrecision > 6 || lngPrecision > 6) {
        warnings.push('Coordinate precision seems excessive')
        score -= 0.1
      }
    }

    // City/state/country consistency
    if (event.city_name && event.venue?.city && 
        event.city_name.toLowerCase() !== event.venue.city.toLowerCase()) {
      warnings.push('City name mismatch between event and venue')
      score -= 0.2
    }

    // Address completeness
    if (event.venue?.address) {
      const addressParts = event.venue.address.split(',').map(part => part.trim())
      if (addressParts.length < 2) {
        warnings.push('Address appears incomplete')
        score -= 0.1
      }
    }

    return {
      passed: errors.length === 0,
      score: Math.max(0, score),
      errors,
      warnings
    }
  }

  /**
   * Content quality validation
   */
  private validateContentQuality(event: Event): QualityResult {
    const errors: string[] = []
    const warnings: string[] = []
    let score = 1.0

    // Title quality
    if (event.title) {
      if (event.title.length < 5) {
        warnings.push('Title is very short')
        score -= 0.2
      }

      if (event.title.length > 200) {
        warnings.push('Title is very long')
        score -= 0.1
      }

      // Check for all caps
      if (event.title === event.title.toUpperCase() && event.title.length > 10) {
        warnings.push('Title is all uppercase')
        score -= 0.1
      }

      // Check for repeated characters
      if (/(.)\1{4,}/.test(event.title)) {
        warnings.push('Title contains repeated characters')
        score -= 0.1
      }
    }

    // Description quality
    if (event.description) {
      if (event.description.length < 20) {
        warnings.push('Description is very short')
        score -= 0.1
      }

      // Check for placeholder text
      const placeholders = ['lorem ipsum', 'test', 'placeholder', 'tbd', 'coming soon']
      const lowerDesc = event.description.toLowerCase()
      
      if (placeholders.some(placeholder => lowerDesc.includes(placeholder))) {
        warnings.push('Description contains placeholder text')
        score -= 0.2
      }

      // Check for excessive HTML
      const htmlTagCount = (event.description.match(/<[^>]*>/g) || []).length
      const textLength = event.description.replace(/<[^>]*>/g, '').length
      
      if (htmlTagCount > textLength / 20) {
        warnings.push('Description has excessive HTML markup')
        score -= 0.1
      }
    }

    // Venue name quality
    if (event.venue_name) {
      if (event.venue_name.toLowerCase().includes('unnamed') || 
          event.venue_name.toLowerCase().includes('unknown')) {
        warnings.push('Venue name appears to be placeholder')
        score -= 0.2
      }
    }

    return {
      passed: errors.length === 0,
      score: Math.max(0, score),
      errors,
      warnings
    }
  }

  /**
   * Calculate letter grade from score
   */
  private calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 0.9) return 'A'
    if (score >= 0.8) return 'B'
    if (score >= 0.7) return 'C'
    if (score >= 0.6) return 'D'
    return 'F'
  }

  /**
   * Generate recommendations based on gate results
   */
  private generateRecommendations(gateResults: QualityReport['gates']): string[] {
    const recommendations: string[] = []

    gateResults.forEach(result => {
      if (!result.passed) {
        switch (result.gateId) {
          case 'core_completeness':
            recommendations.push('Add missing required fields to improve data completeness')
            break
          case 'format_accuracy':
            recommendations.push('Fix data format issues, especially dates and coordinates')
            break
          case 'business_consistency':
            recommendations.push('Review business logic rules and ensure data consistency')
            break
          case 'geographic_data':
            recommendations.push('Verify and improve geographic data accuracy')
            break
          case 'content_quality':
            recommendations.push('Enhance content quality and remove placeholder text')
            break
        }
      }
    })

    // General recommendations
    const failedGates = gateResults.filter(result => !result.passed).length
    const totalGates = gateResults.length

    if (failedGates > totalGates / 2) {
      recommendations.push('Consider reviewing data source quality and ingestion processes')
    }

    return recommendations
  }

  /**
   * Update metrics
   */
  private updateMetrics(
    passed: boolean, 
    score: number, 
    errors: string[], 
    processingTime: number
  ): void {
    this.metrics.totalValidations++
    
    if (passed) {
      this.metrics.passedValidations++
    } else {
      this.metrics.failedValidations++
    }

    // Update average score
    this.metrics.averageScore = 
      (this.metrics.averageScore * (this.metrics.totalValidations - 1) + score) / 
      this.metrics.totalValidations

    // Update processing time
    this.metrics.processingTimeMs = 
      (this.metrics.processingTimeMs * (this.metrics.totalValidations - 1) + processingTime) / 
      this.metrics.totalValidations

    // Track common errors
    errors.forEach(error => {
      const existing = this.metrics.commonErrors.find(item => item.error === error)
      if (existing) {
        existing.count++
      } else {
        this.metrics.commonErrors.push({ error, count: 1 })
      }
    })

    // Keep only top 10 most common errors
    this.metrics.commonErrors.sort((a, b) => b.count - a.count)
    this.metrics.commonErrors = this.metrics.commonErrors.slice(0, 10)
  }

  /**
   * Get quality metrics
   */
  getMetrics(): QualityMetrics {
    return { ...this.metrics }
  }

  /**
   * Get all quality gates
   */
  getGates(): QualityGate[] {
    return Array.from(this.gates.values())
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalValidations: 0,
      passedValidations: 0,
      failedValidations: 0,
      averageScore: 0,
      commonErrors: [],
      processingTimeMs: 0
    }
  }

  /**
   * Export quality configuration
   */
  exportConfiguration(): any {
    return {
      gates: Array.from(this.gates.values()).map(gate => ({
        id: gate.id,
        name: gate.name,
        description: gate.description,
        priority: gate.priority,
        enabled: gate.enabled,
        threshold: gate.threshold,
        weight: gate.weight
      })),
      metrics: this.metrics
    }
  }

  /**
   * Import quality configuration
   */
  importConfiguration(config: any): void {
    if (config.gates) {
      config.gates.forEach((gateConfig: any) => {
        const existingGate = this.gates.get(gateConfig.id)
        if (existingGate) {
          existingGate.enabled = gateConfig.enabled
          existingGate.threshold = gateConfig.threshold
          existingGate.weight = gateConfig.weight
        }
      })
    }

    if (config.metrics) {
      this.metrics = { ...config.metrics }
    }
  }
}

// Export singleton instance
export const dataQualityGates = new DataQualityGates()