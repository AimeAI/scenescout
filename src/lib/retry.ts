/**
 * Retry Utility with Exponential Backoff
 * Provides robust retry logic for API calls and edge functions
 */

export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts?: number
  /** Initial delay in milliseconds */
  initialDelay?: number
  /** Maximum delay in milliseconds */
  maxDelay?: number
  /** Backoff multiplier */
  backoffMultiplier?: number
  /** Function to determine if error is retryable */
  shouldRetry?: (error: Error, attempt: number) => boolean
  /** Callback when retry occurs */
  onRetry?: (error: Error, attempt: number, delay: number) => void
  /** Request timeout in milliseconds */
  timeout?: number
}

export interface RetryStats {
  attempts: number
  totalDelay: number
  lastError?: Error
  success: boolean
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  shouldRetry: (error: Error) => {
    // Retry on network errors, timeouts, and 5xx errors
    const retryableErrors = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ENETUNREACH',
      '500',
      '502',
      '503',
      '504',
    ]
    return retryableErrors.some(code => error.message.includes(code))
  },
  onRetry: () => {},
  timeout: 30000,
}

/**
 * Calculate delay for next retry using exponential backoff with jitter
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  // Exponential backoff: delay = initialDelay * (multiplier ^ attempt)
  const exponentialDelay = initialDelay * Math.pow(multiplier, attempt)

  // Add jitter (random ±25%) to prevent thundering herd
  const jitter = 0.75 + Math.random() * 0.5
  const delayWithJitter = exponentialDelay * jitter

  // Cap at maxDelay
  return Math.min(delayWithJitter, maxDelay)
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Wrap a promise with timeout
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutError)), timeoutMs)
    ),
  ])
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<{ result: T; stats: RetryStats }> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  const stats: RetryStats = {
    attempts: 0,
    totalDelay: 0,
    success: false,
  }

  let lastError: Error | undefined

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    stats.attempts = attempt + 1

    try {
      // Wrap function with timeout if specified
      const result = opts.timeout
        ? await withTimeout(
            fn(),
            opts.timeout,
            `Request timed out after ${opts.timeout}ms`
          )
        : await fn()

      stats.success = true
      return { result, stats }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      stats.lastError = lastError

      // Check if we should retry
      const isLastAttempt = attempt === opts.maxAttempts - 1
      const shouldRetryError = opts.shouldRetry(lastError, attempt)

      if (isLastAttempt || !shouldRetryError) {
        // Don't retry - throw the error
        throw lastError
      }

      // Calculate delay for next attempt
      const delay = calculateDelay(
        attempt,
        opts.initialDelay,
        opts.maxDelay,
        opts.backoffMultiplier
      )
      stats.totalDelay += delay

      // Call retry callback
      opts.onRetry(lastError, attempt + 1, delay)

      // Wait before retrying
      await sleep(delay)
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError || new Error('Retry failed')
}

/**
 * Retry wrapper specifically for fetch requests
 */
export async function retryFetch(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  const { result } = await retry(async () => {
    const response = await fetch(url, init)

    // Treat 5xx and 429 as retryable errors
    if (response.status >= 500 || response.status === 429) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response
  }, {
    ...options,
    shouldRetry: (error, attempt) => {
      // Retry on 5xx, 429, and network errors
      const is5xx = error.message.match(/HTTP 5\d\d/)
      const is429 = error.message.includes('429')
      const isNetworkError = options?.shouldRetry?.(error, attempt) ??
        DEFAULT_OPTIONS.shouldRetry(error, attempt)

      return !!(is5xx || is429 || isNetworkError)
    },
  })

  return result
}

/**
 * Circuit Breaker Pattern
 * Prevents cascading failures by stopping requests when failure rate is high
 */
export class CircuitBreaker {
  private failureCount = 0
  private successCount = 0
  private lastFailureTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'

  constructor(
    private options: {
      /** Number of failures before opening circuit */
      failureThreshold?: number
      /** Time in ms to wait before attempting to close circuit */
      resetTimeout?: number
      /** Minimum requests before evaluating circuit */
      minimumRequests?: number
    } = {}
  ) {
    this.options = {
      failureThreshold: 5,
      resetTimeout: 60000,
      minimumRequests: 10,
      ...options,
    }
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition to half-open
    if (this.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime
      if (timeSinceLastFailure >= (this.options.resetTimeout || 60000)) {
        this.state = 'half-open'
        console.log('🔄 Circuit breaker: Transitioning to half-open')
      } else {
        throw new Error(
          `Circuit breaker is open. Retry after ${Math.ceil((this.options.resetTimeout! - timeSinceLastFailure) / 1000)}s`
        )
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess() {
    this.successCount++

    if (this.state === 'half-open') {
      // Successful request in half-open state closes the circuit
      this.state = 'closed'
      this.failureCount = 0
      console.log('✅ Circuit breaker: Closed after successful request')
    }
  }

  private onFailure() {
    this.failureCount++
    this.lastFailureTime = Date.now()

    const totalRequests = this.failureCount + this.successCount
    const failureRate = this.failureCount / totalRequests

    // Only evaluate circuit if we have minimum requests
    if (totalRequests >= (this.options.minimumRequests || 10)) {
      const threshold = (this.options.failureThreshold || 5) / 100

      if (failureRate >= threshold || this.state === 'half-open') {
        this.state = 'open'
        console.error(
          `⚠️ Circuit breaker: Opened (${this.failureCount} failures, ${(failureRate * 100).toFixed(1)}% failure rate)`
        )
      }
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    }
  }

  reset() {
    this.state = 'closed'
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = 0
  }
}

/**
 * Error logger for monitoring
 */
export class ErrorLogger {
  private errors: Array<{
    timestamp: Date
    error: Error
    context?: Record<string, any>
  }> = []

  log(error: Error, context?: Record<string, any>) {
    this.errors.push({
      timestamp: new Date(),
      error,
      context,
    })

    // Log to console
    console.error('❌ Error logged:', {
      message: error.message,
      stack: error.stack,
      context,
    })

    // Keep only last 100 errors
    if (this.errors.length > 100) {
      this.errors.shift()
    }
  }

  getErrors(since?: Date) {
    if (since) {
      return this.errors.filter(e => e.timestamp >= since)
    }
    return this.errors
  }

  getErrorRate(windowMs: number = 60000): number {
    const since = new Date(Date.now() - windowMs)
    const recentErrors = this.getErrors(since)
    return recentErrors.length / (windowMs / 1000)
  }

  clear() {
    this.errors = []
  }
}

// Global error logger instance
export const errorLogger = new ErrorLogger()
