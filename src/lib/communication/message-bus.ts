/**
 * Inter-Agent Message Bus System
 * Provides robust communication infrastructure for agent coordination
 */

import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';

export interface AgentMessage {
  id: string;
  from: string;
  to: string | string[]; // Can be single agent or broadcast
  type: 'task' | 'status' | 'result' | 'conflict' | 'heartbeat' | 'broadcast';
  priority: 'high' | 'medium' | 'low';
  payload: any;
  timestamp: number;
  retries?: number;
  ttl?: number; // Time to live in ms
}

export interface AgentState {
  id: string;
  type: string;
  status: 'active' | 'busy' | 'idle' | 'offline';
  lastHeartbeat: number;
  workload: number;
  capabilities: string[];
  currentTasks: string[];
}

export class MessageBus extends EventEmitter {
  private messagePath: string;
  private statePath: string;
  private lockPath: string;
  private agents: Map<string, AgentState> = new Map();
  private messageQueue: AgentMessage[] = [];
  private processing = false;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.messagePath = path.join(process.cwd(), 'memory', 'messages.json');
    this.statePath = path.join(process.cwd(), 'memory', 'agent-states.json');
    this.lockPath = path.join(process.cwd(), 'memory', 'bus.lock');
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Ensure memory directory exists
      await fs.mkdir(path.dirname(this.messagePath), { recursive: true });
      
      // Load existing state
      await this.loadAgentStates();
      await this.loadMessages();
      
      // Start heartbeat monitoring
      this.startHeartbeatMonitoring();
      
