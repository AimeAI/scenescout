/**
 * Tests for the spawner implementation
 */

import { createSpawner, EventSpawner } from '@/lib/spawner';
import { SpawnTask, SpawnResult } from '@/lib/spawner/types';
import { createEventProcessor, EventProcessor } from '@/lib/spawner/event-processor';

// Mock dependencies
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({ data: null }))
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => ({ 
            data: { id: 'test-id', title: 'Test Event' },
            error: null
          }))
        }))
      }))
    }))
  }
}));

describe('EventSpawner', () => {
  let spawner: EventSpawner;

  beforeEach(() => {
    spawner = createSpawner({
      maxWorkers: 3,
      timeout: 5000,
      retryAttempts: 2
    });
  });

  afterEach(async () => {
    await spawner.shutdown();
  });

  describe('Basic functionality', () => {
    test('should create spawner with default config', () => {
      const defaultSpawner = createSpawner();
      expect(defaultSpawner).toBeInstanceOf(EventSpawner);
    });

    test('should handle single task execution', async () => {
      const task: SpawnTask = {
        name: 'test-task',
        data: { value: 42 },
        handler: async (data) => {
          return { result: data.value * 2 };
        }
      };

      const result = await spawner.spawn(task);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ result: 84 });
      expect(result.duration).toBeGreaterThan(0);
    });

    test('should handle batch task execution', async () => {
      const tasks: SpawnTask[] = [
        {
          name: 'task-1',
          data: { value: 1 },
          handler: async (data) => ({ result: data.value * 2 })
        },
        {
          name: 'task-2',
          data: { value: 2 },
          handler: async (data) => ({ result: data.value * 2 })
        },
        {
          name: 'task-3',
          data: { value: 3 },
          handler: async (data) => ({ result: data.value * 2 })
        }
      ];

      const results = await spawner.spawnBatch(tasks);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(results[0].data).toEqual({ result: 2 });
      expect(results[1].data).toEqual({ result: 4 });
      expect(results[2].data).toEqual({ result: 6 });
    });
  });

  describe('Error handling', () => {
    test('should handle task errors with retries', async () => {
      let attemptCount = 0;
      const task: SpawnTask = {
        name: 'failing-task',
        data: { shouldFail: true },
        handler: async (data) => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Task failed');
          }
          return { success: true, attempts: attemptCount };
        }
      };

      const result = await spawner.spawn(task);

      expect(result.success).toBe(true);
      expect(result.data.attempts).toBe(3);
      expect(attemptCount).toBe(3);
    });

    test('should fail after max retries', async () => {
      const task: SpawnTask = {
        name: 'always-failing-task',
        data: {},
        handler: async () => {
          throw new Error('Always fails');
        }
      };

      const result = await spawner.spawn(task);

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Always fails');
    });

    test('should handle timeout errors', async () => {
      const task: SpawnTask = {
        name: 'timeout-task',
        data: {},
        handler: async () => {
          // Simulate long-running task
          await new Promise(resolve => setTimeout(resolve, 10000));
          return { completed: true };
        }
      };

      const result = await spawner.spawn(task);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('timeout');
    });
  });

  describe('Concurrency and queuing', () => {
    test('should respect max workers limit', async () => {
      const spawner = createSpawner({ maxWorkers: 2 });
      let concurrentTasks = 0;
      let maxConcurrent = 0;

      const tasks: SpawnTask[] = Array.from({ length: 5 }, (_, i) => ({
        name: `concurrent-task-${i}`,
        data: { index: i },
        handler: async (data) => {
          concurrentTasks++;
          maxConcurrent = Math.max(maxConcurrent, concurrentTasks);
          
          // Simulate work
          await new Promise(resolve => setTimeout(resolve, 100));
          
          concurrentTasks--;
          return { index: data.index };
        }
      }));

      await spawner.spawnBatch(tasks);

      expect(maxConcurrent).toBeLessThanOrEqual(2);
      await spawner.shutdown();
    });

    test('should queue tasks when at capacity', async () => {
      const spawner = createSpawner({ maxWorkers: 1 });
      
      const tasks: SpawnTask[] = Array.from({ length: 3 }, (_, i) => ({
        name: `queued-task-${i}`,
        data: { index: i },
        handler: async (data) => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return { index: data.index };
        }
      }));

      const startTime = Date.now();
      const results = await spawner.spawnBatch(tasks);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(duration).toBeGreaterThan(100); // Sequential execution
      
      await spawner.shutdown();
    });
  });

  describe('Status and metrics', () => {
    test('should track metrics correctly', async () => {
      const tasks: SpawnTask[] = Array.from({ length: 5 }, (_, i) => ({
        name: `metric-task-${i}`,
        data: { index: i },
        handler: async (data) => ({ index: data.index })
      }));

      await spawner.spawnBatch(tasks);
      const status = spawner.getStatus();

      expect(status.metrics.totalTasks).toBe(5);
      expect(status.metrics.completedTasks).toBe(5);
      expect(status.metrics.failedTasks).toBe(0);
      expect(status.metrics.averageTime).toBeGreaterThan(0);
    });

    test('should emit events during execution', (done) => {
      const events: string[] = [];
      
      spawner.on('worker:start', () => events.push('start'));
      spawner.on('worker:complete', () => events.push('complete'));

      const task: SpawnTask = {
        name: 'event-test',
        data: {},
        handler: async () => ({ success: true })
      };

      spawner.spawn(task).then(() => {
        expect(events).toContain('start');
        expect(events).toContain('complete');
        done();
      });
    });
  });
});

