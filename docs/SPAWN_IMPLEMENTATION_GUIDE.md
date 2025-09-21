# Spawn Architecture Implementation Guide

## Quick Start

This guide provides concrete implementation steps for the SceneScout spawning architecture.

## 1. Core Implementation Files

### 1.1 Spawn Controller (`src/lib/spawn/controller.ts`)

```typescript
import { Worker } from 'worker_threads';
import { EventEmitter } from 'events';
import { Redis } from '@upstash/redis';
import { createClient } from '@supabase/supabase-js';

export interface SpawnConfig {
  maxWorkers: number;
  workerTimeout: number;
  redisUrl: string;
  supabaseUrl: string;
  supabaseKey: string;
}

export class SpawnController extends EventEmitter {
  private workers: Map<string, Worker> = new Map();
  private redis: Redis;
  private supabase: ReturnType<typeof createClient>;
  private config: SpawnConfig;
  private taskQueue: Array<Task> = [];
  
  constructor(config: SpawnConfig) {
    super();
    this.config = config;
    this.redis = new Redis({ url: config.redisUrl });
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey);
  }
  
  async initialize(): Promise<void> {
    // Setup message subscriptions
    await this.subscribeToChannels();
    
    // Spawn initial worker pool
    await this.spawnInitialWorkers();
    
    // Start health monitoring
    this.startHealthMonitoring();
  }
  
  async spawnWorker(type: WorkerType): Promise<string> {
    const workerId = `worker-${type}-${Date.now()}`;
    const workerPath = this.getWorkerPath(type);
    
    const worker = new Worker(workerPath, {
      workerData: {
        workerId,
        type,
        config: this.config
      }
    });
    
    worker.on('message', (msg) => this.handleWorkerMessage(workerId, msg));
    worker.on('error', (err) => this.handleWorkerError(workerId, err));
    worker.on('exit', (code) => this.handleWorkerExit(workerId, code));
    
    this.workers.set(workerId, worker);
    
    await this.registerWorker(workerId, type);
    
    return workerId;
  }
  
  async distributeTask(task: Task): Promise<void> {
    const availableWorker = await this.findAvailableWorker(task.type);
    
    if (!availableWorker) {
      // Queue task if no workers available
      this.taskQueue.push(task);
      return;
    }
    
    const assignment: TaskAssignment = {
      taskId: task.id,
      workerId: availableWorker.id,
      taskType: task.type,
      parameters: task.parameters,
      deadline: Date.now() + this.config.workerTimeout,
      retryCount: 0
    };
    
    await this.assignTask(assignment);
  }
  
  private async assignTask(assignment: TaskAssignment): Promise<void> {
    const worker = this.workers.get(assignment.workerId);
    if (!worker) throw new Error(`Worker ${assignment.workerId} not found`);
    
    // Update worker state
    await this.updateWorkerState(assignment.workerId, 'busy', assignment.taskId);
    
    // Send task to worker
    worker.postMessage({
      type: 'task',
      assignment
    });
    
    // Set timeout for task completion
    setTimeout(() => this.handleTaskTimeout(assignment), this.config.workerTimeout);
  }
}
```

### 1.2 Worker Base Class (`src/lib/spawn/workers/base.ts`)