      console.log('✅ Message Bus initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Message Bus:', error);
    }
  }

  /**
   * Register an agent with the communication system
   */
  async registerAgent(agent: Omit<AgentState, 'lastHeartbeat'>): Promise<void> {
    const agentState: AgentState = {
      ...agent,
      lastHeartbeat: Date.now()
    };
    
    this.agents.set(agent.id, agentState);
    await this.saveAgentStates();
    
    this.emit('agent:registered', agentState);
    console.log(`🤖 Agent registered: ${agent.id} (${agent.type})`);
  }

  /**
   * Send a message between agents
   */
  async sendMessage(message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<string> {
    const fullMessage: AgentMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retries: 0
    };

    // Add to queue based on priority
    this.addToQueue(fullMessage);
    
    // Process queue immediately
    await this.processQueue();
    
    this.emit('message:sent', fullMessage);
    return fullMessage.id;
  }

  /**
   * Broadcast message to all agents or specific types
   */
  async broadcast(
    from: string,
    type: AgentMessage['type'],
    payload: any,
    targetTypes?: string[]
  ): Promise<string[]> {
    const targets = Array.from(this.agents.values())
      .filter(agent => !targetTypes || targetTypes.includes(agent.type))
      .map(agent => agent.id);

    const messageIds: string[] = [];
    
    for (const target of targets) {
      if (target !== from) { // Don't send to self
        const messageId = await this.sendMessage({
          from,
          to: target,
          type,
          priority: 'medium',
          payload
        });
        messageIds.push(messageId);
      }
    }

    return messageIds;
  }

  /**
   * Get messages for a specific agent
   */
  async getMessages(agentId: string, markAsRead = true): Promise<AgentMessage[]> {
    await this.loadMessages();
    
    const agentMessages = this.messageQueue.filter(msg => 
      (typeof msg.to === 'string' && msg.to === agentId) ||
      (Array.isArray(msg.to) && msg.to.includes(agentId))
    );

    if (markAsRead) {
      // Remove read messages from queue
      this.messageQueue = this.messageQueue.filter(msg => 
        !agentMessages.includes(msg)
      );
      await this.saveMessages();
    }

    return agentMessages.sort((a, b) => this.getPriorityOrder(a.priority) - this.getPriorityOrder(b.priority));
  }

  /**
   * Update agent heartbeat and status
   */
  async updateHeartbeat(agentId: string, status?: AgentState['status'], workload?: number): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.lastHeartbeat = Date.now();
      if (status) agent.status = status;
      if (workload !== undefined) agent.workload = workload;
      
      await this.saveAgentStates();
      this.emit('agent:heartbeat', agent);
    }
  }

  /**
   * Get current system status
   */
  getSystemStatus(): {
    totalAgents: number;
    activeAgents: number;
    queuedMessages: number;
    avgWorkload: number;
  } {
    const agents = Array.from(this.agents.values());
    const activeAgents = agents.filter(a => a.status === 'active' || a.status === 'busy');
    const avgWorkload = agents.reduce((sum, a) => sum + a.workload, 0) / agents.length;

    return {
      totalAgents: agents.length,
      activeAgents: activeAgents.length,
      queuedMessages: this.messageQueue.length,
      avgWorkload: avgWorkload || 0
    };
  }

  /**
   * Resolve conflicts between agents
   */
  async resolveConflict(conflictData: {
    agents: string[];
    resource: string;
    type: 'file' | 'task' | 'resource';
  }): Promise<{ winner: string; resolution: string }> {
    const { agents: conflictAgents, resource, type } = conflictData;
    
    // Get agent priorities and timestamps
    const agentData = conflictAgents.map(id => ({
      id,
      agent: this.agents.get(id),
      priority: this.getAgentPriority(id),
      workload: this.agents.get(id)?.workload || 0
    }));

    // Resolution algorithm: timestamp-based with agent hierarchy
    let winner: string;
    let resolution: string;

    switch (type) {
      case 'file':
        // For files, prefer the agent with earliest claim and highest priority
        winner = agentData.sort((a, b) => 
          b.priority - a.priority || (a.agent?.lastHeartbeat || 0) - (b.agent?.lastHeartbeat || 0)
        )[0].id;
        resolution = `File access granted to ${winner} based on priority and timestamp`;
        break;
        
      case 'task':
        // For tasks, prefer agent with lowest workload and appropriate capability
        winner = agentData.sort((a, b) => 
          a.workload - b.workload || b.priority - a.priority
        )[0].id;
        resolution = `Task assigned to ${winner} based on workload balancing`;
        break;
        
      case 'resource':
        // For resources, prefer active agent with highest priority
        winner = agentData.filter(a => a.agent?.status === 'active')
          .sort((a, b) => b.priority - a.priority)[0]?.id || agentData[0].id;
        resolution = `Resource allocated to ${winner} based on availability and priority`;
        break;
        
      default:
        winner = agentData[0].id;
        resolution = 'Default resolution: first agent wins';
    }

    // Notify all agents of resolution
    await this.broadcast('system', 'conflict', {
      resource,
      winner,
      resolution,
      conflictAgents
    });

    return { winner, resolution };
  }

  private addToQueue(message: AgentMessage): void {
    const priorityOrder = this.getPriorityOrder(message.priority);
    
    // Insert message in correct priority position
    let insertIndex = this.messageQueue.findIndex(msg => 
      this.getPriorityOrder(msg.priority) > priorityOrder
    );
    
    if (insertIndex === -1) {
      this.messageQueue.push(message);
    } else {
      this.messageQueue.splice(insertIndex, 0, message);
    }
  }

  private getPriorityOrder(priority: AgentMessage['priority']): number {
    switch (priority) {
      case 'high': return 1;
      case 'medium': return 2;
      case 'low': return 3;
      default: return 4;
    }
  }

  private getAgentPriority(agentId: string): number {
    const agent = this.agents.get(agentId);
    if (!agent) return 0;
    
    // Priority based on agent type
    const typePriority: Record<string, number> = {
      'coordinator': 10,
      'system-architect': 9,
      'task-orchestrator': 8,
      'coder': 7,
      'tester': 6,
      'reviewer': 5,
      'researcher': 4,
      'analyst': 3
    };
    
    return typePriority[agent.type] || 1;
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      await this.saveMessages();
    } finally {
      this.processing = false;
    }
  }

  private startHeartbeatMonitoring(): void {
    this.heartbeatInterval = setInterval(async () => {
      const now = Date.now();
      const staleThreshold = 30000; // 30 seconds
      
      for (const [agentId, agent] of this.agents) {
        if (now - agent.lastHeartbeat > staleThreshold && agent.status !== 'offline') {
          agent.status = 'offline';
          this.emit('agent:offline', agent);
          console.warn(`⚠️  Agent ${agentId} marked as offline`);
        }
      }
      
      await this.saveAgentStates();
    }, 10000); // Check every 10 seconds
  }

  private async loadMessages(): Promise<void> {
    try {
      const data = await fs.readFile(this.messagePath, 'utf-8');
      this.messageQueue = JSON.parse(data);
    } catch {
      this.messageQueue = [];
    }
  }

  private async saveMessages(): Promise<void> {
    await this.withLock(async () => {
      await fs.writeFile(this.messagePath, JSON.stringify(this.messageQueue, null, 2));
    });
  }

  private async loadAgentStates(): Promise<void> {
    try {
      const data = await fs.readFile(this.statePath, 'utf-8');
      const states = JSON.parse(data);
      this.agents = new Map(states.map((state: AgentState) => [state.id, state]));
    } catch {
      this.agents = new Map();
    }
  }

  private async saveAgentStates(): Promise<void> {
    await this.withLock(async () => {
      const states = Array.from(this.agents.values());
      await fs.writeFile(this.statePath, JSON.stringify(states, null, 2));
    });
  }

  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    let retries = 0;
    const maxRetries = 5;
    
    while (retries < maxRetries) {
      try {
        await fs.writeFile(this.lockPath, '1');
        const result = await fn();
        await fs.unlink(this.lockPath);
        return result;
      } catch (error) {
        if (retries === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 100 * (retries + 1)));
        retries++;
      }
    }
    
    throw new Error('Failed to acquire lock');
  }

  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.removeAllListeners();
  }
}

// Singleton instance
export const messageBus = new MessageBus();