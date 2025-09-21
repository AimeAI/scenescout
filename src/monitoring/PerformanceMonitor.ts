/**
 * Central Performance Monitor for Swarm System
 * Comprehensive monitoring, alerting, and optimization
 */

import { EventEmitter } from 'events';
import { MetricsCollector } from './collectors/MetricsCollector';
import { AlertManager } from './alerts/AlertManager';
import { DashboardManager } from './dashboards/DashboardManager';
import { OptimizationEngine } from './optimizers/OptimizationEngine';
import { ReportGenerator } from './reports/ReportGenerator';

export interface AgentMetrics {
  agentId: string;
  agentType: string;
  cpu: number;
  memory: number;
  taskCompletionRate: number;
  responseTime: number;
  errorRate: number;
  activeConnections: number;
  lastHeartbeat: Date;
  status: 'active' | 'idle' | 'busy' | 'error' | 'offline';
}

export interface SwarmMetrics {
  totalAgents: number;
  activeAgents: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageResponseTime: number;
  throughput: number;
  communicationLatency: number;
  systemLoad: number;
  memoryUsage: number;
  timestamp: Date;
}

export interface PerformanceAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'performance' | 'availability' | 'error' | 'resource';
  message: string;
  agentId?: string;
  metrics: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
}

export class PerformanceMonitor extends EventEmitter {
  private metricsCollector: MetricsCollector;
  private alertManager: AlertManager;
  private dashboardManager: DashboardManager;
  private optimizationEngine: OptimizationEngine;
  private reportGenerator: ReportGenerator;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  // Performance thresholds
  private readonly thresholds = {
    cpu: { warning: 70, critical: 90 },
    memory: { warning: 80, critical: 95 },
    responseTime: { warning: 1000, critical: 5000 }, // ms
    errorRate: { warning: 0.05, critical: 0.1 }, // 5%, 10%
    taskFailureRate: { warning: 0.1, critical: 0.2 }, // 10%, 20%
    communicationLatency: { warning: 200, critical: 500 } // ms
  };

  constructor() {
    super();
    this.metricsCollector = new MetricsCollector();
    this.alertManager = new AlertManager();
    this.dashboardManager = new DashboardManager();
    this.optimizationEngine = new OptimizationEngine();
    this.reportGenerator = new ReportGenerator();

    this.setupEventHandlers();
  }

  /**
   * Start comprehensive performance monitoring
   */
  async startMonitoring(intervalMs: number = 5000): Promise<void> {
    if (this.isMonitoring) {
      console.log('Performance monitoring already active');
      return;
    }

    console.log('🚀 Starting Performance Monitor...');
    
    try {
      // Initialize all monitoring components
      await this.metricsCollector.initialize();
      await this.alertManager.initialize();
      await this.dashboardManager.initialize();
      await this.optimizationEngine.initialize();
      await this.reportGenerator.initialize();

      // Start monitoring loop
      this.monitoringInterval = setInterval(async () => {
        await this.performMonitoringCycle();
      }, intervalMs);

      this.isMonitoring = true;
      
      console.log('✅ Performance monitoring started successfully');
      this.emit('monitoring:started', { interval: intervalMs });

    } catch (error) {
      console.error('❌ Failed to start performance monitoring:', error);
      throw error;
    }
  }

