/**
 * Error handling and retry mechanisms for SceneScout scraping
 * Provides robust error recovery and intelligent retry strategies
 */

import { ScrapingError, ScraperConfig, RetryableRequest } from '../types'

/**
 * Error classification and retry strategy
 */
export interface ErrorClassification {
  isRetryable: boolean
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: 'temporary' | 'configuration' | 'target' | 'system'
  recommendedAction: string
  estimatedRetryDelay: number
}

/**
 * Circuit breaker state for failing targets
 */
export interface CircuitBreakerState {
  isOpen: boolean
  failureCount: number
  lastFailureTime: Date
  nextAttemptTime: Date
  successCount: number
}

/**
 * Comprehensive error handler with advanced retry mechanisms
 */
export class ScrapingErrorHandler {
  private config: ScraperConfig
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map()
  private errorStats: Map<string, { count: number; lastOccurrence: Date }> = new Map()
  private retryQueue: Map<string, RetryableRequest<any>> = new Map()
  
  constructor(config: ScraperConfig) {
    this.config = config
  }
  
  /**
   * Classify an error and determine handling strategy
   */
  classifyError(error: Error | ScrapingError, context?: any): ErrorClassification {
    const scrapingError = this.toScrapingError(error, context)
    
    switch (scrapingError.type) {
      case 'network':
        return this.classifyNetworkError(scrapingError, context)
      
      case 'rate_limit':
        return {
          isRetryable: true,
          priority: 'medium',
          category: 'temporary',
          recommendedAction: 'Implement exponential backoff',
          estimatedRetryDelay: this.calculateRateLimitDelay(scrapingError)
        }
      
      case 'blocked':
        return {
          isRetryable: true,
          priority: 'high',
          category: 'target',
          recommendedAction: 'Rotate user agent and proxy',
          estimatedRetryDelay: 60000 // 1 minute
        }
      
      case 'captcha':
        return {
          isRetryable: false,
          priority: 'critical',
          category: 'target',
          recommendedAction: 'Manual intervention or CAPTCHA solving service',
          estimatedRetryDelay: 0
        }
      
      case 'parsing':
        return {
          isRetryable: false,
          priority: 'medium',
          category: 'configuration',
          recommendedAction: 'Update selectors or parsing logic',
          estimatedRetryDelay: 0
        }
      
      case 'validation':
        return {
          isRetryable: false,
          priority: 'low',
          category: 'configuration',
          recommendedAction: 'Review data validation rules',
          estimatedRetryDelay: 0
        }
      
      case 'timeout':
        return {
          isRetryable: true,
          priority: 'medium',
          category: 'temporary',
          recommendedAction: 'Increase timeout or retry with delay',
          estimatedRetryDelay: this.config.retry.baseDelay
        }
      
      case 'auth':
        return {
          isRetryable: true,
          priority: 'high',
          category: 'configuration',
          recommendedAction: 'Refresh authentication credentials',
          estimatedRetryDelay: 5000
        }
      
      default:
        return {
          isRetryable: false,
          priority: 'medium',
          category: 'system',
          recommendedAction: 'Investigate unknown error type',
          estimatedRetryDelay: 0
        }
    }
  }
  
  /**
   * Handle error with appropriate recovery strategy
   */
  async handleError(
    error: Error | ScrapingError,
    context: any,
    targetId: string
  ): Promise<{ shouldRetry: boolean; delay: number; action?: string }> {
    const scrapingError = this.toScrapingError(error, context)
    const classification = this.classifyError(scrapingError, context)
    
    // Update error statistics
    this.updateErrorStats(scrapingError.type, targetId)
    
    // Check circuit breaker
    if (this.shouldTripCircuitBreaker(targetId, scrapingError)) {
      this.tripCircuitBreaker(targetId)
      return { shouldRetry: false, delay: 0, action: 'circuit_breaker_tripped' }
    }
    
    // Update circuit breaker state
    this.updateCircuitBreaker(targetId, false)
    
    // Log error with classification
    await this.logErrorWithClassification(scrapingError, classification, context)
    
    if (!classification.isRetryable || scrapingError.retryCount >= this.config.retry.maxRetries) {
      return { shouldRetry: false, delay: 0 }
    }
    
    const delay = this.calculateRetryDelay(scrapingError, classification)
    const action = await this.determineRecoveryAction(scrapingError, classification, context)
    
    return { shouldRetry: true, delay, action }
  }
  
