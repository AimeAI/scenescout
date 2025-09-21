/**
 * Pipeline Monitoring and Alerting System
 * Comprehensive monitoring, alerting, and performance tracking
 */

import { EventEmitter } from 'events'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types'

export interface AlertRule {
  id: string
  name: string
  description: string
  metric: string
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals' | 'contains'
  threshold: number | string
  severity: 'low' | 'medium' | 'high' | 'critical'
  enabled: boolean
  cooldownMinutes: number
  channels: string[] // slack, email, webhook, etc.
  lastTriggered?: Date
}

export interface Alert {
  id: string
  ruleId: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  metric: string
  currentValue: any
  threshold: any
  timestamp: Date
  resolved: boolean
  resolvedAt?: Date
  metadata?: Record<string, any>
}

export interface MetricSample {
  timestamp: Date
  metric: string
  value: number
  labels?: Record<string, string>
}

export interface PerformanceMetrics {
  pipeline: {
    totalEventsProcessed: number
    eventsPerSecond: number
    errorRate: number
    averageProcessingTime: number
    queueSize: number
    activeJobs: number
  }
  api: {
    totalRequests: number
    requestsPerSecond: number
    averageResponseTime: number
    errorRate: number
    rateLimitHits: number
  }
  database: {
    connectionCount: number
    averageQueryTime: number
    slowQueries: number
    deadlocks: number
    storageUsed: number
  }
  realtime: {
    activeConnections: number
    messagesSent: number
    messagesReceived: number
    averageLatency: number
    connectionErrors: number
  }
  quality: {
    averageQualityScore: number
    validationFailures: number
    dataCompleteness: number
    duplicatesDetected: number
  }
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  uptime: number
  lastHealthCheck: Date
  components: {
    pipeline: 'healthy' | 'degraded' | 'unhealthy'
    database: 'healthy' | 'degraded' | 'unhealthy'
    realtime: 'healthy' | 'degraded' | 'unhealthy'
    apis: 'healthy' | 'degraded' | 'unhealthy'
  }
  metrics: PerformanceMetrics
  alerts: Alert[]
}

export class MonitoringSystem extends EventEmitter {
  private supabase: ReturnType<typeof createClient<Database>>
  private alertRules = new Map<string, AlertRule>()
  private activeAlerts = new Map<string, Alert>()
  private metrics: PerformanceMetrics
  private metricHistory: MetricSample[] = []
  private monitoringInterval?: NodeJS.Timeout
  private healthCheckInterval?: NodeJS.Timeout
  private isMonitoring = false
  private startTime = Date.now()