describe('EventProcessor', () => {
  let processor: EventProcessor;

  beforeEach(() => {
    processor = createEventProcessor({
      batchSize: 5,
      deduplicationEnabled: true,
      enrichmentEnabled: false // Disable for testing
    });
  });

  afterEach(async () => {
    await processor.shutdown();
  });

  describe('Event processing', () => {
    test('should process Eventbrite events', async () => {
      const mockEvents = [
        {
          id: 'eb-1',
          name: { text: 'Test Event 1' },
          venue: {
            name: 'Test Venue',
            address: {
              city: 'San Francisco',
              region: 'CA',
              country: 'US'
            }
          },
          start: { local: '2024-01-01T18:00:00' },
          is_free: true,
          status: 'live'
        }
      ];

      const results = await processor.processEventbriteEvents(mockEvents);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].data.source).toBe('eventbrite');
    });

    test('should process Yelp events', async () => {
      const mockEvents = [
        {
          id: 'yelp-1',
          name: 'Test Yelp Event',
          location: {
            city: 'New York',
            state: 'NY',
            country: 'US'
          },
          time_start: '2024-01-01T19:00:00',
          cost: 25
        }
      ];

      const results = await processor.processYelpEvents(mockEvents);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].data.source).toBe('yelp');
    });

    test('should process manual event submission', async () => {
      const mockEvent = {
        title: 'Manual Test Event',
        venue_name: 'Manual Venue',
        city: 'Los Angeles',
        state: 'CA',
        start_time: '2024-01-01T20:00:00',
        price: 15
      };

      const result = await processor.processManualEvent(mockEvent);

      expect(result.success).toBe(true);
      expect(result.data.source).toBe('manual');
      expect(result.data.status).toBe('pending_review');
    });
  });

  describe('Data validation', () => {
    test('should reject invalid events', async () => {
      const invalidEvents = [
        {
          id: 'invalid-1',
          // Missing required fields
        }
      ];

      const results = await processor.processEventbriteEvents(invalidEvents);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error?.message).toContain('Invalid event data');
    });
  });

  describe('Statistics', () => {
    test('should track processing statistics', async () => {
      const mockEvents = [
        {
          id: 'stat-1',
          name: { text: 'Stat Event 1' },
          venue: { name: 'Venue 1', address: { city: 'City 1' } },
          start: { local: '2024-01-01T18:00:00' },
          is_free: true
        },
        {
          id: 'stat-2',
          name: { text: 'Stat Event 2' },
          venue: { name: 'Venue 2', address: { city: 'City 2' } },
          start: { local: '2024-01-01T19:00:00' },
          is_free: false
        }
      ];

      await processor.processEventbriteEvents(mockEvents);
      const stats = processor.getStats();

      expect(stats.processedCount).toBe(2);
      expect(stats.metrics.totalTasks).toBe(2);
      expect(stats.metrics.completedTasks).toBe(2);
    });
  });
});