  /**
   * Stop performance monitoring
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) return;

    console.log('🛑 Stopping Performance Monitor...');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    
    // Generate final report
    await this.generatePerformanceReport('final');
    
    console.log('✅ Performance monitoring stopped');
    this.emit('monitoring:stopped');
  }

  /**
   * Main monitoring cycle - collect metrics, analyze, alert, optimize
   */
  private async performMonitoringCycle(): Promise<void> {
    try {
      const startTime = Date.now();

      // 1. Collect current metrics from all agents
      const agentMetrics = await this.metricsCollector.collectAgentMetrics();
      const swarmMetrics = await this.metricsCollector.collectSwarmMetrics();
      const systemMetrics = await this.metricsCollector.collectSystemMetrics();

      // 2. Analyze performance and detect issues
      const issues = await this.analyzePerformance({
        agents: agentMetrics,
        swarm: swarmMetrics,
        system: systemMetrics
      });

      // 3. Generate alerts for critical issues
      for (const issue of issues) {
        await this.alertManager.processAlert(issue);
      }

      // 4. Update real-time dashboard
      await this.dashboardManager.updateMetrics({
        agents: agentMetrics,
        swarm: swarmMetrics,
        system: systemMetrics,
        alerts: issues
      });

      // 5. Run optimization recommendations
      const optimizations = await this.optimizationEngine.analyzeAndOptimize({
        agents: agentMetrics,
        swarm: swarmMetrics,
        system: systemMetrics
      });

      // 6. Apply auto-optimizations if enabled
      for (const optimization of optimizations) {
        if (optimization.autoApply) {
          await this.applyOptimization(optimization);
        }
      }

      const cycleTime = Date.now() - startTime;
      
      // Emit monitoring cycle complete event
      this.emit('monitoring:cycle', {
        cycleTime,
        agentCount: agentMetrics.length,
        alertCount: issues.length,
        optimizationCount: optimizations.length
      });

      // Log performance if cycle is slow
      if (cycleTime > 1000) {
        console.warn(`⚠️ Monitoring cycle took ${cycleTime}ms (threshold: 1000ms)`);
      }

    } catch (error) {
      console.error('❌ Error in monitoring cycle:', error);
      this.emit('monitoring:error', error);
    }
  }

  /**
   * Analyze performance metrics and detect issues
   */
  private async analyzePerformance(metrics: {
    agents: AgentMetrics[];
    swarm: SwarmMetrics;
    system: any;
  }): Promise<PerformanceAlert[]> {
    const alerts: PerformanceAlert[] = [];

    // Analyze individual agent performance
    for (const agent of metrics.agents) {
      // CPU usage alerts
      if (agent.cpu >= this.thresholds.cpu.critical) {
        alerts.push({
          id: `cpu-critical-${agent.agentId}`,
          severity: 'critical',
          type: 'performance',
          message: `Agent ${agent.agentId} CPU usage critical: ${agent.cpu}%`,
          agentId: agent.agentId,
          metrics: { cpu: agent.cpu },
          timestamp: new Date(),
          resolved: false
        });
      } else if (agent.cpu >= this.thresholds.cpu.warning) {
        alerts.push({
          id: `cpu-warning-${agent.agentId}`,
          severity: 'medium',
          type: 'performance',
          message: `Agent ${agent.agentId} high CPU usage: ${agent.cpu}%`,
          agentId: agent.agentId,
          metrics: { cpu: agent.cpu },
          timestamp: new Date(),
          resolved: false
        });
      }

      // Memory usage alerts
      if (agent.memory >= this.thresholds.memory.critical) {
        alerts.push({
          id: `memory-critical-${agent.agentId}`,
          severity: 'critical',
          type: 'resource',
          message: `Agent ${agent.agentId} memory usage critical: ${agent.memory}%`,
          agentId: agent.agentId,
          metrics: { memory: agent.memory },
          timestamp: new Date(),
          resolved: false
        });
      }

      // Response time alerts
      if (agent.responseTime >= this.thresholds.responseTime.critical) {
        alerts.push({
          id: `response-critical-${agent.agentId}`,
          severity: 'critical',
          type: 'performance',
          message: `Agent ${agent.agentId} response time critical: ${agent.responseTime}ms`,
          agentId: agent.agentId,
          metrics: { responseTime: agent.responseTime },
          timestamp: new Date(),
          resolved: false
        });
      }

      // Error rate alerts
      if (agent.errorRate >= this.thresholds.errorRate.critical) {
        alerts.push({
          id: `error-critical-${agent.agentId}`,
          severity: 'critical',
          type: 'error',
          message: `Agent ${agent.agentId} high error rate: ${(agent.errorRate * 100).toFixed(1)}%`,
          agentId: agent.agentId,
          metrics: { errorRate: agent.errorRate },
          timestamp: new Date(),
          resolved: false
        });
      }

      // Agent offline check
      const lastHeartbeatAge = Date.now() - agent.lastHeartbeat.getTime();
      if (lastHeartbeatAge > 30000) { // 30 seconds
        alerts.push({
          id: `offline-${agent.agentId}`,
          severity: 'high',
          type: 'availability',
          message: `Agent ${agent.agentId} appears offline (last heartbeat: ${Math.round(lastHeartbeatAge / 1000)}s ago)`,
          agentId: agent.agentId,
          metrics: { lastHeartbeatAge },
          timestamp: new Date(),
          resolved: false
        });
      }
    }

    // Analyze swarm-level performance
    if (metrics.swarm.communicationLatency >= this.thresholds.communicationLatency.critical) {
      alerts.push({
        id: 'swarm-latency-critical',
        severity: 'critical',
        type: 'performance',
        message: `Swarm communication latency critical: ${metrics.swarm.communicationLatency}ms`,
        metrics: { communicationLatency: metrics.swarm.communicationLatency },
        timestamp: new Date(),
        resolved: false
      });
    }

    // Task failure rate analysis
    const taskFailureRate = metrics.swarm.totalTasks > 0 ? 
      metrics.swarm.failedTasks / metrics.swarm.totalTasks : 0;
    
    if (taskFailureRate >= this.thresholds.taskFailureRate.critical) {
      alerts.push({
        id: 'task-failure-critical',
        severity: 'critical',
        type: 'error',
        message: `High task failure rate: ${(taskFailureRate * 100).toFixed(1)}%`,
        metrics: { taskFailureRate, failedTasks: metrics.swarm.failedTasks },
        timestamp: new Date(),
        resolved: false
      });
    }

    return alerts;
  }

