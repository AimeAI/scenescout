/**
 * Performance Optimization Dashboard
 * Central hub for monitoring and controlling all optimization systems
 */

import { EventEmitter } from 'events';
import { SystemOptimizer } from './system-optimizer';
import { QueryOptimizer } from './query-optimizer';
import { DatabaseOptimizer } from './database-optimizer';
import { BundleOptimizer } from './bundle-optimizer';
import type { QueryClient } from '@tanstack/react-query';

export interface DashboardConfig {
  autoOptimization: {
    enabled: boolean;
    aggressiveness: 'conservative' | 'moderate' | 'aggressive';
    intervalMs: number;
  };
  monitoring: {
    enabled: boolean;
    realTimeUpdates: boolean;
    alertThresholds: {
      responseTime: number;
      errorRate: number;
      memoryUsage: number;
      cacheHitRatio: number;
    };
  };
  reporting: {
    enabled: boolean;
    intervalMs: number;
    retention: number; // days
  };
}

export interface OptimizationStatus {
  system: {
    status: 'active' | 'inactive' | 'error';
    lastRun: Date;
    metrics: any;
  };
  database: {
    status: 'active' | 'inactive' | 'error';
    connectionHealth: 'healthy' | 'degraded' | 'unhealthy';
    metrics: any;
  };
  queries: {
    status: 'active' | 'inactive' | 'error';
    cacheEfficiency: number;
    metrics: any;
  };
  bundle: {
    status: 'active' | 'inactive' | 'error';
    webVitalsScore: number;
    metrics: any;
  };
  overall: {
    health: 'excellent' | 'good' | 'fair' | 'poor';
    score: number;
    issues: string[];
    recommendations: string[];
  };
}

export interface PerformanceAlert {
  id: string;
  type: 'performance' | 'error' | 'resource' | 'optimization';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  component: 'system' | 'database' | 'queries' | 'bundle';
  timestamp: Date;
  resolved: boolean;
  actions?: string[];
}

export class OptimizationDashboard extends EventEmitter {
  private config: DashboardConfig;
  private systemOptimizer: SystemOptimizer;
  private queryOptimizer?: QueryOptimizer;
  private databaseOptimizer?: DatabaseOptimizer;
  private bundleOptimizer: BundleOptimizer;
  private monitoringInterval?: NodeJS.Timeout;
  private reportingInterval?: NodeJS.Timeout;
  private alerts: PerformanceAlert[] = [];
  private isActive = false;

  constructor(config: Partial<DashboardConfig> = {}) {
    super();
    
    this.config = {
      autoOptimization: {
        enabled: true,
        aggressiveness: 'moderate',
        intervalMs: 30000, // 30 seconds
        ...config.autoOptimization
      },
      monitoring: {
        enabled: true,
        realTimeUpdates: true,
        alertThresholds: {
          responseTime: 2000, // 2 seconds
          errorRate: 0.05,    // 5%
          memoryUsage: 0.8,   // 80%
          cacheHitRatio: 0.7  // 70%
        },
        ...config.monitoring
      },
      reporting: {
        enabled: true,
        intervalMs: 300000, // 5 minutes
        retention: 7,       // 7 days
        ...config.reporting
      }
    };

    this.systemOptimizer = new SystemOptimizer();
    this.bundleOptimizer = new BundleOptimizer();
    
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Listen to optimization events
    this.systemOptimizer.on('optimization:started', () => {
      this.emit('dashboard:system-started');
    });
    
    this.systemOptimizer.on('optimization:cycle', (data) => {
      this.emit('dashboard:system-cycle', data);
      this.checkAlertConditions('system', data);
    });
    
    this.systemOptimizer.on('optimization:error', (error) => {
      this.createAlert({
        type: 'error',
        severity: 'high',
        component: 'system',
        message: `System optimization error: ${error.message}`,
        actions: ['Check system logs', 'Restart optimization']
      });
    });
  }

