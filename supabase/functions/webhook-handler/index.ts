import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface WebhookEvent {
  id: string
  type: string
  source: string
  data: any
  timestamp: string
  signature?: string
  retryCount?: number
}

interface ProcessingResult {
  success: boolean
  eventId: string
  action: string
  error?: string
  metadata?: any
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

class WebhookProcessor {
  private readonly maxRetries = 3
  private readonly rateLimits = new Map<string, { count: number; resetTime: number }>()

  async processWebhookQueue(): Promise<{
    success: boolean
    processed: number
    errors: string[]
    results: ProcessingResult[]
  }> {
    console.log('🔄 Processing webhook queue...')
    
    const results: ProcessingResult[] = []
    const errors: string[] = []
    let processed = 0

    try {
      // Get pending webhook events
      const { data: webhooks, error } = await supabase
        .from('webhook_queue')
        .select('*')
        .eq('status', 'pending')
        .lt('retry_count', this.maxRetries)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(50)

      if (error) {
        throw new Error(`Failed to fetch webhook queue: ${error.message}`)
      }

      if (!webhooks || webhooks.length === 0) {
        console.log('📭 No pending webhooks to process')
        return { success: true, processed: 0, errors: [], results: [] }
      }

      console.log(`📬 Found ${webhooks.length} pending webhooks`)

      // Process each webhook
      for (const webhook of webhooks) {
        try {
          // Check rate limits
          if (!this.checkRateLimit(webhook.source)) {
            console.log(`⏳ Rate limit exceeded for ${webhook.source}, skipping`)
            continue
          }

          // Mark as processing
          await this.updateWebhookStatus(webhook.id, 'processing')

          // Process the webhook
          const result = await this.processWebhook(webhook)
          results.push(result)

          if (result.success) {
            await this.updateWebhookStatus(webhook.id, 'completed', result.metadata)
            processed++
          } else {
            await this.handleWebhookError(webhook, result.error || 'Unknown error')
            errors.push(`Webhook ${webhook.id}: ${result.error}`)
          }

        } catch (error) {
          console.error(`Error processing webhook ${webhook.id}:`, error)
          await this.handleWebhookError(webhook, error.message)
          errors.push(`Webhook ${webhook.id}: ${error.message}`)
        }

        // Small delay between processing to avoid overwhelming services
        await this.delay(100)
      }

      // Clean up old completed webhooks
      await this.cleanupOldWebhooks()

    } catch (error) {
      console.error('Webhook queue processing error:', error)
      errors.push(`Queue processing error: ${error.message}`)
    }

    return {
      success: errors.length === 0,
      processed,
      errors,
      results
    }
  }

  private async processWebhook(webhook: any): Promise<ProcessingResult> {
    console.log(`🔍 Processing webhook: ${webhook.type} from ${webhook.source}`)

    try {
      // Verify webhook signature if present
      if (webhook.signature && !this.verifySignature(webhook)) {
        return {
          success: false,
          eventId: webhook.id,
          action: 'verify_signature',
          error: 'Invalid webhook signature'
        }
      }

      // Route to appropriate handler based on type and source
      switch (webhook.source) {
        case 'eventbrite':
          return await this.processEventbriteWebhook(webhook)
        
        case 'ticketmaster':
          return await this.processTicketmasterWebhook(webhook)
        
        case 'facebook':
          return await this.processFacebookWebhook(webhook)
        
        case 'yelp':
          return await this.processYelpWebhook(webhook)
        
        case 'internal':
          return await this.processInternalWebhook(webhook)
        
        default:
          return {
            success: false,
            eventId: webhook.id,
            action: 'route_webhook',
            error: `Unknown webhook source: ${webhook.source}`
          }
      }

    } catch (error) {
      return {
        success: false,
        eventId: webhook.id,
        action: 'process_webhook',
        error: error.message
      }
    }
  }