  /**
   * Create a retryable request wrapper
   */
  createRetryableRequest<T>(
    id: string,
    operation: () => Promise<T>,
    context: any
  ): RetryableRequest<T> {
    const retryable: RetryableRequest<T> = {
      attempt: 0,
      maxAttempts: this.config.retry.maxRetries,
      execute: async () => {
        retryable.attempt++
        
        try {
          const result = await operation()
          this.updateCircuitBreaker(id, true)
          return result
        } catch (error) {
          retryable.lastError = error as Error
          
          const handling = await this.handleError(error as Error, context, id)
          
          if (handling.shouldRetry && retryable.attempt < retryable.maxAttempts) {
            if (handling.delay > 0) {
              await this.delay(handling.delay)
            }
            
            if (handling.action) {
              await this.executeRecoveryAction(handling.action, context)
            }
            
            return retryable.execute()
          }
          
          throw error
        }
      }
    }
    
    return retryable
  }
  
  /**
   * Execute a request with automatic retry and error handling
   */
  async executeWithRetry<T>(
    id: string,
    operation: () => Promise<T>,
    context: any = {}
  ): Promise<T> {
    const retryable = this.createRetryableRequest(id, operation, context)
    this.retryQueue.set(id, retryable)
    
    try {
      const result = await retryable.execute()
      this.retryQueue.delete(id)
      return result
    } catch (error) {
      this.retryQueue.delete(id)
      throw error
    }
  }
  
  /**
   * Check if circuit breaker is open for a target
   */
  isCircuitBreakerOpen(targetId: string): boolean {
    const state = this.circuitBreakers.get(targetId)
    
    if (!state) {
      return false
    }
    
    // Check if enough time has passed to attempt recovery
    if (state.isOpen && Date.now() > state.nextAttemptTime.getTime()) {
      state.isOpen = false
      state.nextAttemptTime = new Date(Date.now() + 60000) // 1 minute recovery window
    }
    
    return state.isOpen
  }
  
  /**
   * Get error statistics for monitoring
   */
  getErrorStatistics(): Record<string, any> {
    const stats: Record<string, any> = {}
    
    // Error type statistics
    for (const [errorType, data] of this.errorStats.entries()) {
      stats[errorType] = {
        count: data.count,
        lastOccurrence: data.lastOccurrence,
        frequency: this.calculateErrorFrequency(errorType)
      }
    }
    
    // Circuit breaker statistics
    stats.circuitBreakers = {}
    for (const [targetId, state] of this.circuitBreakers.entries()) {
      stats.circuitBreakers[targetId] = {
        isOpen: state.isOpen,
        failureCount: state.failureCount,
        successCount: state.successCount,
        lastFailureTime: state.lastFailureTime,
        nextAttemptTime: state.nextAttemptTime
      }
    }
    
    // Active retries
    stats.activeRetries = this.retryQueue.size
    
    return stats
  }
  
  /**
   * Reset error statistics (useful for testing or fresh starts)
   */
  resetStatistics(): void {
    this.errorStats.clear()
    this.circuitBreakers.clear()
    this.retryQueue.clear()
  }
  
  // Private helper methods
  
  private toScrapingError(error: Error | ScrapingError, context?: any): ScrapingError {
    if (this.isScrapingError(error)) {
      return error
    }
    
    // Convert generic error to ScrapingError
    const scrapingError: ScrapingError = {
      type: this.inferErrorType(error, context),
      severity: this.inferErrorSeverity(error, context),
      message: error.message,
      details: context,
      timestamp: new Date(),
      retryable: true,
      retryCount: 0
    }
    
    return scrapingError
  }
  
  private isScrapingError(error: any): error is ScrapingError {
    return error && typeof error.type === 'string' && typeof error.severity === 'string'
  }
  
  private inferErrorType(error: Error, context?: any): ScrapingError['type'] {
    const message = error.message.toLowerCase()
    
    if (message.includes('timeout')) return 'timeout'
    if (message.includes('network') || message.includes('fetch')) return 'network'
    if (message.includes('rate limit') || message.includes('429')) return 'rate_limit'
    if (message.includes('blocked') || message.includes('403')) return 'blocked'
    if (message.includes('captcha')) return 'captcha'
    if (message.includes('auth') || message.includes('401')) return 'auth'
    if (message.includes('parse') || message.includes('selector')) return 'parsing'
    if (message.includes('validation')) return 'validation'
    
    return 'network' // Default fallback
  }
  
