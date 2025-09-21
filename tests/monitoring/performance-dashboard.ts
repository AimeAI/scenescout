/**
 * Performance Monitoring Dashboard for Integration Tests
 * Real-time monitoring and reporting of swarm system performance
 */

import { EventEmitter } from 'events'
import { performance } from 'perf_hooks'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

interface PerformanceMetric {
  timestamp: number
  component: string
  metric: string
  value: number
  unit: string
  threshold?: number
  status: 'normal' | 'warning' | 'critical'
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical'
  components: {
    swarmOrchestrator: 'healthy' | 'degraded' | 'critical'
    spawner: 'healthy' | 'degraded' | 'critical'
    pipeline: 'healthy' | 'degraded' | 'critical'
    realtimeStream: 'healthy' | 'degraded' | 'critical'
    database: 'healthy' | 'degraded' | 'critical'
    apiIntegrations: 'healthy' | 'degraded' | 'critical'
  }
  alerts: Alert[]
  uptime: number
  lastUpdated: number
}

interface Alert {
  id: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  component: string
  message: string
  timestamp: number
  acknowledged: boolean
  resolved: boolean
}

interface PerformanceReport {
  summary: {
    testSuite: string
    startTime: number
    endTime: number
    totalDuration: number
    overallStatus: 'pass' | 'fail' | 'warning'
  }
  metrics: {
    responseTime: {
      average: number
      p50: number
      p95: number
      p99: number
      max: number
    }
    throughput: {
      requestsPerSecond: number
      peakThroughput: number
      averageThroughput: number
    }
    errors: {
      total: number
      rate: number
      byType: Record<string, number>
    }
    resources: {
      memory: {
        initial: number
        peak: number
        final: number
        leakDetected: boolean
      }
      cpu: {
        average: number
        peak: number
      }
    }
  }
  agents: {
    [agentType: string]: {
      tasksExecuted: number
      successRate: number
      averageExecutionTime: number
      errors: number
    }
  }
  trends: {
    performance: 'improving' | 'stable' | 'degrading'
    reliability: 'improving' | 'stable' | 'degrading'
    efficiency: 'improving' | 'stable' | 'degrading'
  }
}

