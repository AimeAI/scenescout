/**
 * Playwright configuration for SceneScout scraping infrastructure
 * Provides optimized settings for respectful and efficient scraping
 */

import { BrowserType, LaunchOptions, Browser } from 'playwright'
import { chromium, firefox, webkit } from 'playwright'
import UserAgent from 'user-agents'
import { ScraperConfig } from '../types'

export interface PlaywrightConfig extends LaunchOptions {
  browserType: 'chromium' | 'firefox' | 'webkit'
  userAgentRotation: boolean
  proxyRotation: boolean
  fingerprintRandomization: boolean
}

/**
 * Default configuration for production scraping
 */
export const DEFAULT_SCRAPER_CONFIG: ScraperConfig = {
  name: 'default',
  enabled: true,
  rateLimit: {
    requestsPerMinute: 30,
    burstLimit: 5,
    delayBetweenRequests: 2000
  },
  timeout: {
    navigationTimeout: 30000,
    actionTimeout: 10000,
    waitTimeout: 5000
  },
  retry: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2
  },
  browser: {
    headless: true,
    viewport: { width: 1920, height: 1080 },
    userAgent: null, // Will be rotated
    locale: 'en-US',
    timezone: 'America/New_York'
  },
  respectRobotsTxt: true,
  useStealthMode: true
}

/**
 * Browser-specific configurations optimized for different targets
 */
export const BROWSER_CONFIGS: Record<string, PlaywrightConfig> = {
  // Fast, lightweight configuration for API-like scraping
  fast: {
    browserType: 'chromium',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-feature=Translate',
      '--disable-ipc-flooding-protection'
    ],
    userAgentRotation: false,
    proxyRotation: false,
    fingerprintRandomization: false
  },
  
  // Stealth configuration for anti-bot websites
  stealth: {
    browserType: 'chromium',
    headless: true,
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-web-security',
      '--disable-client-side-phishing-detection',
      '--disable-features=TranslateUI,BlinkGenPropertyTrees',
      '--disable-component-extensions-with-background-pages',
      '--no-pings',
      '--disable-default-apps'
    ],
    userAgentRotation: true,
    proxyRotation: true,
    fingerprintRandomization: true
  },
  
  // Slow, careful configuration for heavily protected sites
  careful: {
    browserType: 'firefox',
    headless: true,
    firefoxUserPrefs: {
      'dom.webaudio.enabled': false,
      'media.navigator.enabled': false,
      'media.peerconnection.enabled': false,
      'webgl.disabled': true,
      'privacy.trackingprotection.enabled': true,
      'browser.cache.disk.enable': false,
      'browser.cache.memory.enable': false,
      'network.cookie.cookieBehavior': 1
    },
    userAgentRotation: true,
    proxyRotation: true,
    fingerprintRandomization: true
  },
  
  // Development configuration with debugging enabled
  debug: {
    browserType: 'chromium',
    headless: false,
    devtools: true,
    slowMo: 100,
    args: ['--start-maximized'],
    userAgentRotation: false,
    proxyRotation: false,
    fingerprintRandomization: false
  }
}

/**
 * User agent rotation manager
 */
export class UserAgentRotator {
  private userAgents: string[] = []
  private currentIndex = 0
  
  constructor() {
    this.generateUserAgents()
  }
  
  /**
   * Generate a pool of realistic user agents
   */
  private generateUserAgents(): void {
    const userAgent = new UserAgent()
    
    // Generate 50 different user agents
    for (let i = 0; i < 50; i++) {
      this.userAgents.push(userAgent.toString())
    }
  }
  
  /**
   * Get the next user agent in rotation
   */
  getNext(): string {
    const agent = this.userAgents[this.currentIndex]
    this.currentIndex = (this.currentIndex + 1) % this.userAgents.length
    return agent
  }
  
  /**
   * Get a random user agent
   */
  getRandom(): string {
    const randomIndex = Math.floor(Math.random() * this.userAgents.length)
    return this.userAgents[randomIndex]
  }
  
