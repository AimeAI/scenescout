/**
 * Communication Dashboard
 * Provides real-time monitoring and management interface for inter-agent communication
 */

import { messageBus, AgentState, AgentMessage } from './message-bus';
import { agentCoordinator, TaskAssignment } from './agent-coordinator';
import { conflictResolver, Conflict } from './conflict-resolver';
import { healthMonitor, SystemHealth, HealthAlert } from './health-monitor';
import { EventEmitter } from 'events';

export interface DashboardMetrics {
  timestamp: number;
  agents: {
    total: number;
    active: number;
    busy: number;
    idle: number;
    offline: number;
  };
  communication: {
    messagesPerSecond: number;
    avgLatency: number;
    failureRate: number;
    queueDepth: number;
  };
  tasks: {
    total: number;
    pending: number;
    active: number;
    completed: number;
    failed: number;
  };
  conflicts: {
    total: number;
    resolved: number;
    pending: number;
    escalated: number;
  };
  health: SystemHealth;
}

export interface CommunicationEvent {
  id: string;
  timestamp: number;
  type: 'message' | 'task' | 'conflict' | 'alert' | 'agent_status';
  source: string;
  details: any;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export class CommunicationDashboard extends EventEmitter {
  private metrics: DashboardMetrics[] = [];
  private events: CommunicationEvent[] = [];
  private updateInterval?: NodeJS.Timeout;
  private readonly maxMetricsHistory = 1000;
  private readonly maxEventsHistory = 500;

  constructor() {
    super();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    this.setupEventHandlers();
    this.startMetricsCollection();
    console.log('📊 Communication Dashboard initialized');
  }

  /**
   * Get current dashboard metrics
   */
  getCurrentMetrics(): DashboardMetrics {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : this.createEmptyMetrics();
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(hours: number = 1): DashboardMetrics[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.metrics.filter(m => m.timestamp > cutoff);
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 50): CommunicationEvent[] {
    return this.events.slice(-limit).reverse();
  }

  /**
   * Get agent network topology
   */
  getNetworkTopology(): {
    nodes: Array<{
      id: string;
      type: string;
      status: string;
      workload: number;
      connections: number;
    }>;
    edges: Array<{
      from: string;
      to: string;
      weight: number;
      latency: number;
    }>;
  } {
    const allAgents = Array.from((messageBus as any).agents.values()) as AgentState[];
    const recentMessages = this.getRecentCommunications();

    const nodes = allAgents.map(agent => {
      const connections = recentMessages.filter(msg => 
        msg.from === agent.id || msg.to === agent.id
      ).length;

      return {
        id: agent.id,
        type: agent.type,
        status: agent.status,
        workload: agent.workload,
        connections
      };
    });

    // Calculate edges based on message frequency
    const edgeMap = new Map<string, { count: number; totalLatency: number }>();
    
    for (const msg of recentMessages) {
      const key = `${msg.from}-${msg.to}`;
      const existing = edgeMap.get(key) || { count: 0, totalLatency: 0 };
      existing.count++;
      existing.totalLatency += (msg as any).latency || 0;
      edgeMap.set(key, existing);
    }

    const edges = Array.from(edgeMap.entries()).map(([key, data]) => {
      const [from, to] = key.split('-');
      return {
        from,
        to,
        weight: data.count,
        latency: data.count > 0 ? data.totalLatency / data.count : 0
      };
    });

    return { nodes, edges };
  }

  /**
   * Get system performance summary
   */
  getPerformanceSummary(): {
    throughput: number;
    efficiency: number;
    reliability: number;
    scalability: number;
    overallScore: number;
  } {
    const recent = this.getMetricsHistory(0.5); // Last 30 minutes
    if (recent.length === 0) {
      return { throughput: 0, efficiency: 0, reliability: 0, scalability: 0, overallScore: 0 };
    }

    // Calculate throughput (tasks completed per minute)
    const completedTasks = recent.reduce((sum, m) => sum + m.tasks.completed, 0);
    const throughput = completedTasks / (recent.length * 5 / 60); // per minute

    // Calculate efficiency (completion rate)
    const totalTasks = recent.reduce((sum, m) => sum + m.tasks.total, 0);
    const efficiency = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Calculate reliability (1 - failure rate)
    const avgFailureRate = recent.reduce((sum, m) => sum + m.communication.failureRate, 0) / recent.length;
    const reliability = (1 - avgFailureRate) * 100;

    // Calculate scalability (agent utilization efficiency)
    const avgActiveAgents = recent.reduce((sum, m) => sum + m.agents.active, 0) / recent.length;
    const avgTotalAgents = recent.reduce((sum, m) => sum + m.agents.total, 0) / recent.length;
    const scalability = avgTotalAgents > 0 ? (avgActiveAgents / avgTotalAgents) * 100 : 0;

    // Overall score
    const overallScore = (throughput * 0.3 + efficiency * 0.3 + reliability * 0.25 + scalability * 0.15);

    return {
      throughput: Math.round(throughput * 100) / 100,
      efficiency: Math.round(efficiency * 100) / 100,
      reliability: Math.round(reliability * 100) / 100,
      scalability: Math.round(scalability * 100) / 100,
      overallScore: Math.round(overallScore * 100) / 100
    };
  }

  /**
   * Get communication bottlenecks
   */
  getBottlenecks(): Array<{
    type: 'agent' | 'communication' | 'task' | 'resource';
    description: string;
    severity: 'low' | 'medium' | 'high';
    recommendation: string;
    affectedAgents: string[];
  }> {
    const bottlenecks: any[] = [];
    const currentMetrics = this.getCurrentMetrics();
    const topology = this.getNetworkTopology();

    // Agent bottlenecks
    const overloadedAgents = topology.nodes.filter(node => node.workload > 0.8);
    if (overloadedAgents.length > 0) {
      bottlenecks.push({
        type: 'agent',
        description: `${overloadedAgents.length} agents are overloaded`,
        severity: overloadedAgents.length > 2 ? 'high' : 'medium',
        recommendation: 'Consider scaling up agents or redistributing workload',
        affectedAgents: overloadedAgents.map(a => a.id)
      });
    }

    // Communication bottlenecks
    if (currentMetrics.communication.avgLatency > 2000) {
      bottlenecks.push({
        type: 'communication',
        description: `High communication latency: ${currentMetrics.communication.avgLatency}ms`,
        severity: currentMetrics.communication.avgLatency > 5000 ? 'high' : 'medium',
        recommendation: 'Optimize message routing or check network connectivity',
        affectedAgents: []
      });
    }

    // Task queue bottlenecks
    if (currentMetrics.tasks.pending > currentMetrics.agents.active * 2) {
      bottlenecks.push({
        type: 'task',
        description: `Task queue is backing up: ${currentMetrics.tasks.pending} pending tasks`,
        severity: 'medium',
        recommendation: 'Spawn additional agents or optimize task processing',
        affectedAgents: []
      });
    }

    // Resource conflicts
    if (currentMetrics.conflicts.pending > 3) {
      bottlenecks.push({
        type: 'resource',
        description: `Multiple unresolved conflicts: ${currentMetrics.conflicts.pending}`,
        severity: 'high',
        recommendation: 'Review resource allocation and conflict resolution strategies',
        affectedAgents: []
      });
    }

    return bottlenecks;
  }

  /**
   * Generate system health report
   */
  generateHealthReport(): {
    summary: string;
    status: 'healthy' | 'degraded' | 'critical';
    recommendations: string[];
    keyMetrics: { [key: string]: number };
    trends: { [key: string]: 'improving' | 'stable' | 'degrading' };
  } {
    const currentMetrics = this.getCurrentMetrics();
    const recentHistory = this.getMetricsHistory(1);
    const performance = this.getPerformanceSummary();
    const bottlenecks = this.getBottlenecks();

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (bottlenecks.some(b => b.severity === 'high') || performance.overallScore < 50) {
      status = 'critical';
    } else if (bottlenecks.some(b => b.severity === 'medium') || performance.overallScore < 75) {
      status = 'degraded';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (currentMetrics.agents.offline > 0) {
      recommendations.push(`Investigate ${currentMetrics.agents.offline} offline agents`);
    }
    if (performance.efficiency < 80) {
      recommendations.push('Improve task completion efficiency');
    }
    if (currentMetrics.communication.failureRate > 0.05) {
      recommendations.push('Address communication reliability issues');
    }
    recommendations.push(...bottlenecks.map(b => b.recommendation));

    // Calculate trends
    const trends: { [key: string]: 'improving' | 'stable' | 'degrading' } = {};
    if (recentHistory.length >= 2) {
      const older = recentHistory[0];
      const newer = recentHistory[recentHistory.length - 1];
      
      trends.throughput = this.calculateTrend(older.tasks.completed, newer.tasks.completed);
      trends.latency = this.calculateTrend(newer.communication.avgLatency, older.communication.avgLatency);
      trends.efficiency = this.calculateTrend(older.tasks.failed, newer.tasks.failed, true);
    }

    const summary = `System is ${status}. ${currentMetrics.agents.active}/${currentMetrics.agents.total} agents active. ` +
      `${currentMetrics.tasks.pending} tasks pending. Overall performance: ${performance.overallScore}%`;

    return {
      summary,
      status,
      recommendations: recommendations.slice(0, 5), // Top 5 recommendations
      keyMetrics: {
        'Overall Score': performance.overallScore,
        'Active Agents': currentMetrics.agents.active,
        'Avg Latency (ms)': currentMetrics.communication.avgLatency,
        'Task Success Rate': ((currentMetrics.tasks.completed / Math.max(1, currentMetrics.tasks.total)) * 100),
        'Conflict Resolution Rate': ((currentMetrics.conflicts.resolved / Math.max(1, currentMetrics.conflicts.total)) * 100)
      },
      trends
    };
  }

  private setupEventHandlers(): void {
    // Message events
    messageBus.on('message:sent', (message: AgentMessage) => {
      this.addEvent({
        type: 'message',
        source: message.from,
        details: {
          to: message.to,
          messageType: message.type,
          priority: message.priority
        },
        severity: 'info'
      });
    });

    // Agent events
    messageBus.on('agent:registered', (agent: AgentState) => {
      this.addEvent({
        type: 'agent_status',
        source: agent.id,
        details: { action: 'registered', type: agent.type },
        severity: 'info'
      });
    });

    messageBus.on('agent:offline', (agent: AgentState) => {
      this.addEvent({
        type: 'agent_status',
        source: agent.id,
        details: { action: 'offline' },
        severity: 'warning'
      });
    });

    // Health alerts
    healthMonitor.on('alert:created', (alert: HealthAlert) => {
      this.addEvent({
        type: 'alert',
        source: 'health-monitor',
        details: alert,
        severity: alert.severity === 'critical' ? 'critical' : 'warning'
      });
    });

    // Conflict events
    conflictResolver.on('conflict:reported', (conflict: Conflict) => {
      this.addEvent({
        type: 'conflict',
        source: 'conflict-resolver',
        details: conflict,
        severity: conflict.priority === 'critical' ? 'critical' : 'warning'
      });
    });
  }

  private startMetricsCollection(): void {
    this.updateInterval = setInterval(() => {
      this.collectMetrics();
    }, 5000); // Collect every 5 seconds
  }

  private collectMetrics(): void {
    const systemStatus = messageBus.getSystemStatus();
    const coordinatorStats = agentCoordinator.getCoordinationStats();
    const conflictStats = conflictResolver.getConflictStats();
    const systemHealth = healthMonitor.getSystemHealth();

    const allAgents = Array.from((messageBus as any).agents.values()) as AgentState[];
    const agentStatusCounts = allAgents.reduce((acc, agent) => {
      acc[agent.status] = (acc[agent.status] || 0) + 1;
      return acc;
    }, {} as { [status: string]: number });

    const metrics: DashboardMetrics = {
      timestamp: Date.now(),
      agents: {
        total: systemStatus.totalAgents,
        active: agentStatusCounts.active || 0,
        busy: agentStatusCounts.busy || 0,
        idle: agentStatusCounts.idle || 0,
        offline: agentStatusCounts.offline || 0
      },
      communication: {
        messagesPerSecond: this.calculateMessageRate(),
        avgLatency: systemHealth.communicationLatency,
        failureRate: systemHealth.errorRate,
        queueDepth: systemStatus.queuedMessages
      },
      tasks: {
        total: coordinatorStats.totalTasks,
        pending: coordinatorStats.pendingTasks,
        active: coordinatorStats.activeTasks,
        completed: coordinatorStats.completedTasks,
        failed: coordinatorStats.failedTasks
      },
      conflicts: {
        total: conflictStats.total,
        resolved: conflictStats.resolved,
        pending: conflictStats.pending,
        escalated: conflictStats.escalated
      },
      health: systemHealth
    };

    this.metrics.push(metrics);
    
    // Cleanup old metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }

    this.emit('metrics:updated', metrics);
  }

  private addEvent(eventData: Omit<CommunicationEvent, 'id' | 'timestamp'>): void {
    const event: CommunicationEvent = {
      ...eventData,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    this.events.push(event);
    
    // Cleanup old events
    if (this.events.length > this.maxEventsHistory) {
      this.events = this.events.slice(-this.maxEventsHistory);
    }

    this.emit('event:added', event);
  }

  private createEmptyMetrics(): DashboardMetrics {
    return {
      timestamp: Date.now(),
      agents: { total: 0, active: 0, busy: 0, idle: 0, offline: 0 },
      communication: { messagesPerSecond: 0, avgLatency: 0, failureRate: 0, queueDepth: 0 },
      tasks: { total: 0, pending: 0, active: 0, completed: 0, failed: 0 },
      conflicts: { total: 0, resolved: 0, pending: 0, escalated: 0 },
      health: {
        overall: 'healthy',
        totalAgents: 0,
        healthyAgents: 0,
        degradedAgents: 0,
        criticalAgents: 0,
        offlineAgents: 0,
        avgResponseTime: 0,
        systemLoad: 0,
        communicationLatency: 0,
        errorRate: 0
      }
    };
  }

  private calculateMessageRate(): number {
    // Calculate messages per second based on recent activity
    const recentEvents = this.events.filter(e => 
      e.type === 'message' && Date.now() - e.timestamp < 60000 // Last minute
    );
    return recentEvents.length / 60; // Per second
  }

  private getRecentCommunications(): AgentMessage[] {
    // This would be implemented to get recent messages from the message bus
    // For now, return empty array as this requires access to message bus internals
    return [];
  }

  private calculateTrend(oldValue: number, newValue: number, inverse = false): 'improving' | 'stable' | 'degrading' {
    const threshold = 0.05; // 5% change threshold
    const change = (newValue - oldValue) / Math.max(oldValue, 1);
    
    if (inverse) {
      if (change < -threshold) return 'improving';
      if (change > threshold) return 'degrading';
    } else {
      if (change > threshold) return 'improving';
      if (change < -threshold) return 'degrading';
    }
    
    return 'stable';
  }

  destroy(): void {
    if (this.updateInterval) clearInterval(this.updateInterval);
    this.removeAllListeners();
  }
}

// Singleton instance
export const communicationDashboard = new CommunicationDashboard();