/**
 * Real-time Event Streaming System
 * WebSocket-based real-time updates for events, venues, and user interactions
 */

import { EventEmitter } from 'events'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types'
import type { Event, Venue } from '@/types'

export interface StreamMessage {
  id: string
  type: 'event_update' | 'venue_update' | 'user_activity' | 'system_notification'
  action: 'insert' | 'update' | 'delete'
  timestamp: string
  data: any
  metadata?: Record<string, any>
}

export interface StreamSubscription {
  id: string
  type: string
  filters?: Record<string, any>
  callback: (message: StreamMessage) => void
  isActive: boolean
  createdAt: Date
}

export interface StreamMetrics {
  totalConnections: number
  activeStreams: number
  messagesPerSecond: number
  averageLatency: number
  errorRate: number
  uptime: number
  bandwidth: {
    inbound: number
    outbound: number
  }
}

export class RealtimeEventStream extends EventEmitter {
  private supabase: ReturnType<typeof createClient<Database>>
  private subscriptions = new Map<string, StreamSubscription>()
  private channels = new Map<string, any>()
  private isConnected = false
  private metrics: StreamMetrics
  private startTime = Date.now()
  private messageBuffer: StreamMessage[] = []
  private bufferFlushInterval?: NodeJS.Timeout
  private heartbeatInterval?: NodeJS.Timeout

