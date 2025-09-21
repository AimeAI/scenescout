# Communication System Integration Guide

## Quick Start

### 1. Installation and Setup

```bash
# The communication system is already integrated into the project
# Import and use the system components directly
```

```typescript
import { 
  initializeCommunicationSystem,
  registerAgent,
  sendAgentMessage,
  createTask,
  getSystemStatus
} from '@/lib/communication';

// Initialize the system (auto-initialized on import)
await initializeCommunicationSystem();
```

### 2. Agent Registration

Every agent must register before participating in communication:

```typescript
// Register a new agent
await registerAgent({
  id: 'my-agent-001',
  type: 'coder',
  capabilities: ['javascript', 'react', 'testing', 'debugging'],
  initialStatus: 'active'
});
```

### 3. Basic Communication

```typescript
// Send a message to another agent
const messageId = await sendAgentMessage(
  'my-agent-001',                    // from
  'target-agent-002',                // to
  'task',                           // type
  { 
    action: 'review_code',
    file: 'src/components/App.tsx',
    requirements: ['security', 'performance']
  },                                // payload
  'high'                           // priority
);

// Send broadcast message
const broadcastId = await sendAgentMessage(
  'my-agent-001',
  ['agent-002', 'agent-003', 'agent-004'],
  'broadcast',
  { announcement: 'Starting deployment process' }
);
```

## Agent Implementation Patterns

### 1. Basic Agent Template

```typescript
import { 
  registerAgent, 
  sendAgentMessage, 
  messageBus,
  healthMonitor,
  conflictResolver 
} from '@/lib/communication';

class MyAgent {
  private agentId: string;
  private agentType: string;
  private capabilities: string[];
  private isRunning = false;

  constructor(id: string, type: string, capabilities: string[]) {
    this.agentId = id;
    this.agentType = type;
    this.capabilities = capabilities;
  }

  async initialize(): Promise<void> {
    // Register with communication system
    await registerAgent({
      id: this.agentId,
      type: this.agentType,
      capabilities: this.capabilities,
      initialStatus: 'active'
    });

    // Start message listening
    this.startMessageHandling();
    
    // Start heartbeat
    this.startHeartbeat();
    
    this.isRunning = true;
    console.log(`Agent ${this.agentId} initialized`);
  }

  private startMessageHandling(): void {
    setInterval(async () => {
      if (!this.isRunning) return;
      
      // Get messages for this agent
      const messages = await messageBus.getMessages(this.agentId);
      
      for (const message of messages) {
        await this.handleMessage(message);
      }
    }, 1000); // Check every second
  }

  private async handleMessage(message: any): Promise<void> {
    try {
      switch (message.type) {
        case 'task':
          await this.handleTask(message);
          break;
        case 'heartbeat':
          await this.handleHeartbeat(message);
          break;
        case 'conflict':
          await this.handleConflict(message);
          break;
        default:
          console.log(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error(`Error handling message:`, error);
      
      // Report error
      await sendAgentMessage(
        this.agentId,
        message.from,
        'status',
        { error: error.message, messageId: message.id },
        'high'
      );
    }
  }

  private async handleTask(message: any): Promise<void> {
    const { taskId, task } = message.payload;
    
    // Update status to busy
    await messageBus.updateHeartbeat(this.agentId, 'busy');
    
    try {
      // Execute the task
      const result = await this.executeTask(task);
      
      // Report success
      await sendAgentMessage(
        this.agentId,
        'coordinator',
        'status',
        { taskId, status: 'completed', result },
        'medium'
      );
      
    } catch (error) {
      // Report failure
      await sendAgentMessage(
        this.agentId,
        'coordinator',
        'status',
        { taskId, status: 'failed', error: error.message },
        'high'
      );
    } finally {
      // Update status back to active
      await messageBus.updateHeartbeat(this.agentId, 'active');
    }
  }

  private async executeTask(task: any): Promise<any> {
    // Implement task-specific logic here
    console.log(`Executing task: ${task.description}`);
    
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return { completed: true, timestamp: Date.now() };
  }

  private async handleHeartbeat(message: any): Promise<void> {
    // Respond to heartbeat ping
    if (message.payload.ping) {
      await sendAgentMessage(
        this.agentId,
        message.from,
        'heartbeat',
        { pong: true, originalTimestamp: message.payload.timestamp },
        'low'
      );
    }
  }

  private async handleConflict(message: any): Promise<void> {
    // Handle conflict notifications
    const { conflict } = message.payload;
    console.log(`Conflict notification: ${conflict.description}`);
    
    // Implement conflict-specific responses if needed
  }

  private startHeartbeat(): void {
    setInterval(async () => {
      if (this.isRunning) {
        await messageBus.updateHeartbeat(this.agentId);
        
        // Record health metrics
        healthMonitor.recordMetrics(this.agentId, {
          // Add any custom metrics here
        });
      }
    }, 30000); // Every 30 seconds
  }

  async shutdown(): Promise<void> {
    this.isRunning = false;
    
    // Update status to offline
    await messageBus.updateHeartbeat(this.agentId, 'offline');
    
    console.log(`Agent ${this.agentId} shutdown`);
  }
}

// Usage
const agent = new MyAgent('coder-001', 'coder', ['javascript', 'react']);
await agent.initialize();
```