  constructor() {
    super()
    
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    this.metrics = this.initializeMetrics()
    this.setupDefaultAlertRules()
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      pipeline: {
        totalEventsProcessed: 0,
        eventsPerSecond: 0,
        errorRate: 0,
        averageProcessingTime: 0,
        queueSize: 0,
        activeJobs: 0
      },
      api: {
        totalRequests: 0,
        requestsPerSecond: 0,
        averageResponseTime: 0,
        errorRate: 0,
        rateLimitHits: 0
      },
      database: {
        connectionCount: 0,
        averageQueryTime: 0,
        slowQueries: 0,
        deadlocks: 0,
        storageUsed: 0
      },
      realtime: {
        activeConnections: 0,
        messagesSent: 0,
        messagesReceived: 0,
        averageLatency: 0,
        connectionErrors: 0
      },
      quality: {
        averageQualityScore: 0,
        validationFailures: 0,
        dataCompleteness: 0,
        duplicatesDetected: 0
      }
    }
  }

  private setupDefaultAlertRules(): void {
    // Pipeline performance alerts
    this.addAlertRule({
      id: 'high_error_rate',
      name: 'High Error Rate',
      description: 'Alert when pipeline error rate exceeds 5%',
      metric: 'pipeline.errorRate',
      condition: 'greater_than',
      threshold: 0.05,
      severity: 'high',
      enabled: true,
      cooldownMinutes: 15,
      channels: ['slack', 'email']
    })

    this.addAlertRule({
      id: 'slow_processing',
      name: 'Slow Processing',
      description: 'Alert when average processing time exceeds 30 seconds',
      metric: 'pipeline.averageProcessingTime',
      condition: 'greater_than',
      threshold: 30000,
      severity: 'medium',
      enabled: true,
      cooldownMinutes: 10,
      channels: ['slack']
    })

    this.addAlertRule({
      id: 'queue_backlog',
      name: 'Queue Backlog',
      description: 'Alert when queue size exceeds 1000 items',
      metric: 'pipeline.queueSize',
      condition: 'greater_than',
      threshold: 1000,
      severity: 'high',
      enabled: true,
      cooldownMinutes: 5,
      channels: ['slack', 'webhook']
    })

    // API performance alerts
    this.addAlertRule({
      id: 'api_rate_limits',
      name: 'API Rate Limits',
      description: 'Alert when hitting rate limits frequently',
      metric: 'api.rateLimitHits',
      condition: 'greater_than',
      threshold: 10,
      severity: 'medium',
      enabled: true,
      cooldownMinutes: 30,
      channels: ['slack']
    })

    // Database alerts
    this.addAlertRule({
      id: 'slow_queries',
      name: 'Slow Database Queries',
      description: 'Alert when query time exceeds 5 seconds',
      metric: 'database.averageQueryTime',
      condition: 'greater_than',
      threshold: 5000,
      severity: 'medium',
      enabled: true,
      cooldownMinutes: 10,
      channels: ['slack']
    })

    // Data quality alerts
    this.addAlertRule({
      id: 'low_quality_score',
      name: 'Low Data Quality Score',
      description: 'Alert when average quality score drops below 0.7',
      metric: 'quality.averageQualityScore',
      condition: 'less_than',
      threshold: 0.7,
      severity: 'medium',
      enabled: true,
      cooldownMinutes: 30,
      channels: ['email']
    })

    // Real-time system alerts
    this.addAlertRule({
      id: 'realtime_connection_errors',
      name: 'Real-time Connection Errors',
      description: 'Alert when real-time connection errors increase',
      metric: 'realtime.connectionErrors',
      condition: 'greater_than',
      threshold: 5,
      severity: 'high',
      enabled: true,
      cooldownMinutes: 5,
      channels: ['slack', 'webhook']
    })
  }

  /**
   * Start monitoring system
   */
  async startMonitoring(intervalMs = 30000): Promise<void> {
    if (this.isMonitoring) return

    this.isMonitoring = true
    
    // Start metric collection
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics()
    }, intervalMs)

    // Start health checks
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck()
    }, intervalMs * 2) // Less frequent health checks

    this.emit('monitoring_started', { timestamp: new Date() })
    console.log('📊 Monitoring system started')
  }

  /**
   * Stop monitoring system
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) return

    this.isMonitoring = false

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    this.emit('monitoring_stopped', { timestamp: new Date() })
    console.log('📊 Monitoring system stopped')
  }

  /**
   * Collect metrics from various sources
   */
  private async collectMetrics(): Promise<void> {
    try {
      // Collect pipeline metrics
      await this.collectPipelineMetrics()
      
      // Collect API metrics  
      await this.collectApiMetrics()
      
      // Collect database metrics
      await this.collectDatabaseMetrics()
      
      // Collect real-time metrics
      await this.collectRealtimeMetrics()
      
      // Collect quality metrics
      await this.collectQualityMetrics()

      // Store historical data
      this.storeMetricSamples()

      // Check alert rules
      this.evaluateAlertRules()

      this.emit('metrics_collected', { 
        timestamp: new Date(), 
        metrics: this.metrics 
      })

    } catch (error) {
      console.error('❌ Error collecting metrics:', error)
      this.emit('metric_collection_error', error)
    }
  }

  /**
   * Collect pipeline-specific metrics
   */
  private async collectPipelineMetrics(): Promise<void> {
    // This would typically integrate with your pipeline orchestrator
    // For now, we'll simulate some metrics
    
    // In real implementation, you'd call:
    // const pipelineStatus = await pipelineOrchestrator.getStatus()
    // this.metrics.pipeline = pipelineStatus.metrics
    
    // Simulate metrics for demonstration
    this.metrics.pipeline.eventsPerSecond = Math.floor(Math.random() * 100)
    this.metrics.pipeline.errorRate = Math.random() * 0.1
    this.metrics.pipeline.averageProcessingTime = 5000 + Math.random() * 10000
    this.metrics.pipeline.queueSize = Math.floor(Math.random() * 500)
    this.metrics.pipeline.activeJobs = Math.floor(Math.random() * 10)
  }

  /**
   * Collect API metrics
   */
  private async collectApiMetrics(): Promise<void> {
    // Simulate API metrics
    this.metrics.api.requestsPerSecond = Math.floor(Math.random() * 50)
    this.metrics.api.averageResponseTime = 200 + Math.random() * 1000
    this.metrics.api.errorRate = Math.random() * 0.05
    this.metrics.api.rateLimitHits = Math.floor(Math.random() * 20)
  }

  /**
   * Collect database metrics
   */
  private async collectDatabaseMetrics(): Promise<void> {
    try {
      // Query database statistics
      const { data: dbStats } = await this.supabase
        .from('events')
        .select('id', { count: 'exact', head: true })

      // Get query performance stats (if available)
      const { data: slowQueries } = await this.supabase
        .rpc('get_slow_queries') // Custom RPC function
        .then(result => result, () => ({ data: [] })) // Fallback if RPC doesn't exist

      this.metrics.database.connectionCount = Math.floor(Math.random() * 20)
      this.metrics.database.averageQueryTime = 100 + Math.random() * 2000
      this.metrics.database.slowQueries = slowQueries?.length || 0
      
    } catch (error) {
      console.error('Error collecting database metrics:', error)
    }
  }

  /**
   * Collect real-time metrics
   */
  private async collectRealtimeMetrics(): Promise<void> {
    // Simulate real-time metrics
    this.metrics.realtime.activeConnections = Math.floor(Math.random() * 100)
    this.metrics.realtime.messagesSent = Math.floor(Math.random() * 1000)
    this.metrics.realtime.averageLatency = 50 + Math.random() * 200
    this.metrics.realtime.connectionErrors = Math.floor(Math.random() * 10)
  }

  /**
   * Collect data quality metrics
   */
  private async collectQualityMetrics(): Promise<void> {
    // Simulate quality metrics
    this.metrics.quality.averageQualityScore = 0.7 + Math.random() * 0.3
    this.metrics.quality.validationFailures = Math.floor(Math.random() * 50)
    this.metrics.quality.dataCompleteness = 0.8 + Math.random() * 0.2
    this.metrics.quality.duplicatesDetected = Math.floor(Math.random() * 20)
  }

  /**
   * Store metric samples for historical analysis
   */
  private storeMetricSamples(): void {
    const timestamp = new Date()
    
    // Flatten metrics for storage
    const samples: MetricSample[] = []
    
    Object.entries(this.metrics).forEach(([category, categoryMetrics]) => {
      Object.entries(categoryMetrics).forEach(([metric, value]) => {
        samples.push({
          timestamp,
          metric: `${category}.${metric}`,
          value: value as number,
          labels: { category }
        })
      })
    })

    // Add to history (keep only last 1000 samples)
    this.metricHistory.push(...samples)
    if (this.metricHistory.length > 1000) {
      this.metricHistory = this.metricHistory.slice(-1000)
    }
  }

  /**
   * Evaluate alert rules against current metrics
   */
  private evaluateAlertRules(): void {
    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue

      // Check cooldown
      if (rule.lastTriggered) {
        const cooldownEnd = new Date(rule.lastTriggered.getTime() + rule.cooldownMinutes * 60000)
        if (new Date() < cooldownEnd) continue
      }

      const currentValue = this.getMetricValue(rule.metric)
      if (currentValue === null) continue

      const shouldAlert = this.evaluateCondition(currentValue, rule.condition, rule.threshold)
      
      if (shouldAlert) {
        this.triggerAlert(rule, currentValue)
      }
    }
  }

  /**
   * Get metric value by path
   */
  private getMetricValue(metricPath: string): number | null {
    const parts = metricPath.split('.')
    let value: any = this.metrics

    for (const part of parts) {
      value = value?.[part]
      if (value === undefined || value === null) return null
    }

    return typeof value === 'number' ? value : null
  }

  /**
   * Evaluate alert condition
   */
  private evaluateCondition(
    currentValue: number, 
    condition: AlertRule['condition'], 
    threshold: number | string
  ): boolean {
    const numThreshold = typeof threshold === 'string' ? parseFloat(threshold) : threshold

    switch (condition) {
      case 'greater_than':
        return currentValue > numThreshold
      case 'less_than':
        return currentValue < numThreshold
      case 'equals':
        return currentValue === numThreshold
      case 'not_equals':
        return currentValue !== numThreshold
      default:
        return false
    }
  }

  /**
   * Trigger alert
   */
  private async triggerAlert(rule: AlertRule, currentValue: number): Promise<void> {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      severity: rule.severity,
      title: rule.name,
      message: `${rule.description}. Current value: ${currentValue}, Threshold: ${rule.threshold}`,
      metric: rule.metric,
      currentValue,
      threshold: rule.threshold,
      timestamp: new Date(),
      resolved: false
    }

    this.activeAlerts.set(alert.id, alert)
    rule.lastTriggered = new Date()

    // Send alert notifications
    await this.sendAlertNotifications(alert, rule.channels)

    this.emit('alert_triggered', alert)
    console.log(`🚨 Alert triggered: ${alert.title}`)
  }

  /**
   * Send alert notifications to configured channels
   */
  private async sendAlertNotifications(alert: Alert, channels: string[]): Promise<void> {
    const notifications = channels.map(async (channel) => {
      try {
        switch (channel) {
          case 'slack':
            await this.sendSlackNotification(alert)
            break
          case 'email':
            await this.sendEmailNotification(alert)
            break
          case 'webhook':
            await this.sendWebhookNotification(alert)
            break
          default:
            console.warn(`Unknown notification channel: ${channel}`)
        }
      } catch (error) {
        console.error(`Failed to send ${channel} notification:`, error)
      }
    })

    await Promise.allSettled(notifications)
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(alert: Alert): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!webhookUrl) return

    const color = {
      low: 'good',
      medium: 'warning', 
      high: 'danger',
      critical: 'danger'
    }[alert.severity]

    const payload = {
      text: `🚨 SceneScout Alert: ${alert.title}`,
      attachments: [{
        color,
        title: alert.title,
        text: alert.message,
        fields: [
          { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
          { title: 'Metric', value: alert.metric, short: true },
          { title: 'Current Value', value: alert.currentValue.toString(), short: true },
          { title: 'Threshold', value: alert.threshold.toString(), short: true }
        ],
        timestamp: Math.floor(alert.timestamp.getTime() / 1000)
      }]
    }

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(alert: Alert): Promise<void> {
    // Implementation would depend on your email service
    console.log(`📧 Email alert would be sent: ${alert.title}`)
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(alert: Alert): Promise<void> {
    const webhookUrl = process.env.ALERT_WEBHOOK_URL
    if (!webhookUrl) return

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'alert',
        alert,
        timestamp: new Date().toISOString()
      })
    })
  }

  /**
   * Perform comprehensive health check
   */
  public async performHealthCheck(): Promise<SystemHealth> {
    const healthStatus: SystemHealth = {
      status: 'healthy',
      uptime: Date.now() - this.startTime,
      lastHealthCheck: new Date(),
      components: {
        pipeline: 'healthy',
        database: 'healthy',
        realtime: 'healthy',
        apis: 'healthy'
      },
      metrics: this.metrics,
      alerts: Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved)
    }

    // Check component health based on metrics
    if (this.metrics.pipeline.errorRate > 0.1) {
      healthStatus.components.pipeline = 'unhealthy'
    } else if (this.metrics.pipeline.errorRate > 0.05) {
      healthStatus.components.pipeline = 'degraded'
    }

    if (this.metrics.database.averageQueryTime > 5000) {
      healthStatus.components.database = 'unhealthy'
    } else if (this.metrics.database.averageQueryTime > 2000) {
      healthStatus.components.database = 'degraded'
    }

    if (this.metrics.realtime.connectionErrors > 10) {
      healthStatus.components.realtime = 'unhealthy'
    } else if (this.metrics.realtime.connectionErrors > 5) {
      healthStatus.components.realtime = 'degraded'
    }

    if (this.metrics.api.errorRate > 0.1) {
      healthStatus.components.apis = 'unhealthy'
    } else if (this.metrics.api.errorRate > 0.05) {
      healthStatus.components.apis = 'degraded'
    }

    // Determine overall status
    const componentStatuses = Object.values(healthStatus.components)
    if (componentStatuses.some(status => status === 'unhealthy')) {
      healthStatus.status = 'unhealthy'
    } else if (componentStatuses.some(status => status === 'degraded')) {
      healthStatus.status = 'degraded'
    }

    this.emit('health_check', healthStatus)
    return healthStatus
  }

  /**
   * Add alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule)
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    return this.alertRules.delete(ruleId)
  }

  /**
   * Get all alert rules
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values())
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => !alert.resolved)
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId)
    if (!alert) return false

    alert.resolved = true
    alert.resolvedAt = new Date()
    
    this.emit('alert_resolved', alert)
    return true
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * Get metric history
   */
  getMetricHistory(metricName?: string, hours = 24): MetricSample[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
    
    let filtered = this.metricHistory.filter(sample => sample.timestamp >= cutoff)
    
    if (metricName) {
      filtered = filtered.filter(sample => sample.metric === metricName)
    }
    
    return filtered.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }

  /**
   * Export monitoring configuration
   */
  exportConfiguration(): any {
    return {
      alertRules: Array.from(this.alertRules.values()),
      metrics: this.metrics,
      activeAlerts: Array.from(this.activeAlerts.values())
    }
  }
}

// Export singleton instance
export const monitoringSystem = new MonitoringSystem()