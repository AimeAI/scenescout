/**
 * Optimization Engine - Analyzes performance and provides optimization recommendations
 */

import { EventEmitter } from 'events';
import { AgentMetrics, SwarmMetrics } from '../PerformanceMonitor';

export interface OptimizationRecommendation {
  id: string;
  type: 'scale_agents' | 'redistribute_load' | 'restart_agent' | 'adjust_thresholds' | 'resource_allocation' | 'topology_change';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  expectedImpact: string;
  autoApply: boolean;
  confidence: number; // 0-1
  estimatedCost: number;
  estimatedBenefit: number;
  parameters: Record<string, any>;
  prerequisites: string[];
  risks: string[];
  timestamp: Date;
}

export interface OptimizationRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  enabled: boolean;
  confidence: number;
  autoApply: boolean;
}

export class OptimizationEngine extends EventEmitter {
  private recommendations: OptimizationRecommendation[] = [];
  private optimizationRules: Map<string, OptimizationRule> = new Map();
  private performanceBaseline: any = null;
  private optimizationHistory: any[] = [];

  async initialize(): Promise<void> {
    console.log('🔧 Initializing Optimization Engine...');
    
    // Setup optimization rules
    this.setupOptimizationRules();
    
    // Load performance baseline
    await this.loadPerformanceBaseline();
    
    console.log('✅ Optimization Engine initialized');
  }

  /**
   * Analyze performance and generate optimization recommendations
   */
  async analyzeAndOptimize(data: {
    agents: AgentMetrics[];
    swarm: SwarmMetrics;
    system: any;
  }): Promise<OptimizationRecommendation[]> {
    try {
      const recommendations: OptimizationRecommendation[] = [];

      // Analyze agent performance
      const agentOptimizations = await this.analyzeAgentPerformance(data.agents);
      recommendations.push(...agentOptimizations);

      // Analyze swarm performance
      const swarmOptimizations = await this.analyzeSwarmPerformance(data.swarm);
      recommendations.push(...swarmOptimizations);

      // Analyze system resources
      const systemOptimizations = await this.analyzeSystemPerformance(data.system);
      recommendations.push(...systemOptimizations);

      // Analyze load distribution
      const loadOptimizations = await this.analyzeLoadDistribution(data.agents, data.swarm);
      recommendations.push(...loadOptimizations);

      // Sort by priority and confidence
      recommendations.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.confidence - a.confidence;
      });

      // Store recommendations
      this.recommendations = recommendations;

      // Emit optimization event
      this.emit('optimization:analyzed', {
        recommendationCount: recommendations.length,
        highPriorityCount: recommendations.filter(r => r.priority === 'high' || r.priority === 'critical').length
      });