```typescript
import { parentPort, workerData } from 'worker_threads';
import { createClient } from '@supabase/supabase-js';

export abstract class BaseWorker {
  protected workerId: string;
  protected type: string;
  protected supabase: ReturnType<typeof createClient>;
  
  constructor() {
    if (!parentPort) throw new Error('Worker must be run in worker thread');
    
    this.workerId = workerData.workerId;
    this.type = workerData.type;
    this.supabase = createClient(
      workerData.config.supabaseUrl,
      workerData.config.supabaseKey
    );
    
    this.setupMessageHandling();
    this.initialize();
  }
  
  private setupMessageHandling(): void {
    parentPort!.on('message', async (message) => {
      try {
        await this.handleMessage(message);
      } catch (error) {
        this.sendError(error);
      }
    });
  }
  
  protected async handleMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'task':
        await this.processTask(message.assignment);
        break;
      case 'health':
        this.sendHealthStatus();
        break;
      case 'shutdown':
        await this.shutdown();
        break;
      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }
  }
  
  protected abstract initialize(): Promise<void>;
  protected abstract processTask(assignment: TaskAssignment): Promise<void>;
  protected abstract shutdown(): Promise<void>;
  
  protected sendResult(taskId: string, result: any): void {
    parentPort!.postMessage({
      type: 'result',
      taskId,
      workerId: this.workerId,
      result
    });
  }
  
  protected sendError(error: any): void {
    parentPort!.postMessage({
      type: 'error',
      workerId: this.workerId,
      error: error.message || error
    });
  }
  
  protected sendHealthStatus(): void {
    parentPort!.postMessage({
      type: 'health',
      workerId: this.workerId,
      status: 'healthy',
      timestamp: Date.now()
    });
  }
}
```

### 1.3 Discovery Worker (`src/lib/spawn/workers/discovery.ts`)

```typescript
import { BaseWorker } from './base';
import { EventbriteClient } from '@/lib/api/eventbrite-client';
import { TicketmasterClient } from '@/lib/api/ticketmaster-client';
import { YelpClient } from '@/lib/api/yelp-client';

export class DiscoveryWorker extends BaseWorker {
  private clients: Map<string, any> = new Map();
  
  protected async initialize(): Promise<void> {
    // Initialize API clients
    this.clients.set('eventbrite', new EventbriteClient());
    this.clients.set('ticketmaster', new TicketmasterClient());
    this.clients.set('yelp', new YelpClient());
  }
  
  protected async processTask(assignment: TaskAssignment): Promise<void> {
    const { source, location, dateRange } = assignment.parameters;
    
    try {
      const client = this.clients.get(source);
      if (!client) throw new Error(`Unknown source: ${source}`);
      
      // Discover events
      const events = await client.searchEvents({
        location,
        dateRange,
        limit: 50
      });
      
      // Store raw events for ingestion
      const { error } = await this.supabase
        .from('raw_events')
        .insert(events.map(event => ({
          source,
          external_id: event.id,
          data: event,
          discovered_at: new Date().toISOString()
        })));
      
      if (error) throw error;
      
      this.sendResult(assignment.taskId, {
        source,
        eventsDiscovered: events.length,
        location
      });
      
    } catch (error) {
      this.sendError({
        taskId: assignment.taskId,
        error: error.message
      });
    }
  }
  
  protected async shutdown(): Promise<void> {
    // Cleanup API clients
    for (const client of this.clients.values()) {
      if (client.cleanup) await client.cleanup();
    }
  }
}
```

### 1.4 Task Distribution (`src/lib/spawn/tasks/distributor.ts`)

```typescript
export class TaskDistributor {
  private controller: SpawnController;
  private scheduledTasks: Map<string, NodeJS.Timeout> = new Map();
  
  constructor(controller: SpawnController) {
    this.controller = controller;
  }
  
  async scheduleDiscovery(config: DiscoveryConfig): Promise<void> {
    const cities = await this.getTargetCities();
    const sources = ['eventbrite', 'ticketmaster', 'yelp'];
    
    // Create discovery tasks for each city/source combination
    for (const city of cities) {
      for (const source of sources) {
        const task: Task = {
          id: `discovery-${source}-${city.id}-${Date.now()}`,
          type: 'discovery',
          priority: this.calculatePriority(city, source),
          parameters: {
            source,
            location: {
              latitude: city.latitude,
              longitude: city.longitude,
              radius: city.radius || 50000 // 50km default
            },
            dateRange: {
              start: new Date(),
              end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
            }
          }
        };
        
        await this.controller.distributeTask(task);
      }
    }
  }
  
  async scheduleIngestion(): Promise<void> {
    // Query for unprocessed raw events
    const { data: rawEvents, error } = await this.supabase
      .from('raw_events')
      .select('*')
      .is('processed', false)
      .limit(100);
    
    if (error) throw error;
    
    // Group by source for batch processing
    const eventsBySource = this.groupBySource(rawEvents);
    
    for (const [source, events] of eventsBySource) {
      const task: Task = {
        id: `ingestion-${source}-${Date.now()}`,
        type: 'ingestion',
        priority: 5,
        parameters: {
          source,
          eventIds: events.map(e => e.id),
          batchSize: events.length
        }
      };
      
      await this.controller.distributeTask(task);
    }
  }
  
  startScheduledTasks(): void {
    // Schedule discovery every 6 hours
    const discoveryInterval = setInterval(
      () => this.scheduleDiscovery({}),
      6 * 60 * 60 * 1000
    );
    this.scheduledTasks.set('discovery', discoveryInterval);
    
    // Schedule ingestion every 30 minutes
    const ingestionInterval = setInterval(
      () => this.scheduleIngestion(),
      30 * 60 * 1000
    );
    this.scheduledTasks.set('ingestion', ingestionInterval);
  }
}
```

