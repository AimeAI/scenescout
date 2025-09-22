/**
 * Comprehensive logging system for SceneScout scraping operations
 * Provides structured logging with different levels and output formats
 */

import { ScrapingError, ScrapingSession, ScrapingMetrics } from '../types'

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogEntry {
  timestamp: Date
  level: LogLevel
  category: string
  message: string
  metadata?: any
  sessionId?: string
  scraperId?: string
  targetId?: string
  userId?: string
  correlationId?: string
}

export interface LoggerConfig {
  level: LogLevel
  outputs: LogOutput[]
  includeStackTrace: boolean
  maxLogSize: number // bytes
  retentionDays: number
  enableRemoteLogging: boolean
  structuredLogging: boolean
  sensitiveDataMasks: string[]
}

export interface LogOutput {
  type: 'console' | 'file' | 'database' | 'remote' | 'webhook'
  config: any
  formatter: LogFormatter
  filter?: (entry: LogEntry) => boolean
}

export interface LogFormatter {
  format(entry: LogEntry): string
}

/**
 * Console log formatter for development
 */
export class ConsoleFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString()
    const level = LogLevel[entry.level].padEnd(8)
    const category = entry.category.padEnd(15)
    
    let message = `[${timestamp}] ${level} ${category} ${entry.message}`
    
    if (entry.sessionId) {
      message += ` [session: ${entry.sessionId}]`
    }
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      message += `\n  Metadata: ${JSON.stringify(entry.metadata, null, 2)}`
    }
    
    return message
  }
}

/**
 * JSON formatter for structured logging
 */
export class JsonFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    return JSON.stringify({
      timestamp: entry.timestamp.toISOString(),
      level: LogLevel[entry.level],
      category: entry.category,
      message: entry.message,
      metadata: entry.metadata,
      sessionId: entry.sessionId,
      scraperId: entry.scraperId,
      targetId: entry.targetId,
      userId: entry.userId,
      correlationId: entry.correlationId
    })
  }
}

/**
 * Production formatter with minimal structure
 */
export class ProductionFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    const data = {
      '@timestamp': entry.timestamp.toISOString(),
      level: LogLevel[entry.level],
      category: entry.category,
      message: entry.message,
      session_id: entry.sessionId,
      scraper_id: entry.scraperId,
      target_id: entry.targetId
    }
    
    if (entry.metadata) {
      Object.assign(data, entry.metadata)
    }
    
    return JSON.stringify(data)
  }
}

/**
 * Main logging class
 */