      return recommendations;

    } catch (error) {
      console.error('Failed to analyze and optimize:', error);
      this.emit('optimization:error', error);
      return [];
    }
  }

  /**
   * Analyze individual agent performance
   */
  private async analyzeAgentPerformance(agents: AgentMetrics[]): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    for (const agent of agents) {
      // High CPU usage optimization
      if (agent.cpu > 85) {
        recommendations.push({
          id: `cpu-optimization-${agent.agentId}`,
          type: 'resource_allocation',
          priority: agent.cpu > 95 ? 'critical' : 'high',
          description: `Agent ${agent.agentId} has high CPU usage (${agent.cpu}%). Consider reducing workload or scaling horizontally.`,
          expectedImpact: `Reduce CPU usage by 20-40%, improve response times`,
          autoApply: false,
          confidence: 0.85,
          estimatedCost: 2,
          estimatedBenefit: 8,
          parameters: {
            agentId: agent.agentId,
            currentCpu: agent.cpu,
            targetCpu: 70,
            action: 'redistribute_tasks'
          },
          prerequisites: ['Load balancer available', 'Other agents have capacity'],
          risks: ['Temporary task interruption'],
          timestamp: new Date()
        });
      }

      // High memory usage optimization
      if (agent.memory > 80) {
        recommendations.push({
          id: `memory-optimization-${agent.agentId}`,
          type: 'resource_allocation',
          priority: agent.memory > 90 ? 'critical' : 'high',
          description: `Agent ${agent.agentId} has high memory usage (${agent.memory}%). Consider memory cleanup or restart.`,
          expectedImpact: `Reduce memory usage by 30-50%, prevent memory leaks`,
          autoApply: agent.memory > 95,
          confidence: 0.90,
          estimatedCost: 1,
          estimatedBenefit: 7,
          parameters: {
            agentId: agent.agentId,
            currentMemory: agent.memory,
            action: 'restart_agent'
          },
          prerequisites: ['Agent can be safely restarted'],
          risks: ['Brief service interruption'],
          timestamp: new Date()
        });
      }

      // Slow response time optimization
      if (agent.responseTime > 2000) {
        recommendations.push({
          id: `response-optimization-${agent.agentId}`,
          type: 'redistribute_load',
          priority: agent.responseTime > 5000 ? 'high' : 'medium',
          description: `Agent ${agent.agentId} has slow response times (${agent.responseTime}ms). Consider load redistribution.`,
          expectedImpact: `Improve response times by 40-60%`,
          autoApply: false,
          confidence: 0.75,
          estimatedCost: 3,
          estimatedBenefit: 6,
          parameters: {
            agentId: agent.agentId,
            currentResponseTime: agent.responseTime,
            targetResponseTime: 1000
          },
          prerequisites: ['Load balancer configured'],
          risks: ['Complex redistribution logic required'],
          timestamp: new Date()
        });
      }

      // High error rate optimization
      if (agent.errorRate > 0.05) {
        recommendations.push({
          id: `error-optimization-${agent.agentId}`,
          type: 'restart_agent',
          priority: agent.errorRate > 0.1 ? 'critical' : 'high',
          description: `Agent ${agent.agentId} has high error rate (${(agent.errorRate * 100).toFixed(1)}%). Consider restart or investigation.`,
          expectedImpact: `Reduce error rate by 70-90%`,
          autoApply: agent.errorRate > 0.15,
          confidence: 0.80,
          estimatedCost: 2,
          estimatedBenefit: 9,
          parameters: {
            agentId: agent.agentId,
            currentErrorRate: agent.errorRate,
            action: 'restart_and_investigate'
          },
          prerequisites: ['Error logging enabled', 'Restart procedure defined'],
          risks: ['Service interruption', 'Potential data loss'],
          timestamp: new Date()
        });
      }

      // Agent offline optimization
      if (agent.status === 'offline') {
        recommendations.push({
          id: `offline-optimization-${agent.agentId}`,
          type: 'restart_agent',
          priority: 'critical',
          description: `Agent ${agent.agentId} is offline. Immediate restart required.`,
          expectedImpact: `Restore agent functionality, maintain swarm capacity`,
          autoApply: true,
          confidence: 0.95,
          estimatedCost: 1,
          estimatedBenefit: 10,
          parameters: {
            agentId: agent.agentId,
            action: 'immediate_restart'
          },
          prerequisites: ['Agent restart mechanism available'],
          risks: ['Brief service interruption'],
          timestamp: new Date()
        });
      }
    }

    return recommendations;
  }

  /**
   * Analyze swarm-level performance
   */
  private async analyzeSwarmPerformance(swarm: SwarmMetrics): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Too few active agents
    const agentUtilization = swarm.totalAgents > 0 ? swarm.activeAgents / swarm.totalAgents : 0;
    if (agentUtilization < 0.7 && swarm.systemLoad > 2.0) {
      recommendations.push({
        id: 'scale-up-agents',
        type: 'scale_agents',
        priority: 'high',
        description: `Low agent utilization (${Math.round(agentUtilization * 100)}%) with high system load. Consider scaling up.`,
        expectedImpact: `Improve throughput by 30-50%, reduce system load`,
        autoApply: false,
        confidence: 0.75,
        estimatedCost: 5,
        estimatedBenefit: 8,
        parameters: {
          currentAgents: swarm.totalAgents,
          targetAgents: Math.ceil(swarm.totalAgents * 1.5),
          reason: 'high_load_low_utilization'
        },
        prerequisites: ['Resource capacity available', 'Scaling mechanism configured'],
        risks: ['Increased resource costs'],
        timestamp: new Date()
      });
    }

    // Too many agents with low load
    if (agentUtilization > 0.9 && swarm.systemLoad < 1.0 && swarm.totalAgents > 3) {
      recommendations.push({
        id: 'scale-down-agents',
        type: 'scale_agents',
        priority: 'medium',
        description: `High agent utilization (${Math.round(agentUtilization * 100)}%) with low system load. Consider scaling down.`,
        expectedImpact: `Reduce resource costs by 20-30%, maintain performance`,
        autoApply: false,
        confidence: 0.70,
        estimatedCost: 1,
        estimatedBenefit: 5,
        parameters: {
          currentAgents: swarm.totalAgents,
          targetAgents: Math.max(3, Math.floor(swarm.totalAgents * 0.8)),
          reason: 'low_load_high_utilization'
        },
        prerequisites: ['Minimum agent count maintained', 'Graceful shutdown possible'],
        risks: ['Potential capacity shortage during peaks'],
        timestamp: new Date()
      });
    }

    // High communication latency
    if (swarm.communicationLatency > 200) {
      recommendations.push({
        id: 'topology-optimization',
        type: 'topology_change',
        priority: swarm.communicationLatency > 500 ? 'high' : 'medium',
        description: `High communication latency (${swarm.communicationLatency}ms). Consider topology optimization.`,
        expectedImpact: `Reduce communication latency by 40-60%`,
        autoApply: false,
        confidence: 0.65,
        estimatedCost: 4,
        estimatedBenefit: 7,
        parameters: {
          currentLatency: swarm.communicationLatency,
          currentTopology: 'mesh', // This would be detected
          recommendedTopology: 'hierarchical'
        },
        prerequisites: ['Topology change mechanism available'],
        risks: ['Temporary communication disruption', 'Complex reconfiguration'],
        timestamp: new Date()
      });
    }

    // Low throughput
    if (swarm.throughput < 50 && swarm.totalTasks > 100) {
      recommendations.push({
        id: 'throughput-optimization',
        type: 'redistribute_load',
        priority: 'medium',
        description: `Low throughput (${swarm.throughput} req/s) with high task count. Consider load redistribution.`,
        expectedImpact: `Increase throughput by 50-80%`,
        autoApply: false,
        confidence: 0.70,
        estimatedCost: 3,
        estimatedBenefit: 6,
        parameters: {
          currentThroughput: swarm.throughput,
          targetThroughput: 100,
          optimization: 'load_balancing'
        },
        prerequisites: ['Load balancer available', 'Task queue system operational'],
        risks: ['Temporary task redistribution complexity'],
        timestamp: new Date()
      });
    }

    // High task failure rate
    const taskFailureRate = swarm.totalTasks > 0 ? swarm.failedTasks / swarm.totalTasks : 0;
    if (taskFailureRate > 0.1) {
      recommendations.push({
        id: 'task-failure-optimization',
        type: 'adjust_thresholds',
        priority: taskFailureRate > 0.2 ? 'critical' : 'high',
        description: `High task failure rate (${(taskFailureRate * 100).toFixed(1)}%). Consider threshold adjustments and error handling.`,
        expectedImpact: `Reduce task failures by 60-80%`,
        autoApply: false,
        confidence: 0.80,
        estimatedCost: 2,
        estimatedBenefit: 9,
        parameters: {
          currentFailureRate: taskFailureRate,
          targetFailureRate: 0.05,
          adjustments: ['timeout_thresholds', 'retry_policies', 'error_handling']
        },
        prerequisites: ['Error analysis available', 'Threshold configuration accessible'],
        risks: ['May mask underlying issues'],
        timestamp: new Date()
      });
    }

    return recommendations;
  }

  /**
   * Analyze system-level performance
   */
  private async analyzeSystemPerformance(system: any): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // High system CPU
    if (system.cpu > 80) {
      recommendations.push({
        id: 'system-cpu-optimization',
        type: 'resource_allocation',
        priority: system.cpu > 90 ? 'critical' : 'high',
        description: `High system CPU usage (${system.cpu}%). Consider resource optimization.`,
        expectedImpact: `Reduce system CPU by 20-30%`,
        autoApply: false,
        confidence: 0.75,
        estimatedCost: 3,
        estimatedBenefit: 7,
        parameters: {
          currentCpu: system.cpu,
          optimization: 'process_optimization'
        },
        prerequisites: ['System monitoring available'],
        risks: ['System-wide changes required'],
        timestamp: new Date()
      });
    }

    // High database query time
    if (system.database?.avgQueryTime > 100) {
      recommendations.push({
        id: 'database-optimization',
        type: 'resource_allocation',
        priority: 'medium',
        description: `Slow database queries (${system.database.avgQueryTime}ms avg). Consider database optimization.`,
        expectedImpact: `Improve query performance by 40-60%`,
        autoApply: false,
        confidence: 0.70,
        estimatedCost: 4,
        estimatedBenefit: 6,
        parameters: {
          currentQueryTime: system.database.avgQueryTime,
          optimizations: ['index_optimization', 'query_tuning', 'connection_pooling']
        },
        prerequisites: ['Database access available', 'DBA support'],
        risks: ['Database schema changes', 'Potential downtime'],
        timestamp: new Date()
      });
    }

    return recommendations;
  }

  /**
   * Analyze load distribution across agents
   */
  private async analyzeLoadDistribution(agents: AgentMetrics[], swarm: SwarmMetrics): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    if (agents.length === 0) return recommendations;

    // Calculate load distribution metrics
    const cpuValues = agents.map(a => a.cpu);
    const memoryValues = agents.map(a => a.memory);
    const responseTimeValues = agents.map(a => a.responseTime);

    const cpuStdDev = this.calculateStandardDeviation(cpuValues);
    const memoryStdDev = this.calculateStandardDeviation(memoryValues);
    const responseTimeStdDev = this.calculateStandardDeviation(responseTimeValues);

    // High CPU distribution variance
    if (cpuStdDev > 20) {
      recommendations.push({
        id: 'cpu-load-balancing',
        type: 'redistribute_load',
        priority: 'medium',
        description: `Uneven CPU distribution across agents (stddev: ${cpuStdDev.toFixed(1)}). Consider load rebalancing.`,
        expectedImpact: `More even load distribution, improved overall performance`,
        autoApply: false,
        confidence: 0.70,
        estimatedCost: 3,
        estimatedBenefit: 5,
        parameters: {
          cpuStdDev,
          loadBalancing: 'cpu_based'
        },
        prerequisites: ['Load balancer configured'],
        risks: ['Temporary task redistribution'],
        timestamp: new Date()
      });
    }

    // High response time variance
    if (responseTimeStdDev > 1000) {
      recommendations.push({
        id: 'response-load-balancing',
        type: 'redistribute_load',
        priority: 'medium',
        description: `Uneven response times across agents (stddev: ${responseTimeStdDev.toFixed(0)}ms). Consider load rebalancing.`,
        expectedImpact: `More consistent response times, better user experience`,
        autoApply: false,
        confidence: 0.65,
        estimatedCost: 3,
        estimatedBenefit: 6,
        parameters: {
          responseTimeStdDev,
          loadBalancing: 'response_time_based'
        },
        prerequisites: ['Response time monitoring', 'Load balancer configured'],
        risks: ['Complex load balancing logic'],
        timestamp: new Date()
      });
    }

    return recommendations;
  }

  /**
   * Setup optimization rules
   */
  private setupOptimizationRules(): void {
    const rules: OptimizationRule[] = [
      {
        id: 'auto-restart-high-memory',
        name: 'Auto Restart High Memory Agents',
        condition: 'agent.memory > 95',
        action: 'restart_agent',
        enabled: true,
        confidence: 0.90,
        autoApply: true
      },
      {
        id: 'auto-restart-offline-agents',
        name: 'Auto Restart Offline Agents',
        condition: 'agent.status == offline',
        action: 'restart_agent',
        enabled: true,
        confidence: 0.95,
        autoApply: true
      },
      {
        id: 'scale-up-high-load',
        name: 'Scale Up on High Load',
        condition: 'swarm.systemLoad > 3.0 && swarm.activeAgents < 10',
        action: 'scale_agents',
        enabled: false, // Disabled by default for safety
        confidence: 0.70,
        autoApply: false
      }
    ];

    for (const rule of rules) {
      this.optimizationRules.set(rule.id, rule);
    }

    console.log(`📋 Loaded ${rules.length} optimization rules`);
  }

  /**
   * Load performance baseline for comparison
   */
  private async loadPerformanceBaseline(): Promise<void> {
    // In a real implementation, this would load from a database or configuration
    this.performanceBaseline = {
      cpu: { target: 60, warning: 80, critical: 90 },
      memory: { target: 70, warning: 85, critical: 95 },
      responseTime: { target: 500, warning: 1000, critical: 2000 },
      errorRate: { target: 0.01, warning: 0.05, critical: 0.1 },
      throughput: { target: 100, warning: 50, critical: 20 }
    };

    console.log('📊 Performance baseline loaded');
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Get current recommendations
   */
  async getRecommendations(): Promise<OptimizationRecommendation[]> {
    return this.recommendations;
  }

  /**
   * Get optimization rules
   */
  getOptimizationRules(): OptimizationRule[] {
    return Array.from(this.optimizationRules.values());
  }

  /**
   * Add optimization rule
   */
  addOptimizationRule(rule: OptimizationRule): void {
    this.optimizationRules.set(rule.id, rule);
    console.log(`📋 Added optimization rule: ${rule.name}`);
  }

  /**
   * Remove optimization rule
   */
  removeOptimizationRule(ruleId: string): void {
    this.optimizationRules.delete(ruleId);
    console.log(`📋 Removed optimization rule: ${ruleId}`);
  }

  /**
   * Get optimization history
   */
  getOptimizationHistory(): any[] {
    return this.optimizationHistory;
  }

  /**
   * Record optimization action
   */
  recordOptimization(optimization: any): void {
    this.optimizationHistory.push({
      ...optimization,
      timestamp: new Date()
    });

    // Keep history manageable
    if (this.optimizationHistory.length > 1000) {
      this.optimizationHistory.splice(0, this.optimizationHistory.length - 1000);
    }
  }

  /**
   * Cleanup optimization engine
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up optimization engine...');
    
    // Clear recommendations
    this.recommendations = [];
    
    console.log('✅ Optimization engine cleanup complete');
  }
}