/**
 * Tests for health check endpoints and API monitoring
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals'

describe('API Health Checks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Main Health Endpoint', () => {
    it('should return healthy status when all services are operational', async () => {
      const response = await fetch('/api/health')
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        services: expect.objectContaining({
          database: 'healthy',
          eventbrite: 'healthy',
          ticketmaster: 'healthy',
        }),
      })
    })

    it('should include response time metrics', async () => {
      const start = Date.now()
      const response = await fetch('/api/health')
      const end = Date.now()

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.responseTime).toBeDefined()
      expect(data.responseTime).toBeLessThan(end - start + 100) // Allow some margin
    })
  })

  describe('Service-Specific Health Checks', () => {
    it('should check Supabase database connectivity', async () => {
      const response = await fetch('/api/health/database')
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toMatchObject({
        service: 'database',
        status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        details: expect.any(Object),
      })
    })

    it('should validate API key configurations', async () => {
      const response = await fetch('/api/health/apis')
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.apis).toMatchObject({
        eventbrite: expect.objectContaining({
          configured: expect.any(Boolean),
          status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        }),
        ticketmaster: expect.objectContaining({
          configured: expect.any(Boolean),
          status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        }),
        google: expect.objectContaining({
          configured: expect.any(Boolean),
          status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        }),
        yelp: expect.objectContaining({
          configured: expect.any(Boolean),
          status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        }),
      })
    })
  })

  describe('Performance Metrics', () => {
    it('should track ingestion performance', async () => {
      const response = await fetch('/api/health/ingestion')
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toMatchObject({
        lastIngestion: expect.any(String),
        eventsIngested24h: expect.any(Number),
        averageProcessingTime: expect.any(Number),
        errorRate: expect.any(Number),
      })
    })

    it('should monitor database performance', async () => {
      const response = await fetch('/api/health/database/performance')
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toMatchObject({
        queryLatency: expect.any(Number),
        connectionCount: expect.any(Number),
        tableStats: expect.any(Object),
      })
    })
  })

  describe('Rate Limit Monitoring', () => {
    it('should track API rate limit status', async () => {
      const response = await fetch('/api/health/rate-limits')
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.rateLimits).toMatchObject({
        eventbrite: expect.objectContaining({
          remaining: expect.any(Number),
          resetTime: expect.any(String),
          limit: expect.any(Number),
        }),
        ticketmaster: expect.objectContaining({
          remaining: expect.any(Number),
          resetTime: expect.any(String),
          limit: expect.any(Number),
        }),
      })
    })

    it('should alert when approaching rate limits', async () => {
      // Mock a scenario where rate limits are low
      const response = await fetch('/api/health/rate-limits')
      const data = await response.json()

      // Check if alerts are triggered for low rate limits
      Object.values(data.rateLimits).forEach((limit: any) => {
        if (limit.remaining < limit.limit * 0.1) {
          expect(data.alerts).toContainEqual(
            expect.objectContaining({
              type: 'rate_limit_warning',
              service: expect.any(String),
            })
          )
        }
      })
    })
  })

  describe('Error Tracking', () => {
    it('should log and track API errors', async () => {
      const response = await fetch('/api/health/errors')
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data).toMatchObject({
        errorCount24h: expect.any(Number),
        criticalErrors: expect.any(Array),
        errorsByService: expect.any(Object),
      })
    })

    it('should categorize errors by severity', async () => {
      const response = await fetch('/api/health/errors')
      const data = await response.json()

      expect(data.errorsBySeverity).toMatchObject({
        critical: expect.any(Number),
        warning: expect.any(Number),
        info: expect.any(Number),
      })
    })
  })

  describe('Alerting System', () => {
    it('should generate alerts for service degradation', async () => {
      // This would typically be tested with a mock that simulates service issues
      const mockDegradedService = {
        status: 'degraded',
        responseTime: 5000, // Slow response
        errorRate: 0.15, // High error rate
      }

      const alerts = generateHealthAlerts(mockDegradedService)
      
      expect(alerts).toContainEqual(
        expect.objectContaining({
          type: 'performance_degradation',
          severity: 'warning',
          message: expect.stringContaining('slow response'),
        })
      )

      expect(alerts).toContainEqual(
        expect.objectContaining({
          type: 'high_error_rate',
          severity: 'critical',
          message: expect.stringContaining('error rate'),
        })
      )
    })

    it('should include recommended actions in alerts', async () => {
      const mockFailedService = {
        status: 'unhealthy',
        lastSuccess: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      }

      const alerts = generateHealthAlerts(mockFailedService)
      
      expect(alerts[0]).toMatchObject({
        type: 'service_down',
        severity: 'critical',
        recommendedActions: expect.arrayContaining([
          expect.stringContaining('Check API key'),
          expect.stringContaining('Verify network'),
        ]),
      })
    })
  })
})

// Helper function to generate health alerts based on service status
function generateHealthAlerts(serviceStatus: any): any[] {
  const alerts = []

  if (serviceStatus.responseTime > 3000) {
    alerts.push({
      type: 'performance_degradation',
      severity: 'warning',
      message: `Service experiencing slow response times: ${serviceStatus.responseTime}ms`,
    })
  }

  if (serviceStatus.errorRate > 0.1) {
    alerts.push({
      type: 'high_error_rate',
      severity: 'critical',
      message: `High error rate detected: ${(serviceStatus.errorRate * 100).toFixed(1)}%`,
    })
  }

  if (serviceStatus.status === 'unhealthy') {
    alerts.push({
      type: 'service_down',
      severity: 'critical',
      message: 'Service is currently unavailable',
      recommendedActions: [
        'Check API key configuration',
        'Verify network connectivity',
        'Review service status page',
        'Check rate limit status',
      ],
    })
  }

  return alerts
}