export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetric[] = []
  private alerts: Alert[] = []
  private startTime = Date.now()
  private monitoringInterval?: NodeJS.Timeout
  private reportingInterval?: NodeJS.Timeout
  private isMonitoring = false
  private systemHealth: SystemHealth
  private agentMetrics = new Map<string, any>()
  private baselineMetrics = new Map<string, number>()
  
  constructor() {
    super()
    
    this.systemHealth = {
      overall: 'healthy',
      components: {
        swarmOrchestrator: 'healthy',
        spawner: 'healthy',
        pipeline: 'healthy',
        realtimeStream: 'healthy',
        database: 'healthy',
        apiIntegrations: 'healthy'
      },
      alerts: [],
      uptime: 0,
      lastUpdated: Date.now()
    }
    
    this.loadBaseline()
  }
  
  private loadBaseline(): void {
    try {
      const baselinePath = join(process.cwd(), 'tests/monitoring/baseline-metrics.json')
      if (existsSync(baselinePath)) {
        const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'))
        Object.entries(baseline).forEach(([key, value]) => {
          this.baselineMetrics.set(key, value as number)
        })
      }
    } catch (error) {
      console.warn('Could not load baseline metrics:', error.message)
    }
  }
  
  private saveBaseline(): void {
    try {
      const baselinePath = join(process.cwd(), 'tests/monitoring/baseline-metrics.json')
      const baseline = Object.fromEntries(this.baselineMetrics)
      writeFileSync(baselinePath, JSON.stringify(baseline, null, 2))
    } catch (error) {
      console.warn('Could not save baseline metrics:', error.message)
    }
  }
  
  startMonitoring(): void {
    if (this.isMonitoring) return
    
    this.isMonitoring = true
    this.startTime = Date.now()
    
    console.log('📈 Starting performance monitoring...')
    
    // Monitor system metrics every second
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics()
    }, 1000)
    
    // Generate reports every 10 seconds
    this.reportingInterval = setInterval(() => {
      this.generateMiniReport()
    }, 10000)
    
    this.emit('monitoring:started')
  }
  
  stopMonitoring(): void {
    if (!this.isMonitoring) return
    
    this.isMonitoring = false
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }
    
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval)
    }
    
    console.log('📈 Performance monitoring stopped')
    this.emit('monitoring:stopped')
  }
  
  recordMetric(
    component: string,
    metric: string,
    value: number,
    unit: string = 'ms',
    threshold?: number
  ): void {
    const metricData: PerformanceMetric = {
      timestamp: Date.now(),
      component,
      metric,
      value,
      unit,
      threshold,
      status: this.determineStatus(value, threshold)
    }
    
    this.metrics.push(metricData)
    
    // Check for alerts
    if (metricData.status === 'critical' || metricData.status === 'warning') {
      this.createAlert(metricData)
    }
    
    // Update system health
    this.updateSystemHealth(component, metricData.status)
    
    this.emit('metric:recorded', metricData)
  }
  
  recordAgentMetric(agentType: string, metrics: Record<string, any>): void {
    const existing = this.agentMetrics.get(agentType) || {
      tasksExecuted: 0,
      totalExecutionTime: 0,
      errors: 0,
      successCount: 0
    }
    
    this.agentMetrics.set(agentType, {
      ...existing,
      ...metrics,
      lastUpdated: Date.now()
    })
    
    this.emit('agent:metric', { agentType, metrics })
  }
  
  private determineStatus(value: number, threshold?: number): 'normal' | 'warning' | 'critical' {
    if (!threshold) return 'normal'
    
    if (value > threshold * 2) return 'critical'
    if (value > threshold) return 'warning'
    return 'normal'
  }
  
  private createAlert(metric: PerformanceMetric): void {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      severity: metric.status === 'critical' ? 'critical' : 'warning',
      component: metric.component,
      message: `${metric.metric} is ${metric.value}${metric.unit} (threshold: ${metric.threshold}${metric.unit})`,
      timestamp: Date.now(),
      acknowledged: false,
      resolved: false
    }
    
    this.alerts.push(alert)
    this.systemHealth.alerts.push(alert)
    
    this.emit('alert:created', alert)
    
    console.log(`🚨 ${alert.severity.toUpperCase()}: ${alert.message}`)
  }
  
  private updateSystemHealth(component: string, status: 'normal' | 'warning' | 'critical'): void {
    // Map component names to system health components
    const componentMap: Record<string, keyof SystemHealth['components']> = {
      'swarm': 'swarmOrchestrator',
      'spawner': 'spawner',
      'pipeline': 'pipeline',
      'realtime': 'realtimeStream',
      'database': 'database',
      'api': 'apiIntegrations'
    }
    
    const healthComponent = Object.entries(componentMap)
      .find(([key]) => component.toLowerCase().includes(key))?.[1]
    
    if (healthComponent) {
      const healthStatus = status === 'critical' ? 'critical' : 
                          status === 'warning' ? 'degraded' : 'healthy'
      
      this.systemHealth.components[healthComponent] = healthStatus
    }
    
    // Update overall health
    const componentStatuses = Object.values(this.systemHealth.components)
    if (componentStatuses.includes('critical')) {
      this.systemHealth.overall = 'critical'
    } else if (componentStatuses.includes('degraded')) {
      this.systemHealth.overall = 'degraded'
    } else {
      this.systemHealth.overall = 'healthy'
    }
    
    this.systemHealth.uptime = Date.now() - this.startTime
    this.systemHealth.lastUpdated = Date.now()
  }
  
  private collectSystemMetrics(): void {
    // Memory usage
    const memUsage = process.memoryUsage()
    this.recordMetric('system', 'memory_heap_used', memUsage.heapUsed / 1024 / 1024, 'MB', 100)
    this.recordMetric('system', 'memory_heap_total', memUsage.heapTotal / 1024 / 1024, 'MB')
    
    // CPU usage (simulated - in real implementation use actual CPU monitoring)
    const cpuUsage = Math.random() * 100
    this.recordMetric('system', 'cpu_usage', cpuUsage, '%', 80)
    
    // Event loop lag (simulated)
    const eventLoopLag = Math.random() * 10
    this.recordMetric('system', 'event_loop_lag', eventLoopLag, 'ms', 10)
  }
  
  private generateMiniReport(): void {
    const recentMetrics = this.getRecentMetrics(10000) // Last 10 seconds
    if (recentMetrics.length === 0) return
    
    const avgResponseTime = this.calculateAverage(
      recentMetrics.filter(m => m.metric.includes('response_time')),
      'value'
    )
    
    const errorCount = recentMetrics.filter(m => 
      m.metric.includes('error') || m.status === 'critical'
    ).length
    
    console.log(`📋 Mini Report: Avg Response: ${avgResponseTime.toFixed(2)}ms, Errors: ${errorCount}, Health: ${this.systemHealth.overall}`)
  }
  
  generateReport(): PerformanceReport {
    const endTime = Date.now()
    const totalDuration = endTime - this.startTime
    
    // Calculate response time metrics
    const responseTimeMetrics = this.metrics.filter(m => 
      m.metric.includes('response_time') || m.metric.includes('execution_time')
    )
    
    const responseTimes = responseTimeMetrics.map(m => m.value).sort((a, b) => a - b)
    
    // Calculate throughput metrics
    const throughputMetrics = this.calculateThroughput()
    
    // Calculate error metrics
    const errorMetrics = this.calculateErrorMetrics()
    
    // Calculate resource metrics
    const resourceMetrics = this.calculateResourceMetrics()
    
    // Calculate agent metrics
    const agentMetrics = this.calculateAgentMetrics()
    
    // Determine trends
    const trends = this.calculateTrends()
    
    const report: PerformanceReport = {
      summary: {
        testSuite: 'Integration Tests',
        startTime: this.startTime,
        endTime,
        totalDuration,
        overallStatus: this.determineOverallStatus()
      },
      metrics: {
        responseTime: {
          average: this.calculateAverage(responseTimeMetrics, 'value'),
          p50: this.getPercentile(responseTimes, 50),
          p95: this.getPercentile(responseTimes, 95),
          p99: this.getPercentile(responseTimes, 99),
          max: Math.max(...responseTimes, 0)
        },
        throughput: throughputMetrics,
        errors: errorMetrics,
        resources: resourceMetrics
      },
      agents: agentMetrics,
      trends
    }
    
    this.emit('report:generated', report)
    return report
  }
  
  private calculateThroughput(): any {
    const timeWindows = this.getTimeWindows(5000) // 5-second windows
    const throughputs = timeWindows.map(window => {
      const requests = this.metrics.filter(m => 
        m.timestamp >= window.start && m.timestamp < window.end &&
        (m.metric.includes('request') || m.metric.includes('task'))
      ).length
      return requests / (window.duration / 1000) // requests per second
    })
    
    return {
      requestsPerSecond: this.calculateAverage(throughputs.map((t, i) => ({ value: t, index: i })), 'value'),
      peakThroughput: Math.max(...throughputs, 0),
      averageThroughput: throughputs.reduce((sum, t) => sum + t, 0) / throughputs.length
    }
  }
  
  private calculateErrorMetrics(): any {
    const errorMetrics = this.metrics.filter(m => 
      m.metric.includes('error') || m.status === 'critical'
    )
    
    const totalRequests = this.metrics.filter(m => 
      m.metric.includes('request') || m.metric.includes('task')
    ).length
    
    const errorsByType = errorMetrics.reduce((acc, metric) => {
      const type = metric.metric
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return {
      total: errorMetrics.length,
      rate: totalRequests > 0 ? (errorMetrics.length / totalRequests) * 100 : 0,
      byType: errorsByType
    }
  }
  
  private calculateResourceMetrics(): any {
    const memoryMetrics = this.metrics.filter(m => m.metric === 'memory_heap_used')
    const cpuMetrics = this.metrics.filter(m => m.metric === 'cpu_usage')
    
    return {
      memory: {
        initial: memoryMetrics[0]?.value || 0,
        peak: Math.max(...memoryMetrics.map(m => m.value), 0),
        final: memoryMetrics[memoryMetrics.length - 1]?.value || 0,
        leakDetected: this.detectMemoryLeak(memoryMetrics)
      },
      cpu: {
        average: this.calculateAverage(cpuMetrics, 'value'),
        peak: Math.max(...cpuMetrics.map(m => m.value), 0)
      }
    }
  }
  
  private calculateAgentMetrics(): any {
    const agentMetrics: any = {}
    
    this.agentMetrics.forEach((metrics, agentType) => {
      const successRate = metrics.tasksExecuted > 0 ? 
        (metrics.successCount / metrics.tasksExecuted) * 100 : 0
      
      const averageExecutionTime = metrics.tasksExecuted > 0 ? 
        metrics.totalExecutionTime / metrics.tasksExecuted : 0
      
      agentMetrics[agentType] = {
        tasksExecuted: metrics.tasksExecuted,
        successRate,
        averageExecutionTime,
        errors: metrics.errors
      }
    })
    
    return agentMetrics
  }
  
  private calculateTrends(): any {
    // Compare recent performance to baseline
    const recentWindow = this.getRecentMetrics(30000) // Last 30 seconds
    
    const currentAvgResponseTime = this.calculateAverage(
      recentWindow.filter(m => m.metric.includes('response_time')),
      'value'
    )
    
    const baselineResponseTime = this.baselineMetrics.get('avg_response_time') || currentAvgResponseTime
    
    const performanceTrend = this.calculateTrend(currentAvgResponseTime, baselineResponseTime)
    
    // Update baseline if this run is better
    if (currentAvgResponseTime < baselineResponseTime) {
      this.baselineMetrics.set('avg_response_time', currentAvgResponseTime)
    }
    
    return {
      performance: performanceTrend,
      reliability: this.calculateReliabilityTrend(),
      efficiency: this.calculateEfficiencyTrend()
    }
  }
  
  private calculateTrend(current: number, baseline: number): 'improving' | 'stable' | 'degrading' {
    const changePercent = ((current - baseline) / baseline) * 100
    
    if (changePercent < -5) return 'improving' // 5% better
    if (changePercent > 10) return 'degrading'  // 10% worse
    return 'stable'
  }
  
  private calculateReliabilityTrend(): 'improving' | 'stable' | 'degrading' {
    const recentErrors = this.metrics.filter(m => 
      m.timestamp > Date.now() - 30000 && 
      (m.status === 'critical' || m.metric.includes('error'))
    ).length
    
    const baselineErrors = this.baselineMetrics.get('error_count') || recentErrors
    
    return this.calculateTrend(recentErrors, baselineErrors)
  }
  
  private calculateEfficiencyTrend(): 'improving' | 'stable' | 'degrading' {
    const recentMemory = this.metrics.filter(m => 
      m.timestamp > Date.now() - 30000 && m.metric === 'memory_heap_used'
    )
    
    const avgMemory = this.calculateAverage(recentMemory, 'value')
    const baselineMemory = this.baselineMetrics.get('avg_memory') || avgMemory
    
    return this.calculateTrend(avgMemory, baselineMemory)
  }
  
  private determineOverallStatus(): 'pass' | 'fail' | 'warning' {
    const criticalAlerts = this.alerts.filter(a => a.severity === 'critical' && !a.resolved)
    const warningAlerts = this.alerts.filter(a => a.severity === 'warning' && !a.resolved)
    
    if (criticalAlerts.length > 0) return 'fail'
    if (warningAlerts.length > 0) return 'warning'
    return 'pass'
  }
  
  private detectMemoryLeak(memoryMetrics: PerformanceMetric[]): boolean {
    if (memoryMetrics.length < 10) return false
    
    const firstHalf = memoryMetrics.slice(0, Math.floor(memoryMetrics.length / 2))
    const secondHalf = memoryMetrics.slice(Math.floor(memoryMetrics.length / 2))
    
    const firstAvg = this.calculateAverage(firstHalf, 'value')
    const secondAvg = this.calculateAverage(secondHalf, 'value')
    
    return (secondAvg - firstAvg) / firstAvg > 0.2 // 20% increase
  }
  
  private getRecentMetrics(windowMs: number): PerformanceMetric[] {
    const cutoff = Date.now() - windowMs
    return this.metrics.filter(m => m.timestamp >= cutoff)
  }
  
  private getTimeWindows(windowSize: number): Array<{ start: number; end: number; duration: number }> {
    const windows = []
    const totalDuration = Date.now() - this.startTime
    
    for (let start = this.startTime; start < Date.now(); start += windowSize) {
      const end = Math.min(start + windowSize, Date.now())
      windows.push({ start, end, duration: end - start })
    }
    
    return windows
  }
  
  private calculateAverage(items: any[], prop: string): number {
    if (items.length === 0) return 0
    const sum = items.reduce((acc, item) => acc + item[prop], 0)
    return sum / items.length
  }
  
  private getPercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0
    const index = Math.ceil((percentile / 100) * values.length) - 1
    return values[Math.max(0, index)]
  }
  
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.acknowledged = true
      this.emit('alert:acknowledged', alert)
      return true
    }
    return false
  }
  
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      alert.acknowledged = true
      this.emit('alert:resolved', alert)
      return true
    }
    return false
  }
  
  getSystemHealth(): SystemHealth {
    return { ...this.systemHealth }
  }
  
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.resolved)
  }
  
  getMetrics(component?: string, metric?: string): PerformanceMetric[] {
    let filteredMetrics = [...this.metrics]
    
    if (component) {
      filteredMetrics = filteredMetrics.filter(m => m.component === component)
    }
    
    if (metric) {
      filteredMetrics = filteredMetrics.filter(m => m.metric === metric)
    }
    
    return filteredMetrics
  }
  
  exportReport(report: PerformanceReport, format: 'json' | 'html' = 'json'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `performance-report-${timestamp}.${format}`
    const filepath = join(process.cwd(), 'tests/reports', filename)
    
    try {
      if (format === 'json') {
        writeFileSync(filepath, JSON.stringify(report, null, 2))
      } else {
        const html = this.generateHTMLReport(report)
        writeFileSync(filepath, html)
      }
      
      console.log(`📄 Performance report exported: ${filepath}`)
      return filepath
    } catch (error) {
      console.error('Failed to export report:', error.message)
      return ''
    }
  }
  
  private generateHTMLReport(report: PerformanceReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Report - ${new Date(report.summary.startTime).toLocaleString()}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
        .status-pass { color: #28a745; }
        .status-warning { color: #ffc107; }
        .status-fail { color: #dc3545; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff; }
        .trend-improving { color: #28a745; }
        .trend-stable { color: #6c757d; }
        .trend-degrading { color: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Performance Report</h1>
            <p><strong>Test Suite:</strong> ${report.summary.testSuite}</p>
            <p><strong>Duration:</strong> ${(report.summary.totalDuration / 1000).toFixed(2)} seconds</p>
            <p><strong>Status:</strong> <span class="status-${report.summary.overallStatus}">${report.summary.overallStatus.toUpperCase()}</span></p>
        </div>
        
        <h2>Performance Metrics</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <h3>Response Time</h3>
                <p>Average: ${report.metrics.responseTime.average.toFixed(2)}ms</p>
                <p>P95: ${report.metrics.responseTime.p95.toFixed(2)}ms</p>
                <p>P99: ${report.metrics.responseTime.p99.toFixed(2)}ms</p>
            </div>
            <div class="metric-card">
                <h3>Throughput</h3>
                <p>Avg: ${report.metrics.throughput.averageThroughput.toFixed(2)} req/s</p>
                <p>Peak: ${report.metrics.throughput.peakThroughput.toFixed(2)} req/s</p>
            </div>
            <div class="metric-card">
                <h3>Errors</h3>
                <p>Total: ${report.metrics.errors.total}</p>
                <p>Rate: ${report.metrics.errors.rate.toFixed(2)}%</p>
            </div>
            <div class="metric-card">
                <h3>Memory</h3>
                <p>Peak: ${report.metrics.resources.memory.peak.toFixed(2)}MB</p>
                <p>Leak: ${report.metrics.resources.memory.leakDetected ? 'Detected' : 'None'}</p>
            </div>
        </div>
        
        <h2>Agent Performance</h2>
        <div class="metric-grid">
            ${Object.entries(report.agents).map(([agent, metrics]) => `
                <div class="metric-card">
                    <h3>${agent}</h3>
                    <p>Tasks: ${metrics.tasksExecuted}</p>
                    <p>Success Rate: ${metrics.successRate.toFixed(1)}%</p>
                    <p>Avg Time: ${metrics.averageExecutionTime.toFixed(2)}ms</p>
                </div>
            `).join('')}
        </div>
        
        <h2>Trends</h2>
        <p><strong>Performance:</strong> <span class="trend-${report.trends.performance}">${report.trends.performance}</span></p>
        <p><strong>Reliability:</strong> <span class="trend-${report.trends.reliability}">${report.trends.reliability}</span></p>
        <p><strong>Efficiency:</strong> <span class="trend-${report.trends.efficiency}">${report.trends.efficiency}</span></p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #6c757d; font-size: 0.9em;">
            Generated on ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>
    `
  }
  
  cleanup(): void {
    this.stopMonitoring()
    this.saveBaseline()
    this.removeAllListeners()
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Export types
export type {
  PerformanceMetric,
  SystemHealth,
  Alert,
  PerformanceReport
}