/**
 * Agent Coordination System
 * Manages agent registration, task assignment, and workload balancing
 */

import { messageBus, AgentMessage, AgentState } from './message-bus';
import { conflictResolver } from './conflict-resolver';
import { healthMonitor } from './health-monitor';

export interface TaskAssignment {
  id: string;
  type: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  requiredCapabilities: string[];
  assignedAgent?: string;
  status: 'pending' | 'assigned' | 'in-progress' | 'completed' | 'failed';
  createdAt: number;
  estimatedDuration?: number;
  dependencies?: string[];
}

export interface CoordinationConfig {
  maxWorkloadPerAgent: number;
  taskTimeout: number;
  rebalanceInterval: number;
  autoAssignment: boolean;
}

export class AgentCoordinator {
  private tasks: Map<string, TaskAssignment> = new Map();
  private config: CoordinationConfig;
  private rebalanceTimer?: NodeJS.Timeout;

  constructor(config: Partial<CoordinationConfig> = {}) {
    this.config = {
      maxWorkloadPerAgent: 5,
      taskTimeout: 300000, // 5 minutes
      rebalanceInterval: 30000, // 30 seconds
      autoAssignment: true,
      ...config
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    // Listen for agent messages
    messageBus.on('message:sent', this.handleMessage.bind(this));
    messageBus.on('agent:registered', this.handleAgentRegistration.bind(this));
    messageBus.on('agent:offline', this.handleAgentOffline.bind(this));

    // Start periodic rebalancing
    if (this.config.autoAssignment) {
      this.startRebalancing();
    }

    console.log('🎯 Agent Coordinator initialized');
  }

  /**
   * Register a new task for assignment
   */
  async createTask(task: Omit<TaskAssignment, 'id' | 'status' | 'createdAt'>): Promise<string> {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fullTask: TaskAssignment = {
      ...task,
      id: taskId,
      status: 'pending',
      createdAt: Date.now()
    };

    this.tasks.set(taskId, fullTask);

    // Auto-assign if enabled
    if (this.config.autoAssignment) {
      await this.assignTask(taskId);
    }

    return taskId;
  }

  /**
   * Assign a task to the most suitable agent
   */
  async assignTask(taskId: string): Promise<string | null> {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending') {
      return null;
    }

    const suitableAgent = await this.findBestAgent(task);
    if (!suitableAgent) {
      console.warn(`⚠️  No suitable agent found for task ${taskId}`);
      return null;
    }

    // Update task
    task.assignedAgent = suitableAgent.id;
    task.status = 'assigned';

    // Send task to agent
    await messageBus.sendMessage({
      from: 'coordinator',
      to: suitableAgent.id,
      type: 'task',
      priority: task.priority,
      payload: {
        taskId,
        task: task
      }
    });

    console.log(`✅ Task ${taskId} assigned to ${suitableAgent.id}`);
    return suitableAgent.id;
  }

  /**
   * Find the best agent for a given task
   */
  private async findBestAgent(task: TaskAssignment): Promise<AgentState | null> {
    const systemStatus = messageBus.getSystemStatus();
    const allAgents = Array.from((messageBus as any).agents.values()) as AgentState[];

    // Filter agents by capabilities and availability
    const suitableAgents = allAgents.filter(agent => {
      // Must be active
      if (agent.status === 'offline') return false;
      
      // Must have required capabilities
      const hasCapabilities = task.requiredCapabilities.every(cap => 
        agent.capabilities.includes(cap)
      );
      if (!hasCapabilities) return false;
      
      // Must not be overloaded
      if (agent.workload >= this.config.maxWorkloadPerAgent) return false;
      
      return true;
    });

    if (suitableAgents.length === 0) return null;

    // Score agents based on suitability
    const scoredAgents = suitableAgents.map(agent => {
      let score = 0;
      
      // Prefer agents with lower workload
      score += (this.config.maxWorkloadPerAgent - agent.workload) * 10;
      
      // Prefer agents with exact capability match
      const exactMatches = task.requiredCapabilities.filter(cap => 
        agent.capabilities.includes(cap)
      ).length;
      score += exactMatches * 5;
      
      // Prefer recently active agents
      const timeSinceHeartbeat = Date.now() - agent.lastHeartbeat;
      score += Math.max(0, 60000 - timeSinceHeartbeat) / 1000; // Bonus for recent activity
      
      // Task type preference
      if (task.type === agent.type) score += 15;
      
      return { agent, score };
    });

    // Sort by score and return best agent
    scoredAgents.sort((a, b) => b.score - a.score);
    return scoredAgents[0].agent;
  }