  constructor() {
    super()
    
    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      }
    )

    this.metrics = {
      totalConnections: 0,
      activeStreams: 0,
      messagesPerSecond: 0,
      averageLatency: 0,
      errorRate: 0,
      uptime: 0,
      bandwidth: { inbound: 0, outbound: 0 }
    }

    this.setupBufferFlush()
    this.setupHeartbeat()
  }

  private setupBufferFlush(): void {
    this.bufferFlushInterval = setInterval(() => {
      if (this.messageBuffer.length > 0) {
        this.flushMessageBuffer()
      }
    }, 100) // Flush every 100ms
  }

  private setupHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.updateMetrics()
      this.emit('heartbeat', this.metrics)
    }, 5000) // Every 5 seconds
  }

  private updateMetrics(): void {
    this.metrics.uptime = Date.now() - this.startTime
    this.metrics.activeStreams = this.subscriptions.size
    // Calculate messages per second from buffer
    this.metrics.messagesPerSecond = this.messageBuffer.length * 10 // 100ms * 10 = 1 second
  }

  private flushMessageBuffer(): void {
    const messages = [...this.messageBuffer]
    this.messageBuffer = []

    // Batch process messages
    this.processBatchedMessages(messages)
  }

  private processBatchedMessages(messages: StreamMessage[]): void {
    // Group messages by type for efficient processing
    const grouped = messages.reduce((acc, message) => {
      if (!acc[message.type]) acc[message.type] = []
      acc[message.type].push(message)
      return acc
    }, {} as Record<string, StreamMessage[]>)

    // Emit grouped messages
    Object.entries(grouped).forEach(([type, msgs]) => {
      this.emit('batch_messages', { type, messages: msgs, count: msgs.length })
    })
  }

  /**
   * Connect to real-time streams
   */
  async connect(): Promise<void> {
    try {
      this.metrics.totalConnections++
      
      // Subscribe to all event changes
      await this.subscribeToEvents()
      
      // Subscribe to venue changes
      await this.subscribeToVenues()
      
      // Subscribe to user activities (if needed)
      await this.subscribeToUserActivities()

      this.isConnected = true
      this.emit('connected', { timestamp: new Date(), metrics: this.metrics })
      
      console.log('🔴 Real-time event stream connected')

    } catch (error) {
      this.emit('connection_error', error)
      console.error('❌ Failed to connect to real-time stream:', error)
      throw error
    }
  }

  /**
   * Disconnect from all streams
   */
  async disconnect(): Promise<void> {
    try {
      // Unsubscribe from all channels
      for (const [channelName, channel] of this.channels) {
        await this.supabase.removeChannel(channel)
        console.log(`📡 Unsubscribed from ${channelName}`)
      }

      this.channels.clear()
      this.subscriptions.clear()
      this.isConnected = false

      // Clear intervals
      if (this.bufferFlushInterval) {
        clearInterval(this.bufferFlushInterval)
      }
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval)
      }

      this.emit('disconnected', { timestamp: new Date() })
      console.log('🔴 Real-time event stream disconnected')

    } catch (error) {
      console.error('❌ Error disconnecting from real-time stream:', error)
    }
  }

  /**
   * Subscribe to event changes
   */
  private async subscribeToEvents(): Promise<void> {
    const channel = this.supabase
      .channel('events_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'events' },
        (payload) => this.handleEventChange(payload)
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'event_interactions' },
        (payload) => this.handleEventInteraction(payload)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('📡 Subscribed to events stream')
        }
      })

    this.channels.set('events', channel)
  }

  /**
   * Subscribe to venue changes
   */
  private async subscribeToVenues(): Promise<void> {
    const channel = this.supabase
      .channel('venues_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'venues' },
        (payload) => this.handleVenueChange(payload)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('📡 Subscribed to venues stream')
        }
      })

    this.channels.set('venues', channel)
  }

  /**
   * Subscribe to user activities
   */
  private async subscribeToUserActivities(): Promise<void> {
    const channel = this.supabase
      .channel('user_activities')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_events' },
        (payload) => this.handleUserActivity(payload)
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'plans' },
        (payload) => this.handlePlanActivity(payload)
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('📡 Subscribed to user activities stream')
        }
      })

    this.channels.set('activities', channel)
  }

  /**
   * Handle event database changes
   */
  private handleEventChange(payload: any): void {
    const message: StreamMessage = {
      id: `event_${payload.new?.id || payload.old?.id}_${Date.now()}`,
      type: 'event_update',
      action: payload.eventType.toLowerCase() as 'insert' | 'update' | 'delete',
      timestamp: new Date().toISOString(),
      data: {
        event: payload.new || payload.old,
        changes: payload.new ? this.calculateChanges(payload.old, payload.new) : null
      },
      metadata: {
        schema: payload.schema,
        table: payload.table,
        commit_timestamp: payload.commit_timestamp
      }
    }

    this.queueMessage(message)
  }

  /**
   * Handle venue database changes
   */
  private handleVenueChange(payload: any): void {
    const message: StreamMessage = {
      id: `venue_${payload.new?.id || payload.old?.id}_${Date.now()}`,
      type: 'venue_update',
      action: payload.eventType.toLowerCase() as 'insert' | 'update' | 'delete',
      timestamp: new Date().toISOString(),
      data: {
        venue: payload.new || payload.old,
        changes: payload.new ? this.calculateChanges(payload.old, payload.new) : null
      },
      metadata: {
        schema: payload.schema,
        table: payload.table,
        commit_timestamp: payload.commit_timestamp
      }
    }

    this.queueMessage(message)
  }

  /**
   * Handle user activity changes
   */
  private handleUserActivity(payload: any): void {
    const message: StreamMessage = {
      id: `activity_${payload.new?.id}_${Date.now()}`,
      type: 'user_activity',
      action: 'insert',
      timestamp: new Date().toISOString(),
      data: {
        activity: payload.new,
        user_id: payload.new?.user_id,
        event_id: payload.new?.event_id
      },
      metadata: {
        activity_type: 'event_interaction'
      }
    }

    this.queueMessage(message)
  }

  /**
   * Handle plan activity changes
   */
  private handlePlanActivity(payload: any): void {
    const message: StreamMessage = {
      id: `plan_${payload.new?.id}_${Date.now()}`,
      type: 'user_activity',
      action: 'insert',
      timestamp: new Date().toISOString(),
      data: {
        plan: payload.new,
        user_id: payload.new?.created_by
      },
      metadata: {
        activity_type: 'plan_created'
      }
    }

    this.queueMessage(message)
  }

  /**
   * Handle event interactions (views, saves, etc.)
   */
  private handleEventInteraction(payload: any): void {
    const message: StreamMessage = {
      id: `interaction_${payload.new?.id}_${Date.now()}`,
      type: 'user_activity',
      action: payload.eventType.toLowerCase() as 'insert' | 'update' | 'delete',
      timestamp: new Date().toISOString(),
      data: {
        interaction: payload.new || payload.old,
        event_id: payload.new?.event_id || payload.old?.event_id,
        user_id: payload.new?.user_id || payload.old?.user_id
      },
      metadata: {
        interaction_type: payload.new?.interaction_type || payload.old?.interaction_type
      }
    }

    this.queueMessage(message)
  }

  /**
   * Queue message for batched processing
   */
  private queueMessage(message: StreamMessage): void {
    this.messageBuffer.push(message)
    
    // Emit individual message immediately for real-time subscribers
    this.emit('message', message)
    
    // Trigger flush if buffer is getting large
    if (this.messageBuffer.length >= 50) {
      this.flushMessageBuffer()
    }
  }

  /**
   * Calculate changes between old and new records
   */
  private calculateChanges(oldRecord: any, newRecord: any): Record<string, { from: any; to: any }> {
    if (!oldRecord || !newRecord) return {}

    const changes: Record<string, { from: any; to: any }> = {}

    Object.keys(newRecord).forEach(key => {
      if (oldRecord[key] !== newRecord[key]) {
        changes[key] = {
          from: oldRecord[key],
          to: newRecord[key]
        }
      }
    })

    return changes
  }

  /**
   * Subscribe to specific message types with filters
   */
  subscribe(
    type: string,
    callback: (message: StreamMessage) => void,
    filters?: Record<string, any>
  ): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const subscription: StreamSubscription = {
      id: subscriptionId,
      type,
      filters,
      callback,
      isActive: true,
      createdAt: new Date()
    }

    this.subscriptions.set(subscriptionId, subscription)

    // Set up event listener
    this.on('message', (message: StreamMessage) => {
      if (subscription.isActive && this.messageMatchesSubscription(message, subscription)) {
        try {
          subscription.callback(message)
        } catch (error) {
          console.error(`❌ Error in subscription ${subscriptionId}:`, error)
          this.emit('subscription_error', { subscriptionId, error })
        }
      }
    })

    console.log(`📋 Created subscription ${subscriptionId} for type: ${type}`)
    return subscriptionId
  }

  /**
   * Unsubscribe from message stream
   */
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId)
    if (!subscription) return false

    subscription.isActive = false
    this.subscriptions.delete(subscriptionId)
    
    console.log(`📋 Removed subscription ${subscriptionId}`)
    return true
  }

  /**
   * Check if message matches subscription filters
   */
  private messageMatchesSubscription(message: StreamMessage, subscription: StreamSubscription): boolean {
    // Type filter
    if (subscription.type !== '*' && message.type !== subscription.type) {
      return false
    }

    // Additional filters
    if (subscription.filters) {
      for (const [key, value] of Object.entries(subscription.filters)) {
        if (this.getNestedValue(message, key) !== value) {
          return false
        }
      }
    }

    return true
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  /**
   * Broadcast system notification
   */
  broadcastNotification(
    title: string,
    message: string,
    type: 'info' | 'warning' | 'error' | 'success' = 'info',
    metadata?: Record<string, any>
  ): void {
    const notification: StreamMessage = {
      id: `notification_${Date.now()}`,
      type: 'system_notification',
      action: 'insert',
      timestamp: new Date().toISOString(),
      data: {
        title,
        message,
        notification_type: type
      },
      metadata
    }

    this.queueMessage(notification)
  }

  /**
   * Get current stream metrics
   */
  getMetrics(): StreamMetrics {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime
    }
  }

  /**
   * Get active subscriptions
   */
  getSubscriptions(): StreamSubscription[] {
    return Array.from(this.subscriptions.values())
  }

  /**
   * Get connection status
   */
  isStreamConnected(): boolean {
    return this.isConnected
  }

  /**
   * Create filtered event stream
   */
  createEventStream(filters: {
    categories?: string[]
    cities?: string[]
    sources?: string[]
    priceRange?: { min?: number; max?: number }
  }): string {
    return this.subscribe('event_update', (message) => {
      const event = message.data.event
      
      // Apply filters
      if (filters.categories && !filters.categories.includes(event.category)) return
      if (filters.cities && !filters.cities.includes(event.city_name)) return
      if (filters.sources && !filters.sources.includes(event.source)) return
      if (filters.priceRange) {
        const eventPrice = event.price_min || 0
        if (filters.priceRange.min && eventPrice < filters.priceRange.min) return
        if (filters.priceRange.max && eventPrice > filters.priceRange.max) return
      }

      // Emit filtered event
      this.emit('filtered_event', { filter: filters, event, message })
    }, filters)
  }

  /**
   * Create venue activity stream
   */
  createVenueStream(venueIds: string[]): string {
    return this.subscribe('venue_update', (message) => {
      const venue = message.data.venue
      if (venueIds.includes(venue.id)) {
        this.emit('venue_activity', { venue, message })
      }
    }, { venue_ids: venueIds })
  }

  /**
   * Create user activity stream
   */
  createUserActivityStream(userId: string): string {
    return this.subscribe('user_activity', (message) => {
      if (message.data.user_id === userId) {
        this.emit('user_activity', { userId, activity: message.data, message })
      }
    }, { user_id: userId })
  }

  /**
   * Health check for stream status
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy'
    details: Record<string, any>
  }> {
    const metrics = this.getMetrics()
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    
    // Check connection status
    if (!this.isConnected) {
      status = 'unhealthy'
    }
    
    // Check error rate
    if (metrics.errorRate > 5) {
      status = status === 'healthy' ? 'degraded' : 'unhealthy'
    }
    
    // Check message processing rate
    if (metrics.messagesPerSecond > 100) {
      status = status === 'healthy' ? 'degraded' : status
    }

    return {
      status,
      details: {
        isConnected: this.isConnected,
        metrics,
        activeChannels: this.channels.size,
        activeSubscriptions: this.subscriptions.size,
        bufferSize: this.messageBuffer.length
      }
    }
  }
}

// Export singleton instance
export const realtimeEventStream = new RealtimeEventStream()