  private async processEventbriteWebhook(webhook: any): Promise<ProcessingResult> {
    const { type, data } = webhook.payload

    switch (type) {
      case 'event.published':
      case 'event.updated':
        return await this.handleEventUpdate(webhook, data)
      
      case 'event.unpublished':
        return await this.handleEventDeletion(webhook, data)
      
      case 'attendee.updated':
        return await this.handleAttendeeUpdate(webhook, data)
      
      default:
        return {
          success: true,
          eventId: webhook.id,
          action: 'ignore',
          metadata: { reason: `Unhandled event type: ${type}` }
        }
    }
  }

  private async processTicketmasterWebhook(webhook: any): Promise<ProcessingResult> {
    const { type, data } = webhook.payload

    switch (type) {
      case 'event_update':
        return await this.handleEventUpdate(webhook, data)
      
      case 'venue_update':
        return await this.handleVenueUpdate(webhook, data)
      
      case 'artist_update':
        return await this.handleArtistUpdate(webhook, data)
      
      default:
        return {
          success: true,
          eventId: webhook.id,
          action: 'ignore',
          metadata: { reason: `Unhandled event type: ${type}` }
        }
    }
  }

  private async processFacebookWebhook(webhook: any): Promise<ProcessingResult> {
    const { type, data } = webhook.payload

    switch (type) {
      case 'event_changed':
        return await this.handleEventUpdate(webhook, data)
      
      case 'event_removed':
        return await this.handleEventDeletion(webhook, data)
      
      default:
        return {
          success: true,
          eventId: webhook.id,
          action: 'ignore',
          metadata: { reason: `Unhandled event type: ${type}` }
        }
    }
  }

  private async processYelpWebhook(webhook: any): Promise<ProcessingResult> {
    const { type, data } = webhook.payload

    switch (type) {
      case 'business_updated':
        return await this.handleVenueUpdate(webhook, data)
      
      case 'review_posted':
        return await this.handleReviewUpdate(webhook, data)
      
      default:
        return {
          success: true,
          eventId: webhook.id,
          action: 'ignore',
          metadata: { reason: `Unhandled event type: ${type}` }
        }
    }
  }

  private async processInternalWebhook(webhook: any): Promise<ProcessingResult> {
    const { type, data } = webhook.payload

    switch (type) {
      case 'user_preference_updated':
        return await this.handleUserPreferenceUpdate(webhook, data)
      
      case 'recommendation_refresh':
        return await this.handleRecommendationRefresh(webhook, data)
      
      case 'data_quality_alert':
        return await this.handleDataQualityAlert(webhook, data)
      
      default:
        return {
          success: true,
          eventId: webhook.id,
          action: 'ignore',
          metadata: { reason: `Unhandled internal event type: ${type}` }
        }
    }
  }