  /**
   * Initialize all optimization systems
   */
  async initialize(options: {
    queryClient?: QueryClient;
    supabaseUrl?: string;
    supabaseKey?: string;
  } = {}): Promise<void> {
    console.log('🚀 Initializing Performance Optimization Dashboard...');
    
    try {
      // Initialize query optimizer if QueryClient is provided
      if (options.queryClient) {
        this.queryOptimizer = new QueryOptimizer(options.queryClient);
        console.log('✅ Query optimizer initialized');
      }
      
      // Initialize database optimizer if Supabase credentials are provided
      if (options.supabaseUrl && options.supabaseKey) {
        this.databaseOptimizer = new DatabaseOptimizer(
          options.supabaseUrl,
          options.supabaseKey
        );
        console.log('✅ Database optimizer initialized');
      }
      
      // Start optimization systems
      await this.systemOptimizer.startOptimization();
      
      if (this.queryOptimizer) {
        this.queryOptimizer.optimizeEventQueries();
      }
      
      // Start monitoring if enabled
      if (this.config.monitoring.enabled) {
        this.startMonitoring();
      }
      
      // Start reporting if enabled
      if (this.config.reporting.enabled) {
        this.startReporting();
      }
      
      this.isActive = true;
      
      console.log('✅ Performance Optimization Dashboard initialized successfully');
      this.emit('dashboard:initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize optimization dashboard:', error);
      throw error;
    }
  }

  /**
   * Start monitoring all optimization systems
   */
  private startMonitoring(): void {
    console.log('📊 Starting optimization monitoring...');
    
    this.monitoringInterval = setInterval(async () => {
      await this.performMonitoringCycle();
    }, this.config.autoOptimization.intervalMs);
  }

  /**
   * Start periodic reporting
   */
  private startReporting(): void {
    console.log('📊 Starting performance reporting...');
    
    this.reportingInterval = setInterval(async () => {
      await this.generatePerformanceReport();
    }, this.config.reporting.intervalMs);
  }

  /**
   * Perform monitoring cycle across all systems
   */
  private async performMonitoringCycle(): Promise<void> {
    try {
      const status = await this.getOptimizationStatus();
      
      // Check for performance issues
      this.analyzePerformanceIssues(status);
      
      // Apply auto-optimizations if enabled
      if (this.config.autoOptimization.enabled) {
        await this.applyAutoOptimizations(status);
      }
      
      // Emit monitoring update
      if (this.config.monitoring.realTimeUpdates) {
        this.emit('dashboard:monitoring-update', status);
      }
      
    } catch (error) {
      console.error('❌ Monitoring cycle failed:', error);
      this.createAlert({
        type: 'error',
        severity: 'medium',
        component: 'system',
        message: `Monitoring cycle failed: ${error.message}`
      });
    }
  }

  /**
   * Get comprehensive optimization status
   */
  async getOptimizationStatus(): Promise<OptimizationStatus> {
    const systemMetrics = this.systemOptimizer.getMetrics();
    const queryMetrics = this.queryOptimizer?.getMetrics();
    const databaseMetrics = this.databaseOptimizer?.getMetrics();
    const bundleMetrics = this.bundleOptimizer.getMetrics();
    const webVitals = this.bundleOptimizer.getWebVitalsScore();
    
    // Get database health if available
    let databaseHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (this.databaseOptimizer) {
      const healthCheck = await this.databaseOptimizer.healthCheck();
      databaseHealth = healthCheck.status;
    }
    
    const status: OptimizationStatus = {
      system: {
        status: this.isActive ? 'active' : 'inactive',
        lastRun: new Date(),
        metrics: systemMetrics
      },
      database: {
        status: this.databaseOptimizer ? 'active' : 'inactive',
        connectionHealth: databaseHealth,
        metrics: databaseMetrics
      },
      queries: {
        status: this.queryOptimizer ? 'active' : 'inactive',
        cacheEfficiency: queryMetrics?.cacheStats?.hitRatio || 0,
        metrics: queryMetrics
      },
      bundle: {
        status: 'active',
        webVitalsScore: webVitals.score,
        metrics: bundleMetrics
      },
      overall: this.calculateOverallHealth({
        system: systemMetrics,
        query: queryMetrics,
        database: databaseMetrics,
        bundle: bundleMetrics,
        webVitals
      })
    };
    
    return status;
  }

  /**
   * Calculate overall system health score
   */
  private calculateOverallHealth(metrics: any): {
    health: 'excellent' | 'good' | 'fair' | 'poor';
    score: number;
    issues: string[];
    recommendations: string[];
  } {
    let score = 100;
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // System performance impact
    if (metrics.system?.overall?.responseTime > 2000) {
      score -= 20;
      issues.push('Slow system response time');
      recommendations.push('Optimize database queries and caching');
    }
    
    // Database performance impact
    if (metrics.database?.queries?.averageLatency > 1000) {
      score -= 15;
      issues.push('Slow database queries');
      recommendations.push('Add database indexes or optimize queries');
    }
    
    // Query cache efficiency impact
    if (metrics.query?.cacheStats?.hitRatio < 0.7) {
      score -= 10;
      issues.push('Low cache hit ratio');
      recommendations.push('Improve caching strategy or increase cache TTL');
    }
    
    // Web Vitals impact
    if (metrics.webVitals?.score < 75) {
      score -= 15;
      issues.push('Poor Web Vitals performance');
      recommendations.push('Optimize bundle size and loading performance');
    }
    
    // Bundle size impact
    if (metrics.bundle?.bundleSize?.total > 1000000) { // 1MB
      score -= 10;
      issues.push('Large bundle size');
      recommendations.push('Implement code splitting and lazy loading');
    }
    
    const health = score >= 90 ? 'excellent' : 
                   score >= 75 ? 'good' : 
                   score >= 60 ? 'fair' : 'poor';
    
    return {
      health,
      score: Math.max(0, score),
      issues,
      recommendations
    };
  }

