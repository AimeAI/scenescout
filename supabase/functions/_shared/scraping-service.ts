interface ScrapingConfig {
  userAgent: string
  maxRetries: number
  timeout: number
  rateLimit: {
    requests: number
    window: number
  }
}

interface RateLimiter {
  requests: number[]
  maxRequests: number
  windowMs: number
}

export class ScrapingService {
  private config: ScrapingConfig
  private rateLimiter: RateLimiter

  constructor(config: ScrapingConfig) {
    this.config = config
    this.rateLimiter = {
      requests: [],
      maxRequests: config.rateLimit.requests,
      windowMs: config.rateLimit.window
    }
  }

  async fetchWithRetry(url: string, options: RequestInit = {}): Promise<Response> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        await this.checkRateLimit()
        
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), this.config.timeout)
        
        const response = await fetch(url, {
          ...options,
          headers: {
            'User-Agent': this.config.userAgent,
            ...options.headers
          },
          signal: controller.signal
        })
        
        clearTimeout(timeout)
        
        if (response.ok) {
          return response
        }
        
        if (response.status === 429) {
          // Rate limited, wait and retry
          const retryAfter = response.headers.get('Retry-After')
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000
          console.log(`Rate limited, waiting ${waitTime}ms before retry ${attempt}`)
          await this.delay(waitTime)
          continue
        }
        
        if (response.status >= 500) {
          // Server error, retry
          const waitTime = Math.pow(2, attempt) * 1000
          console.log(`Server error ${response.status}, waiting ${waitTime}ms before retry ${attempt}`)
          await this.delay(waitTime)
          continue
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        
      } catch (error) {
        lastError = error as Error
        
        if (error.name === 'AbortError') {
          console.log(`Request timeout, attempt ${attempt}/${this.config.maxRetries}`)
        } else {
          console.log(`Request failed: ${error.message}, attempt ${attempt}/${this.config.maxRetries}`)
        }
        
        if (attempt < this.config.maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000
          await this.delay(waitTime)
        }
      }
    }
    
    throw lastError || new Error('Max retries exceeded')
  }

  async fetchHtml(url: string): Promise<string> {
    const response = await this.fetchWithRetry(url, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate'
      }
    })
    
    return await response.text()
  }

  async fetchJson(url: string): Promise<any> {
    const response = await this.fetchWithRetry(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
    
    return await response.json()
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now()
    
    // Remove requests outside the window
    this.rateLimiter.requests = this.rateLimiter.requests.filter(
      timestamp => now - timestamp < this.rateLimiter.windowMs
    )
    
    // Check if we've exceeded the rate limit
    if (this.rateLimiter.requests.length >= this.rateLimiter.maxRequests) {
      const oldestRequest = Math.min(...this.rateLimiter.requests)
      const waitTime = this.rateLimiter.windowMs - (now - oldestRequest)
      
      if (waitTime > 0) {
        console.log(`Rate limit reached, waiting ${waitTime}ms`)
        await this.delay(waitTime)
      }
    }
    
    // Record this request
    this.rateLimiter.requests.push(now)
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Utility methods for parsing common data structures
  extractJsonFromScript(html: string, pattern: RegExp = /__INITIAL_STATE__\s*=\s*({.*?});/): any {
    try {
      const matches = html.match(pattern)
      if (matches && matches[1]) {
        return JSON.parse(matches[1])
      }
    } catch (error) {
      console.error('Failed to extract JSON from script:', error)
    }
    return null
  }

  extractStructuredData(html: string): any[] {
    const structuredData: any[] = []
    const scriptMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
    
    if (scriptMatches) {
      scriptMatches.forEach(script => {
        try {
          const jsonStr = script.replace(/<script[^>]*>/, '').replace(/<\/script>/, '')
          const data = JSON.parse(jsonStr)
          structuredData.push(data)
        } catch (error) {
          console.error('Failed to parse structured data:', error)
        }
      })
    }
    
    return structuredData
  }

  extractMetaTags(html: string): Record<string, string> {
    const metaTags: Record<string, string> = {}
    const metaMatches = html.match(/<meta[^>]*>/gi) || []
    
    metaMatches.forEach(tag => {
      const nameMatch = tag.match(/name=["']([^"']+)["']/i)
      const propertyMatch = tag.match(/property=["']([^"']+)["']/i)
      const contentMatch = tag.match(/content=["']([^"']+)["']/i)
      
      if (contentMatch) {
        const key = nameMatch?.[1] || propertyMatch?.[1]
        if (key) {
          metaTags[key] = contentMatch[1]
        }
      }
    })
    
    return metaTags
  }

  sanitizeText(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[\r\n]+/g, ' ')
      .trim()
  }

  parseDateTime(dateStr: string): string | null {
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) {
        return null
      }
      return date.toISOString()
    } catch (error) {
      console.error('Failed to parse date:', error)
      return null
    }
  }
}