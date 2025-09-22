#!/usr/bin/env deno run --allow-net --allow-env

/**
 * SceneScout Job Scheduler
 * Comprehensive scheduling system for all scraping and maintenance jobs
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface SchedulingConfig {
  cityTrafficLevels: Record<string, 'high' | 'medium' | 'low'>
  schedules: {
    highTraffic: string    // Every 30 minutes
    mediumTraffic: string  // Every 2 hours  
    lowTraffic: string     // Daily
    venueSpecific: string  // Every 6 hours
    healthCheck: string    // Every 5 minutes
    dataCleanup: string    // Daily at 2 AM
    analytics: string      // Every hour
    backup: string         // Daily at 3 AM
    webhooks: string       // Continuous processing
  }
  jobPriorities: Record<string, number>
  rateLimits: Record<string, { requests: number; window: number }>
}

interface JobDefinition {
  id: string
  type: 'city' | 'venue' | 'health' | 'cleanup' | 'backup' | 'analytics' | 'webhook'
  name: string
  description: string
  schedule: string
  priority: number
  enabled: boolean
  maxRetries: number
  timeoutMinutes: number
  dependencies?: string[]
  conditions?: {
    skipIfNoNewData?: boolean
    minimumInterval?: number
    userActivityThreshold?: number
  }
}

class JobScheduler {
  private supabase: any
  private config: SchedulingConfig

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    this.config = this.getDefaultConfig()
  }

  private getDefaultConfig(): SchedulingConfig {
    return {
      cityTrafficLevels: {
        'new-york': 'high',
        'los-angeles': 'high', 
        'chicago': 'high',
        'san-francisco': 'high',
        'boston': 'high',
        'seattle': 'medium',
        'denver': 'medium',
        'austin': 'medium',
        'philadelphia': 'medium',
        'atlanta': 'medium',
        'detroit': 'low',
        'cleveland': 'low',
        'kansas-city': 'low'
      },
      schedules: {
        highTraffic: '*/30 * * * *',    // Every 30 minutes
        mediumTraffic: '0 */2 * * *',   // Every 2 hours
        lowTraffic: '0 8 * * *',        // Daily at 8 AM
        venueSpecific: '0 */6 * * *',   // Every 6 hours
        healthCheck: '*/5 * * * *',     // Every 5 minutes
        dataCleanup: '0 2 * * *',       // Daily at 2 AM
        analytics: '0 * * * *',         // Every hour
        backup: '0 3 * * *',            // Daily at 3 AM
        webhooks: '* * * * *'           // Every minute (continuous)
      },
      jobPriorities: {
        health: 10,
        webhook: 9,
        'high-traffic-city': 8,
        'medium-traffic-city': 6,
        venue: 5,
        'low-traffic-city': 4,
        analytics: 3,
        cleanup: 2,
        backup: 1
      },
      rateLimits: {
        eventbrite: { requests: 1000, window: 3600 },
        ticketmaster: { requests: 5000, window: 86400 },
        facebook: { requests: 200, window: 3600 },
        yelp: { requests: 5000, window: 86400 },
        google: { requests: 100000, window: 86400 }
      }
    }
  }

  async initializeScheduler(): Promise<void> {
    console.log('🚀 Initializing SceneScout Job Scheduler...')
    
    // Create job definitions
    const jobs = await this.createJobDefinitions()
    
    // Insert jobs into database
    await this.insertJobDefinitions(jobs)
    
    // Set up Supabase cron schedules
    await this.setupSupabaseCronJobs(jobs)
    
    // Initialize monitoring
    await this.initializeMonitoring()
    
    console.log('✅ Job Scheduler initialized successfully')
  }

  private async createJobDefinitions(): Promise<JobDefinition[]> {
    const jobs: JobDefinition[] = []

    // Health check jobs
    jobs.push({
      id: 'health-check',
      type: 'health',
      name: 'System Health Check',
      description: 'Monitor system health and API status',
      schedule: this.config.schedules.healthCheck,
      priority: this.config.jobPriorities.health,
      enabled: true,
      maxRetries: 1,
      timeoutMinutes: 2
    })

    // City scraping jobs based on traffic levels
    for (const [city, traffic] of Object.entries(this.config.cityTrafficLevels)) {
      let schedule: string
      let priority: number
      
      switch (traffic) {
        case 'high':
          schedule = this.config.schedules.highTraffic
          priority = this.config.jobPriorities['high-traffic-city']
          break
        case 'medium':
          schedule = this.config.schedules.mediumTraffic
          priority = this.config.jobPriorities['medium-traffic-city']
          break
        case 'low':
          schedule = this.config.schedules.lowTraffic
          priority = this.config.jobPriorities['low-traffic-city']
          break
      }

      jobs.push({
        id: `city-scraper-${city}`,
        type: 'city',
        name: `City Scraper - ${city}`,
        description: `Scrape events for ${city} (${traffic} traffic)`,
        schedule: schedule!,
        priority: priority!,
        enabled: true,
        maxRetries: 3,
        timeoutMinutes: 15,
        conditions: {
          skipIfNoNewData: false,
          minimumInterval: traffic === 'high' ? 25 : traffic === 'medium' ? 115 : 1440
        }
      })
    }

    // Venue-specific scraping jobs
    jobs.push({
      id: 'venue-scraper',
      type: 'venue',
      name: 'Venue Data Scraper',
      description: 'Update venue information and details',
      schedule: this.config.schedules.venueSpecific,
      priority: this.config.jobPriorities.venue,
      enabled: true,
      maxRetries: 3,
      timeoutMinutes: 30,
      dependencies: ['health-check']
    })

    // Webhook processing
    jobs.push({
      id: 'webhook-processor',
      type: 'webhook',
      name: 'Webhook Processor',
      description: 'Process real-time webhook events',
      schedule: this.config.schedules.webhooks,
      priority: this.config.jobPriorities.webhook,
      enabled: true,
      maxRetries: 2,
      timeoutMinutes: 5
    })

    // Analytics jobs
    jobs.push({
      id: 'performance-analytics',
      type: 'analytics',
      name: 'Performance Analytics',
      description: 'Collect and analyze system performance metrics',
      schedule: this.config.schedules.analytics,
      priority: this.config.jobPriorities.analytics,
      enabled: true,
      maxRetries: 2,
      timeoutMinutes: 10
    })

    // Data cleanup jobs
    jobs.push({
      id: 'data-cleanup',
      type: 'cleanup',
      name: 'Data Cleanup',
      description: 'Clean old logs, expired jobs, and orphaned data',
      schedule: this.config.schedules.dataCleanup,
      priority: this.config.jobPriorities.cleanup,
      enabled: true,
      maxRetries: 2,
      timeoutMinutes: 60
    })

    // Backup jobs
    jobs.push({
      id: 'backup-and-archive',
      type: 'backup',
      name: 'Backup and Archive',
      description: 'Backup critical data and archive old records',
      schedule: this.config.schedules.backup,
      priority: this.config.jobPriorities.backup,
      enabled: true,
      maxRetries: 1,
      timeoutMinutes: 120
    })

    return jobs
  }

  private async insertJobDefinitions(jobs: JobDefinition[]): Promise<void> {
    console.log('📝 Inserting job definitions...')

    // Create job_definitions table if it doesn't exist
    await this.supabase.rpc('create_job_definitions_table')

    for (const job of jobs) {
      const { error } = await this.supabase
        .from('job_definitions')
        .upsert({
          id: job.id,
          type: job.type,
          name: job.name,
          description: job.description,
          schedule: job.schedule,
          priority: job.priority,
          enabled: job.enabled,
          max_retries: job.maxRetries,
          timeout_minutes: job.timeoutMinutes,
          dependencies: job.dependencies || [],
          conditions: job.conditions || {},
          updated_at: new Date().toISOString()
        })

      if (error) {
        console.error(`Failed to insert job ${job.id}:`, error)
      }
    }

    console.log(`✅ Inserted ${jobs.length} job definitions`)
  }

  private async setupSupabaseCronJobs(jobs: JobDefinition[]): Promise<void> {
    console.log('⏰ Setting up Supabase cron schedules...')

    const cronJobs = [
      // Main scheduled scraper - every 30 minutes
      {
        name: 'scheduled-scraper',
        schedule: '*/30 * * * *',
        function: 'scheduled-scraper'
      },
      // Health checks - every 5 minutes
      {
        name: 'health-check',
        schedule: '*/5 * * * *',
        function: 'health-check'
      },
      // Webhook processing - every minute
      {
        name: 'webhook-handler',
        schedule: '* * * * *',
        function: 'webhook-handler'
      },
      // Data cleanup - daily at 2 AM
      {
        name: 'data-cleanup',
        schedule: '0 2 * * *',
        function: 'data-cleanup'
      },
      // Performance analytics - every hour
      {
        name: 'performance-analytics',
        schedule: '0 * * * *',
        function: 'performance-analytics'
      }
    ]

    for (const cronJob of cronJobs) {
      await this.supabase.rpc('schedule_function', {
        function_name: cronJob.function,
        cron_schedule: cronJob.schedule,
        enabled: true
      })
    }

    console.log(`✅ Set up ${cronJobs.length} Supabase cron schedules`)
  }

  private async initializeMonitoring(): Promise<void> {
    console.log('📊 Initializing job monitoring...')

    // Create monitoring tables
    await this.supabase.rpc('create_monitoring_tables')

    // Insert initial monitoring configuration
    await this.supabase
      .from('monitoring_config')
      .upsert({
        component: 'job-scheduler',
        config: {
          alertThresholds: {
            successRate: 0.95,
            executionTimeIncrease: 0.5,
            consecutiveFailures: 2,
            errorRate: 0.05
          },
          healthChecks: {
            interval: 300, // 5 minutes
            timeout: 30,
            retries: 3
          },
          notifications: {
            email: true,
            slack: true,
            dashboard: true
          }
        },
        updated_at: new Date().toISOString()
      })

    console.log('✅ Monitoring initialized')
  }

  async getJobStatus(): Promise<any> {
    const { data: jobs, error } = await this.supabase
      .from('scraping_jobs')
      .select(`
        *,
        job_definitions!inner(name, description, schedule)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      throw new Error(`Failed to get job status: ${error.message}`)
    }

    return {
      totalJobs: jobs.length,
      running: jobs.filter(j => j.status === 'running').length,
      pending: jobs.filter(j => j.status === 'pending').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      recentJobs: jobs.slice(0, 10)
    }
  }

  async triggerManualJob(jobId: string, target?: string): Promise<any> {
    console.log(`🔄 Manually triggering job: ${jobId}`)

    const { data: jobDef, error: defError } = await this.supabase
      .from('job_definitions')
      .select('*')
      .eq('id', jobId)
      .single()

    if (defError || !jobDef) {
      throw new Error(`Job definition not found: ${jobId}`)
    }

    const { data: job, error: insertError } = await this.supabase
      .from('scraping_jobs')
      .insert({
        type: jobDef.type,
        target: target || jobId,
        priority: jobDef.priority + 2, // Higher priority for manual jobs
        status: 'pending',
        scheduled_for: new Date().toISOString(),
        manual_trigger: true
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(`Failed to create manual job: ${insertError.message}`)
    }

    return job
  }

  async adjustSchedule(jobId: string, newSchedule: string): Promise<void> {
    console.log(`⏰ Adjusting schedule for job ${jobId} to: ${newSchedule}`)

    const { error } = await this.supabase
      .from('job_definitions')
      .update({
        schedule: newSchedule,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (error) {
      throw new Error(`Failed to update schedule: ${error.message}`)
    }
  }

  async pauseJob(jobId: string): Promise<void> {
    const { error } = await this.supabase
      .from('job_definitions')
      .update({
        enabled: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (error) {
      throw new Error(`Failed to pause job: ${error.message}`)
    }
  }

  async resumeJob(jobId: string): Promise<void> {
    const { error } = await this.supabase
      .from('job_definitions')
      .update({
        enabled: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (error) {
      throw new Error(`Failed to resume job: ${error.message}`)
    }
  }

  async getHealthMetrics(): Promise<any> {
    const { data: metrics, error } = await this.supabase
      .from('health_check_results')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(10)

    if (error) {
      throw new Error(`Failed to get health metrics: ${error.message}`)
    }

    return metrics
  }

  async optimizeSchedules(): Promise<void> {
    console.log('🔧 Optimizing job schedules based on usage patterns...')

    // Analyze user activity patterns
    const { data: userActivity } = await this.supabase.rpc('get_user_activity_patterns')
    
    // Analyze system performance
    const { data: performance } = await this.supabase.rpc('get_system_performance_metrics')

    // Adjust city traffic levels based on recent activity
    if (userActivity) {
      for (const activity of userActivity) {
        const currentLevel = this.config.cityTrafficLevels[activity.city]
        let newLevel: 'high' | 'medium' | 'low'

        if (activity.daily_active_users > 1000) {
          newLevel = 'high'
        } else if (activity.daily_active_users > 100) {
          newLevel = 'medium'
        } else {
          newLevel = 'low'
        }

        if (currentLevel !== newLevel) {
          console.log(`📈 Adjusting ${activity.city} from ${currentLevel} to ${newLevel} traffic`)
          this.config.cityTrafficLevels[activity.city] = newLevel
          
          // Update job schedule
          const jobId = `city-scraper-${activity.city}`
          const newSchedule = this.config.schedules[`${newLevel}Traffic`]
          await this.adjustSchedule(jobId, newSchedule)
        }
      }
    }

    console.log('✅ Schedule optimization complete')
  }
}

// CLI interface
if (import.meta.main) {
  const scheduler = new JobScheduler()
  const command = Deno.args[0]

  try {
    switch (command) {
      case 'init':
        await scheduler.initializeScheduler()
        break
      
      case 'status':
        const status = await scheduler.getJobStatus()
        console.log('📊 Job Status:', JSON.stringify(status, null, 2))
        break
      
      case 'trigger':
        const jobId = Deno.args[1]
        const target = Deno.args[2]
        if (!jobId) {
          console.error('❌ Usage: trigger <job-id> [target]')
          Deno.exit(1)
        }
        const job = await scheduler.triggerManualJob(jobId, target)
        console.log('✅ Manual job triggered:', job.id)
        break
      
      case 'pause':
        const pauseJobId = Deno.args[1]
        if (!pauseJobId) {
          console.error('❌ Usage: pause <job-id>')
          Deno.exit(1)
        }
        await scheduler.pauseJob(pauseJobId)
        console.log(`⏸️ Job ${pauseJobId} paused`)
        break
      
      case 'resume':
        const resumeJobId = Deno.args[1]
        if (!resumeJobId) {
          console.error('❌ Usage: resume <job-id>')
          Deno.exit(1)
        }
        await scheduler.resumeJob(resumeJobId)
        console.log(`▶️ Job ${resumeJobId} resumed`)
        break
      
      case 'optimize':
        await scheduler.optimizeSchedules()
        break
      
      case 'health':
        const health = await scheduler.getHealthMetrics()
        console.log('🏥 Health Metrics:', JSON.stringify(health, null, 2))
        break
      
      default:
        console.log(`
🤖 SceneScout Job Scheduler

Commands:
  init                    Initialize scheduler with all job definitions
  status                  Show current job status
  trigger <job-id> [target]  Manually trigger a job
  pause <job-id>         Pause a job
  resume <job-id>        Resume a paused job
  optimize               Optimize schedules based on usage patterns
  health                 Show health metrics

Examples:
  deno run job-scheduler.ts init
  deno run job-scheduler.ts trigger city-scraper-new-york
  deno run job-scheduler.ts status
        `)
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
    Deno.exit(1)
  }
}

export { JobScheduler }