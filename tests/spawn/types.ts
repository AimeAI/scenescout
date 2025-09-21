// Type definitions for spawn implementation testing

export interface Agent {
  id: string;
  type: 'coder' | 'researcher' | 'tester' | 'reviewer' | 'analyst' | 'optimizer' | 'coordinator';
  capabilities: string[];
  status: 'idle' | 'active' | 'busy' | 'terminated';
  resources?: {
    memory?: number;
    cpu?: number;
  };
}

export interface Task {
  id: string;
  description: string;
  assignedAgent?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  dependencies?: string[];
  result?: any;
  error?: string;
}

export interface SpawnOptions {
  maxAgents?: number;
  topology?: 'mesh' | 'hierarchical' | 'ring' | 'star';
  strategy?: 'balanced' | 'specialized' | 'adaptive';
  timeout?: number;
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
  };
}

export interface SpawnResult {
  success: boolean;
  agent?: Agent;
  error?: string;
  spawnTime?: number;
  metrics?: {
    initializationTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

export interface CoordinationMessage {
  from: string;
  to: string;
  type: 'task' | 'status' | 'result' | 'error' | 'coordination';
  payload: any;
  timestamp: number;
}

export interface ExecutionMetrics {
  taskId: string;
  agentId: string;
  startTime: number;
  endTime: number;
  executionTime: number;
  tokensUsed?: number;
  filesModified?: number;
  success: boolean;
  errors?: string[];
}

export interface SwarmState {
  id: string;
  agents: Agent[];
  tasks: Task[];
  topology: SpawnOptions['topology'];
  status: 'initializing' | 'active' | 'paused' | 'terminated';
  metrics: {
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageExecutionTime: number;
  };
}