  private inferErrorSeverity(error: Error, context?: any): ScrapingError['severity'] {
    const message = error.message.toLowerCase()
    
    if (message.includes('critical') || message.includes('fatal')) return 'critical'
    if (message.includes('captcha') || message.includes('blocked')) return 'high'
    if (message.includes('timeout') || message.includes('rate limit')) return 'medium'
    
    return 'low'
  }
  
  private classifyNetworkError(error: ScrapingError, context?: any): ErrorClassification {
    const message = error.message.toLowerCase()
    
    if (message.includes('dns') || message.includes('resolve')) {
      return {
        isRetryable: true,
        priority: 'medium',
        category: 'temporary',
        recommendedAction: 'Check DNS or try alternate DNS servers',
        estimatedRetryDelay: 5000
      }
    }
    
    if (message.includes('connection') || message.includes('connect')) {
      return {
        isRetryable: true,
        priority: 'medium',
        category: 'temporary',
        recommendedAction: 'Check network connectivity',
        estimatedRetryDelay: this.config.retry.baseDelay
      }
    }
    
    if (message.includes('ssl') || message.includes('certificate')) {
      return {
        isRetryable: false,
        priority: 'high',
        category: 'configuration',
        recommendedAction: 'Check SSL configuration',
        estimatedRetryDelay: 0
      }
    }
    
    return {
      isRetryable: true,
      priority: 'medium',
      category: 'temporary',
      recommendedAction: 'Generic network retry',
      estimatedRetryDelay: this.config.retry.baseDelay
    }
  }
  
  private calculateRateLimitDelay(error: ScrapingError): number {
    // Extract delay from rate limit headers if available
    if (error.details?.retryAfter) {
      return parseInt(error.details.retryAfter) * 1000
    }
    
    // Default exponential backoff for rate limits
    return Math.min(
      this.config.retry.baseDelay * Math.pow(2, error.retryCount),
      60000 // Max 1 minute
    )
  }
  
  private calculateRetryDelay(error: ScrapingError, classification: ErrorClassification): number {
    const baseDelay = classification.estimatedRetryDelay || this.config.retry.baseDelay
    const exponentialDelay = baseDelay * Math.pow(this.config.retry.backoffMultiplier, error.retryCount)
    
    // Add jitter to avoid thundering herd
    const jitter = Math.random() * 1000
    
    return Math.min(exponentialDelay + jitter, this.config.retry.maxDelay)
  }
  
  private async determineRecoveryAction(
    error: ScrapingError,
    classification: ErrorClassification,
    context: any
  ): Promise<string | undefined> {
    switch (error.type) {
      case 'blocked':
        return 'rotate_session'
      
      case 'rate_limit':
        return 'increase_delay'
      
      case 'timeout':
        return 'increase_timeout'
      
      case 'auth':
        return 'refresh_auth'
      
      default:
        return undefined
    }
  }
  
  private async executeRecoveryAction(action: string, context: any): Promise<void> {
    switch (action) {
      case 'rotate_session':
        // Signal to rotate user agent, proxy, etc.
        context.shouldRotateSession = true
        break
      
      case 'increase_delay':
        // Increase delay between requests
        context.additionalDelay = (context.additionalDelay || 0) + 1000
        break
      
      case 'increase_timeout':
        // Increase timeout for next request
        context.timeout = (context.timeout || this.config.timeout.navigationTimeout) * 1.5
        break
      
      case 'refresh_auth':
        // Signal to refresh authentication
        context.shouldRefreshAuth = true
        break
    }
  }
  
  private shouldTripCircuitBreaker(targetId: string, error: ScrapingError): boolean {
    const state = this.circuitBreakers.get(targetId)
    
    if (!state) {
      return false
    }
    
    // Trip if we have too many failures in a short time
    const failureThreshold = 5
    const timeWindow = 5 * 60 * 1000 // 5 minutes
    
    if (state.failureCount >= failureThreshold) {
      const timeSinceFirstFailure = Date.now() - state.lastFailureTime.getTime()
      return timeSinceFirstFailure < timeWindow
    }
    
    return false
  }
  
  private tripCircuitBreaker(targetId: string): void {
    const state = this.circuitBreakers.get(targetId) || {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: new Date(),
      nextAttemptTime: new Date(),
      successCount: 0
    }
    
    state.isOpen = true
    state.nextAttemptTime = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    
    this.circuitBreakers.set(targetId, state)
  }
  