### 2. Resource-Aware Agent

```typescript
import { requestResourceLock, conflictResolver } from '@/lib/communication';

class ResourceAwareAgent extends MyAgent {
  private lockedResources: Set<string> = new Set();

  async requestFileAccess(filePath: string, lockType: 'read' | 'write' = 'read'): Promise<boolean> {
    const granted = await requestResourceLock(
      filePath,
      this.agentId,
      lockType,
      60000, // 1 minute
      this.getAgentPriority()
    );

    if (granted) {
      this.lockedResources.add(filePath);
      console.log(`File access granted: ${filePath}`);
      return true;
    } else {
      console.log(`File access denied: ${filePath}`);
      return false;
    }
  }

  async releaseFileAccess(filePath: string): Promise<void> {
    await conflictResolver.releaseResourceLock(filePath, this.agentId);
    this.lockedResources.delete(filePath);
    console.log(`File access released: ${filePath}`);
  }

  async releaseAllResources(): Promise<void> {
    for (const resource of this.lockedResources) {
      await this.releaseFileAccess(resource);
    }
  }

  private getAgentPriority(): number {
    // Return priority based on agent type
    const priorities = {
      'coordinator': 10,
      'system-architect': 9,
      'coder': 7,
      'tester': 6,
      'reviewer': 5
    };
    return priorities[this.agentType] || 1;
  }

  async shutdown(): Promise<void> {
    await this.releaseAllResources();
    await super.shutdown();
  }
}
```

### 3. Coordinating Agent

```typescript
import { createTask, agentCoordinator } from '@/lib/communication';

class CoordinatingAgent extends MyAgent {
  async orchestrateWorkflow(workflow: any): Promise<void> {
    console.log(`Starting workflow orchestration: ${workflow.name}`);
    
    const taskIds: string[] = [];
    
    // Create tasks for each step
    for (const step of workflow.steps) {
      const taskId = await createTask({
        type: step.type,
        description: step.description,
        requiredCapabilities: step.capabilities,
        priority: step.priority || 'medium',
        estimatedDuration: step.estimatedDuration
      });
      
      taskIds.push(taskId);
    }
    
    // Monitor task completion
    await this.monitorTasks(taskIds);
    
    console.log(`Workflow completed: ${workflow.name}`);
  }

  private async monitorTasks(taskIds: string[]): Promise<void> {
    const completedTasks = new Set<string>();
    
    while (completedTasks.size < taskIds.length) {
      // Check task statuses
      const stats = agentCoordinator.getCoordinationStats();
      
      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // This is simplified - in practice, you'd listen for task completion events
    }
  }
}
```

## Advanced Integration Patterns

### 1. Health Monitoring Integration