## 2. Database Schema

```sql
-- Raw events table for discovered events
CREATE TABLE raw_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  data JSONB NOT NULL,
  discovered_at TIMESTAMPTZ NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error TEXT,
  UNIQUE(source, external_id)
);

-- Worker state tracking
CREATE TABLE worker_state (
  worker_id TEXT PRIMARY KEY,
  worker_type TEXT NOT NULL,
  status TEXT NOT NULL,
  current_task TEXT,
  tasks_completed INTEGER DEFAULT 0,
  average_time_ms INTEGER,
  error_rate FLOAT DEFAULT 0,
  last_heartbeat TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task assignments
CREATE TABLE task_assignments (
  task_id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  parameters JSONB NOT NULL,
  status TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  result JSONB,
  error TEXT
);
```

## 3. Configuration

### 3.1 Environment Variables

```env
# Spawn Configuration
SPAWN_MAX_WORKERS=10
SPAWN_WORKER_TIMEOUT=300000  # 5 minutes
SPAWN_REDIS_URL=redis://localhost:6379

# API Keys
EVENTBRITE_API_KEY=your_key
TICKETMASTER_API_KEY=your_key
YELP_API_KEY=your_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
```

### 3.2 Spawn Configuration (`src/config/spawn.ts`)

```typescript
export const spawnConfig = {
  maxWorkers: parseInt(process.env.SPAWN_MAX_WORKERS || '10'),
  workerTimeout: parseInt(process.env.SPAWN_WORKER_TIMEOUT || '300000'),
  redisUrl: process.env.SPAWN_REDIS_URL || 'redis://localhost:6379',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  
  workerTypes: {
    discovery: {
      maxConcurrency: 3,
      memoryLimit: '512MB',
      cpuLimit: 0.5
    },
    ingestion: {
      maxConcurrency: 5,
      memoryLimit: '256MB',
      cpuLimit: 0.3
    },
    processing: {
      maxConcurrency: 2,
      memoryLimit: '1GB',
      cpuLimit: 1
    }
  },
  
  retryPolicy: {
    maxRetries: 3,
    backoffMultiplier: 2,
    maxBackoff: 60000 // 1 minute
  }
};
```

## 4. API Integration

### 4.1 Spawn API Routes (`src/app/api/spawn/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { SpawnController } from '@/lib/spawn/controller';
import { TaskDistributor } from '@/lib/spawn/tasks/distributor';
import { spawnConfig } from '@/config/spawn';

let controller: SpawnController;
let distributor: TaskDistributor;

async function initializeSpawn() {
  if (!controller) {
    controller = new SpawnController(spawnConfig);
    await controller.initialize();
    
    distributor = new TaskDistributor(controller);
    distributor.startScheduledTasks();
  }
}

