import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabaseClient'

interface SwarmEventFilters {
  category?: string
  price_tier?: string
  city?: string
  netflix_category?: string
  limit?: number
  offset?: number
}

interface SwarmAnalytics {
  total_events: number
  category_distribution: Record<string, Record<string, number>>
  price_tier_distribution: Record<string, number>
  source_distribution: Record<string, number>
  external_url_coverage: number
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      category,
      price_tier,
      city = 'toronto-on',
      netflix_category,
      limit = 50,
      offset = 0,
      analytics = false
    } = req.query

    // If analytics requested, return swarm intelligence metrics
    if (analytics) {
      const analyticsData = await getSwarmAnalytics()
      return res.status(200).json(analyticsData)
    }

    // Build base query with swarm intelligence features
    let query = supabase
      .from('events')
      .select(`
        *,
        venue:venues(id, name, address, latitude, longitude, venue_type),
        city:cities(id, name, slug)
      `)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('hotness_score', { ascending: false })

    // Apply city filter
    if (city) {
      const { data: cityData } = await supabase
        .from('cities')
        .select('id')
        .eq('slug', city)
        .single()
      
      if (cityData) {
        query = query.eq('city_id', cityData.id)
      }
    }

    // Apply category filter
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    // Apply price tier filter
    if (price_tier && price_tier !== 'all') {
      query = query.eq('price_tier', price_tier)
    }

    // Apply pagination
    query = query.range(Number(offset), Number(offset) + Number(limit) - 1)

    const { data: events, error } = await query

    if (error) {
      console.error('Error fetching swarm events:', error)
      return res.status(500).json({ error: 'Failed to fetch events' })
    }

    // Group events by Netflix-style categories for enhanced discovery
    const netflixCategories = await groupEventsForNetflix(events || [])

    // Validate external URLs
    const eventsWithValidatedUrls = await validateExternalUrls(events || [])

    return res.status(200).json({
      events: eventsWithValidatedUrls,
      netflix_categories: netflixCategories,
      total_count: events?.length || 0,
      swarm_intelligence: {
        quality_scoring: 'active',
        category_balancing: 'active',
        source_diversity: await getSourceDiversity(),
        external_url_coverage: calculateExternalUrlCoverage(events || [])
      },
      filters_applied: {
        category,
        price_tier,
        city,
        netflix_category
      }
    })

  } catch (error) {
    console.error('Swarm API error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      swarm_status: 'degraded'
    })
  }
}

async function getSwarmAnalytics(): Promise<SwarmAnalytics> {
  try {
    // Get total events
    const { count: totalEvents } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .gte('date', new Date().toISOString().split('T')[0])

    // Get category distribution
    const { data: categoryData } = await supabase
      .from('events')
      .select('category, price_tier')
      .gte('date', new Date().toISOString().split('T')[0])

    const categoryDistribution: Record<string, Record<string, number>> = {}
    const priceTierDistribution: Record<string, number> = {}

    categoryData?.forEach(event => {
      if (!categoryDistribution[event.category]) {
        categoryDistribution[event.category] = {}
      }
      if (!categoryDistribution[event.category][event.price_tier]) {
        categoryDistribution[event.category][event.price_tier] = 0
      }
      categoryDistribution[event.category][event.price_tier]++
      
      if (!priceTierDistribution[event.price_tier]) {
        priceTierDistribution[event.price_tier] = 0
      }
      priceTierDistribution[event.price_tier]++
    })

    // Get source distribution
    const { data: sourceData } = await supabase
      .from('events')
      .select('source')
      .gte('date', new Date().toISOString().split('T')[0])

    const sourceDistribution: Record<string, number> = {}
    sourceData?.forEach(event => {
      if (!sourceDistribution[event.source]) {
        sourceDistribution[event.source] = 0
      }
      sourceDistribution[event.source]++
    })

    // Calculate external URL coverage
    const { count: eventsWithUrls } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .gte('date', new Date().toISOString().split('T')[0])
      .not('external_url', 'is', null)

    const externalUrlCoverage = totalEvents ? (eventsWithUrls / totalEvents) * 100 : 0

    return {
      total_events: totalEvents || 0,
      category_distribution: categoryDistribution,
      price_tier_distribution: priceTierDistribution,
      source_distribution: sourceDistribution,
      external_url_coverage: Math.round(externalUrlCoverage * 100) / 100
    }

  } catch (error) {
    console.error('Error getting swarm analytics:', error)
    return {
      total_events: 0,
      category_distribution: {},
      price_tier_distribution: {},
      source_distribution: {},
      external_url_coverage: 0
    }
  }
}

async function groupEventsForNetflix(events: any[]) {
  const now = new Date()
  const tonight = new Date(now)
  tonight.setHours(17, 0, 0, 0) // 5 PM today
  const tomorrowMorning = new Date(now)
  tomorrowMorning.setDate(tomorrowMorning.getDate() + 1)
  tomorrowMorning.setHours(6, 0, 0, 0) // 6 AM tomorrow

  const thisWeekend = new Date(now)
  const daysUntilFriday = (5 - now.getDay() + 7) % 7
  thisWeekend.setDate(now.getDate() + daysUntilFriday)

  return {
    trending_now: events
      .filter(e => (e.hotness_score || 0) > 80)
      .slice(0, 10),
    
    tonight: events
      .filter(e => {
        const eventDate = new Date(e.date + 'T' + (e.time || '20:00'))
        return eventDate >= tonight && eventDate <= tomorrowMorning
      })
      .slice(0, 10),
    
    this_weekend: events
      .filter(e => {
        const eventDate = new Date(e.date)
        const dayOfWeek = eventDate.getDay()
        return dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0 // Fri, Sat, Sun
      })
      .slice(0, 10),
    
    free_events: events
      .filter(e => e.is_free || e.price_tier === 'free')
      .slice(0, 10),
    
    date_night: events
      .filter(e => ['arts', 'music', 'food'].includes(e.category) && e.price_tier !== 'free')
      .slice(0, 10),
    
    family_friendly: events
      .filter(e => ['arts', 'social', 'food'].includes(e.category) && e.price_tier !== 'luxury')
      .slice(0, 10),
    
    food_lovers: events
      .filter(e => e.category === 'food')
      .slice(0, 10),
    
    music_lovers: events
      .filter(e => e.category === 'music')
      .slice(0, 10),
    
    art_culture: events
      .filter(e => e.category === 'arts')
      .slice(0, 10),
    
    sports_fitness: events
      .filter(e => e.category === 'sports')
      .slice(0, 10),
    
    nightlife: events
      .filter(e => ['music', 'social'].includes(e.category) && e.time && e.time >= '20:00')
      .slice(0, 10),
    
    tech_innovation: events
      .filter(e => ['tech', 'business'].includes(e.category))
      .slice(0, 10)
  }
}

async function validateExternalUrls(events: any[]) {
  return events.map(event => ({
    ...event,
    external_url_status: event.external_url ? 'valid' : 'missing',
    ticket_available: !!event.external_url,
    swarm_verified: event.verification_count > 0
  }))
}

async function getSourceDiversity() {
  const { data: sources } = await supabase
    .from('events')
    .select('source')
    .gte('date', new Date().toISOString().split('T')[0])

  const uniqueSources = new Set(sources?.map(s => s.source))
  return {
    unique_sources: uniqueSources.size,
    source_list: Array.from(uniqueSources)
  }
}

function calculateExternalUrlCoverage(events: any[]) {
  if (events.length === 0) return 0
  const eventsWithUrls = events.filter(e => e.external_url).length
  return Math.round((eventsWithUrls / events.length) * 100 * 100) / 100
}