  private updateCircuitBreaker(targetId: string, success: boolean): void {
    let state = this.circuitBreakers.get(targetId)
    
    if (!state) {
      state = {
        isOpen: false,
        failureCount: 0,
        lastFailureTime: new Date(),
        nextAttemptTime: new Date(),
        successCount: 0
      }
      this.circuitBreakers.set(targetId, state)
    }
    
    if (success) {
      state.successCount++
      state.failureCount = Math.max(0, state.failureCount - 1)
    } else {
      state.failureCount++
      state.lastFailureTime = new Date()
    }
  }
  
  private updateErrorStats(errorType: string, targetId: string): void {
    const key = `${targetId}:${errorType}`
    const current = this.errorStats.get(key) || { count: 0, lastOccurrence: new Date() }
    
    current.count++
    current.lastOccurrence = new Date()
    
    this.errorStats.set(key, current)
  }
  
  private calculateErrorFrequency(errorType: string): number {
    const entries = Array.from(this.errorStats.entries())
      .filter(([key]) => key.endsWith(`:${errorType}`))
    
    if (entries.length === 0) return 0
    
    const totalCount = entries.reduce((sum, [, data]) => sum + data.count, 0)
    const timeSpan = Date.now() - Math.min(...entries.map(([, data]) => data.lastOccurrence.getTime()))
    
    // Errors per hour
    return (totalCount / timeSpan) * (60 * 60 * 1000)
  }
  
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  private async logErrorWithClassification(
    error: ScrapingError,
    classification: ErrorClassification,
    context: any
  ): Promise<void> {
    const logData = {
      error: {
        type: error.type,
        severity: error.severity,
        message: error.message,
        retryCount: error.retryCount,
        timestamp: error.timestamp
      },
      classification: {
        isRetryable: classification.isRetryable,
        priority: classification.priority,
        category: classification.category,
        recommendedAction: classification.recommendedAction,
        estimatedRetryDelay: classification.estimatedRetryDelay
      },
      context
    }
    
    // In a real implementation, this would go to a proper logging system
    console.error('Scraping error with classification:', JSON.stringify(logData, null, 2))
  }
}

/**
 * Specific error types for different scraping scenarios
 */
export class NetworkError extends Error implements ScrapingError {
  type: ScrapingError['type'] = 'network'
  severity: ScrapingError['severity']
  details?: any
  url?: string
  timestamp: Date
  retryable: boolean
  retryCount: number
  
  constructor(
    message: string,
    severity: ScrapingError['severity'] = 'medium',
    details?: any,
    url?: string
  ) {
    super(message)
    this.name = 'NetworkError'
    this.severity = severity
    this.details = details
    this.url = url
    this.timestamp = new Date()
    this.retryable = true
    this.retryCount = 0
  }
}

export class RateLimitError extends Error implements ScrapingError {
  type: ScrapingError['type'] = 'rate_limit'
  severity: ScrapingError['severity'] = 'medium'
  details?: any
  url?: string
  timestamp: Date
  retryable: boolean
  retryCount: number
  
  constructor(message: string, retryAfter?: number, url?: string) {
    super(message)
    this.name = 'RateLimitError'
    this.details = { retryAfter }
    this.url = url
    this.timestamp = new Date()
    this.retryable = true
    this.retryCount = 0
  }
}

export class ParsingError extends Error implements ScrapingError {
  type: ScrapingError['type'] = 'parsing'
  severity: ScrapingError['severity'] = 'low'
  details?: any
  url?: string
  selector?: string
  timestamp: Date
  retryable: boolean
  retryCount: number
  
  constructor(message: string, selector?: string, url?: string) {
    super(message)
    this.name = 'ParsingError'
    this.selector = selector
    this.url = url
    this.timestamp = new Date()
    this.retryable = false
    this.retryCount = 0
  }
}

export class CaptchaError extends Error implements ScrapingError {
  type: ScrapingError['type'] = 'captcha'
  severity: ScrapingError['severity'] = 'critical'
  details?: any
  url?: string
  timestamp: Date
  retryable: boolean
  retryCount: number
  
  constructor(message: string, url?: string) {
    super(message)
    this.name = 'CaptchaError'
    this.url = url
    this.timestamp = new Date()
    this.retryable = false
    this.retryCount = 0
  }
}