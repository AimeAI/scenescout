#!/usr/bin/env node
/**
 * SceneScout Data Processing Pipeline
 * Processes scraped events through normalization, geocoding, and categorization
 */

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs').promises
const path = require('path')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

class DataProcessor {
  constructor() {
    this.stats = {
      totalProcessed: 0,
      normalized: 0,
      geocoded: 0,
      categorized: 0,
      errors: 0,
      skipped: 0
    }
    this.startTime = Date.now()
  }

  async processInitialData() {
    console.log('🚀 Starting data processing pipeline...')
    
    try {
      // Get unprocessed events from the database
      const events = await this.getUnprocessedEvents()
      console.log(`📄 Found ${events.length} events to process`)
      
      if (events.length === 0) {
        console.log('✅ No events need processing')
        return this.stats
      }
      
      // Process events in batches
      const batchSize = 25
      const batches = this.chunkArray(events, batchSize)
      
      console.log(`📊 Processing ${batches.length} batches of ${batchSize} events each...\n`)
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        console.log(`🔄 Processing batch ${i + 1}/${batches.length}...`)
        
        await this.processBatch(batch)
        
        // Brief pause between batches to avoid overwhelming APIs
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
      
      // Generate processing report
      await this.generateProcessingReport()
      
      return this.stats
      
    } catch (error) {
      console.error('❌ Data processing failed:', error)
      throw error
    }
  }
  
  async getUnprocessedEvents() {
    // Get events that need processing (missing geocoding, categories, etc.)
    const { data, error } = await supabase
      .from('events')
      .select(`
        id, name, description, address, venue_id,
        latitude, longitude, categories, tags,
        event_date, start_time, end_time,
        venues(name, latitude, longitude, address)
      `)
      .is('deleted_at', null)
      .limit(1000) // Process up to 1000 events initially
      .order('created_at', { ascending: false })
    
    if (error) {
      throw new Error(`Failed to fetch events: ${error.message}`)
    }
    
    return data || []
  }
  
