/**
 * Type definitions for the Event Spawner system
 */

export interface SpawnConfig {
  maxWorkers: number;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  onError?: (error: Error, task: SpawnTask) => void;
  onComplete?: (result: any, task: SpawnTask) => void;
}

export interface SpawnTask {
  id?: string;
  name: string;
  data: any;
  handler: (data: any) => Promise<any>;
  priority?: number;
  metadata?: Record<string, any>;
  resolve?: (value: any) => void;
}

export interface SpawnWorker {
  id: string;
  task: SpawnTask;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  attempts: number;
  error?: Error;
}

export interface SpawnResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  duration: number;
  workerId: string;
}

export type SpawnStatus = 'idle' | 'processing' | 'stopping' | 'stopped';

export interface SpawnMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTime: number;
  startTime: number;
}

export interface SpawnEvent {
  type: 'worker:start' | 'worker:complete' | 'worker:error' | 'worker:retry' | 
        'task:queued' | 'shutdown:forced' | 'shutdown:complete';
  timestamp: number;
  data: any;
}

// Event source specific task handlers
export interface EventSourceHandler {
  source: 'eventbrite' | 'yelp' | 'manual' | 'scraper';
  process: (data: any) => Promise<any>;
  validate?: (data: any) => boolean;
  transform?: (data: any) => any;
}