  /**
   * Apply optimization recommendation
   */
  private async applyOptimization(optimization: any): Promise<void> {
    try {
      console.log(`🔧 Applying optimization: ${optimization.type}`);
      
      switch (optimization.type) {
        case 'scale_agents':
          await this.scaleAgents(optimization.targetCount);
          break;
        case 'redistribute_load':
          await this.redistributeLoad(optimization.loadDistribution);
          break;
        case 'restart_agent':
          await this.restartAgent(optimization.agentId);
          break;
        case 'adjust_thresholds':
          await this.adjustThresholds(optimization.thresholds);
          break;
        default:
          console.warn(`Unknown optimization type: ${optimization.type}`);
      }

      this.emit('optimization:applied', optimization);
      
    } catch (error) {
      console.error(`Failed to apply optimization ${optimization.type}:`, error);
      this.emit('optimization:failed', { optimization, error });
    }
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(type: 'hourly' | 'daily' | 'weekly' | 'final' = 'hourly'): Promise<string> {
    try {
      const report = await this.reportGenerator.generateReport(type);
      
      console.log(`📊 Performance report (${type}) generated: ${report.length} bytes`);
      this.emit('report:generated', { type, size: report.length });
      
      return report;
      
    } catch (error) {
      console.error(`Failed to generate ${type} performance report:`, error);
      throw error;
    }
  }

  /**
   * Get current performance dashboard data
   */
  async getDashboardData(): Promise<any> {
    return await this.dashboardManager.getCurrentData();
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<PerformanceAlert[]> {
    return await this.alertManager.getActiveAlerts();
  }

  /**
   * Get optimization recommendations
   */
  async getOptimizationRecommendations(): Promise<any[]> {
    return await this.optimizationEngine.getRecommendations();
  }

  // Helper methods for optimization actions
  private async scaleAgents(targetCount: number): Promise<void> {
    // Implementation would integrate with swarm management
    console.log(`Scaling swarm to ${targetCount} agents`);
  }

  private async redistributeLoad(loadDistribution: any): Promise<void> {
    console.log('Redistributing load across agents');
  }

  private async restartAgent(agentId: string): Promise<void> {
    console.log(`Restarting agent ${agentId}`);
  }

  private async adjustThresholds(thresholds: any): Promise<void> {
    Object.assign(this.thresholds, thresholds);
    console.log('Performance thresholds adjusted');
  }

  /**
   * Setup event handlers for monitoring components
   */
  private setupEventHandlers(): void {
    // Forward events from sub-components
    this.metricsCollector.on('metrics:collected', (data) => {
      this.emit('metrics:collected', data);
    });

    this.alertManager.on('alert:triggered', (alert) => {
      this.emit('alert:triggered', alert);
    });

    this.optimizationEngine.on('optimization:recommended', (recommendation) => {
      this.emit('optimization:recommended', recommendation);
    });

    // Handle critical alerts
    this.on('alert:triggered', (alert) => {
      if (alert.severity === 'critical') {
        console.error(`🚨 CRITICAL ALERT: ${alert.message}`);
      }
    });
  }
}

export default PerformanceMonitor;