```typescript
import { healthMonitor } from '@/lib/communication';

class HealthAwareAgent extends MyAgent {
  private performanceMetrics = {
    tasksCompleted: 0,
    tasksSuccessful: 0,
    avgExecutionTime: 0,
    lastExecutionTimes: [] as number[]
  };

  async executeTask(task: any): Promise<any> {
    const startTime = Date.now();
    
    try {
      const result = await super.executeTask(task);
      
      // Record successful completion
      this.recordTaskCompletion(true, Date.now() - startTime);
      
      return result;
    } catch (error) {
      // Record failure
      this.recordTaskCompletion(false, Date.now() - startTime);
      throw error;
    }
  }

  private recordTaskCompletion(successful: boolean, executionTime: number): void {
    this.performanceMetrics.tasksCompleted++;
    if (successful) {
      this.performanceMetrics.tasksSuccessful++;
    }
    
    // Track execution times (keep last 10)
    this.performanceMetrics.lastExecutionTimes.push(executionTime);
    if (this.performanceMetrics.lastExecutionTimes.length > 10) {
      this.performanceMetrics.lastExecutionTimes.shift();
    }
    
    // Calculate average
    this.performanceMetrics.avgExecutionTime = 
      this.performanceMetrics.lastExecutionTimes.reduce((a, b) => a + b, 0) / 
      this.performanceMetrics.lastExecutionTimes.length;
    
    // Record metrics with health monitor
    healthMonitor.recordTaskCompletion(this.agentId, successful);
    healthMonitor.recordMetrics(this.agentId, {
      avgResponseTime: this.performanceMetrics.avgExecutionTime,
      taskCompletionRate: this.performanceMetrics.tasksSuccessful / this.performanceMetrics.tasksCompleted
    });
  }
}
```

### 2. Dashboard Integration

```typescript
import { communicationDashboard } from '@/lib/communication';

// Monitor system status
setInterval(() => {
  const metrics = communicationDashboard.getCurrentMetrics();
  const performance = communicationDashboard.getPerformanceSummary();
  const bottlenecks = communicationDashboard.getBottlenecks();
  
  console.log('System Status:', {
    activeAgents: metrics.agents.active,
    pendingTasks: metrics.tasks.pending,
    overallPerformance: performance.overallScore,
    criticalBottlenecks: bottlenecks.filter(b => b.severity === 'high').length
  });
}, 30000);

// Get health reports
const healthReport = communicationDashboard.generateHealthReport();
console.log('Health Report:', healthReport);
```

### 3. Error Handling Best Practices

```typescript
class RobustAgent extends MyAgent {
  private maxRetries = 3;
  private backoffMultiplier = 1000; // Start with 1 second

  async executeTaskWithRetry(task: any, retryCount = 0): Promise<any> {
    try {
      return await this.executeTask(task);
    } catch (error) {
      if (retryCount < this.maxRetries) {
        // Calculate backoff delay
        const delay = this.backoffMultiplier * Math.pow(2, retryCount);
        
        console.log(`Task failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${this.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return await this.executeTaskWithRetry(task, retryCount + 1);
      } else {
        console.error(`Task failed after ${this.maxRetries} retries:`, error);
        throw error;
      }
    }
  }

  async handleMessage(message: any): Promise<void> {
    try {
      await super.handleMessage(message);
    } catch (error) {
      // Log error for debugging
      console.error(`Message handling error for ${message.id}:`, error);
      
      // Report to health monitor
      healthMonitor.recordMetrics(this.agentId, {
        errorRate: 0.1 // This would be calculated based on recent history
      });
      
      // Notify sender of error if appropriate
      if (message.from !== 'system') {
        await sendAgentMessage(
          this.agentId,
          message.from,
          'status',
          { 
            error: 'Message processing failed',
            originalMessageId: message.id,
            details: error.message
          },
          'medium'
        );
      }
    }
  }
}
```

## Configuration Examples

### 1. Custom Agent Coordinator Settings

```typescript
import { AgentCoordinator } from '@/lib/communication/agent-coordinator';