  async processBatch(events) {
    const promises = events.map(event => this.processEvent(event))
    const results = await Promise.allSettled(promises)
    
    let batchStats = { processed: 0, errors: 0 }
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        batchStats.processed++
        this.stats.totalProcessed++
      } else {
        batchStats.errors++
        this.stats.errors++
        console.warn(`    ⚠️ Error processing event ${events[index].id}:`, result.reason?.message || result.reason)
      }
    })
    
    console.log(`    ✅ Batch complete: ${batchStats.processed} processed, ${batchStats.errors} errors`)
  }
  
  async processEvent(event) {
    const updates = {}
    let hasUpdates = false
    
    try {
      // 1. Normalize event data
      const normalizedData = await this.normalizeEventData(event)
      if (normalizedData) {
        Object.assign(updates, normalizedData)
        hasUpdates = true
        this.stats.normalized++
      }
      
      // 2. Geocode if missing coordinates
      if (!event.latitude || !event.longitude) {
        const geocoded = await this.geocodeEvent(event)
        if (geocoded) {
          Object.assign(updates, geocoded)
          hasUpdates = true
          this.stats.geocoded++
        }
      }
      
      // 3. Categorize event
      const categories = await this.categorizeEvent(event)
      if (categories && categories.length > 0) {
        updates.categories = categories
        hasUpdates = true
        this.stats.categorized++
      }
      
      // 4. Extract and clean metadata
      const metadata = await this.extractMetadata(event)
      if (metadata) {
        updates.metadata = metadata
        hasUpdates = true
      }
      
      // 5. Update PostGIS location field if we have coordinates
      if (updates.latitude && updates.longitude) {
        updates.location = `POINT(${updates.longitude} ${updates.latitude})`
      }
      
      // Save updates if any
      if (hasUpdates) {
        const { error } = await supabase
          .from('events')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', event.id)
        
        if (error) {
          throw new Error(`Failed to update event ${event.id}: ${error.message}`)
        }
      } else {
        this.stats.skipped++
      }
      
    } catch (error) {
      throw new Error(`Event ${event.id} processing failed: ${error.message}`)
    }
  }
  
  async normalizeEventData(event) {
    const updates = {}
    
    // Normalize name (trim, title case)
    if (event.name) {
      const normalizedName = event.name.trim()
      if (normalizedName !== event.name) {
        updates.name = normalizedName
      }
    }
    
    // Generate slug if missing or invalid
    const currentSlug = event.slug
    const expectedSlug = this.createSlug(event.name)
    if (!currentSlug || currentSlug !== expectedSlug) {
      updates.slug = await this.ensureUniqueSlug(expectedSlug, event.id)
    }
    
    // Normalize description length
    if (event.description && event.description.length > 1000) {
      updates.short_description = event.description.substring(0, 497) + '...'
    }
    
    // Ensure arrays are properly formatted
    if (!Array.isArray(event.categories)) {
      updates.categories = []
    }
    if (!Array.isArray(event.tags)) {
      updates.tags = []
    }
    
    return Object.keys(updates).length > 0 ? updates : null
  }
  
  async geocodeEvent(event) {
    // Try to get coordinates from venue first
    if (event.venues?.latitude && event.venues?.longitude) {
      return {
        latitude: event.venues.latitude,
        longitude: event.venues.longitude,
        address: event.venues.address || event.address
      }
    }
    
    // If we have an address, simulate geocoding
    const address = event.address || event.venues?.address
    if (address) {
      // For initial seeding, we'll use approximate coordinates based on city
      const geocoded = await this.simulateGeocoding(address)
      return geocoded
    }
    
    return null
  }
  
  async simulateGeocoding(address) {
    // Simple geocoding simulation based on city detection
    const cityCoords = {
      'new york': { lat: 40.7128, lng: -74.0060 },
      'los angeles': { lat: 34.0522, lng: -118.2437 },
      'san francisco': { lat: 37.7749, lng: -122.4194 },
      'chicago': { lat: 41.8781, lng: -87.6298 },
      'austin': { lat: 30.2672, lng: -97.7431 }
    }
    
    const addressLower = address.toLowerCase()
    
    for (const [city, coords] of Object.entries(cityCoords)) {
      if (addressLower.includes(city)) {
        // Add small random offset to simulate exact location
        const offset = 0.01 // ~1km
        return {
          latitude: coords.lat + (Math.random() - 0.5) * offset,
          longitude: coords.lng + (Math.random() - 0.5) * offset
        }
      }
    }
    
    return null
  }
  
  async categorizeEvent(event) {
    const categories = new Set()
    
    const text = `${event.name || ''} ${event.description || ''}`.toLowerCase()
    
    // Music categories
    if (text.match(/\b(concert|music|band|singer|dj|festival|jazz|rock|pop|classical|electronic)\b/)) {
      categories.add('music')
    }
    
    // Arts categories
    if (text.match(/\b(art|gallery|museum|theater|theatre|dance|ballet|opera|exhibit|performance)\b/)) {
      categories.add('arts')
    }
    
    // Food & Drink
    if (text.match(/\b(food|drink|restaurant|bar|wine|beer|cocktail|dining|culinary|tasting)\b/)) {
      categories.add('food-drink')
    }
    
    // Sports & Fitness
    if (text.match(/\b(sport|fitness|yoga|gym|running|basketball|football|baseball|soccer|workout)\b/)) {
      categories.add('sports')
    }
    
    // Business & Professional
    if (text.match(/\b(business|conference|seminar|workshop|networking|professional|meeting|training)\b/)) {
      categories.add('business')
    }
    
    // Community & Social
    if (text.match(/\b(community|social|meetup|volunteer|charity|fundraiser|neighborhood)\b/)) {
      categories.add('community')
    }
    
    // Technology
    if (text.match(/\b(tech|technology|programming|software|startup|digital|coding|ai|data)\b/)) {
      categories.add('technology')
    }
    
    // Education
    if (text.match(/\b(education|learning|class|course|lecture|university|college|school)\b/)) {
      categories.add('education')
    }
    
    // Default to 'other' if no categories found
    if (categories.size === 0) {
      categories.add('other')
    }
    
    return Array.from(categories)
  }
  
  async extractMetadata(event) {
    const metadata = {}
    
    // Extract venue information if available
    if (event.venues) {
      metadata.venue_info = {
        name: event.venues.name,
        has_coordinates: !!(event.venues.latitude && event.venues.longitude)
      }
    }
    
    // Event timing metadata
    if (event.start_time && event.end_time) {
      metadata.duration_estimated = true
    }
    
    // Processing metadata
    metadata.processed_at = new Date().toISOString()
    metadata.processing_version = '1.0'
    
    return metadata
  }
  
  createSlug(text) {
    if (!text) return `event-${Date.now()}`
    
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-')
      .substring(0, 100) // Limit length
  }
  
  async ensureUniqueSlug(baseSlug, eventId) {
    let slug = baseSlug
    let counter = 1
    
    while (true) {
      const { data, error } = await supabase
        .from('events')
        .select('id')
        .eq('slug', slug)
        .neq('id', eventId)
        .limit(1)
      
      if (error) {
        console.warn('Error checking slug uniqueness:', error)
        return `${baseSlug}-${Date.now()}`
      }
      
      if (!data || data.length === 0) {
        return slug
      }
      
      slug = `${baseSlug}-${counter}`
      counter++
      
      if (counter > 100) {
        return `${baseSlug}-${Date.now()}`
      }
    }
  }
  
  async generateProcessingReport() {
    const duration = Date.now() - this.startTime
    const durationMinutes = Math.round(duration / 60000)
    
    const report = {
      session: {
        start_time: new Date(this.startTime).toISOString(),
        end_time: new Date().toISOString(),
        duration_minutes: durationMinutes
      },
      statistics: {
        total_processed: this.stats.totalProcessed,
        normalized: this.stats.normalized,
        geocoded: this.stats.geocoded,
        categorized: this.stats.categorized,
        errors: this.stats.errors,
        skipped: this.stats.skipped
      },
      performance: {
        events_per_minute: Math.round(this.stats.totalProcessed / Math.max(durationMinutes, 1)),
        success_rate: Math.round((this.stats.totalProcessed / (this.stats.totalProcessed + this.stats.errors)) * 100)
      }
    }
    
    // Save report
    const reportPath = path.join(__dirname, 'data-processing-report.json')
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
    
    // Display summary
    console.log('\n📊 DATA PROCESSING COMPLETE')
    console.log('============================')
    console.log(`🚀 Total Processed: ${report.statistics.total_processed}`)
    console.log(`🎯 Normalized: ${report.statistics.normalized}`)
    console.log(`🗺️ Geocoded: ${report.statistics.geocoded}`)
    console.log(`🏷️ Categorized: ${report.statistics.categorized}`)
    console.log(`❌ Errors: ${report.statistics.errors}`)
    console.log(`⏩ Skipped: ${report.statistics.skipped}`)
    console.log(`⏱️ Duration: ${durationMinutes} minutes`)
    console.log(`⚡ Rate: ${report.performance.events_per_minute} events/min`)
    console.log(`✅ Success Rate: ${report.performance.success_rate}%`)
    
    console.log(`\n📝 Full report saved to: ${reportPath}`)
    
    return report
  }
  
  chunkArray(array, size) {
    const chunks = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
}

// Export for use in other scripts
module.exports = { DataProcessor }

// Run if called directly
if (require.main === module) {
  const processor = new DataProcessor()
  
  processor.processInitialData()
    .then(stats => {
      const success = stats.totalProcessed > 0 && stats.errors < stats.totalProcessed * 0.1
      console.log(success ? '✅ Data processing completed successfully!' : '⚠️ Data processing completed with issues')
      process.exit(success ? 0 : 1)
    })
    .catch(error => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}