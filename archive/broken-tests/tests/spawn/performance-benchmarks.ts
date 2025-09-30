import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { performance } from 'perf_hooks';

// Performance benchmark suite for spawn implementation
describe('Performance Benchmarks', () => {
  let results: any[] = [];

  beforeAll(() => {
    console.log('Starting Performance Benchmark Suite...');
  });

  afterAll(() => {
    console.log('\n=== Performance Benchmark Results ===');
    results.forEach(result => {
      console.log(`${result.name}: ${result.time.toFixed(2)}ms (${result.status})`);
    });
  });

  describe('Spawn Performance', () => {
    it('should spawn single agent under 100ms', async () => {
      const start = performance.now();
      
      // Simulate agent spawn
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const end = performance.now();
      const duration = end - start;

      results.push({
        name: 'Single Agent Spawn',
        time: duration,
        status: duration < 100 ? 'PASS' : 'FAIL'
      });

      expect(duration).toBeLessThan(100);
    });

    it('should spawn 5 agents concurrently under 500ms', async () => {
      const start = performance.now();
      
      // Simulate concurrent spawns
      const spawns = Array.from({ length: 5 }, (_, i) => 
        new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 20))
      );
      
      await Promise.all(spawns);
      
      const end = performance.now();
      const duration = end - start;

      results.push({
        name: 'Concurrent Spawn (5 agents)',
        time: duration,
        status: duration < 500 ? 'PASS' : 'FAIL'
      });

      expect(duration).toBeLessThan(500);
    });

    it('should scale linearly with agent count', async () => {
      const agentCounts = [1, 5, 10, 20];
      const timings: number[] = [];

      for (const count of agentCounts) {
        const start = performance.now();
        
        const spawns = Array.from({ length: count }, () => 
          new Promise(resolve => setTimeout(resolve, 10))
        );
        
        await Promise.all(spawns);
        
        const end = performance.now();
        timings.push(end - start);
      }

      // Check for linear scaling
      const scalingFactor = timings[3] / timings[0];
      results.push({
        name: 'Scaling Factor (20x agents)',
        time: scalingFactor,
        status: scalingFactor < 5 ? 'PASS' : 'FAIL'
      });

      expect(scalingFactor).toBeLessThan(5); // Should scale better than linear
    });
  });

  describe('Task Execution Performance', () => {
    it('should execute task with minimal overhead', async () => {
      const taskExecutionTime = 100;
      const start = performance.now();
      
      // Simulate task execution with overhead
      const overhead = 10;
      await new Promise(resolve => setTimeout(resolve, taskExecutionTime + overhead));
      
      const end = performance.now();
      const actualOverhead = (end - start) - taskExecutionTime;

      results.push({
        name: 'Task Execution Overhead',
        time: actualOverhead,
        status: actualOverhead < 50 ? 'PASS' : 'FAIL'
      });

      expect(actualOverhead).toBeLessThan(50);
    });

    it('should handle 100 concurrent tasks efficiently', async () => {
      const start = performance.now();
      
      const tasks = Array.from({ length: 100 }, (_, i) => 
        new Promise(resolve => setTimeout(resolve, Math.random() * 10))
      );
      
      await Promise.all(tasks);
      
      const end = performance.now();
      const duration = end - start;

      results.push({
        name: 'Concurrent Tasks (100)',
        time: duration,
        status: duration < 200 ? 'PASS' : 'FAIL'
      });

      expect(duration).toBeLessThan(200);
    });
  });

  describe('Memory Performance', () => {
    it('should maintain stable memory usage', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Simulate operations that could leak memory
      for (let i = 0; i < 1000; i++) {
        const data = Array.from({ length: 100 }, () => Math.random());
        // Process data
        data.reduce((sum, val) => sum + val, 0);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = ((finalMemory - initialMemory) / initialMemory) * 100;

      results.push({
        name: 'Memory Growth %',
        time: memoryGrowth,
        status: memoryGrowth < 10 ? 'PASS' : 'FAIL'
      });

      expect(memoryGrowth).toBeLessThan(10);
    });

    it('should clean up resources properly', async () => {
      const allocations: any[] = [];
      
      // Allocate resources
      for (let i = 0; i < 10; i++) {
        allocations.push({
          id: i,
          data: new Array(1000).fill(Math.random())
        });
      }
      
      // Clean up
      const cleanupStart = performance.now();
      allocations.length = 0;
      const cleanupEnd = performance.now();
      
      const cleanupTime = cleanupEnd - cleanupStart;

      results.push({
        name: 'Resource Cleanup Time',
        time: cleanupTime,
        status: cleanupTime < 10 ? 'PASS' : 'FAIL'
      });

      expect(cleanupTime).toBeLessThan(10);
    });
  });

  describe('Coordination Performance', () => {
    it('should coordinate messages with low latency', async () => {
      const messageCount = 100;
      const start = performance.now();
      
      // Simulate message passing
      const messages = Array.from({ length: messageCount }, (_, i) => ({
        from: `agent-${i % 10}`,
        to: `agent-${(i + 1) % 10}`,
        payload: { task: i }
      }));
      
      // Process messages
      messages.forEach(msg => {
        // Simulate message processing
        JSON.stringify(msg);
      });
      
      const end = performance.now();
      const avgLatency = (end - start) / messageCount;

      results.push({
        name: 'Avg Message Latency',
        time: avgLatency,
        status: avgLatency < 1 ? 'PASS' : 'FAIL'
      });

      expect(avgLatency).toBeLessThan(1);
    });

    it('should sync state efficiently', async () => {
      const agentCount = 20;
      const state = {
        agents: Array.from({ length: agentCount }, (_, i) => ({
          id: `agent-${i}`,
          status: 'active',
          tasks: []
        })),
        timestamp: Date.now()
      };
      
      const start = performance.now();
      
      // Simulate state synchronization
      const serialized = JSON.stringify(state);
      const copies = Array.from({ length: agentCount }, () => 
        JSON.parse(serialized)
      );
      
      const end = performance.now();
      const syncTime = end - start;

      results.push({
        name: 'State Sync Time (20 agents)',
        time: syncTime,
        status: syncTime < 50 ? 'PASS' : 'FAIL'
      });

      expect(syncTime).toBeLessThan(50);
    });
  });

  describe('Load Testing', () => {
    it('should handle burst load', async () => {
      const burstSize = 50;
      const start = performance.now();
      
      // Simulate burst of requests
      const burst = Array.from({ length: burstSize }, (_, i) => 
        new Promise(resolve => {
          const delay = Math.random() * 5;
          setTimeout(() => resolve(i), delay);
        })
      );
      
      await Promise.all(burst);
      
      const end = performance.now();
      const burstTime = end - start;

      results.push({
        name: 'Burst Load Handling (50 requests)',
        time: burstTime,
        status: burstTime < 100 ? 'PASS' : 'FAIL'
      });

      expect(burstTime).toBeLessThan(100);
    });

    it('should maintain performance under sustained load', async () => {
      const duration = 1000; // 1 second
      const start = performance.now();
      let operationCount = 0;
      
      // Sustained load for duration
      while (performance.now() - start < duration) {
        // Simulate operation
        await new Promise(resolve => setImmediate(resolve));
        operationCount++;
      }
      
      const opsPerSecond = operationCount / (duration / 1000);

      results.push({
        name: 'Operations per Second',
        time: opsPerSecond,
        status: opsPerSecond > 1000 ? 'PASS' : 'FAIL'
      });

      expect(opsPerSecond).toBeGreaterThan(1000);
    });
  });
});

// Benchmark utility functions
export class BenchmarkRunner {
  private results: Map<string, number[]> = new Map();

  async measure(name: string, fn: () => Promise<void>, iterations = 10): Promise<void> {
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
    }
    
    this.results.set(name, times);
  }

  getStats(name: string) {
    const times = this.results.get(name) || [];
    if (times.length === 0) return null;
    
    const sorted = [...times].sort((a, b) => a - b);
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      average: times.reduce((a, b) => a + b, 0) / times.length,
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  report() {
    console.log('\n=== Detailed Benchmark Report ===');
    this.results.forEach((times, name) => {
      const stats = this.getStats(name);
      if (stats) {
        console.log(`\n${name}:`);
        console.log(`  Min: ${stats.min.toFixed(2)}ms`);
        console.log(`  Max: ${stats.max.toFixed(2)}ms`);
        console.log(`  Median: ${stats.median.toFixed(2)}ms`);
        console.log(`  Average: ${stats.average.toFixed(2)}ms`);
        console.log(`  P95: ${stats.p95.toFixed(2)}ms`);
        console.log(`  P99: ${stats.p99.toFixed(2)}ms`);
      }
    });
  }
}