export class ScrapingLogger {
  private config: LoggerConfig
  private outputs: LogOutput[]
  private logBuffer: LogEntry[] = []
  private correlationId: string
  
  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      outputs: [],
      includeStackTrace: false,
      maxLogSize: 10 * 1024 * 1024, // 10MB
      retentionDays: 30,
      enableRemoteLogging: false,
      structuredLogging: true,
      sensitiveDataMasks: ['password', 'apiKey', 'token', 'secret'],
      ...config
    }
    
    this.correlationId = this.generateCorrelationId()
    this.setupDefaultOutputs()
  }
  
  /**
   * Log debug message
   */
  debug(
    category: string,
    message: string,
    metadata?: any,
    context?: { sessionId?: string; scraperId?: string; targetId?: string }
  ): void {
    this.log(LogLevel.DEBUG, category, message, metadata, context)
  }
  
  /**
   * Log info message
   */
  info(
    category: string,
    message: string,
    metadata?: any,
    context?: { sessionId?: string; scraperId?: string; targetId?: string }
  ): void {
    this.log(LogLevel.INFO, category, message, metadata, context)
  }
  
  /**
   * Log warning message
   */
  warn(
    category: string,
    message: string,
    metadata?: any,
    context?: { sessionId?: string; scraperId?: string; targetId?: string }
  ): void {
    this.log(LogLevel.WARN, category, message, metadata, context)
  }
  
  /**
   * Log error message
   */
  error(
    category: string,
    message: string,
    error?: Error | any,
    context?: { sessionId?: string; scraperId?: string; targetId?: string }
  ): void {
    const metadata: any = {}
    
    if (error) {
      metadata.error = {
        name: error.name || 'Error',
        message: error.message,
        stack: this.config.includeStackTrace ? error.stack : undefined
      }
      
      // Include additional error properties
      if (error.code) metadata.error.code = error.code
      if (error.status) metadata.error.status = error.status
      if (error.details) metadata.error.details = error.details
    }
    
    this.log(LogLevel.ERROR, category, message, metadata, context)
  }
  
  /**
   * Log critical message
   */
  critical(
    category: string,
    message: string,
    error?: Error | any,
    context?: { sessionId?: string; scraperId?: string; targetId?: string }
  ): void {
    const metadata: any = {}
    
    if (error) {
      metadata.error = {
        name: error.name || 'Error',
        message: error.message,
        stack: error.stack
      }
    }
    
    this.log(LogLevel.CRITICAL, category, message, metadata, context)
  }
  
  /**
   * Log scraping error
   */
  logScrapingError(
    error: ScrapingError,
    context: { sessionId?: string; scraperId?: string; targetId?: string }
  ): void {
    const metadata = {
      errorType: error.type,
      severity: error.severity,
      retryable: error.retryable,
      retryCount: error.retryCount,
      url: error.url,
      selector: error.selector,
      details: error.details
    }
    
    this.error('scraping', error.message, undefined, {
      ...context,
      ...metadata
    })
  }
  
  /**
   * Log session metrics
   */
  logSessionMetrics(session: ScrapingSession): void {
    const metadata = {
      sessionId: session.id,
      jobId: session.jobId,
      target: session.target.name,
      status: session.status,
      duration: session.endTime 
        ? session.endTime.getTime() - session.startTime.getTime()
        : undefined,
      eventsFound: session.progress.eventsFound,
      eventsProcessed: session.progress.eventsProcessed,
      errorsCount: session.progress.errorsCount,
      successRate: session.metrics.successRate,
      avgResponseTime: session.metrics.avgResponseTime
    }
    
    this.info('session-metrics', 'Session completed', metadata)
  }
  
  /**
   * Log performance metrics
   */
  logPerformanceMetrics(metrics: ScrapingMetrics): void {
    const metadata = {
      sessionId: metrics.sessionId,
      target: metrics.target,
      eventsScraped: metrics.eventsScraped,
      venuesScraped: metrics.venuesScraped,
      successRate: metrics.successRate,
      avgResponseTime: metrics.avgResponseTime,
      dataQualityScore: metrics.dataQualityScore,
      blockedAttempts: metrics.blockedAttempts,
      rateLimitHits: metrics.rateLimitHits,
      captchaEncounters: metrics.captchaEncounters
    }
    
    this.info('performance', 'Performance metrics', metadata)
  }
  
  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    category: string,
    message: string,
    metadata?: any,
    context?: { sessionId?: string; scraperId?: string; targetId?: string }
  ): void {
    // Check log level
    if (level < this.config.level) {
      return
    }
    
    // Create log entry
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      metadata: this.sanitizeMetadata(metadata),
      sessionId: context?.sessionId,
      scraperId: context?.scraperId,
      targetId: context?.targetId,
      correlationId: this.correlationId
    }
    
    // Add to buffer
    this.logBuffer.push(entry)
    
    // Output to all configured outputs
    this.outputs.forEach(output => {
      try {
        if (!output.filter || output.filter(entry)) {
          this.writeToOutput(output, entry)
        }
      } catch (error) {
        console.error('Error writing to log output:', error)
      }
    })
    
    // Manage buffer size
    this.manageBuffer()
  }
  
  /**
   * Setup default outputs based on environment
   */
  private setupDefaultOutputs(): void {
    // Console output for development
    if (process.env.NODE_ENV !== 'production') {
      this.outputs.push({
        type: 'console',
        config: {},
        formatter: new ConsoleFormatter()
      })
    } else {
      // Structured logging for production
      this.outputs.push({
        type: 'console',
        config: {},
        formatter: new JsonFormatter(),
        filter: (entry) => entry.level >= LogLevel.INFO
      })
    }
    
    // Add remote logging if enabled
    if (this.config.enableRemoteLogging && process.env.LOG_ENDPOINT) {
      this.outputs.push({
        type: 'remote',
        config: {
          endpoint: process.env.LOG_ENDPOINT,
          apiKey: process.env.LOG_API_KEY
        },
        formatter: new ProductionFormatter(),
        filter: (entry) => entry.level >= LogLevel.WARN
      })
    }
  }
  
  /**
   * Write log entry to specific output
   */
  private writeToOutput(output: LogOutput, entry: LogEntry): void {
    const formatted = output.formatter.format(entry)
    
    switch (output.type) {
      case 'console':
        this.writeToConsole(entry.level, formatted)
        break
        
      case 'file':
        this.writeToFile(output.config.filePath, formatted)
        break
        
      case 'database':
        this.writeToDatabase(output.config, entry)
        break
        
      case 'remote':
        this.writeToRemote(output.config, formatted)
        break
        
      case 'webhook':
        this.writeToWebhook(output.config, entry)
        break
    }
  }
  
  /**
   * Write to console with appropriate color coding
   */
  private writeToConsole(level: LogLevel, message: string): void {
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(message)
        break
      case LogLevel.INFO:
        console.info(message)
        break
      case LogLevel.WARN:
        console.warn(message)
        break
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(message)
        break
    }
  }
  
  /**
   * Write to file (placeholder - would implement file writing)
   */
  private writeToFile(filePath: string, message: string): void {
    // In a real implementation, this would write to file system
    // For now, just log to console with file indicator
    console.log(`[FILE: ${filePath}] ${message}`)
  }
  
  /**
   * Write to database (placeholder)
   */
  private writeToDatabase(config: any, entry: LogEntry): void {
    // Placeholder for database logging
    console.log(`[DATABASE] ${entry.message}`)
  }
  
  /**
   * Write to remote logging service
   */
  private async writeToRemote(config: any, message: string): Promise<void> {
    try {
      if (!config.endpoint) return
      
      await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': config.apiKey ? `Bearer ${config.apiKey}` : undefined
        },
        body: message
      })
    } catch (error) {
      console.error('Failed to send log to remote service:', error)
    }
  }
  
  /**
   * Write to webhook
   */
  private async writeToWebhook(config: any, entry: LogEntry): Promise<void> {
    try {
      if (!config.url) return
      
      await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        },
        body: JSON.stringify(entry)
      })
    } catch (error) {
      console.error('Failed to send log to webhook:', error)
    }
  }
  
  /**
   * Sanitize metadata to remove sensitive information
   */
  private sanitizeMetadata(metadata: any): any {
    if (!metadata) return undefined
    
    const sanitized = { ...metadata }
    
    this.config.sensitiveDataMasks.forEach(mask => {
      if (sanitized[mask]) {
        sanitized[mask] = '***REDACTED***'
      }
    })
    
    return sanitized
  }
  
  /**
   * Manage log buffer size
   */
  private manageBuffer(): void {
    const maxEntries = 1000
    
    if (this.logBuffer.length > maxEntries) {
      this.logBuffer = this.logBuffer.slice(-maxEntries)
    }
  }
  
  /**
   * Generate correlation ID for tracking related logs
   */
  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * Add custom output
   */
  addOutput(output: LogOutput): void {
    this.outputs.push(output)
  }
  
  /**
   * Remove output by type
   */
  removeOutput(type: string): void {
    this.outputs = this.outputs.filter(output => output.type !== type)
  }
  
  /**
   * Get log buffer (for debugging)
   */
  getBuffer(): LogEntry[] {
    return [...this.logBuffer]
  }
  
  /**
   * Clear log buffer
   */
  clearBuffer(): void {
    this.logBuffer = []
  }
  
  /**
   * Export logs as JSON
   */
  exportLogs(filter?: (entry: LogEntry) => boolean): string {
    const logs = filter ? this.logBuffer.filter(filter) : this.logBuffer
    return JSON.stringify(logs, null, 2)
  }
  
  /**
   * Get statistics about logged events
   */
  getStatistics(): {
    totalLogs: number
    byLevel: Record<string, number>
    byCategory: Record<string, number>
    timeRange: { start: Date; end: Date } | null
  } {
    const stats = {
      totalLogs: this.logBuffer.length,
      byLevel: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      timeRange: null as { start: Date; end: Date } | null
    }
    
    if (this.logBuffer.length > 0) {
      stats.timeRange = {
        start: this.logBuffer[0].timestamp,
        end: this.logBuffer[this.logBuffer.length - 1].timestamp
      }
    }
    
    this.logBuffer.forEach(entry => {
      const level = LogLevel[entry.level]
      stats.byLevel[level] = (stats.byLevel[level] || 0) + 1
      stats.byCategory[entry.category] = (stats.byCategory[entry.category] || 0) + 1
    })
    
    return stats
  }
}

/**
 * Default logger instance
 */
export const defaultLogger = new ScrapingLogger({
  level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  enableRemoteLogging: process.env.NODE_ENV === 'production',
  includeStackTrace: process.env.NODE_ENV !== 'production'
})

/**
 * Create logger for specific scraper
 */
export function createScraperLogger(scraperId: string, config?: Partial<LoggerConfig>): ScrapingLogger {
  return new ScrapingLogger({
    ...config,
    outputs: [
      {
        type: 'console',
        config: {},
        formatter: new ConsoleFormatter(),
        filter: (entry) => entry.scraperId === scraperId
      }
    ]
  })
}

/**
 * Log levels for external use
 */
export { LogLevel as ScrapingLogLevel }