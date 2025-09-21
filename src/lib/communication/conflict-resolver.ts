/**
 * Conflict Resolution System
 * Handles resource conflicts, task conflicts, and coordination disputes
 */

import { messageBus, AgentMessage } from './message-bus';

export interface Conflict {
  id: string;
  type: 'resource' | 'task' | 'priority' | 'deadlock';
  description: string;
  involvedAgents: string[];
  resource?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'resolving' | 'resolved' | 'escalated';
  createdAt: number;
  resolvedAt?: number;
  resolution?: ConflictResolution;
}

export interface ConflictResolution {
  strategy: string;
  winner?: string;
  details: string;
  compensation?: { [agentId: string]: any };
  preventionMeasures?: string[];
}

export interface ResourceLock {
  resource: string;
  agentId: string;
  lockType: 'read' | 'write' | 'exclusive';
  expiresAt: number;
  priority: number;
}

export class ConflictResolver {
  private conflicts: Map<string, Conflict> = new Map();
  private resourceLocks: Map<string, ResourceLock[]> = new Map();
  private resolutionStrategies: Map<string, ConflictResolutionStrategy> = new Map();

  constructor() {
    this.initializeStrategies();
    this.setupEventHandlers();
    console.log('⚖️  Conflict Resolver initialized');
  }

  /**
   * Report a new conflict
   */
  async reportConflict(conflictData: Omit<Conflict, 'id' | 'status' | 'createdAt'>): Promise<string> {
    const conflictId = `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const conflict: Conflict = {
      ...conflictData,
      id: conflictId,
      status: 'pending',
      createdAt: Date.now()
    };

    this.conflicts.set(conflictId, conflict);

    // Auto-resolve if possible
    await this.attemptResolution(conflictId);

    // Notify involved agents
    await this.notifyAgents(conflict, 'conflict_reported');

    console.log(`⚠️  Conflict reported: ${conflict.type} - ${conflict.description}`);
    return conflictId;
  }

  /**
   * Attempt to resolve a conflict automatically
   */
  async attemptResolution(conflictId: string): Promise<boolean> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict || conflict.status !== 'pending') return false;

    conflict.status = 'resolving';

    try {
      const strategy = this.resolutionStrategies.get(conflict.type);
      if (!strategy) {
        throw new Error(`No resolution strategy for conflict type: ${conflict.type}`);
      }

      const resolution = await strategy.resolve(conflict);
      
      conflict.resolution = resolution;
      conflict.status = 'resolved';
      conflict.resolvedAt = Date.now();

      await this.applyResolution(conflict);
      await this.notifyAgents(conflict, 'conflict_resolved');

      console.log(`✅ Conflict resolved: ${conflictId} using ${resolution.strategy}`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to resolve conflict ${conflictId}:`, error);
      
      if (conflict.priority === 'critical') {
        await this.escalateConflict(conflictId);
      } else {
        conflict.status = 'pending';
      }
      