export async function GET(request: NextRequest) {
  await initializeSpawn();
  
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  
  switch (action) {
    case 'status':
      return NextResponse.json(await controller.getSystemStatus());
    
    case 'workers':
      return NextResponse.json(await controller.getWorkerStates());
    
    case 'tasks':
      return NextResponse.json(await controller.getTaskQueue());
    
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  await initializeSpawn();
  
  const body = await request.json();
  const { action, params } = body;
  
  switch (action) {
    case 'spawn':
      const workerId = await controller.spawnWorker(params.type);
      return NextResponse.json({ workerId });
    
    case 'task':
      await controller.distributeTask(params.task);
      return NextResponse.json({ success: true });
    
    case 'discovery':
      await distributor.scheduleDiscovery(params);
      return NextResponse.json({ success: true });
    
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}
```

## 5. Testing Strategy

### 5.1 Unit Tests (`tests/spawn/controller.test.ts`)

```typescript
import { SpawnController } from '@/lib/spawn/controller';
import { mockConfig } from '../mocks/spawn-config';

describe('SpawnController', () => {
  let controller: SpawnController;
  
  beforeEach(async () => {
    controller = new SpawnController(mockConfig);
    await controller.initialize();
  });
  
  afterEach(async () => {
    await controller.shutdown();
  });
  
  test('spawns worker successfully', async () => {
    const workerId = await controller.spawnWorker('discovery');
    expect(workerId).toMatch(/^worker-discovery-\d+$/);
  });
  
  test('distributes task to available worker', async () => {
    await controller.spawnWorker('discovery');
    
    const task = {
      id: 'test-task-1',
      type: 'discovery',
      priority: 5,
      parameters: {
        source: 'eventbrite',
        location: { latitude: 37.7749, longitude: -122.4194 }
      }
    };
    
    await controller.distributeTask(task);
    
    const status = await controller.getSystemStatus();
    expect(status.activeTasks).toBe(1);
  });
});
```

## 6. Monitoring & Observability

### 6.1 Metrics Collection

```typescript
interface SpawnMetrics {
  workers: {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
  tasks: {
    queued: number;
    active: number;
    completed: number;
    failed: number;
    averageCompletionTime: number;
  };
  performance: {
    cpuUsage: number;
    memoryUsage: number;
    eventDiscoveryRate: number;
    ingestionRate: number;
  };
}
```

### 6.2 Health Dashboard Component

```tsx
export function SpawnHealthDashboard() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['spawn-metrics'],
    queryFn: fetchSpawnMetrics,
    refetchInterval: 5000
  });
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <MetricCard
        title="Active Workers"
        value={metrics.workers.total}
        breakdown={metrics.workers.byType}
      />
      <MetricCard
        title="Task Queue"
        value={metrics.tasks.queued}
        trend={metrics.tasks.active}
      />
      <MetricCard
        title="Discovery Rate"
        value={`${metrics.performance.eventDiscoveryRate}/hr`}
        chart={metrics.discoveryHistory}
      />
    </div>
  );
}
```

## 7. Deployment

### 7.1 Docker Configuration

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

ENV NODE_ENV=production
ENV SPAWN_MAX_WORKERS=20

EXPOSE 3000

CMD ["npm", "run", "start:spawn"]
```

### 7.2 Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scenescout-spawn
spec:
  replicas: 3
  selector:
    matchLabels:
      app: scenescout-spawn
  template:
    metadata:
      labels:
        app: scenescout-spawn
    spec:
      containers:
      - name: spawn-controller
        image: scenescout/spawn:latest
        resources:
          limits:
            memory: "2Gi"
            cpu: "2"
          requests:
            memory: "1Gi"
            cpu: "1"
        env:
        - name: SPAWN_MAX_WORKERS
          value: "20"
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
```

## Next Steps

1. Implement the core SpawnController class
2. Create worker implementations for each type
3. Set up the message queue infrastructure
4. Implement the task distribution logic
5. Create monitoring and health check endpoints
6. Write comprehensive tests
7. Set up deployment configuration
8. Create operational documentation

This implementation guide provides a complete foundation for building the SceneScout spawning system with production-ready patterns and best practices.