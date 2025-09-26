import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface HealthCheckResult {
  component: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime?: number
  error?: string
  metadata?: any
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  services: HealthCheckResult[]
  metrics: {
    totalChecks: number
    healthyServices: number
    degradedServices: number
    unhealthyServices: number
    averageResponseTime: number
  }
  alerts: string[]
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

class HealthChecker {
  private timeout = 10000 // 10 seconds
  private alerts: string[] = []

  async performHealthChecks(): Promise<SystemHealth> {
    console.log('🏥 Starting system health checks...')
    
    const services: HealthCheckResult[] = []
    
    // Check database connectivity
    services.push(await this.checkDatabase())
    
    // Check external APIs
    services.push(await this.checkEventbriteAPI())
    services.push(await this.checkTicketmasterAPI()) 
    services.push(await this.checkYelpAPI())
    // Google Places API check removed
    
    // Check Edge Functions
    services.push(await this.checkEdgeFunctions())
    
    // Check scraping jobs health
    services.push(await this.checkScrapingJobs())
    
    // Check storage and backups
    services.push(await this.checkStorage())
    
    // Calculate overall metrics
    const metrics = this.calculateMetrics(services)
    const overall = this.determineOverallHealth(services)
    
    const health: SystemHealth = {
      overall,
      timestamp: new Date().toISOString(),
      services,
      metrics,
      alerts: this.alerts
    }
    
    // Store health check results
    await this.storeHealthResults(health)
    
    // Trigger alerts if necessary
    await this.processAlerts(health)
    
    return health
  }

  private async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    
    try {
      // Test basic connectivity
      const { data, error } = await supabase
        .from('events')
        .select('count')
        .limit(1)
        .single()
      
      const responseTime = Date.now() - startTime
      
      if (error) {
        return {
          component: 'database',
          status: 'unhealthy',
          responseTime,
          error: error.message
        }
      }
      
      // Check response time
      const status = responseTime > 5000 ? 'degraded' : 'healthy'
      
      return {
        component: 'database',
        status,
        responseTime,
        metadata: {
          connectionPool: 'active',
          queryPerformance: responseTime < 1000 ? 'excellent' : responseTime < 3000 ? 'good' : 'slow'
        }
      }
      
    } catch (error) {
      return {
        component: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message
      }
    }
  }

  private async checkEventbriteAPI(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    
    try {
      const apiKey = Deno.env.get('EVENTBRITE_PRIVATE_TOKEN')
      if (!apiKey) {
        return {
          component: 'eventbrite-api',
          status: 'unhealthy',
          error: 'API key not configured'
        }
      }
      
      const response = await fetch(
        'https://www.eventbriteapi.com/v3/users/me/',
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          },
          signal: AbortSignal.timeout(this.timeout)
        }
      )
      
      const responseTime = Date.now() - startTime
      
      if (!response.ok) {
        if (response.status === 429) {
          return {
            component: 'eventbrite-api',
            status: 'degraded',
            responseTime,
            error: 'Rate limit exceeded',
            metadata: { rateLimitHit: true }
          }
        }
        
        return {
          component: 'eventbrite-api',
          status: 'unhealthy',
          responseTime,
          error: `HTTP ${response.status}`
        }
      }
      
      return {
        component: 'eventbrite-api',
        status: 'healthy',
        responseTime,
        metadata: {
          apiVersion: 'v3',
          rateLimit: response.headers.get('x-ratelimit-remaining')
        }
      }
      
    } catch (error) {
      return {
        component: 'eventbrite-api',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message
      }
    }
  }

  private async checkTicketmasterAPI(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    
    try {
      const apiKey = Deno.env.get('TICKETMASTER_API_KEY')
      if (!apiKey) {
        return {
          component: 'ticketmaster-api',
          status: 'unhealthy',
          error: 'API key not configured'
        }
      }
      
      const response = await fetch(
        `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&size=1`,
        {
          signal: AbortSignal.timeout(this.timeout)
        }
      )
      
      const responseTime = Date.now() - startTime
      
      if (!response.ok) {
        return {
          component: 'ticketmaster-api',
          status: response.status === 429 ? 'degraded' : 'unhealthy',
          responseTime,
          error: `HTTP ${response.status}`
        }
      }
      
      return {
        component: 'ticketmaster-api',
        status: 'healthy',
        responseTime,
        metadata: {
          apiVersion: 'v2'
        }
      }
      
    } catch (error) {
      return {
        component: 'ticketmaster-api',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message
      }
    }
  }

  private async checkYelpAPI(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    
    try {
      const apiKey = Deno.env.get('YELP_API_KEY')
      if (!apiKey) {
        return {
          component: 'yelp-api',
          status: 'unhealthy',
          error: 'API key not configured'
        }
      }
      
      const response = await fetch(
        'https://api.yelp.com/v3/businesses/search?term=restaurant&location=san-francisco&limit=1',
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          },
          signal: AbortSignal.timeout(this.timeout)
        }
      )
      
      const responseTime = Date.now() - startTime
      
      if (!response.ok) {
        return {
          component: 'yelp-api',
          status: response.status === 429 ? 'degraded' : 'unhealthy',
          responseTime,
          error: `HTTP ${response.status}`
        }
      }
      
      return {
        component: 'yelp-api',
        status: 'healthy',
        responseTime,
        metadata: {
          apiVersion: 'v3'
        }
      }
      
    } catch (error) {
      return {
        component: 'yelp-api',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message
      }
    }
  }


  private async checkEdgeFunctions(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    
    try {
      // Test a simple edge function
      const functionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/health-check`
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify({ test: true }),
        signal: AbortSignal.timeout(this.timeout)
      })
      
      const responseTime = Date.now() - startTime
      
      if (!response.ok) {
        return {
          component: 'edge-functions',
          status: 'unhealthy',
          responseTime,
          error: `HTTP ${response.status}`
        }
      }
      
      return {
        component: 'edge-functions',
        status: 'healthy',
        responseTime,
        metadata: {
          coldStart: responseTime > 3000
        }
      }
      
    } catch (error) {
      return {
        component: 'edge-functions',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message
      }
    }
  }

  private async checkScrapingJobs(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    
    try {
      // Check recent scraping job performance
      const { data: recentJobs, error } = await supabase
        .from('scraping_jobs')
        .select('status, created_at, completed_at, error_count')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('created_at', { ascending: false })
      
      if (error) {
        return {
          component: 'scraping-jobs',
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          error: error.message
        }
      }
      
      const totalJobs = recentJobs?.length || 0
      const failedJobs = recentJobs?.filter(job => job.status === 'failed').length || 0
      const failureRate = totalJobs > 0 ? failedJobs / totalJobs : 0
      
      let status: 'healthy' | 'degraded' | 'unhealthy'
      if (failureRate > 0.2) {
        status = 'unhealthy'
        this.alerts.push(`High scraping job failure rate: ${(failureRate * 100).toFixed(1)}%`)
      } else if (failureRate > 0.1) {
        status = 'degraded'
        this.alerts.push(`Elevated scraping job failure rate: ${(failureRate * 100).toFixed(1)}%`)
      } else {
        status = 'healthy'
      }
      
      return {
        component: 'scraping-jobs',
        status,
        responseTime: Date.now() - startTime,
        metadata: {
          totalJobs24h: totalJobs,
          failedJobs24h: failedJobs,
          failureRate: failureRate,
          successRate: 1 - failureRate
        }
      }
      
    } catch (error) {
      return {
        component: 'scraping-jobs',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message
      }
    }
  }

  private async checkStorage(): Promise<HealthCheckResult> {
    const startTime = Date.now()
    
    try {
      // Check storage bucket access
      const { data: buckets, error } = await supabase.storage.listBuckets()
      
      if (error) {
        return {
          component: 'storage',
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          error: error.message
        }
      }
      
      return {
        component: 'storage',
        status: 'healthy',
        responseTime: Date.now() - startTime,
        metadata: {
          buckets: buckets?.length || 0
        }
      }
      
    } catch (error) {
      return {
        component: 'storage',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message
      }
    }
  }

  private calculateMetrics(services: HealthCheckResult[]): SystemHealth['metrics'] {
    const totalChecks = services.length
    const healthyServices = services.filter(s => s.status === 'healthy').length
    const degradedServices = services.filter(s => s.status === 'degraded').length
    const unhealthyServices = services.filter(s => s.status === 'unhealthy').length
    
    const responseTimes = services
      .filter(s => s.responseTime !== undefined)
      .map(s => s.responseTime!)
    
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0
    
    return {
      totalChecks,
      healthyServices,
      degradedServices,
      unhealthyServices,
      averageResponseTime
    }
  }

  private determineOverallHealth(services: HealthCheckResult[]): 'healthy' | 'degraded' | 'unhealthy' {
    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length
    const degradedCount = services.filter(s => s.status === 'degraded').length
    
    // If any critical service is unhealthy, overall is unhealthy
    const criticalServices = ['database', 'edge-functions']
    const criticalUnhealthy = services.some(s => 
      criticalServices.includes(s.component) && s.status === 'unhealthy'
    )
    
    if (criticalUnhealthy || unhealthyCount > 2) {
      return 'unhealthy'
    }
    
    if (unhealthyCount > 0 || degradedCount > 1) {
      return 'degraded'
    }
    
    return 'healthy'
  }

  private async storeHealthResults(health: SystemHealth): Promise<void> {
    try {
      const { error } = await supabase
        .from('health_check_results')
        .insert({
          status: health.overall,
          timestamp: health.timestamp,
          services: health.services,
          metrics: health.metrics,
          alerts: health.alerts
        })
      
      if (error) {
        console.error('Failed to store health results:', error)
      }
      
      // Update system health table
      for (const service of health.services) {
        await supabase
          .from('system_health')
          .upsert({
            component: service.component,
            status: service.status,
            last_check: health.timestamp,
            metrics: service.metadata || {}
          })
      }
      
    } catch (error) {
      console.error('Error storing health results:', error)
    }
  }

  private async processAlerts(health: SystemHealth): Promise<void> {
    if (health.overall === 'unhealthy' || health.alerts.length > 0) {
      console.log('🚨 Health check alerts triggered')
      
      // Store alert in database
      await supabase
        .from('system_alerts')
        .insert({
          type: 'health_check',
          severity: health.overall === 'unhealthy' ? 'critical' : 'warning',
          message: health.alerts.join('; ') || `System status: ${health.overall}`,
          metadata: {
            healthCheck: health,
            timestamp: health.timestamp
          }
        })
      
      // TODO: Send notifications (email, Slack, etc.)
      // This would integrate with your notification system
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🏥 Health check initiated...')
    
    const checker = new HealthChecker()
    const health = await checker.performHealthChecks()
    
    console.log(`✅ Health check completed: ${health.overall}`)
    
    return new Response(
      JSON.stringify(health),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: health.overall === 'healthy' ? 200 : health.overall === 'degraded' ? 206 : 503
      }
    )
    
  } catch (error) {
    console.error('❌ Health check error:', error)
    
    return new Response(
      JSON.stringify({
        overall: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})