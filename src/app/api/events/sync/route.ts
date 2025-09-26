import { NextResponse } from 'next/server'
import { LiveEventScraper } from '@/lib/live-scraper'
import { FileEventRepository } from '@/lib/file-event-repository'

const scraper = new LiveEventScraper()
const repository = new FileEventRepository()

export async function POST() {
  try {
    console.log('🔄 Starting event sync...')
    
    // Categories to scrape and save
    const categories = [
      { name: 'tech', query: 'tech meetup startup' },
      { name: 'music', query: 'concerts music live bands' },
      { name: 'food', query: 'food festivals restaurants dining' },
      { name: 'business', query: 'business networking professional meetup' },
      { name: 'arts', query: 'art exhibitions galleries museums' },
      { name: 'sports', query: 'sports games tournaments matches' },
      { name: 'social', query: 'events toronto today' }
    ]

    let totalSaved = 0
    let totalSkipped = 0

    for (const category of categories) {
      console.log(`📂 Scraping ${category.name} events...`)
      
      try {
        // Scrape fresh events
        const events = await scraper.scrapeAll(category.query, 50)
        
        if (events.length > 0) {
          // Save to repository
          const result = await repository.saveEvents(events)
          totalSaved += result.saved
          totalSkipped += result.skipped
          
          console.log(`✅ ${category.name}: ${result.saved} saved, ${result.skipped} skipped`)
        } else {
          console.log(`⚠️ ${category.name}: No events found`)
        }
      } catch (error) {
        console.error(`❌ Failed to sync ${category.name}:`, error.message)
      }
    }

    // Cleanup old events
    await repository.cleanupOldEvents()

    console.log(`🎉 Sync complete: ${totalSaved} total saved, ${totalSkipped} skipped`)

    return NextResponse.json({
      success: true,
      message: 'Event sync completed',
      stats: {
        totalSaved,
        totalSkipped,
        categories: categories.length
      }
    })

  } catch (error) {
    console.error('Event sync failed:', error)
    return NextResponse.json(
      { error: 'Sync failed', details: error.message },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // Get repository stats
    const totalEvents = await repository.getEventCount()
    const techEvents = await repository.getEventCount('tech')
    const musicEvents = await repository.getEventCount('music')
    const freeEvents = await repository.getEvents({ maxPrice: 0, limit: 1000 })

    return NextResponse.json({
      success: true,
      stats: {
        totalEvents,
        techEvents,
        musicEvents,
        freeEvents: freeEvents.length,
        lastSync: new Date().toISOString()
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get stats', details: error.message },
      { status: 500 }
    )
  }
}
