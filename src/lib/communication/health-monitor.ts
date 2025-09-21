/**
 * Health Monitoring System
 * Monitors agent health, communication latency, and system performance
 */

import { messageBus, AgentState } from './message-bus';
import { EventEmitter } from 'events';

export interface HealthMetrics {
  agentId: string;
  timestamp: number;
  cpuUsage?: number;
  memoryUsage?: number;
  taskCompletionRate: number;
  avgResponseTime: number;
  errorRate: number;
  heartbeatDelay: number;
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  totalAgents: number;
  healthyAgents: number;
  degradedAgents: number;
  criticalAgents: number;
  offlineAgents: number;
  avgResponseTime: number;
  systemLoad: number;
  communicationLatency: number;
  errorRate: number;
}

export interface HealthAlert {
  id: string;
  type: 'agent_offline' | 'high_latency' | 'high_error_rate' | 'system_overload' | 'communication_failure';
  severity: 'warning' | 'critical';
  message: string;
  agentId?: string;
  timestamp: number;
  acknowledged: boolean;
}

export class HealthMonitor extends EventEmitter {
  private metrics: Map<string, HealthMetrics[]> = new Map();
  private alerts: Map<string, HealthAlert> = new Map();
  private pingResponses: Map<string, number> = new Map();
  private taskCompletions: Map<string, { total: number; successful: number }> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private pingInterval?: NodeJS.Timeout;

  private readonly config = {
    metricsRetentionHours: 24,
    healthCheckInterval: 15000, // 15 seconds
    pingInterval: 30000, // 30 seconds
    thresholds: {
      responseTimeWarning: 2000, // 2 seconds
      responseTimeCritical: 5000, // 5 seconds
      errorRateWarning: 0.1, // 10%
      errorRateCritical: 0.25, // 25%
      heartbeatTimeout: 45000, // 45 seconds
      communicationLatencyWarning: 1000, // 1 second
      communicationLatencyCritical: 3000 // 3 seconds
    }
  };

  constructor() {
    super();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    this.setupEventHandlers();
    this.startMonitoring();
    this.startPingService();
    console.log('🏥 Health Monitor initialized');
  }

  /**
   * Record agent performance metrics
   */
  recordMetrics(agentId: string, metrics: Partial<HealthMetrics>): void {
    const now = Date.now();
    const currentMetrics = this.metrics.get(agentId) || [];
    
    // Calculate derived metrics
    const taskStats = this.taskCompletions.get(agentId) || { total: 0, successful: 0 };
    const taskCompletionRate = taskStats.total > 0 ? taskStats.successful / taskStats.total : 1;
    const errorRate = 1 - taskCompletionRate;
    
    const newMetrics: HealthMetrics = {
      agentId,
      timestamp: now,
      taskCompletionRate,
      avgResponseTime: this.pingResponses.get(agentId) || 0,
      errorRate,
      heartbeatDelay: this.calculateHeartbeatDelay(agentId),
      status: this.calculateHealthStatus(agentId, metrics),
      ...metrics
    };

    // Add to metrics history
    currentMetrics.push(newMetrics);
    
    // Clean old metrics (keep last 24 hours)
    const cutoff = now - (this.config.metricsRetentionHours * 60 * 60 * 1000);
    const filteredMetrics = currentMetrics.filter(m => m.timestamp > cutoff);
    
    this.metrics.set(agentId, filteredMetrics);

    // Check for health issues
    this.checkAgentHealth(newMetrics);
    
    this.emit('metrics:recorded', newMetrics);
  }

  /**
   * Record task completion for an agent
   */
  recordTaskCompletion(agentId: string, successful: boolean): void {
    const stats = this.taskCompletions.get(agentId) || { total: 0, successful: 0 };
    stats.total++;
    if (successful) stats.successful++;
    
    this.taskCompletions.set(agentId, stats);
  }

  /**
   * Get current health status for an agent
   */
  getAgentHealth(agentId: string): HealthMetrics | null {
    const metrics = this.metrics.get(agentId);
    return metrics && metrics.length > 0 ? metrics[metrics.length - 1] : null;
  }

