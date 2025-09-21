// Base API Client with rate limiting, retry logic, and error handling
import { ApiConfig, ApiResponse, ApiError, RateLimitState, RetryableRequest } from './types'

export class BaseApiClient {
  protected config: ApiConfig
  protected rateLimitState: RateLimitState
  protected requestQueue: Array<() => Promise<any>> = []
  protected isProcessingQueue = false

  constructor(config: ApiConfig) {
    this.config = config
    this.rateLimitState = {
      requests: 0,
      resetTime: Date.now() + config.rateLimit.windowMs,
      isLimited: false
    }
  }

  /**
   * Make a rate-limited HTTP request
   */
  protected async makeRequest<T>(
    url: string, 
    options: RequestInit = {},
    retries?: number
  ): Promise<ApiResponse<T>> {
    await this.waitForRateLimit()
    
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SceneScout/1.0',
        ...options.headers
      },
      signal: AbortSignal.timeout(this.config.timeout)
    }

    try {
      const response = await fetch(url, requestOptions)
      
      // Update rate limit state from headers
      this.updateRateLimitFromHeaders(response.headers)
      
      if (!response.ok) {
        throw await this.createApiError(response)
      }
      
      const data = await response.json()
      
      return {
        data,
        rateLimit: {
          remaining: this.getRemainingRequests(),
          reset: this.rateLimitState.resetTime
        }
      }
    } catch (error) {
      if (error instanceof ApiError && error.isRetryable && retries && retries > 0) {
        await this.delay(this.config.retryOptions.retryDelay)
        return this.makeRequest<T>(url, options, retries - 1)
      }
      throw error
    }
  }

  /**
   * Make a request with automatic retry logic
   */
  protected async makeRetryableRequest<T>(
    requestFn: () => Promise<ApiResponse<T>>
  ): Promise<ApiResponse<T>> {
    const retryRequest: RetryableRequest<ApiResponse<T>> = {
      attempt: 0,
      maxAttempts: this.config.retryOptions.retries,
      execute: requestFn
    }

    return this.executeWithRetry(retryRequest)
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(
    retryRequest: RetryableRequest<T>
  ): Promise<T> {
    while (retryRequest.attempt < retryRequest.maxAttempts) {
      try {
        retryRequest.attempt++
        return await retryRequest.execute()
      } catch (error) {
        retryRequest.lastError = error as Error
        
        const apiError = error as ApiError
        if (!apiError.isRetryable || retryRequest.attempt >= retryRequest.maxAttempts) {
          throw error
        }
        
        // Exponential backoff
        const delay = this.config.retryOptions.retryDelay * Math.pow(2, retryRequest.attempt - 1)
        await this.delay(delay)
      }
    }
    
    throw retryRequest.lastError || new Error('Max retries exceeded')
  }

  /**
   * Wait if we're rate limited
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now()
    
    // Reset window if expired
    if (now >= this.rateLimitState.resetTime) {
      this.rateLimitState.requests = 0
      this.rateLimitState.resetTime = now + this.config.rateLimit.windowMs
      this.rateLimitState.isLimited = false
    }
    
    // Check if we're at the limit
    if (this.rateLimitState.requests >= this.config.rateLimit.requests) {
      this.rateLimitState.isLimited = true
      const waitTime = this.rateLimitState.resetTime - now
      await this.delay(waitTime)
      return this.waitForRateLimit()
    }
    
    this.rateLimitState.requests++
  }

  /**
   * Update rate limit state from response headers
   */
  private updateRateLimitFromHeaders(headers: Headers): void {
    // Common rate limit headers across APIs
    const remaining = headers.get('x-ratelimit-remaining') || 
                     headers.get('x-rate-limit-remaining') ||
                     headers.get('ratelimit-remaining')
    
    const reset = headers.get('x-ratelimit-reset') || 
                  headers.get('x-rate-limit-reset') ||
                  headers.get('ratelimit-reset')
    
    const limit = headers.get('x-ratelimit-limit') || 
                  headers.get('x-rate-limit-limit') ||
                  headers.get('ratelimit-limit')

    if (remaining) {
      this.rateLimitState.requests = 
        Math.max(0, (parseInt(limit || '0') || this.config.rateLimit.requests) - parseInt(remaining || '0'))
    }
    
    if (reset) {
      // Handle both timestamp and seconds-from-now formats
      const resetValue = parseInt(reset)
      this.rateLimitState.resetTime = resetValue > 1000000000 
        ? resetValue * 1000  // Unix timestamp
        : Date.now() + (resetValue * 1000)  // Seconds from now
    }
  }

  /**
   * Create standardized API error
   */
  private async createApiError(response: Response): Promise<ApiError> {
    let message = `HTTP ${response.status}: ${response.statusText}`
    let details: any = null
    
    try {
      const errorBody = await response.text()
      if (errorBody) {
        try {
          details = JSON.parse(errorBody)
          message = details.message || details.error_description || details.error || message
        } catch {
          details = errorBody
        }
      }
    } catch {
      // Failed to parse error body, use default message
    }
    
    const error = new Error(message) as ApiError
    error.status = response.status
    error.details = details
    error.isRetryable = this.isRetryableStatus(response.status)
    
    return error
  }

  /**
   * Determine if an HTTP status is retryable
   */
  private isRetryableStatus(status: number): boolean {
    return status >= 500 || status === 429 || status === 408
  }

  /**
   * Get remaining requests in current window
   */
  private getRemainingRequests(): number {
    return Math.max(0, this.config.rateLimit.requests - this.rateLimitState.requests)
  }

  /**
   * Simple delay utility
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Build URL with query parameters
   */
  protected buildUrl(endpoint: string, params: Record<string, any> = {}): string {
    const url = new URL(endpoint, this.config.baseUrl)
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => url.searchParams.append(key, String(v)))
        } else {
          url.searchParams.append(key, String(value))
        }
      }
    })
    
    return url.toString()
  }

  /**
   * Get rate limit status
   */
  public getRateLimitStatus(): RateLimitState {
    return { ...this.rateLimitState }
  }

  /**
   * Reset rate limit state (useful for testing)
   */
  public resetRateLimit(): void {
    this.rateLimitState = {
      requests: 0,
      resetTime: Date.now() + this.config.rateLimit.windowMs,
      isLimited: false
    }
  }

  /**
   * Add request to queue for batch processing
   */
  protected async addToQueue<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await requestFn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
      
      this.processQueue()
    })
  }

  /**
   * Process request queue with concurrency control
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return
    }
    
    this.isProcessingQueue = true
    
    try {
      while (this.requestQueue.length > 0) {
        const request = this.requestQueue.shift()
        if (request) {
          await request()
        }
      }
    } finally {
      this.isProcessingQueue = false
    }
  }

  /**
   * Get health status of the API
   */
  public async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    rateLimitStatus: RateLimitState
    lastError?: string
  }> {
    try {
      // Simple ping to the API
      await this.makeRequest('/health', { method: 'HEAD' })
      return {
        status: 'healthy',
        rateLimitStatus: this.getRateLimitStatus()
      }
    } catch (error) {
      return {
        status: this.rateLimitState.isLimited ? 'degraded' : 'unhealthy',
        rateLimitStatus: this.getRateLimitStatus(),
        lastError: (error as Error).message
      }
    }
  }
}