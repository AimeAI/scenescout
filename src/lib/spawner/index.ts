/**
 * Event Processing Spawner
 * Manages concurrent processing of event data from multiple sources
 */

import { EventEmitter } from 'events';
import type { 
  SpawnConfig, 
  SpawnTask, 
  SpawnResult, 
  SpawnWorker,
  SpawnStatus,
  SpawnMetrics
} from './types';

export class EventSpawner extends EventEmitter {
  private workers: Map<string, SpawnWorker> = new Map();
  private taskQueue: SpawnTask[] = [];
  private config: SpawnConfig;
  private status: SpawnStatus = 'idle';
  private metrics: SpawnMetrics = {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    averageTime: 0,
    startTime: Date.now()
  };

  constructor(config: Partial<SpawnConfig>) {
    super();
    this.config = {
      maxWorkers: config.maxWorkers || 5,
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      onError: config.onError,
      onComplete: config.onComplete
    };
  }

  /**
   * Spawn a new task
   */
  async spawn<T = any>(task: SpawnTask): Promise<SpawnResult<T>> {
    this.metrics.totalTasks++;
    
    // Add to queue if at capacity
    if (this.workers.size >= this.config.maxWorkers) {
      return this.queueTask(task);
    }

    // Create and run worker
    return this.createWorker(task);
  }

  /**
   * Spawn multiple tasks in parallel
   */
  async spawnBatch<T = any>(tasks: SpawnTask[]): Promise<SpawnResult<T>[]> {
    this.status = 'processing';
    const results = await Promise.all(
      tasks.map(task => this.spawn<T>(task))
    );
    this.status = 'idle';
    return results;
  }

  /**
   * Create a worker for task execution
   */
  private async createWorker<T>(task: SpawnTask): Promise<SpawnResult<T>> {
    const workerId = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    const worker: SpawnWorker = {
      id: workerId,
      task,
      status: 'running',
      startTime,
      attempts: 0
    };

    this.workers.set(workerId, worker);
    this.emit('worker:start', { workerId, task });

    try {
      // Execute task with timeout
      const result = await this.executeWithTimeout<T>(task, worker);
      
      // Update metrics
      const duration = Date.now() - startTime;
      this.updateMetrics(duration, true);
      
      // Cleanup
      this.workers.delete(workerId);
      this.emit('worker:complete', { workerId, task, result, duration });

      // Process queued tasks
      this.processQueue();

      return {
        success: true,
        data: result,
        duration,
        workerId
      };
    } catch (error) {
      // Handle retry logic
      if (worker.attempts < this.config.retryAttempts) {
        worker.attempts++;
        this.emit('worker:retry', { workerId, task, attempt: worker.attempts });
        
        // Wait before retry
        await this.delay(this.config.retryDelay * worker.attempts);
        return this.createWorker<T>(task);
      }

      // Final failure
      const duration = Date.now() - startTime;
      this.updateMetrics(duration, false);
      this.metrics.failedTasks++;
      
      this.workers.delete(workerId);
      this.emit('worker:error', { workerId, task, error, duration });

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        duration,
        workerId
      };
    }
  }

  /**
   * Execute task with timeout protection
   */
  private async executeWithTimeout<T>(task: SpawnTask, worker: SpawnWorker): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Task timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      // Execute task handler
      task.handler(task.data)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Queue task for later processing
   */
  private async queueTask<T>(task: SpawnTask): Promise<SpawnResult<T>> {
    return new Promise((resolve) => {
      const queuedTask = { ...task, resolve };
      this.taskQueue.push(queuedTask);
      this.emit('task:queued', { task, queueLength: this.taskQueue.length });
    });
  }

  /**
   * Process queued tasks
   */
  private processQueue(): void {
    if (this.taskQueue.length === 0 || this.workers.size >= this.config.maxWorkers) {
      return;
    }

    const task = this.taskQueue.shift();
    if (task) {
      this.createWorker(task).then(task.resolve);
    }
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(duration: number, success: boolean): void {
    if (success) {
      this.metrics.completedTasks++;
      this.metrics.averageTime = 
        (this.metrics.averageTime * (this.metrics.completedTasks - 1) + duration) / 
        this.metrics.completedTasks;
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current spawner status
   */
  getStatus(): {
    status: SpawnStatus;
    workers: number;
    queued: number;
    metrics: SpawnMetrics;
  } {
    return {
      status: this.status,
      workers: this.workers.size,
      queued: this.taskQueue.length,
      metrics: { ...this.metrics }
    };
  }

  /**
   * Gracefully shutdown spawner
   */
  async shutdown(): Promise<void> {
    this.status = 'stopping';
    
    // Wait for all workers to complete
    const timeout = this.config.timeout * 2;
    const startTime = Date.now();
    
    while (this.workers.size > 0 && Date.now() - startTime < timeout) {
      await this.delay(100);
    }

    // Force cleanup if needed
    if (this.workers.size > 0) {
      this.emit('shutdown:forced', { remainingWorkers: this.workers.size });
      this.workers.clear();
    }

    this.taskQueue = [];
    this.status = 'stopped';
    this.emit('shutdown:complete');
  }
}

// Export factory function
export function createSpawner(config: Partial<SpawnConfig> = {}): EventSpawner {
  return new EventSpawner(config);
}

// Export types
export * from './types';