  private async handleEventUpdate(webhook: any, eventData: any): Promise<ProcessingResult> {
    try {
      // Normalize event data
      const normalizedEvent = await this.normalizeEventData(eventData, webhook.source)
      
      // Check if event already exists
      const { data: existingEvent } = await supabase
        .from('events')
        .select('id, external_id, updated_at')
        .eq('external_id', normalizedEvent.external_id)
        .eq('source', webhook.source)
        .single()

      let action: string
      if (existingEvent) {
        // Update existing event
        const { error } = await supabase
          .from('events')
          .update({
            ...normalizedEvent,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingEvent.id)

        if (error) throw error
        action = 'updated'
      } else {
        // Create new event
        const { error } = await supabase
          .from('events')
          .insert(normalizedEvent)

        if (error) throw error
        action = 'created'
      }

      // Trigger real-time updates
      await this.triggerRealtimeUpdate('event_update', {
        event_id: existingEvent?.id,
        action,
        source: webhook.source
      })

      return {
        success: true,
        eventId: webhook.id,
        action,
        metadata: {
          external_id: normalizedEvent.external_id,
          source: webhook.source
        }
      }

    } catch (error) {
      return {
        success: false,
        eventId: webhook.id,
        action: 'handle_event_update',
        error: error.message
      }
    }
  }

  private async handleEventDeletion(webhook: any, eventData: any): Promise<ProcessingResult> {
    try {
      const externalId = eventData.id || eventData.event_id

      // Mark event as deleted instead of hard delete
      const { error } = await supabase
        .from('events')
        .update({
          status: 'deleted',
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('external_id', externalId)
        .eq('source', webhook.source)

      if (error) throw error

      // Trigger real-time updates
      await this.triggerRealtimeUpdate('event_deleted', {
        external_id: externalId,
        source: webhook.source
      })

      return {
        success: true,
        eventId: webhook.id,
        action: 'deleted',
        metadata: {
          external_id: externalId,
          source: webhook.source
        }
      }

    } catch (error) {
      return {
        success: false,
        eventId: webhook.id,
        action: 'handle_event_deletion',
        error: error.message
      }
    }
  }

  private async handleVenueUpdate(webhook: any, venueData: any): Promise<ProcessingResult> {
    try {
      const normalizedVenue = await this.normalizeVenueData(venueData, webhook.source)
      
      // Upsert venue
      const { error } = await supabase
        .from('venues')
        .upsert(normalizedVenue, {
          onConflict: 'external_id,source'
        })

      if (error) throw error

      return {
        success: true,
        eventId: webhook.id,
        action: 'venue_updated',
        metadata: {
          external_id: normalizedVenue.external_id,
          source: webhook.source
        }
      }

    } catch (error) {
      return {
        success: false,
        eventId: webhook.id,
        action: 'handle_venue_update',
        error: error.message
      }
    }
  }

  private async handleAttendeeUpdate(webhook: any, attendeeData: any): Promise<ProcessingResult> {
    try {
      // Update event attendance metrics
      const { error } = await supabase.rpc('update_event_attendance', {
        external_id: attendeeData.event_id,
        source: webhook.source,
        attendance_change: attendeeData.status === 'attending' ? 1 : -1
      })

      if (error) throw error

      return {
        success: true,
        eventId: webhook.id,
        action: 'attendee_updated',
        metadata: {
          event_external_id: attendeeData.event_id,
          status: attendeeData.status
        }
      }

    } catch (error) {
      return {
        success: false,
        eventId: webhook.id,
        action: 'handle_attendee_update',
        error: error.message
      }
    }
  }

  private async handleArtistUpdate(webhook: any, artistData: any): Promise<ProcessingResult> {
    // For future implementation - artist/performer updates
    return {
      success: true,
      eventId: webhook.id,
      action: 'artist_update_ignored',
      metadata: { message: 'Artist updates not implemented yet' }
    }
  }

  private async handleReviewUpdate(webhook: any, reviewData: any): Promise<ProcessingResult> {
    // For future implementation - venue review updates
    return {
      success: true,
      eventId: webhook.id,
      action: 'review_update_ignored',
      metadata: { message: 'Review updates not implemented yet' }
    }
  }

  private async handleUserPreferenceUpdate(webhook: any, userData: any): Promise<ProcessingResult> {
    try {
      // Trigger recommendation refresh for user
      await supabase
        .from('recommendation_refresh_queue')
        .insert({
          user_id: userData.user_id,
          priority: 'high',
          reason: 'preference_update'
        })

      return {
        success: true,
        eventId: webhook.id,
        action: 'preference_update_queued',
        metadata: {
          user_id: userData.user_id
        }
      }

    } catch (error) {
      return {
        success: false,
        eventId: webhook.id,
        action: 'handle_preference_update',
        error: error.message
      }
    }
  }

  private async handleRecommendationRefresh(webhook: any, data: any): Promise<ProcessingResult> {
    try {
      // Call recommendation engine
      const functionUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/refresh-recommendations`
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({
          user_id: data.user_id,
          trigger: 'webhook'
        })
      })

      if (!response.ok) {
        throw new Error(`Recommendation refresh failed: ${response.status}`)
      }

      return {
        success: true,
        eventId: webhook.id,
        action: 'recommendations_refreshed',
        metadata: {
          user_id: data.user_id
        }
      }

    } catch (error) {
      return {
        success: false,
        eventId: webhook.id,
        action: 'handle_recommendation_refresh',
        error: error.message
      }
    }
  }

  private async handleDataQualityAlert(webhook: any, alertData: any): Promise<ProcessingResult> {
    try {
      // Store alert in monitoring system
      await supabase
        .from('data_quality_alerts')
        .insert({
          type: alertData.type,
          severity: alertData.severity,
          message: alertData.message,
          metadata: alertData.metadata,
          source: webhook.source
        })

      return {
        success: true,
        eventId: webhook.id,
        action: 'alert_stored',
        metadata: {
          alert_type: alertData.type,
          severity: alertData.severity
        }
      }

    } catch (error) {
      return {
        success: false,
        eventId: webhook.id,
        action: 'handle_data_quality_alert',
        error: error.message
      }
    }
  }

  private async normalizeEventData(eventData: any, source: string): Promise<any> {
    // This would use the existing event normalizer
    // For now, return a basic normalized structure
    return {
      external_id: eventData.id,
      source,
      title: eventData.name || eventData.title,
      description: eventData.description,
      start_time: eventData.start_time || eventData.start?.utc,
      end_time: eventData.end_time || eventData.end?.utc,
      url: eventData.url,
      updated_at: new Date().toISOString()
    }
  }

  private async normalizeVenueData(venueData: any, source: string): Promise<any> {
    return {
      external_id: venueData.id,
      source,
      name: venueData.name,
      address: venueData.address,
      latitude: venueData.latitude || venueData.location?.latitude,
      longitude: venueData.longitude || venueData.location?.longitude,
      updated_at: new Date().toISOString()
    }
  }

  private verifySignature(webhook: any): boolean {
    // Implement signature verification logic based on source
    // This is a placeholder - implement actual verification
    return true
  }

  private checkRateLimit(source: string): boolean {
    const now = Date.now()
    const limit = this.rateLimits.get(source)
    
    if (!limit || now > limit.resetTime) {
      // Reset or initialize rate limit
      this.rateLimits.set(source, {
        count: 1,
        resetTime: now + 60000 // 1 minute window
      })
      return true
    }
    
    if (limit.count >= 100) { // 100 requests per minute
      return false
    }
    
    limit.count++
    return true
  }

  private async updateWebhookStatus(webhookId: string, status: string, metadata?: any): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'processing') {
      updateData.started_at = new Date().toISOString()
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
      if (metadata) {
        updateData.result = metadata
      }
    }

    await supabase
      .from('webhook_queue')
      .update(updateData)
      .eq('id', webhookId)
  }

  private async handleWebhookError(webhook: any, errorMessage: string): Promise<void> {
    const retryCount = (webhook.retry_count || 0) + 1
    const status = retryCount >= this.maxRetries ? 'failed' : 'pending'
    
    await supabase
      .from('webhook_queue')
      .update({
        status,
        retry_count: retryCount,
        error_message: errorMessage,
        next_retry: retryCount < this.maxRetries 
          ? new Date(Date.now() + Math.pow(2, retryCount) * 60000).toISOString() // Exponential backoff
          : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', webhook.id)

    // Log error
    await supabase
      .from('webhook_errors')
      .insert({
        webhook_id: webhook.id,
        type: webhook.type,
        source: webhook.source,
        error_message: errorMessage,
        payload: webhook.payload,
        retry_count: retryCount
      })
  }

  private async triggerRealtimeUpdate(eventType: string, data: any): Promise<void> {
    try {
      // Send real-time notification via Supabase realtime
      await supabase
        .from('realtime_events')
        .insert({
          type: eventType,
          data,
          timestamp: new Date().toISOString()
        })
    } catch (error) {
      console.error('Failed to trigger realtime update:', error)
    }
  }

  private async cleanupOldWebhooks(): Promise<void> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 7) // Keep webhooks for 7 days

    await supabase
      .from('webhook_queue')
      .delete()
      .eq('status', 'completed')
      .lt('completed_at', cutoffDate.toISOString())
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
    console.log('🔄 Webhook handler initiated...')
    
    const processor = new WebhookProcessor()
    const result = await processor.processWebhookQueue()
    
    console.log(`✅ Webhook processing completed: ${result.processed} processed, ${result.errors.length} errors`)
    
    return new Response(
      JSON.stringify({
        success: result.success,
        message: 'Webhook processing completed',
        processed: result.processed,
        errors: result.errors,
        results: result.results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('❌ Webhook handler error:', error)
    
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