const customCoordinator = new AgentCoordinator({
  maxWorkloadPerAgent: 3,        // Reduce from default 5
  taskTimeout: 600000,           // 10 minutes instead of 5
  rebalanceInterval: 15000,      // Check every 15 seconds
  autoAssignment: true           // Enable automatic assignment
});
```

### 2. Custom Health Monitor Thresholds

```typescript
// This would be configured in the HealthMonitor constructor
// Currently hardcoded, but could be made configurable:

const customHealthConfig = {
  responseTimeWarning: 1000,     // 1 second warning
  responseTimeCritical: 3000,    // 3 second critical
  errorRateWarning: 0.05,        // 5% warning
  errorRateCritical: 0.15,       // 15% critical
  heartbeatTimeout: 60000        // 1 minute timeout
};
```

## Testing Integration

### 1. Mock Agent for Testing

```typescript
class MockAgent {
  constructor(private agentId: string) {}

  async simulateWork(duration: number): Promise<void> {
    await messageBus.updateHeartbeat(this.agentId, 'busy');
    await new Promise(resolve => setTimeout(resolve, duration));
    await messageBus.updateHeartbeat(this.agentId, 'active');
  }

  async sendTestMessage(to: string, payload: any): Promise<string> {
    return await sendAgentMessage(
      this.agentId,
      to,
      'test',
      payload,
      'low'
    );
  }
}

// Test scenario
const testAgent = new MockAgent('test-agent-001');
await registerAgent({
  id: 'test-agent-001',
  type: 'test',
  capabilities: ['testing']
});

await testAgent.simulateWork(2000);
```

### 2. Integration Tests

```typescript
describe('Communication System Integration', () => {
  beforeEach(async () => {
    await initializeCommunicationSystem();
  });

  test('agent registration and messaging', async () => {
    // Register two agents
    await registerAgent({
      id: 'agent-a',
      type: 'sender',
      capabilities: ['sending']
    });
    
    await registerAgent({
      id: 'agent-b',
      type: 'receiver',
      capabilities: ['receiving']
    });

    // Send message
    const messageId = await sendAgentMessage(
      'agent-a',
      'agent-b',
      'test',
      { message: 'Hello, Agent B!' }
    );

    expect(messageId).toBeTruthy();

    // Check message was delivered
    const messages = await messageBus.getMessages('agent-b');
    expect(messages).toHaveLength(1);
    expect(messages[0].payload.message).toBe('Hello, Agent B!');
  });

  test('task assignment and completion', async () => {
    // Register a capable agent
    await registerAgent({
      id: 'worker-agent',
      type: 'worker',
      capabilities: ['data-processing']
    });

    // Create a task
    const taskId = await createTask({
      type: 'data-processing',
      description: 'Process user data',
      requiredCapabilities: ['data-processing']
    });

    expect(taskId).toBeTruthy();

    // Check task was assigned
    const stats = agentCoordinator.getCoordinationStats();
    expect(stats.totalTasks).toBeGreaterThan(0);
  });
});
```

## Troubleshooting Common Issues

### 1. Agent Not Receiving Messages

```typescript
// Check agent registration status
const systemStatus = getSystemStatus();
console.log('Registered agents:', systemStatus.agents);

// Check message queue
const messages = await messageBus.getMessages('your-agent-id', false); // Don't mark as read
console.log('Pending messages:', messages);
```

### 2. High Latency Issues

```typescript
// Monitor communication performance
const dashboard = communicationDashboard.getCurrentMetrics();
console.log('Communication latency:', dashboard.communication.avgLatency);

// Check for bottlenecks
const bottlenecks = communicationDashboard.getBottlenecks();
console.log('System bottlenecks:', bottlenecks);
```

### 3. Task Assignment Failures

```typescript
// Check agent capabilities
const stats = getSystemStatus();
console.log('Available agents and capabilities:', stats.agents);

// Check task requirements
const coordinationStats = agentCoordinator.getCoordinationStats();
console.log('Task statistics:', coordinationStats);
```

This integration guide provides comprehensive examples for implementing agents that work seamlessly with the communication system. The modular design allows for easy customization and extension based on specific requirements.