  /**
   * Handle task completion or failure
   */
  async updateTaskStatus(
    taskId: string, 
    status: TaskAssignment['status'], 
    result?: any
  ): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    const previousStatus = task.status;
    task.status = status;

    // Update agent workload
    if (task.assignedAgent && (status === 'completed' || status === 'failed')) {
      await this.updateAgentWorkload(task.assignedAgent, -1);
    }

    // Broadcast status update
    await messageBus.broadcast('coordinator', 'status', {
      taskId,
      status,
      previousStatus,
      result
    });

    console.log(`📋 Task ${taskId} status: ${previousStatus} → ${status}`);
  }

  /**
   * Get coordination statistics
   */
  getCoordinationStats(): {
    totalTasks: number;
    pendingTasks: number;
    activeTasks: number;
    completedTasks: number;
    failedTasks: number;
    avgTaskDuration: number;
  } {
    const tasks = Array.from(this.tasks.values());
    const now = Date.now();

    const completedTasks = tasks.filter(t => t.status === 'completed');
    const avgDuration = completedTasks.length > 0 
      ? completedTasks.reduce((sum, t) => sum + (now - t.createdAt), 0) / completedTasks.length
      : 0;

    return {
      totalTasks: tasks.length,
      pendingTasks: tasks.filter(t => t.status === 'pending').length,
      activeTasks: tasks.filter(t => t.status === 'in-progress').length,
      completedTasks: completedTasks.length,
      failedTasks: tasks.filter(t => t.status === 'failed').length,
      avgTaskDuration: avgDuration
    };
  }

  /**
   * Rebalance workload across agents
   */
  async rebalanceWorkload(): Promise<void> {
    const systemStatus = messageBus.getSystemStatus();
    
    if (systemStatus.activeAgents === 0) return;

    // Find overloaded agents
    const allAgents = Array.from((messageBus as any).agents.values()) as AgentState[];
    const overloadedAgents = allAgents.filter(agent => 
      agent.workload > this.config.maxWorkloadPerAgent
    );

    if (overloadedAgents.length === 0) return;

    console.log(`⚖️  Rebalancing workload for ${overloadedAgents.length} overloaded agents`);

    // Reassign pending tasks from overloaded agents
    for (const agent of overloadedAgents) {
      const agentTasks = Array.from(this.tasks.values())
        .filter(task => task.assignedAgent === agent.id && task.status === 'assigned');
      
      for (const task of agentTasks.slice(this.config.maxWorkloadPerAgent)) {
        task.status = 'pending';
        task.assignedAgent = undefined;
        await this.assignTask(task.id);
      }
    }
  }

  private async handleMessage(message: AgentMessage): Promise<void> {
    if (message.type === 'status' && message.payload.taskId) {
      await this.updateTaskStatus(
        message.payload.taskId,
        message.payload.status,
        message.payload.result
      );
    }
  }

  private async handleAgentRegistration(agent: AgentState): Promise<void> {
    console.log(`🤖 New agent registered for coordination: ${agent.id}`);
    
    // Assign pending tasks if available
    if (this.config.autoAssignment) {
      const pendingTasks = Array.from(this.tasks.values())
        .filter(task => task.status === 'pending');
      
      for (const task of pendingTasks) {
        await this.assignTask(task.id);
      }
    }
  }

  private async handleAgentOffline(agent: AgentState): Promise<void> {
    console.warn(`🔴 Agent ${agent.id} went offline, reassigning tasks`);
    
    // Reassign tasks from offline agent
    const agentTasks = Array.from(this.tasks.values())
      .filter(task => task.assignedAgent === agent.id && 
        ['assigned', 'in-progress'].includes(task.status));
    
    for (const task of agentTasks) {
      task.status = 'pending';
      task.assignedAgent = undefined;
      await this.assignTask(task.id);
    }
  }

  private async updateAgentWorkload(agentId: string, change: number): Promise<void> {
    const agent = (messageBus as any).agents.get(agentId);
    if (agent) {
      agent.workload = Math.max(0, agent.workload + change);
      await messageBus.updateHeartbeat(agentId, undefined, agent.workload);
    }
  }

  private startRebalancing(): void {
    this.rebalanceTimer = setInterval(
      () => this.rebalanceWorkload(),
      this.config.rebalanceInterval
    );
  }

  destroy(): void {
    if (this.rebalanceTimer) {
      clearInterval(this.rebalanceTimer);
    }
  }
}

// Singleton instance
export const agentCoordinator = new AgentCoordinator();