  /**
   * Analyze performance issues and create alerts
   */
  private analyzePerformanceIssues(status: OptimizationStatus): void {
    const { alertThresholds } = this.config.monitoring;
    
    // Check response time
    if (status.system.metrics?.overall?.responseTime > alertThresholds.responseTime) {
      this.createAlert({
        type: 'performance',
        severity: 'high',
        component: 'system',
        message: `High response time: ${status.system.metrics.overall.responseTime}ms`,
        actions: ['Check database performance', 'Review query optimization']
      });
    }
    
    // Check error rate
    if (status.system.metrics?.overall?.errorRate > alertThresholds.errorRate) {
      this.createAlert({
        type: 'error',
        severity: 'high',
        component: 'system',
        message: `High error rate: ${(status.system.metrics.overall.errorRate * 100).toFixed(1)}%`,
        actions: ['Check error logs', 'Review API endpoints']
      });
    }
    
    // Check cache efficiency
    if (status.queries.cacheEfficiency < alertThresholds.cacheHitRatio) {
      this.createAlert({
        type: 'optimization',
        severity: 'medium',
        component: 'queries',
        message: `Low cache hit ratio: ${(status.queries.cacheEfficiency * 100).toFixed(1)}%`,
        actions: ['Review caching strategy', 'Increase cache TTL']
      });
    }
    
    // Check database health
    if (status.database.connectionHealth === 'unhealthy') {
      this.createAlert({
        type: 'error',
        severity: 'critical',
        component: 'database',
        message: 'Database connection is unhealthy',
        actions: ['Check database connectivity', 'Review connection pool settings']
      });
    }
    
    // Check Web Vitals
    if (status.bundle.webVitalsScore < 60) {
      this.createAlert({
        type: 'performance',
        severity: 'medium',
        component: 'bundle',
        message: `Poor Web Vitals score: ${status.bundle.webVitalsScore}`,
        actions: ['Optimize bundle size', 'Improve loading performance']
      });
    }
  }

  /**
   * Apply automatic optimizations based on current conditions
   */
  private async applyAutoOptimizations(status: OptimizationStatus): Promise<void> {
    const { aggressiveness } = this.config.autoOptimization;
    
    // Conservative optimizations - safe to apply automatically
    if (aggressiveness === 'conservative' || aggressiveness === 'moderate' || aggressiveness === 'aggressive') {
      // Clear cache if hit ratio is very low
      if (status.queries.cacheEfficiency < 0.3 && this.queryOptimizer) {
        console.log('🧹 Auto-optimization: Clearing inefficient cache');
        this.queryOptimizer.optimizeCache();
      }
      
      // Clear database cache if performance is poor
      if (status.database.metrics?.queries?.averageLatency > 2000 && this.databaseOptimizer) {
        console.log('🧹 Auto-optimization: Clearing database cache');
        this.databaseOptimizer.clearCache();
      }
    }
    
    // Moderate optimizations
    if (aggressiveness === 'moderate' || aggressiveness === 'aggressive') {
      // Trigger garbage collection if memory usage is high
      if (status.system.metrics?.frontend?.memoryUsage > 200 * 1024 * 1024) { // 200MB
        console.log('🧹 Auto-optimization: Triggering garbage collection');
        if (global.gc) global.gc();
      }
    }
    
    // Aggressive optimizations - may impact user experience temporarily
    if (aggressiveness === 'aggressive') {
      // Restart optimization systems if performance is very poor
      if (status.overall.score < 30) {
        console.log('🔄 Auto-optimization: Restarting optimization systems');
        await this.restartOptimizations();
      }
    }
  }