  /**
   * Get user agent for specific browser type
   */
  getForBrowser(browserType: 'chromium' | 'firefox' | 'webkit'): string {
    const filters = {
      chromium: (ua: string) => ua.includes('Chrome') && !ua.includes('Firefox'),
      firefox: (ua: string) => ua.includes('Firefox'),
      webkit: (ua: string) => ua.includes('Safari') && !ua.includes('Chrome')
    }
    
    const filtered = this.userAgents.filter(filters[browserType])
    if (filtered.length === 0) {
      return this.getRandom()
    }
    
    return filtered[Math.floor(Math.random() * filtered.length)]
  }
}

/**
 * Browser factory for creating optimized browser instances
 */
export class BrowserFactory {
  private static userAgentRotator = new UserAgentRotator()
  
  /**
   * Create a browser instance with specified configuration
   */
  static async createBrowser(
    configName: keyof typeof BROWSER_CONFIGS = 'stealth'
  ): Promise<Browser> {
    const config = BROWSER_CONFIGS[configName]
    const browserType = this.getBrowserType(config.browserType)
    
    const launchOptions: LaunchOptions = {
      headless: config.headless,
      args: config.args,
      devtools: config.devtools,
      slowMo: config.slowMo,
      timeout: 30000
    }
    
    // Add Firefox-specific options
    if (config.browserType === 'firefox' && config.firefoxUserPrefs) {
      launchOptions.firefoxUserPrefs = config.firefoxUserPrefs
    }
    
    return await browserType.launch(launchOptions)
  }
  
  /**
   * Create a context with randomized fingerprint
   */
  static async createStealthContext(
    browser: Browser,
    config: ScraperConfig,
    playwrightConfig?: PlaywrightConfig
  ) {
    const contextOptions: any = {
      viewport: config.browser.viewport,
      locale: config.browser.locale,
      timezoneId: config.browser.timezone,
      userAgent: this.getUserAgent(playwrightConfig),
      ignoreHTTPSErrors: true,
      javaScriptEnabled: true
    }
    
    // Randomize fingerprint if enabled
    if (playwrightConfig?.fingerprintRandomization) {
      contextOptions.viewport = this.randomizeViewport()
      contextOptions.locale = this.randomizeLocale()
      contextOptions.timezoneId = this.randomizeTimezone()
    }
    
    const context = await browser.newContext(contextOptions)
    
    // Apply stealth scripts
    if (config.useStealthMode) {
      await this.applyStealthScripts(context)
    }
    
    return context
  }
  
  /**
   * Get browser type instance
   */
  private static getBrowserType(type: 'chromium' | 'firefox' | 'webkit'): BrowserType {
    switch (type) {
      case 'chromium':
        return chromium
      case 'firefox':
        return firefox
      case 'webkit':
        return webkit
      default:
        return chromium
    }
  }
  
  /**
   * Get user agent based on configuration
   */
  private static getUserAgent(config?: PlaywrightConfig): string {
    if (!config?.userAgentRotation) {
      return new UserAgent().toString()
    }
    
    return this.userAgentRotator.getForBrowser(config.browserType)
  }
  
  /**
   * Randomize viewport dimensions
   */
  private static randomizeViewport() {
    const widths = [1366, 1440, 1536, 1920, 2560]
    const heights = [768, 900, 1024, 1080, 1440]
    
    return {
      width: widths[Math.floor(Math.random() * widths.length)],
      height: heights[Math.floor(Math.random() * heights.length)]
    }
  }
  
  /**
   * Randomize locale
   */
  private static randomizeLocale(): string {
    const locales = ['en-US', 'en-GB', 'en-CA', 'en-AU']
    return locales[Math.floor(Math.random() * locales.length)]
  }
  
  /**
   * Randomize timezone
   */
  private static randomizeTimezone(): string {
    const timezones = [
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'America/Toronto',
      'Europe/London',
      'Europe/Paris',
      'Australia/Sydney'
    ]
    return timezones[Math.floor(Math.random() * timezones.length)]
  }
  
