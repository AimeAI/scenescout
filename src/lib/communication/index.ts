/**
 * Inter-Agent Communication System
 * Main entry point for robust agent coordination infrastructure
 */

export { messageBus, type AgentMessage, type AgentState } from './message-bus';
export { agentCoordinator, type TaskAssignment, type CoordinationConfig } from './agent-coordinator';
export { conflictResolver, type Conflict, type ConflictResolution, type ResourceLock } from './conflict-resolver';
export { healthMonitor, type HealthMetrics, type SystemHealth, type HealthAlert } from './health-monitor';
export { communicationDashboard, type DashboardMetrics, type CommunicationEvent } from './communication-dashboard';

import { messageBus } from './message-bus';
import { agentCoordinator } from './agent-coordinator';
import { conflictResolver } from './conflict-resolver';
import { healthMonitor } from './health-monitor';
import { communicationDashboard } from './communication-dashboard';

/**
 * Initialize the complete communication system
 */
export async function initializeCommunicationSystem(): Promise<void> {
  console.log('🚀 Initializing Inter-Agent Communication System...');
  
  // All systems are initialized in their constructors
  // This function provides a centralized entry point
  
  console.log('✅ Communication System fully initialized');
  console.log(`📊 Dashboard available at: http://localhost:3000/admin/communication`);
}

/**
 * Register an agent with the communication system
 */
export async function registerAgent(agentData: {
  id: string;
  type: string;
  capabilities: string[];
  initialStatus?: 'active' | 'idle';
}): Promise<void> {
  await messageBus.registerAgent({
    ...agentData,
    status: agentData.initialStatus || 'active',
    workload: 0,
    currentTasks: []
  });
  
  console.log(`✅ Agent registered: ${agentData.id} (${agentData.type})`);
}

/**
 * Send a message between agents
 */
export async function sendAgentMessage(
  from: string,
  to: string | string[],
  type: 'task' | 'status' | 'result' | 'conflict' | 'heartbeat' | 'broadcast',
  payload: any,
  priority: 'high' | 'medium' | 'low' = 'medium'
): Promise<string> {
  return await messageBus.sendMessage({
    from,
    to,
    type,
    priority,
    payload
  });
}

/**
 * Create and assign a task
 */
export async function createTask(taskData: {
  type: string;
  description: string;
  requiredCapabilities: string[];
  priority?: 'high' | 'medium' | 'low';
  estimatedDuration?: number;
}): Promise<string> {
  return await agentCoordinator.createTask({
    ...taskData,
    priority: taskData.priority || 'medium'
  });
}

/**
 * Request a resource lock
 */
export async function requestResourceLock(
  resource: string,
  agentId: string,
  lockType: 'read' | 'write' | 'exclusive',
  duration: number = 30000,
  priority: number = 1
): Promise<boolean> {
  return await conflictResolver.requestResourceLock(
    resource,
    agentId,
    lockType,
    duration,
    priority
  );
}

/**
 * Get system status overview
 */
export function getSystemStatus(): {
  agents: ReturnType<typeof messageBus.getSystemStatus>;
  tasks: ReturnType<typeof agentCoordinator.getCoordinationStats>;
  conflicts: ReturnType<typeof conflictResolver.getConflictStats>;
  health: ReturnType<typeof healthMonitor.getSystemHealth>;
  performance: ReturnType<typeof communicationDashboard.getPerformanceSummary>;
} {
  return {
    agents: messageBus.getSystemStatus(),
    tasks: agentCoordinator.getCoordinationStats(),
    conflicts: conflictResolver.getConflictStats(),
    health: healthMonitor.getSystemHealth(),
    performance: communicationDashboard.getPerformanceSummary()
  };
}

/**
 * Shutdown the communication system gracefully
 */
export async function shutdownCommunicationSystem(): Promise<void> {
  console.log('🛑 Shutting down Communication System...');
  
  communicationDashboard.destroy();
  healthMonitor.destroy();
  agentCoordinator.destroy();
  messageBus.destroy();
  
  console.log('✅ Communication System shutdown complete');
}

// Auto-initialize when imported
initializeCommunicationSystem().catch(console.error);