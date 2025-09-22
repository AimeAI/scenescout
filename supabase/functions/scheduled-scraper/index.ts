import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ScrapingJob {
  id: string
  type: 'city' | 'venue'
  target: string
  priority: number
  last_run?: string
  error_count: number
  status: 'pending' | 'running' | 'completed' | 'failed'
}

interface ScrapingConfig {
  max_concurrent_jobs: number
  retry_attempts: number
  timeout_minutes: number
  rate_limit_delay: number
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const DEFAULT_CONFIG: ScrapingConfig = {
  max_concurrent_jobs: 5,
  retry_attempts: 3,
  timeout_minutes: 15,
  rate_limit_delay: 2000
}

class ScheduledScraper {
  private config: ScrapingConfig
  private runningJobs = new Set<string>()

  constructor(config: ScrapingConfig = DEFAULT_CONFIG) {
    this.config = config
  }

  async processScrapingQueue(): Promise<{
    success: boolean
    processed: number
    errors: string[]
    duration: number
  }> {
    const startTime = Date.now()
    const errors: string[] = []
    let processed = 0

    try {
      // Get pending scraping jobs
      const jobs = await this.getPendingJobs()
      console.log(`Found ${jobs.length} pending scraping jobs`)

      // Process jobs in batches
      const batches = this.createJobBatches(jobs)
      
      for (const batch of batches) {
        await this.processBatch(batch)
        processed += batch.length
        
        // Rate limiting between batches
        if (batches.indexOf(batch) < batches.length - 1) {
          await this.delay(this.config.rate_limit_delay)
        }
      }

      // Cleanup old completed jobs
      await this.cleanupOldJobs()

      // Update system metrics
      await this.updateMetrics(processed, errors.length)

    } catch (error) {
      console.error('Scraping queue processing error:', error)
      errors.push(`Queue processing error: ${error.message}`)
    }

    const duration = Date.now() - startTime
    return {
      success: errors.length === 0,
      processed,
      errors,
      duration
    }
  }

  private async getPendingJobs(): Promise<ScrapingJob[]> {
    const { data, error } = await supabase
      .from('scraping_jobs')
      .select('*')
      .in('status', ['pending', 'failed'])
      .lt('error_count', this.config.retry_attempts)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(50)

    if (error) {
      throw new Error(`Failed to get pending jobs: ${error.message}`)
    }

    return data || []
  }

  private createJobBatches(jobs: ScrapingJob[]): ScrapingJob[][] {
    const batches: ScrapingJob[][] = []
    const batchSize = this.config.max_concurrent_jobs
    
    for (let i = 0; i < jobs.length; i += batchSize) {
      batches.push(jobs.slice(i, i + batchSize))
    }
    
    return batches
  }

  private async processBatch(jobs: ScrapingJob[]): Promise<void> {
    const promises = jobs.map(job => this.processJob(job))
    await Promise.allSettled(promises)
  }

  private async processJob(job: ScrapingJob): Promise<void> {
    if (this.runningJobs.has(job.id)) {
      console.log(`Job ${job.id} already running, skipping`)
      return
    }

    this.runningJobs.add(job.id)
    
    try {
      // Update job status to running
      await this.updateJobStatus(job.id, 'running')
      
      // Call appropriate scraper function
      const result = await this.callScraperFunction(job)
      
      if (result.success) {
        await this.updateJobStatus(job.id, 'completed')
        console.log(`Job ${job.id} completed successfully`)
      } else {
        await this.handleJobError(job, result.error || 'Unknown error')
      }
      
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error)
      await this.handleJobError(job, error.message)
    } finally {
      this.runningJobs.delete(job.id)
    }
  }

  private async callScraperFunction(job: ScrapingJob): Promise<{
    success: boolean
    error?: string
    data?: any
  }> {
    const functionName = job.type === 'city' ? 'city-scraper' : 'venue-scraper'
    const functionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/${functionName}`
    
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      controller.abort()
    }, this.config.timeout_minutes * 60 * 1000)

    try {
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          target: job.target,
          job_id: job.id
        }),
        signal: controller.signal
      })

      clearTimeout(timeout)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      return result
      
    } catch (error) {
      clearTimeout(timeout)
      
      if (error.name === 'AbortError') {
        throw new Error(`Job timeout after ${this.config.timeout_minutes} minutes`)
      }
      
      throw error
    }
  }

  private async updateJobStatus(jobId: string, status: string): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'running') {
      updateData.started_at = new Date().toISOString()
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('scraping_jobs')
      .update(updateData)
      .eq('id', jobId)

    if (error) {
      console.error(`Failed to update job ${jobId} status:`, error)
    }
  }

  private async handleJobError(job: ScrapingJob, errorMessage: string): Promise<void> {
    const errorCount = job.error_count + 1
    const status = errorCount >= this.config.retry_attempts ? 'failed' : 'pending'
    
    const { error } = await supabase
      .from('scraping_jobs')
      .update({
        status,
        error_count: errorCount,
        error_message: errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id)

    if (error) {
      console.error(`Failed to update job error:`, error)
    }
  }

  private async cleanupOldJobs(): Promise<void> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 7) // Keep jobs for 7 days

    const { error } = await supabase
      .from('scraping_jobs')
      .delete()
      .eq('status', 'completed')
      .lt('completed_at', cutoffDate.toISOString())

    if (error) {
      console.error('Failed to cleanup old jobs:', error)
    }
  }

  private async updateMetrics(processed: number, errors: number): Promise<void> {
    const { error } = await supabase
      .from('scraping_metrics')
      .insert({
        timestamp: new Date().toISOString(),
        jobs_processed: processed,
        jobs_failed: errors,
        active_scrapers: this.runningJobs.size
      })

    if (error) {
      console.error('Failed to update metrics:', error)
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting scheduled scraping process...')
    
    const scraper = new ScheduledScraper()
    const result = await scraper.processScrapingQueue()
    
    console.log('Scraping process completed:', result)
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Scraping process completed',
        ...result
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Scheduled scraper error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
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