  /**
   * Apply stealth scripts to avoid detection
   */
  private static async applyStealthScripts(context: any): Promise<void> {
    // Remove webdriver property
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      })
    })
    
    // Override plugins
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'plugins', {
        get: () => ({
          length: 3,
          0: { name: 'Chrome PDF Plugin' },
          1: { name: 'Chrome PDF Viewer' },
          2: { name: 'Native Client' }
        })
      })
    })
    
    // Override permissions
    await context.addInitScript(() => {
      const originalQuery = window.navigator.permissions.query
      window.navigator.permissions.query = (parameters: any) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      )
    })
    
    // Override languages
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      })
    })
    
    // Override hardwareConcurrency
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 4
      })
    })
    
    // Override platform
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'platform', {
        get: () => 'Win32'
      })
    })
    
    // Override memory
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8
      })
    })
    
    // Mock chrome object
    await context.addInitScript(() => {
      (window as any).chrome = {
        runtime: {},
        loadTimes: () => ({}),
        csi: () => ({}),
        app: {}
      }
    })
    
    // Override WebGL vendor and renderer
    await context.addInitScript(() => {
      const getParameter = WebGLRenderingContext.prototype.getParameter
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'Intel Inc.'
        }
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine'
        }
        return getParameter.apply(this, [parameter])
      }
    })
  }
}

/**
 * Proxy rotation manager (for future implementation)
 */
export class ProxyRotator {
  private proxies: Array<{
    server: string
    username?: string
    password?: string
  }> = []
  
  private currentIndex = 0
  
  constructor(proxies: Array<{ server: string; username?: string; password?: string }> = []) {
    this.proxies = proxies
  }
  
  /**
   * Get the next proxy in rotation
   */
  getNext() {
    if (this.proxies.length === 0) {
      return null
    }
    
    const proxy = this.proxies[this.currentIndex]
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length
    return proxy
  }
  
  /**
   * Get a random proxy
   */
  getRandom() {
    if (this.proxies.length === 0) {
      return null
    }
    
    const randomIndex = Math.floor(Math.random() * this.proxies.length)
    return this.proxies[randomIndex]
  }
  
  /**
   * Add a proxy to the rotation
   */
  addProxy(proxy: { server: string; username?: string; password?: string }) {
    this.proxies.push(proxy)
  }
  
  /**
   * Remove a proxy from rotation
   */
  removeProxy(server: string) {
    this.proxies = this.proxies.filter(p => p.server !== server)
  }
}

/**
 * Request interceptor for monitoring and optimization
 */
export class RequestInterceptor {
  private blockedResources = new Set(['image', 'stylesheet', 'font', 'media'])
  private allowedDomains = new Set<string>()
  private blockedDomains = new Set<string>()
  
  constructor(options: {
    blockResources?: string[]
    allowedDomains?: string[]
    blockedDomains?: string[]
  } = {}) {
    if (options.blockResources) {
      this.blockedResources = new Set(options.blockResources)
    }
    
    if (options.allowedDomains) {
      this.allowedDomains = new Set(options.allowedDomains)
    }
    
    if (options.blockedDomains) {
      this.blockedDomains = new Set(options.blockedDomains)
    }
  }
  
  /**
   * Determine if a request should be blocked
   */
  shouldBlockRequest(url: string, resourceType: string): boolean {
    const domain = new URL(url).hostname
    
    // Block if domain is in blocklist
    if (this.blockedDomains.has(domain)) {
      return true
    }
    
    // Allow if domain is in allowlist (and allowlist is not empty)
    if (this.allowedDomains.size > 0 && !this.allowedDomains.has(domain)) {
      return true
    }
    
    // Block if resource type is blocked
    return this.blockedResources.has(resourceType)
  }
  
  /**
   * Modify request headers for stealth
   */
  modifyHeaders(headers: Record<string, string>): Record<string, string> {
    return {
      ...headers,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0'
    }
  }
}