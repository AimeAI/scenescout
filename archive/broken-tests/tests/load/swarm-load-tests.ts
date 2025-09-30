/**
 * Load Testing Suite for Swarm System
 * Tests system performance under various load conditions
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { performance } from 'perf_hooks'
import { EventEmitter } from 'events'
import { IntegrationTestOrchestrator, type AgentTestResult } from '../integration/comprehensive-integration-tests'

interface LoadTestMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  p50ResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  requestsPerSecond: number
  errorRate: number
  memoryUsage: {
    initial: number
    peak: number
    final: number
  }
  cpuUsage: {
    average: number
    peak: number
  }
}

interface LoadTestScenario {
  name: string
  description: string
  concurrent: number
  duration: number
  rampUpTime: number
  agents: string[]
  taskPattern: 'constant' | 'burst' | 'spike' | 'gradual'
  expectedThroughput: number
  maxErrorRate: number
}

class LoadTestRunner extends EventEmitter {
  private orchestrator: IntegrationTestOrchestrator
  private metrics: LoadTestMetrics
  private isRunning = false
  private startTime = 0
  private responseTimes: number[] = []
  private memoryReadings: number[] = []
  private cpuReadings: number[] = []
  
  constructor() {
    super()
    this.orchestrator = new IntegrationTestOrchestrator()
    this.metrics = this.initializeMetrics()
  }
  
  private initializeMetrics(): LoadTestMetrics {
    return {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      p50ResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      requestsPerSecond: 0,
      errorRate: 0,
      memoryUsage: {
        initial: process.memoryUsage().heapUsed,
        peak: 0,
        final: 0
      },
      cpuUsage: {
        average: 0,
        peak: 0
      }
    }
  }
  
  async runLoadTest(scenario: LoadTestScenario): Promise<LoadTestMetrics> {
    console.log(`🚀 Starting load test: ${scenario.name}`)
    console.log(`   Concurrent: ${scenario.concurrent}`)
    console.log(`   Duration: ${scenario.duration}ms`)
    console.log(`   Pattern: ${scenario.taskPattern}`)
    
    this.isRunning = true
    this.startTime = Date.now()
    this.metrics = this.initializeMetrics()
    this.responseTimes = []
    
    // Start monitoring
    this.startMonitoring()
    
    try {
      await this.executeLoadPattern(scenario)
      await this.waitForCompletion()
    } finally {
      this.isRunning = false
      this.stopMonitoring()
      this.calculateFinalMetrics()
    }
    
    return this.metrics
  }
  
  private async executeLoadPattern(scenario: LoadTestScenario): Promise<void> {
    switch (scenario.taskPattern) {
      case 'constant':
        await this.executeConstantLoad(scenario)
        break
      case 'burst':
        await this.executeBurstLoad(scenario)
        break
      case 'spike':
        await this.executeSpikeLoad(scenario)
        break
      case 'gradual':
        await this.executeGradualLoad(scenario)
        break
    }
  }
  
  private async executeConstantLoad(scenario: LoadTestScenario): Promise<void> {
    const intervalMs = scenario.duration / scenario.concurrent
    const promises: Promise<void>[] = []
    
    for (let i = 0; i < scenario.concurrent; i++) {
      const delay = (i * intervalMs) / scenario.concurrent
      
      promises.push(
        this.delay(delay).then(() => this.executeTask(scenario))
      )
    }
    
    await Promise.all(promises)
  }
  
  private async executeBurstLoad(scenario: LoadTestScenario): Promise<void> {
    const burstSize = Math.ceil(scenario.concurrent / 4)
    const burstInterval = scenario.duration / 4
    
    for (let burst = 0; burst < 4; burst++) {
      const burstPromises = Array.from({ length: burstSize }, () => 
        this.executeTask(scenario)
      )
      
      await Promise.all(burstPromises)
      
      if (burst < 3) {
        await this.delay(burstInterval)
      }
    }
  }
  
  private async executeSpikeLoad(scenario: LoadTestScenario): Promise<void> {
    // Ramp up gradually
    const rampUpTasks = Math.floor(scenario.concurrent * 0.3)
    for (let i = 0; i < rampUpTasks; i++) {
      await this.executeTask(scenario)
      await this.delay(scenario.rampUpTime / rampUpTasks)
    }
    
    // Spike - execute most tasks simultaneously
    const spikeTasks = scenario.concurrent - rampUpTasks
    const spikePromises = Array.from({ length: spikeTasks }, () => 
      this.executeTask(scenario)
    )
    
    await Promise.all(spikePromises)
  }
  
  private async executeGradualLoad(scenario: LoadTestScenario): Promise<void> {
    const stepSize = Math.ceil(scenario.concurrent / 10)
    const stepInterval = scenario.duration / 10
    
    for (let step = 0; step < 10; step++) {
      const currentConcurrency = Math.min((step + 1) * stepSize, scenario.concurrent)
      
      const stepPromises = Array.from({ length: stepSize }, () => 
        this.executeTask(scenario)
      )
      
      await Promise.all(stepPromises)
      
      if (step < 9) {
        await this.delay(stepInterval)
      }
    }
  }
  
  private async executeTask(scenario: LoadTestScenario): Promise<void> {
    const agentType = scenario.agents[Math.floor(Math.random() * scenario.agents.length)]
    const task = this.generateRandomTask(agentType)
    
    const startTime = performance.now()
    this.metrics.totalRequests++
    
    try {
      await this.orchestrator['taskRunner'].executeTask(agentType, task)
      
      const responseTime = performance.now() - startTime
      this.recordSuccess(responseTime)
      
    } catch (error) {
      this.recordFailure(performance.now() - startTime)
      this.emit('task_error', { agentType, error })
    }
  }
  
  private generateRandomTask(agentType: string): any {
    const taskTypes = {
      'backend-dev': ['api_endpoint', 'database_operation', 'middleware'],
      'coder': ['component', 'hook', 'utility'],
      'code-analyzer': ['schema_analysis', 'query_optimization', 'index_creation'],
      'researcher': ['api_research', 'pattern_analysis', 'best_practices'],
      'tester': ['unit_test', 'integration_test', 'performance_test'],
      'perf-analyzer': ['bottleneck_analysis', 'optimization', 'monitoring'],
      'reviewer': ['code_review', 'security_audit', 'compliance_check'],
      'cicd-engineer': ['pipeline_setup', 'deployment', 'monitoring']
    }
    
    const types = taskTypes[agentType as keyof typeof taskTypes] || ['generic_task']
    const type = types[Math.floor(Math.random() * types.length)]
    
    return {
      type,
      id: `load_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      complexity: Math.random() > 0.7 ? 'high' : 'normal',
      timestamp: Date.now()
    }
  }
  
  private recordSuccess(responseTime: number): void {
    this.metrics.successfulRequests++
    this.responseTimes.push(responseTime)
    
    this.metrics.minResponseTime = Math.min(this.metrics.minResponseTime, responseTime)
    this.metrics.maxResponseTime = Math.max(this.metrics.maxResponseTime, responseTime)
    
    this.emit('task_success', { responseTime })
  }
  
  private recordFailure(responseTime: number): void {
    this.metrics.failedRequests++
    this.responseTimes.push(responseTime)
    
    this.emit('task_failure', { responseTime })
  }
  
  private startMonitoring(): void {
    const monitoringInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(monitoringInterval)
        return
      }
      
      // Record memory usage
      const memUsage = process.memoryUsage().heapUsed
      this.memoryReadings.push(memUsage)
      this.metrics.memoryUsage.peak = Math.max(this.metrics.memoryUsage.peak, memUsage)
      
      // Simulate CPU usage (in real implementation, use actual CPU monitoring)
      const cpuUsage = Math.random() * 100
      this.cpuReadings.push(cpuUsage)
      this.metrics.cpuUsage.peak = Math.max(this.metrics.cpuUsage.peak, cpuUsage)
      
    }, 1000) // Monitor every second
  }
  
  private stopMonitoring(): void {
    this.metrics.memoryUsage.final = process.memoryUsage().heapUsed
  }
  
  private calculateFinalMetrics(): void {
    if (this.responseTimes.length === 0) return
    
    // Calculate response time statistics
    this.responseTimes.sort((a, b) => a - b)
    
    this.metrics.averageResponseTime = 
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
    
    this.metrics.p50ResponseTime = this.getPercentile(this.responseTimes, 50)
    this.metrics.p95ResponseTime = this.getPercentile(this.responseTimes, 95)
    this.metrics.p99ResponseTime = this.getPercentile(this.responseTimes, 99)
    
    // Calculate throughput
    const durationSeconds = (Date.now() - this.startTime) / 1000
    this.metrics.requestsPerSecond = this.metrics.totalRequests / durationSeconds
    
    // Calculate error rate
    this.metrics.errorRate = (this.metrics.failedRequests / this.metrics.totalRequests) * 100
    
    // Calculate CPU average
    if (this.cpuReadings.length > 0) {
      this.metrics.cpuUsage.average = 
        this.cpuReadings.reduce((sum, cpu) => sum + cpu, 0) / this.cpuReadings.length
    }
  }
  
  private getPercentile(values: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * values.length) - 1
    return values[Math.max(0, index)]
  }
  
  private async waitForCompletion(): Promise<void> {
    // Wait a bit for all async operations to complete
    await this.delay(1000)
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  
  getMetrics(): LoadTestMetrics {
    return { ...this.metrics }
  }
}

// Load test scenarios
const loadTestScenarios: LoadTestScenario[] = [
  {
    name: 'Baseline Performance',
    description: 'Establish baseline performance with minimal load',
    concurrent: 5,
    duration: 10000,
    rampUpTime: 2000,
    agents: ['backend-dev', 'coder'],
    taskPattern: 'constant',
    expectedThroughput: 0.5, // requests per second
    maxErrorRate: 0
  },
  {
    name: 'Normal Load',
    description: 'Typical production load simulation',
    concurrent: 20,
    duration: 30000,
    rampUpTime: 5000,
    agents: ['backend-dev', 'coder', 'code-analyzer', 'tester'],
    taskPattern: 'gradual',
    expectedThroughput: 1.5,
    maxErrorRate: 2
  },
  {
    name: 'High Load',
    description: 'Peak traffic load simulation',
    concurrent: 50,
    duration: 45000,
    rampUpTime: 8000,
    agents: ['backend-dev', 'coder', 'code-analyzer', 'researcher', 'tester', 'perf-analyzer'],
    taskPattern: 'burst',
    expectedThroughput: 3.0,
    maxErrorRate: 5
  },
  {
    name: 'Stress Test',
    description: 'Beyond normal capacity to identify breaking points',
    concurrent: 100,
    duration: 60000,
    rampUpTime: 10000,
    agents: ['backend-dev', 'coder', 'code-analyzer', 'researcher', 'tester', 'perf-analyzer', 'reviewer', 'cicd-engineer'],
    taskPattern: 'spike',
    expectedThroughput: 4.0,
    maxErrorRate: 10
  },
  {
    name: 'Endurance Test',
    description: 'Extended duration to test system stability',
    concurrent: 30,
    duration: 120000, // 2 minutes
    rampUpTime: 15000,
    agents: ['backend-dev', 'coder', 'code-analyzer', 'tester'],
    taskPattern: 'constant',
    expectedThroughput: 2.0,
    maxErrorRate: 3
  }
]

describe('Swarm Load Testing Suite', () => {
  let loadTestRunner: LoadTestRunner
  let testResults: Map<string, LoadTestMetrics>
  
  beforeAll(async () => {
    console.log('🏋️ Starting Swarm Load Testing Suite')
    console.log('=' .repeat(60))
    
    loadTestRunner = new LoadTestRunner()
    testResults = new Map()
    
    // Set up event listeners for monitoring
    let successCount = 0
    let failureCount = 0
    
    loadTestRunner.on('task_success', () => {
      successCount++
      if (successCount % 10 === 0) {
        process.stdout.write('✅')
      }
    })
    
    loadTestRunner.on('task_failure', () => {
      failureCount++
      process.stdout.write('❌')
    })
  })
  
  afterAll(async () => {
    console.log('\n\n📊 Load Test Results Summary:')
    console.log('=' .repeat(60))
    
    testResults.forEach((metrics, scenario) => {
      console.log(`\n🏋️ ${scenario}:`)
      console.log(`   Total Requests: ${metrics.totalRequests}`)
      console.log(`   Success Rate: ${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)}%`)
      console.log(`   Error Rate: ${metrics.errorRate.toFixed(2)}%`)
      console.log(`   Avg Response Time: ${metrics.averageResponseTime.toFixed(2)}ms`)
      console.log(`   P95 Response Time: ${metrics.p95ResponseTime.toFixed(2)}ms`)
      console.log(`   Throughput: ${metrics.requestsPerSecond.toFixed(2)} req/s`)
      console.log(`   Peak Memory: ${(metrics.memoryUsage.peak / 1024 / 1024).toFixed(2)}MB`)
    })
    
    // Calculate overall performance summary
    const allMetrics = Array.from(testResults.values())
    const avgThroughput = allMetrics.reduce((sum, m) => sum + m.requestsPerSecond, 0) / allMetrics.length
    const avgErrorRate = allMetrics.reduce((sum, m) => sum + m.errorRate, 0) / allMetrics.length
    const avgResponseTime = allMetrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / allMetrics.length
    
    console.log('\n📈 Overall Performance:')
    console.log(`   Average Throughput: ${avgThroughput.toFixed(2)} req/s`)
    console.log(`   Average Error Rate: ${avgErrorRate.toFixed(2)}%`)
    console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`)
  })
  
  describe('Load Test Scenarios', () => {
    loadTestScenarios.forEach(scenario => {
      it(`should handle ${scenario.name} successfully`, async () => {
        console.log(`\n🚀 Running ${scenario.name}...`)
        
        const metrics = await loadTestRunner.runLoadTest(scenario)
        testResults.set(scenario.name, metrics)
        
        // Validate performance requirements
        expect(metrics.errorRate).toBeLessThanOrEqual(scenario.maxErrorRate)
        expect(metrics.requestsPerSecond).toBeGreaterThanOrEqual(scenario.expectedThroughput * 0.8) // 80% of expected
        expect(metrics.totalRequests).toBeGreaterThan(0)
        expect(metrics.successfulRequests).toBeGreaterThan(0)
        
        // Response time validation (should be reasonable)
        expect(metrics.averageResponseTime).toBeLessThan(5000) // 5 seconds max average
        expect(metrics.p95ResponseTime).toBeLessThan(10000) // 10 seconds max P95
        
        // Memory usage should not grow excessively
        const memoryGrowth = metrics.memoryUsage.final - metrics.memoryUsage.initial
        const memoryGrowthMB = memoryGrowth / 1024 / 1024
        expect(memoryGrowthMB).toBeLessThan(100) // Should not grow by more than 100MB
        
        console.log(`   ✅ ${scenario.name} completed successfully`)
        console.log(`   📊 ${metrics.requestsPerSecond.toFixed(2)} req/s, ${metrics.errorRate.toFixed(2)}% errors`)
        
      }, scenario.duration + 30000) // Add extra time for test overhead
    })
  })
  
  describe('Performance Regression Tests', () => {
    it('should maintain consistent performance across test runs', async () => {
      const baselineScenario = loadTestScenarios[0] // Use baseline scenario
      const runs = 3
      const results: LoadTestMetrics[] = []
      
      for (let i = 0; i < runs; i++) {
        console.log(`\n🔄 Performance regression run ${i + 1}/${runs}`)
        const metrics = await loadTestRunner.runLoadTest({
          ...baselineScenario,
          name: `Regression Run ${i + 1}`
        })
        results.push(metrics)
        
        // Small delay between runs
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
      
      // Check for consistency
      const throughputs = results.map(r => r.requestsPerSecond)
      const responseTimes = results.map(r => r.averageResponseTime)
      
      const throughputDeviation = this.calculateStandardDeviation(throughputs)
      const responseTimeDeviation = this.calculateStandardDeviation(responseTimes)
      
      // Performance should be consistent (low standard deviation)
      const avgThroughput = throughputs.reduce((a, b) => a + b, 0) / throughputs.length
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      
      expect(throughputDeviation).toBeLessThan(avgThroughput * 0.2) // Within 20% deviation
      expect(responseTimeDeviation).toBeLessThan(avgResponseTime * 0.3) // Within 30% deviation
      
      console.log(`   📊 Throughput consistency: ${(throughputDeviation / avgThroughput * 100).toFixed(1)}% deviation`)
      console.log(`   📊 Response time consistency: ${(responseTimeDeviation / avgResponseTime * 100).toFixed(1)}% deviation`)
    }, 120000)
    
    it('should recover gracefully from load spikes', async () => {
      // First, establish normal performance
      const normalLoad = await loadTestRunner.runLoadTest(loadTestScenarios[1])
      
      // Then simulate a load spike
      const spikeLoad = await loadTestRunner.runLoadTest(loadTestScenarios[3])
      
      // Finally, test recovery back to normal
      const recoveryLoad = await loadTestRunner.runLoadTest({
        ...loadTestScenarios[1],
        name: 'Recovery Test'
      })
      
      // Recovery performance should be similar to initial normal load
      const throughputDifference = Math.abs(recoveryLoad.requestsPerSecond - normalLoad.requestsPerSecond)
      const responseTimeDifference = Math.abs(recoveryLoad.averageResponseTime - normalLoad.averageResponseTime)
      
      expect(throughputDifference).toBeLessThan(normalLoad.requestsPerSecond * 0.25) // Within 25%
      expect(responseTimeDifference).toBeLessThan(normalLoad.averageResponseTime * 0.3) // Within 30%
      expect(recoveryLoad.errorRate).toBeLessThanOrEqual(normalLoad.errorRate + 2) // Error rate shouldn't be much worse
      
      console.log(`   🔄 Recovery throughput: ${recoveryLoad.requestsPerSecond.toFixed(2)} req/s (${((recoveryLoad.requestsPerSecond / normalLoad.requestsPerSecond - 1) * 100).toFixed(1)}% change)`)
    }, 180000)
  })
  
  describe('Resource Utilization Tests', () => {
    it('should efficiently utilize system resources', async () => {
      const scenario = loadTestScenarios[2] // High load scenario
      const metrics = await loadTestRunner.runLoadTest(scenario)
      
      // Memory efficiency
      const memoryEfficiency = metrics.successfulRequests / (metrics.memoryUsage.peak / 1024 / 1024) // requests per MB
      expect(memoryEfficiency).toBeGreaterThan(0.1) // At least 0.1 requests per MB
      
      // CPU efficiency (simulated)
      const cpuEfficiency = metrics.successfulRequests / metrics.cpuUsage.average
      expect(cpuEfficiency).toBeGreaterThan(0.1) // At least 0.1 requests per CPU unit
      
      // No significant memory leaks
      const memoryGrowthRatio = metrics.memoryUsage.final / metrics.memoryUsage.initial
      expect(memoryGrowthRatio).toBeLessThan(2.0) // Memory shouldn't double
      
      console.log(`   💾 Memory efficiency: ${memoryEfficiency.toFixed(2)} req/MB`)
      console.log(`   🖥️  CPU efficiency: ${cpuEfficiency.toFixed(2)} req/CPU unit`)
      console.log(`   📈 Memory growth: ${((memoryGrowthRatio - 1) * 100).toFixed(1)}%`)
    }, 90000)
  })
})

// Helper method for calculating standard deviation
function calculateStandardDeviation(values: number[]): number {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const squaredDifferences = values.map(value => Math.pow(value - mean, 2))
  const variance = squaredDifferences.reduce((sum, value) => sum + value, 0) / values.length
  return Math.sqrt(variance)
}

// Export for use in other tests
export {
  LoadTestRunner,
  loadTestScenarios,
  type LoadTestMetrics,
  type LoadTestScenario
}