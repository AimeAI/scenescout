/**
 * Advanced Rate Limiter
 * Implements token bucket and sliding window algorithms for API rate limiting
 */

interface RateLimitConfig {
  /** Maximum requests allowed in the time window */
  maxRequests: number
  /** Time window in milliseconds */
  windowMs: number
  /** Optional: requests per second limit */
  requestsPerSecond?: number
  /** Optional: minimum delay between requests (ms) */
  minRequestInterval?: number
  /** Optional: enable adaptive rate limiting */
  adaptive?: boolean
}

interface RateLimitStatus {
  remaining: number
  resetAt: number
  retryAfter?: number
}

interface QueuedRequest {
  resolve: (value: RateLimitStatus) => void
  reject: (error: Error) => void
  timestamp: number
  priority: number
}

/**
 * Token Bucket Rate Limiter
 * Allows bursts while maintaining average rate
 */
export class TokenBucketRateLimiter {
  private tokens: number
  private lastRefill: number
  private queue: QueuedRequest[] = []
  private processing = false

  constructor(
    private config: RateLimitConfig,
    private identifier: string = 'default'
  ) {
    this.tokens = config.maxRequests
    this.lastRefill = Date.now()
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refillTokens(): void {
    const now = Date.now()
    const timePassed = now - this.lastRefill
    const tokensToAdd = (timePassed / this.config.windowMs) * this.config.maxRequests

    this.tokens = Math.min(this.config.maxRequests, this.tokens + tokensToAdd)
    this.lastRefill = now
  }

  /**
   * Wait for rate limit clearance
   */
  async waitForToken(priority: number = 0): Promise<RateLimitStatus> {
    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject, timestamp: Date.now(), priority })
      this.queue.sort((a, b) => b.priority - a.priority) // Higher priority first
      this.processQueue()
    })
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    while (this.queue.length > 0) {
      this.refillTokens()

      if (this.tokens >= 1) {
        const request = this.queue.shift()!
        this.tokens -= 1

        // Apply minimum interval if configured
        if (this.config.minRequestInterval) {
          await this.sleep(this.config.minRequestInterval)
        }

        request.resolve({
          remaining: Math.floor(this.tokens),
          resetAt: this.lastRefill + this.config.windowMs,
        })
      } else {
        // Not enough tokens, calculate wait time
        const timeUntilNextToken =
          this.config.windowMs - (Date.now() - this.lastRefill)

        if (timeUntilNextToken > 0) {
          await this.sleep(Math.min(timeUntilNextToken, 1000))
        }
      }
    }

    this.processing = false
  }

  /**
   * Get current rate limit status
   */
  getStatus(): RateLimitStatus {
    this.refillTokens()
    const resetAt = this.lastRefill + this.config.windowMs
    const retryAfter = this.tokens < 1 ? resetAt - Date.now() : undefined

    return {
      remaining: Math.floor(this.tokens),
      resetAt,
      retryAfter,
    }
  }

  /**
   * Reset rate limiter
   */
  reset(): void {
    this.tokens = this.config.maxRequests
    this.lastRefill = Date.now()
    this.queue = []
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Sliding Window Rate Limiter
 * More accurate but slightly more memory intensive
 */
export class SlidingWindowRateLimiter {
  private requests: number[] = []

  constructor(
    private config: RateLimitConfig,
    private identifier: string = 'default'
  ) {}

  /**
   * Wait for rate limit clearance
   */
  async waitForToken(priority: number = 0): Promise<RateLimitStatus> {
    const now = Date.now()

    // Remove old requests outside the window
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.config.windowMs
    )

    // Check if we're at the limit
    if (this.requests.length >= this.config.maxRequests) {
      const oldestRequest = this.requests[0]
      const retryAfter = this.config.windowMs - (now - oldestRequest)

      // Wait until oldest request expires
      await this.sleep(retryAfter)
      return this.waitForToken(priority) // Retry
    }

    // Apply per-second limit if configured
    if (this.config.requestsPerSecond) {
      const recentRequests = this.requests.filter(
        timestamp => now - timestamp < 1000
      )
      if (recentRequests.length >= this.config.requestsPerSecond) {
        await this.sleep(1000 - (now - recentRequests[0]))
      }
    }

    // Apply minimum interval if configured
    if (this.config.minRequestInterval && this.requests.length > 0) {
      const timeSinceLastRequest = now - this.requests[this.requests.length - 1]
      if (timeSinceLastRequest < this.config.minRequestInterval) {
        await this.sleep(this.config.minRequestInterval - timeSinceLastRequest)
      }
    }

    // Add current request
    this.requests.push(Date.now())

    return {
      remaining: this.config.maxRequests - this.requests.length,
      resetAt: this.requests[0] + this.config.windowMs,
    }
  }

  /**
   * Get current rate limit status
   */
  getStatus(): RateLimitStatus {
    const now = Date.now()
    this.requests = this.requests.filter(
      timestamp => now - timestamp < this.config.windowMs
    )

    const resetAt = this.requests.length > 0
      ? this.requests[0] + this.config.windowMs
      : now

    return {
      remaining: this.config.maxRequests - this.requests.length,
      resetAt,
    }
  }

  /**
   * Reset rate limiter
   */
  reset(): void {
    this.requests = []
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Multi-tier Rate Limiter
 * Combines multiple rate limit rules (e.g., per-second, per-minute, per-hour)
 */
export class MultiTierRateLimiter {
  private limiters: SlidingWindowRateLimiter[]

  constructor(
    private tiers: RateLimitConfig[],
    private identifier: string = 'default'
  ) {
    this.limiters = tiers.map(
      config => new SlidingWindowRateLimiter(config, identifier)
    )
  }

  /**
   * Wait for all tier limits
   */
  async waitForToken(priority: number = 0): Promise<RateLimitStatus> {
    // Wait for each tier sequentially
    const statuses = []
    for (const limiter of this.limiters) {
      const status = await limiter.waitForToken(priority)
      statuses.push(status)
    }

    // Return the most restrictive status
    return statuses.reduce((mostRestrictive, current) => ({
      remaining: Math.min(mostRestrictive.remaining, current.remaining),
      resetAt: Math.max(mostRestrictive.resetAt, current.resetAt),
      retryAfter: Math.max(mostRestrictive.retryAfter || 0, current.retryAfter || 0),
    }))
  }

  /**
   * Get combined status
   */
  getStatus(): RateLimitStatus {
    const statuses = this.limiters.map(limiter => limiter.getStatus())
    return statuses.reduce((mostRestrictive, current) => ({
      remaining: Math.min(mostRestrictive.remaining, current.remaining),
      resetAt: Math.max(mostRestrictive.resetAt, current.resetAt),
    }))
  }

  /**
   * Reset all limiters
   */
  reset(): void {
    this.limiters.forEach(limiter => limiter.reset())
  }
}

/**
 * Rate Limiter Manager
 * Manages multiple rate limiters for different APIs
 */
export class RateLimiterManager {
  private limiters = new Map<string, TokenBucketRateLimiter | SlidingWindowRateLimiter | MultiTierRateLimiter>()

  /**
   * Get or create a rate limiter for an API
   */
  getLimiter(
    apiName: string,
    config: RateLimitConfig | RateLimitConfig[],
    algorithm: 'token-bucket' | 'sliding-window' | 'multi-tier' = 'token-bucket'
  ): TokenBucketRateLimiter | SlidingWindowRateLimiter | MultiTierRateLimiter {
    const key = apiName

    if (!this.limiters.has(key)) {
      let limiter: TokenBucketRateLimiter | SlidingWindowRateLimiter | MultiTierRateLimiter

      if (algorithm === 'multi-tier' && Array.isArray(config)) {
        limiter = new MultiTierRateLimiter(config, apiName)
      } else if (algorithm === 'sliding-window') {
        limiter = new SlidingWindowRateLimiter(config as RateLimitConfig, apiName)
      } else {
        limiter = new TokenBucketRateLimiter(config as RateLimitConfig, apiName)
      }

      this.limiters.set(key, limiter)
    }

    return this.limiters.get(key)!
  }

  /**
   * Execute function with rate limiting
   */
  async executeWithLimit<T>(
    apiName: string,
    fn: () => Promise<T>,
    config?: RateLimitConfig,
    priority: number = 0
  ): Promise<T> {
    const limiter = config
      ? this.getLimiter(apiName, config)
      : this.limiters.get(apiName)

    if (!limiter) {
      throw new Error(`No rate limiter configured for ${apiName}`)
    }

    await limiter.waitForToken(priority)
    return fn()
  }

  /**
   * Get status for an API
   */
  getStatus(apiName: string): RateLimitStatus | null {
    const limiter = this.limiters.get(apiName)
    return limiter ? limiter.getStatus() : null
  }

  /**
   * Reset a specific limiter
   */
  reset(apiName: string): void {
    const limiter = this.limiters.get(apiName)
    if (limiter) {
      limiter.reset()
    }
  }

  /**
   * Reset all limiters
   */
  resetAll(): void {
    this.limiters.forEach(limiter => limiter.reset())
  }

  /**
   * Get all limiter statuses
   */
  getAllStatuses(): Record<string, RateLimitStatus> {
    const statuses: Record<string, RateLimitStatus> = {}
    this.limiters.forEach((limiter, key) => {
      statuses[key] = limiter.getStatus()
    })
    return statuses
  }
}

// Singleton instance
export const rateLimiterManager = new RateLimiterManager()

/**
 * Predefined rate limit configs for common APIs
 */
export const API_RATE_LIMITS = {
  // Ticketmaster: 5000 requests per day, 5 per second
  ticketmaster: [
    {
      maxRequests: 5,
      windowMs: 1000, // per second
      minRequestInterval: 200, // 200ms between requests
    },
    {
      maxRequests: 5000,
      windowMs: 24 * 60 * 60 * 1000, // per day
    },
  ] as RateLimitConfig[],

  // Eventbrite: 1000 requests per hour
  eventbrite: {
    maxRequests: 1000,
    windowMs: 60 * 60 * 1000, // per hour
    requestsPerSecond: 10, // Conservative limit
    minRequestInterval: 100, // 100ms between requests
  } as RateLimitConfig,

  // Generic scraping: Conservative limits
  scraping: {
    maxRequests: 30,
    windowMs: 60 * 1000, // per minute
    minRequestInterval: 2000, // 2 seconds between requests
  } as RateLimitConfig,

  // Supabase: Very high limits (self-hosted/managed)
  supabase: {
    maxRequests: 1000,
    windowMs: 60 * 1000, // per minute
  } as RateLimitConfig,
}

/**
 * Helper to create a rate-limited function
 */
export function rateLimited<T extends (...args: any[]) => Promise<any>>(
  apiName: string,
  fn: T,
  config: RateLimitConfig | RateLimitConfig[]
): T {
  const algorithm = Array.isArray(config) ? 'multi-tier' : 'token-bucket'
  rateLimiterManager.getLimiter(apiName, config, algorithm)

  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return rateLimiterManager.executeWithLimit(apiName, () => fn(...args))
  }) as T
}