  /**
   * Create performance alert
   */
  private createAlert(alertData: {
    type: PerformanceAlert['type'];
    severity: PerformanceAlert['severity'];
    component: PerformanceAlert['component'];
    message: string;
    actions?: string[];
  }): void {
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...alertData,
      timestamp: new Date(),
      resolved: false
    };
    
    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
    
    console.warn(`🚨 Performance Alert [${alert.severity.toUpperCase()}]: ${alert.message}`);
    this.emit('dashboard:alert', alert);
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.emit('dashboard:alert-resolved', alert);
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(): Promise<string> {
    const status = await this.getOptimizationStatus();
    const activeAlerts = this.getActiveAlerts();
    
    const report = {
      timestamp: new Date(),
      summary: {
        overallHealth: status.overall.health,
        overallScore: status.overall.score,
        activeAlerts: activeAlerts.length,
        criticalIssues: activeAlerts.filter(a => a.severity === 'critical').length
      },
      status,
      alerts: activeAlerts,
      recommendations: status.overall.recommendations,
      systemDetails: {
        system: this.systemOptimizer.getConfig(),
        query: this.queryOptimizer?.getMetrics(),
        database: this.databaseOptimizer?.getMetrics(),
        bundle: this.bundleOptimizer.getMetrics()
      }
    };
    
    const reportJson = JSON.stringify(report, null, 2);
    
    console.log('📊 Performance report generated');
    this.emit('dashboard:report-generated', report);
    
    return reportJson;
  }

  /**
   * Restart all optimization systems
   */
  async restartOptimizations(): Promise<void> {
    console.log('🔄 Restarting optimization systems...');
    
    try {
      // Stop current systems
      await this.systemOptimizer.stopOptimization();
      
      // Clear caches
      if (this.queryOptimizer) {
        this.queryOptimizer.optimizeCache();
      }
      
      if (this.databaseOptimizer) {
        this.databaseOptimizer.clearCache();
      }
      
      // Restart systems
      await this.systemOptimizer.startOptimization();
      
      if (this.queryOptimizer) {
        this.queryOptimizer.optimizeEventQueries();
      }
      
      console.log('✅ Optimization systems restarted successfully');
      this.emit('dashboard:restarted');
      
    } catch (error) {
      console.error('❌ Failed to restart optimization systems:', error);
      throw error;
    }
  }

  /**
   * Manual optimization trigger
   */
  async triggerOptimization(component?: 'system' | 'database' | 'queries' | 'bundle'): Promise<void> {
    console.log(`🔧 Triggering manual optimization${component ? ` for ${component}` : ''}...`);
    
    try {
      if (!component || component === 'queries') {
        this.queryOptimizer?.optimizeCache();
      }
      
      if (!component || component === 'database') {
        this.databaseOptimizer?.clearCache();
      }
      
      if (!component || component === 'system') {
        // System optimizer runs continuously, so just emit an event
        this.emit('dashboard:manual-optimization', { component: 'system' });
      }
      
      if (!component || component === 'bundle') {
        // Bundle optimizer is passive, so just emit an event
        this.emit('dashboard:manual-optimization', { component: 'bundle' });
      }
      
      console.log('✅ Manual optimization completed');
      
    } catch (error) {
      console.error('❌ Manual optimization failed:', error);
      throw error;
    }
  }

  /**
   * Get dashboard configuration
   */
  getConfig(): DashboardConfig {
    return { ...this.config };
  }

  /**
   * Update dashboard configuration
   */
  updateConfig(newConfig: Partial<DashboardConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart monitoring/reporting with new config
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      if (this.config.monitoring.enabled) {
        this.startMonitoring();
      }
    }
    
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      if (this.config.reporting.enabled) {
        this.startReporting();
      }
    }
    
    console.log('🔧 Dashboard configuration updated');
    this.emit('dashboard:config-updated', this.config);
  }

  /**
   * Cleanup and destroy
   */
  async destroy(): Promise<void> {
    console.log('🧹 Shutting down optimization dashboard...');
    
    // Clear intervals
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }
    
    // Stop optimization systems
    try {
      await this.systemOptimizer.stopOptimization();
      
      if (this.queryOptimizer) {
        this.queryOptimizer.destroy();
      }
      
      if (this.databaseOptimizer) {
        this.databaseOptimizer.destroy();
      }
      
      this.bundleOptimizer.destroy();
      
    } catch (error) {
      console.error('❌ Error during dashboard shutdown:', error);
    }
    
    this.isActive = false;
    this.alerts = [];
    
    console.log('✅ Optimization dashboard shut down');
    this.emit('dashboard:destroyed');
  }
}

export default OptimizationDashboard;