      return false;
    }
  }

  /**
   * Request a resource lock
   */
  async requestResourceLock(
    resource: string,
    agentId: string,
    lockType: ResourceLock['lockType'],
    duration: number = 30000,
    priority: number = 1
  ): Promise<boolean> {
    const locks = this.resourceLocks.get(resource) || [];
    const now = Date.now();

    // Clean expired locks
    const activeLocks = locks.filter(lock => lock.expiresAt > now);
    this.resourceLocks.set(resource, activeLocks);

    // Check for conflicts
    const hasConflict = this.checkLockConflict(activeLocks, lockType, agentId);
    
    if (hasConflict) {
      // Report resource conflict
      await this.reportConflict({
        type: 'resource',
        description: `Resource lock conflict for ${resource}`,
        involvedAgents: [agentId, ...activeLocks.map(l => l.agentId)],
        resource,
        priority: priority > 5 ? 'high' : 'medium'
      });
      
      return false;
    }

    // Grant lock
    const newLock: ResourceLock = {
      resource,
      agentId,
      lockType,
      expiresAt: now + duration,
      priority
    };

    activeLocks.push(newLock);
    this.resourceLocks.set(resource, activeLocks);

    console.log(`🔒 Resource lock granted: ${resource} to ${agentId} (${lockType})`);
    return true;
  }

  /**
   * Release a resource lock
   */
  async releaseResourceLock(resource: string, agentId: string): Promise<void> {
    const locks = this.resourceLocks.get(resource) || [];
    const updatedLocks = locks.filter(lock => lock.agentId !== agentId);
    
    this.resourceLocks.set(resource, updatedLocks);
    console.log(`🔓 Resource lock released: ${resource} by ${agentId}`);
  }

  /**
   * Get conflict statistics
   */
  getConflictStats(): {
    total: number;
    resolved: number;
    pending: number;
    escalated: number;
    avgResolutionTime: number;
    conflictsByType: { [type: string]: number };
  } {
    const conflicts = Array.from(this.conflicts.values());
    const resolved = conflicts.filter(c => c.status === 'resolved');
    
    const avgResolutionTime = resolved.length > 0
      ? resolved.reduce((sum, c) => sum + ((c.resolvedAt || 0) - c.createdAt), 0) / resolved.length
      : 0;

    const conflictsByType = conflicts.reduce((acc, conflict) => {
      acc[conflict.type] = (acc[conflict.type] || 0) + 1;
      return acc;
    }, {} as { [type: string]: number });

    return {
      total: conflicts.length,
      resolved: resolved.length,
      pending: conflicts.filter(c => c.status === 'pending').length,
      escalated: conflicts.filter(c => c.status === 'escalated').length,
      avgResolutionTime,
      conflictsByType
    };
  }

  private initializeStrategies(): void {
    // Resource conflict resolution
    this.resolutionStrategies.set('resource', {
      resolve: async (conflict: Conflict): Promise<ConflictResolution> => {
        if (!conflict.resource) throw new Error('Resource not specified');

        const locks = this.resourceLocks.get(conflict.resource) || [];
        const agentPriorities = conflict.involvedAgents.map(agentId => ({
          agentId,
          priority: this.getAgentPriority(agentId),
          lock: locks.find(l => l.agentId === agentId)
        }));

        // Sort by priority and lock timestamp
        agentPriorities.sort((a, b) => {
          if (a.priority !== b.priority) return b.priority - a.priority;
          return (a.lock?.expiresAt || 0) - (b.lock?.expiresAt || 0);
        });

        const winner = agentPriorities[0].agentId;

        // Release other locks
        for (const { agentId } of agentPriorities.slice(1)) {
          await this.releaseResourceLock(conflict.resource!, agentId);
        }

        return {
          strategy: 'priority_based',
          winner,
          details: `Resource ${conflict.resource} granted to ${winner} based on agent priority`,
          compensation: this.generateCompensation(conflict.involvedAgents.filter(id => id !== winner))
        };
      }
    });

    // Task conflict resolution
    this.resolutionStrategies.set('task', {
      resolve: async (conflict: Conflict): Promise<ConflictResolution> => {
        const agentWorkloads = await this.getAgentWorkloads(conflict.involvedAgents);
        
        // Assign to agent with lowest workload
        const winner = agentWorkloads.sort((a, b) => a.workload - b.workload)[0].agentId;

        return {
          strategy: 'workload_based',
          winner,
          details: `Task assigned to ${winner} based on lowest workload`,
          preventionMeasures: ['Implement better task queue management', 'Add workload prediction']
        };
      }
    });

    // Priority conflict resolution
    this.resolutionStrategies.set('priority', {
      resolve: async (conflict: Conflict): Promise<ConflictResolution> => {
        // Use timestamp-based resolution for priority conflicts
        const agentTimestamps = conflict.involvedAgents.map(agentId => ({
          agentId,
          timestamp: this.getAgentLastActivity(agentId)
        }));

        const winner = agentTimestamps.sort((a, b) => a.timestamp - b.timestamp)[0].agentId;

        return {
          strategy: 'first_come_first_served',
          winner,
          details: `Priority granted to ${winner} based on first activity timestamp`
        };
      }
    });

    // Deadlock resolution
    this.resolutionStrategies.set('deadlock', {
      resolve: async (conflict: Conflict): Promise<ConflictResolution> => {
        // For deadlocks, randomly select a winner and reset states
        const winner = conflict.involvedAgents[Math.floor(Math.random() * conflict.involvedAgents.length)];

        // Release all locks for involved agents
        const allResources = Array.from(this.resourceLocks.keys());
        for (const resource of allResources) {
          for (const agentId of conflict.involvedAgents) {
            if (agentId !== winner) {
              await this.releaseResourceLock(resource, agentId);
            }
          }
        }

        return {
          strategy: 'deadlock_breaker',
          winner,
          details: `Deadlock broken by releasing all locks except for ${winner}`,
          compensation: this.generateCompensation(conflict.involvedAgents.filter(id => id !== winner)),
          preventionMeasures: ['Implement ordered locking', 'Add deadlock detection']
        };
      }
    });
  }

  private setupEventHandlers(): void {
    messageBus.on('message:sent', (message: AgentMessage) => {
      if (message.type === 'conflict') {
        this.handleConflictMessage(message);
      }
    });
  }

  private async handleConflictMessage(message: AgentMessage): Promise<void> {
    const { conflictType, resource, description } = message.payload;
    
    await this.reportConflict({
      type: conflictType,
      description: description || `Conflict reported by ${message.from}`,
      involvedAgents: [message.from, ...(Array.isArray(message.to) ? message.to : [message.to])],
      resource,
      priority: message.priority === 'high' ? 'high' : 'medium'
    });
  }

  private checkLockConflict(
    activeLocks: ResourceLock[],
    requestedType: ResourceLock['lockType'],
    agentId: string
  ): boolean {
    // Agent already has a lock
    if (activeLocks.some(lock => lock.agentId === agentId)) return false;

    // No existing locks
    if (activeLocks.length === 0) return false;

    // Read locks don't conflict with other read locks
    if (requestedType === 'read' && activeLocks.every(lock => lock.lockType === 'read')) {
      return false;
    }

    // Any other combination conflicts
    return true;
  }

  private async applyResolution(conflict: Conflict): Promise<void> {
    if (!conflict.resolution) return;

    const { winner, compensation } = conflict.resolution;

    // Apply compensation to losing agents
    if (compensation) {
      for (const [agentId, comp] of Object.entries(compensation)) {
        await messageBus.sendMessage({
          from: 'conflict-resolver',
          to: agentId,
          type: 'status',
          priority: 'medium',
          payload: {
            type: 'compensation',
            conflict: conflict.id,
            compensation: comp
          }
        });
      }
    }

    // Notify winner
    if (winner) {
      await messageBus.sendMessage({
        from: 'conflict-resolver',
        to: winner,
        type: 'status',
        priority: 'high',
        payload: {
          type: 'conflict_won',
          conflict: conflict.id,
          resource: conflict.resource
        }
      });
    }
  }

  private async notifyAgents(conflict: Conflict, eventType: string): Promise<void> {
    for (const agentId of conflict.involvedAgents) {
      await messageBus.sendMessage({
        from: 'conflict-resolver',
        to: agentId,
        type: 'status',
        priority: conflict.priority === 'critical' ? 'high' : 'medium',
        payload: {
          type: eventType,
          conflict: {
            id: conflict.id,
            type: conflict.type,
            status: conflict.status,
            resolution: conflict.resolution
          }
        }
      });
    }
  }

  private async escalateConflict(conflictId: string): Promise<void> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) return;

    conflict.status = 'escalated';

    // Broadcast escalation to all agents
    await messageBus.broadcast('conflict-resolver', 'broadcast', {
      type: 'conflict_escalated',
      conflict: {
        id: conflict.id,
        type: conflict.type,
        description: conflict.description,
        involvedAgents: conflict.involvedAgents
      }
    });

    console.error(`🚨 Conflict escalated: ${conflictId}`);
  }

  private getAgentPriority(agentId: string): number {
    // Get priority from message bus agent data
    const agent = (messageBus as any).agents.get(agentId);
    if (!agent) return 1;

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

  private async getAgentWorkloads(agentIds: string[]): Promise<{ agentId: string; workload: number }[]> {
    return agentIds.map(agentId => {
      const agent = (messageBus as any).agents.get(agentId);
      return { agentId, workload: agent?.workload || 0 };
    });
  }

  private getAgentLastActivity(agentId: string): number {
    const agent = (messageBus as any).agents.get(agentId);
    return agent?.lastHeartbeat || 0;
  }

  private generateCompensation(losingAgents: string[]): { [agentId: string]: any } {
    const compensation: { [agentId: string]: any } = {};
    
    for (const agentId of losingAgents) {
      compensation[agentId] = {
        priorityBonus: 1, // Next task gets priority boost
        resourceCredit: 1 // Extra resource allocation credit
      };
    }
    
    return compensation;
  }
}

interface ConflictResolutionStrategy {
  resolve(conflict: Conflict): Promise<ConflictResolution>;
}

// Singleton instance
export const conflictResolver = new ConflictResolver();