  /**
   * Get overall system health
   */
  getSystemHealth(): SystemHealth {
    const allAgents = Array.from((messageBus as any).agents.values()) as AgentState[];
    const allMetrics = Array.from(this.metrics.values()).flat();
    const recentMetrics = allMetrics.filter(m => 
      Date.now() - m.timestamp < 300000 // Last 5 minutes
    );

    const healthyAgents = allAgents.filter(a => {
      const health = this.getAgentHealth(a.id);
      return health?.status === 'healthy';
    }).length;

    const degradedAgents = allAgents.filter(a => {
      const health = this.getAgentHealth(a.id);
      return health?.status === 'degraded';
    }).length;

    const criticalAgents = allAgents.filter(a => {
      const health = this.getAgentHealth(a.id);
      return health?.status === 'critical';
    }).length;

    const offlineAgents = allAgents.filter(a => {
      const health = this.getAgentHealth(a.id);
      return health?.status === 'offline' || a.status === 'offline';
    }).length;

    const avgResponseTime = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.avgResponseTime, 0) / recentMetrics.length
      : 0;

    const errorRate = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, m) => sum + m.errorRate, 0) / recentMetrics.length
      : 0;

    const systemLoad = allAgents.reduce((sum, a) => sum + a.workload, 0) / Math.max(allAgents.length, 1);
    const communicationLatency = this.calculateCommunicationLatency();

    // Determine overall health
    let overall: SystemHealth['overall'] = 'healthy';
    if (criticalAgents > 0 || errorRate > this.config.thresholds.errorRateCritical) {
      overall = 'critical';
    } else if (degradedAgents > allAgents.length * 0.3 || errorRate > this.config.thresholds.errorRateWarning) {
      overall = 'degraded';
    }

    return {
      overall,
      totalAgents: allAgents.length,
      healthyAgents,
      degradedAgents,
      criticalAgents,
      offlineAgents,
      avgResponseTime,
      systemLoad,
      communicationLatency,
      errorRate
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): HealthAlert[] {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.acknowledged)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit('alert:acknowledged', alert);
      return true;
    }
    return false;
  }

  /**
   * Get health trends for an agent
   */
  getHealthTrends(agentId: string, hours: number = 1): {
    responseTime: number[];
    errorRate: number[];
    taskCompletionRate: number[];
    timestamps: number[];
  } {
    const metrics = this.metrics.get(agentId) || [];
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const recentMetrics = metrics.filter(m => m.timestamp > cutoff);

    return {
      responseTime: recentMetrics.map(m => m.avgResponseTime),
      errorRate: recentMetrics.map(m => m.errorRate),
      taskCompletionRate: recentMetrics.map(m => m.taskCompletionRate),
      timestamps: recentMetrics.map(m => m.timestamp)
    };
  }

  private setupEventHandlers(): void {
    messageBus.on('agent:heartbeat', (agent: AgentState) => {
      this.recordMetrics(agent.id, {
        heartbeatDelay: Date.now() - agent.lastHeartbeat
      });
    });

    messageBus.on('agent:offline', (agent: AgentState) => {
      this.createAlert({
        type: 'agent_offline',
        severity: 'critical',
        message: `Agent ${agent.id} has gone offline`,
        agentId: agent.id
      });
    });

    messageBus.on('message:sent', () => {
      // Track communication activity
    });
  }

  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  private startPingService(): void {
    this.pingInterval = setInterval(() => {
      this.pingAllAgents();
    }, this.config.pingInterval);
  }

  private async performHealthChecks(): Promise<void> {
    const systemHealth = this.getSystemHealth();
    
    // Check system-wide issues
    if (systemHealth.avgResponseTime > this.config.thresholds.responseTimeCritical) {
      this.createAlert({
        type: 'high_latency',
        severity: 'critical',
        message: `System response time is critically high: ${systemHealth.avgResponseTime}ms`
      });
    }

    if (systemHealth.errorRate > this.config.thresholds.errorRateCritical) {
      this.createAlert({
        type: 'high_error_rate',
        severity: 'critical',
        message: `System error rate is critically high: ${(systemHealth.errorRate * 100).toFixed(2)}%`
      });
    }

    if (systemHealth.systemLoad > 0.9) {
      this.createAlert({
        type: 'system_overload',
        severity: 'warning',
        message: `System load is high: ${(systemHealth.systemLoad * 100).toFixed(1)}%`
      });
    }

    this.emit('health:checked', systemHealth);
  }

  private async pingAllAgents(): Promise<void> {
    const allAgents = Array.from((messageBus as any).agents.values()) as AgentState[];
    
    for (const agent of allAgents) {
      if (agent.status !== 'offline') {
        const startTime = Date.now();
        
        try {
          await messageBus.sendMessage({
            from: 'health-monitor',
            to: agent.id,
            type: 'heartbeat',
            priority: 'low',
            payload: { ping: true, timestamp: startTime }
          });
        } catch (error) {
          const responseTime = Date.now() - startTime;
          this.pingResponses.set(agent.id, responseTime);
          
          if (responseTime > this.config.thresholds.communicationLatencyCritical) {
            this.createAlert({
              type: 'communication_failure',
              severity: 'critical',
              message: `Communication with agent ${agent.id} failed`,
              agentId: agent.id
            });
          }
        }
      }
    }
  }

  private calculateHeartbeatDelay(agentId: string): number {
    const agent = (messageBus as any).agents.get(agentId);
    return agent ? Date.now() - agent.lastHeartbeat : 0;
  }

  private calculateHealthStatus(
    agentId: string, 
    metrics: Partial<HealthMetrics>
  ): HealthMetrics['status'] {
    const agent = (messageBus as any).agents.get(agentId);
    if (!agent || agent.status === 'offline') return 'offline';

    const heartbeatDelay = this.calculateHeartbeatDelay(agentId);
    const responseTime = this.pingResponses.get(agentId) || 0;
    const taskStats = this.taskCompletions.get(agentId) || { total: 0, successful: 0 };
    const errorRate = taskStats.total > 0 ? 1 - (taskStats.successful / taskStats.total) : 0;

    // Critical conditions
    if (
      heartbeatDelay > this.config.thresholds.heartbeatTimeout ||
      responseTime > this.config.thresholds.responseTimeCritical ||
      errorRate > this.config.thresholds.errorRateCritical
    ) {
      return 'critical';
    }

    // Degraded conditions
    if (
      responseTime > this.config.thresholds.responseTimeWarning ||
      errorRate > this.config.thresholds.errorRateWarning
    ) {
      return 'degraded';
    }

    return 'healthy';
  }

  private calculateCommunicationLatency(): number {
    const latencies = Array.from(this.pingResponses.values());
    return latencies.length > 0 
      ? latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length 
      : 0;
  }

  private checkAgentHealth(metrics: HealthMetrics): void {
    if (metrics.status === 'critical') {
      this.createAlert({
        type: 'high_error_rate',
        severity: 'critical',
        message: `Agent ${metrics.agentId} is in critical condition`,
        agentId: metrics.agentId
      });
    }

    if (metrics.avgResponseTime > this.config.thresholds.responseTimeCritical) {
      this.createAlert({
        type: 'high_latency',
        severity: 'critical',
        message: `Agent ${metrics.agentId} has critically high response time: ${metrics.avgResponseTime}ms`,
        agentId: metrics.agentId
      });
    }
  }

  private createAlert(alertData: Omit<HealthAlert, 'id' | 'timestamp' | 'acknowledged'>): void {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: HealthAlert = {
      ...alertData,
      id: alertId,
      timestamp: Date.now(),
      acknowledged: false
    };

    this.alerts.set(alertId, alert);
    this.emit('alert:created', alert);
    
    console.warn(`🚨 Health Alert [${alert.severity}]: ${alert.message}`);
  }

  destroy(): void {
    if (this.monitoringInterval) clearInterval(this.monitoringInterval);
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.removeAllListeners();
  }
}

// Singleton instance
export const healthMonitor = new HealthMonitor();