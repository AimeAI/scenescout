#!/bin/bash

# SceneScout Data Ingestion Setup
# Automates external API connections and scheduling

set -e

echo "🔄 SceneScout Data Ingestion Setup"
echo "=================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Enhanced Eventbrite ingestion function
enhance_eventbrite_function() {
    log_info "Enhancing Eventbrite ingestion function..."
    
    cat > supabase/functions/ingest_eventbrite/index.ts << 'EOF'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface EventbriteEvent {
  id: string
  name: {
    text: string
  }
  description: {
    text: string
  }
  start: {
    timezone: string
    local: string
    utc: string
  }
  end: {
    timezone: string
    local: string
    utc: string
  }
  venue?: {
    id: string
    name: string
    address: {
      address_1?: string
      city?: string
      region?: string
      country?: string
      latitude?: string
      longitude?: string
    }
  }
  ticket_availability: {
    minimum_ticket_price?: {
      major_value: number
      currency: string
    }
    maximum_ticket_price?: {
      major_value: number
      currency: string
    }
  }
  logo?: {
    url: string
  }
  category_id: string
  is_free: boolean
}

const EVENTBRITE_CATEGORIES = {
  '103': 'music',
  '108': 'sports',
  '105': 'arts',
  '110': 'food',
  '102': 'business',
  '113': 'community',
  '104': 'film',
  '117': 'health',
  '118': 'education',
  '109': 'travel'
}

const RATE_LIMIT = {
  requests: 0,
  resetTime: 0,
  maxRequests: 1000 // Eventbrite allows 1000 requests per hour
}

async function checkRateLimit() {
  const now = Date.now()
  
  if (now > RATE_LIMIT.resetTime) {
    RATE_LIMIT.requests = 0
    RATE_LIMIT.resetTime = now + (60 * 60 * 1000) // Reset after 1 hour
  }
  
  if (RATE_LIMIT.requests >= RATE_LIMIT.maxRequests) {
    throw new Error('Rate limit exceeded. Try again later.')
  }
  
  RATE_LIMIT.requests++
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchEventbriteEvents(location: string, page: number = 1, retryCount = 0): Promise<EventbriteEvent[]> {
  const MAX_RETRIES = 3
  const RETRY_DELAY = 1000

  try {
    await checkRateLimit()
    
    const token = Deno.env.get('EVENTBRITE_TOKEN')
    if (!token) {
      throw new Error('EVENTBRITE_TOKEN environment variable is required')
    }

    const url = new URL('https://www.eventbriteapi.com/v3/events/search/')
    url.searchParams.set('location.address', location)
    url.searchParams.set('start_date.range_start', new Date().toISOString())
    url.searchParams.set('expand', 'venue,ticket_availability,category')
    url.searchParams.set('page', page.toString())
    url.searchParams.set('sort_by', 'date')

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limited - wait and retry
        const retryAfter = response.headers.get('Retry-After')
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : RETRY_DELAY * Math.pow(2, retryCount)
        
        if (retryCount < MAX_RETRIES) {
          console.log(`Rate limited. Waiting ${waitTime}ms before retry ${retryCount + 1}...`)
          await sleep(waitTime)
          return fetchEventbriteEvents(location, page, retryCount + 1)
        }
      }
      
      throw new Error(`Eventbrite API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.events || []
    
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`Error fetching events. Retrying ${retryCount + 1}/${MAX_RETRIES}...`)
      await sleep(RETRY_DELAY * Math.pow(2, retryCount))
      return fetchEventbriteEvents(location, page, retryCount + 1)
    }
    
    throw error
  }
}

async function processEvent(supabase: any, event: EventbriteEvent, cityId: string) {
  try {
    // Check if event already exists
    const { data: existing } = await supabase
      .from('events')
      .select('id')
      .eq('external_id', event.id)
      .eq('source', 'eventbrite')
      .single()

    if (existing) {
      console.log(`Event ${event.id} already exists, skipping`)
      return { skipped: true }
    }

    // Process venue if available
    let venueId = null
    if (event.venue) {
      const { data: venue, error: venueError } = await supabase
        .from('venues')
        .upsert({
          external_id: event.venue.id,
          name: event.venue.name,
          address: [
            event.venue.address.address_1,
            event.venue.address.city,
            event.venue.address.region
          ].filter(Boolean).join(', '),
          city_id: cityId,
          latitude: event.venue.address.latitude ? parseFloat(event.venue.address.latitude) : null,
          longitude: event.venue.address.longitude ? parseFloat(event.venue.address.longitude) : null,
        })
        .select('id')
        .single()

      if (venueError) {
        console.error('Venue processing error:', venueError)
      } else {
        venueId = venue.id
      }
    }

    // Insert event
    const { error: eventError } = await supabase
      .from('events')
      .insert({
        external_id: event.id,
        source: 'eventbrite',
        title: event.name.text,
        description: event.description?.text || '',
        date: event.start.local.split('T')[0],
        time: event.start.local.split('T')[1]?.substring(0, 5),
        end_date: event.end.local.split('T')[0],
        end_time: event.end.local.split('T')[1]?.substring(0, 5),
        timezone: event.start.timezone,
        venue_id: venueId,
        city_id: cityId,
        category: EVENTBRITE_CATEGORIES[event.category_id] || 'other',
        is_free: event.is_free,
        price_min: event.ticket_availability?.minimum_ticket_price?.major_value || null,
        price_max: event.ticket_availability?.maximum_ticket_price?.major_value || null,
        currency: event.ticket_availability?.minimum_ticket_price?.currency || 'USD',
        image_url: event.logo?.url || null,
        external_url: `https://www.eventbrite.com/e/${event.id}`,
      })

    if (eventError) {
      console.error('Event insertion error:', eventError)
      return { error: eventError }
    }

    return { success: true }
    
  } catch (error) {
    console.error('Event processing error:', error)
    return { error }
  }
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { cities } = await req.json()
    const targetCities = cities || ['San Francisco', 'New York', 'Los Angeles', 'Chicago']

    let totalProcessed = 0
    let totalErrors = 0
    let totalSkipped = 0

    for (const cityName of targetCities) {
      try {
        console.log(`Processing events for ${cityName}...`)
        
        // Get or create city
        const { data: city, error: cityError } = await supabase
          .from('cities')
          .upsert({
            name: cityName,
            slug: cityName.toLowerCase().replace(/\s+/g, '-'),
            state: 'Unknown', // Will be updated later
            country: 'US'
          })
          .select('id')
          .single()

        if (cityError) {
          console.error(`City error for ${cityName}:`, cityError)
          continue
        }

        // Fetch events for this city
        const events = await fetchEventbriteEvents(cityName)
        console.log(`Found ${events.length} events for ${cityName}`)

        // Process each event
        for (const event of events) {
          const result = await processEvent(supabase, event, city.id)
          
          if (result.success) {
            totalProcessed++
          } else if (result.skipped) {
            totalSkipped++
          } else {
            totalErrors++
          }
          
          // Small delay to avoid overwhelming the database
          await sleep(100)
        }
        
      } catch (cityError) {
        console.error(`Error processing city ${cityName}:`, cityError)
        totalErrors++
      }
    }

    // Update ingestion stats
    await supabase
      .from('ingestion_logs')
      .insert({
        source: 'eventbrite',
        events_processed: totalProcessed,
        events_skipped: totalSkipped,
        events_failed: totalErrors,
        cities_processed: targetCities.length,
        execution_time_ms: Date.now() - startTime
      })

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        skipped: totalSkipped,
        errors: totalErrors,
        cities: targetCities.length
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Ingestion error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  }
})
EOF

    log_success "Eventbrite ingestion function enhanced"
}

# Create data quality monitoring
create_data_monitoring() {
    log_info "Creating data quality monitoring..."
    
    cat > supabase/functions/data_monitor/index.ts << 'EOF'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

interface DataQualityCheck {
  name: string
  query: string
  threshold?: number
  operator?: 'gt' | 'lt' | 'eq'
  severity: 'warning' | 'error'
}

const DATA_QUALITY_CHECKS: DataQualityCheck[] = [
  {
    name: 'Events without location',
    query: 'SELECT COUNT(*) as count FROM events WHERE venue_id IS NULL AND city_id IS NULL',
    threshold: 50,
    operator: 'gt',
    severity: 'warning'
  },
  {
    name: 'Events with missing descriptions',
    query: 'SELECT COUNT(*) as count FROM events WHERE description IS NULL OR description = \'\'',
    threshold: 100,
    operator: 'gt',
    severity: 'warning'
  },
  {
    name: 'Events with past dates',
    query: 'SELECT COUNT(*) as count FROM events WHERE date < CURRENT_DATE',
    threshold: 1000,
    operator: 'gt',
    severity: 'error'
  },
  {
    name: 'Events with invalid prices',
    query: 'SELECT COUNT(*) as count FROM events WHERE price_min < 0 OR price_max < price_min',
    threshold: 0,
    operator: 'gt',
    severity: 'error'
  },
  {
    name: 'Recent ingestion activity',
    query: 'SELECT COUNT(*) as count FROM events WHERE created_at > NOW() - INTERVAL \'24 hours\'',
    threshold: 10,
    operator: 'lt',
    severity: 'warning'
  }
]

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const results = []
    let hasErrors = false
    let hasWarnings = false

    for (const check of DATA_QUALITY_CHECKS) {
      try {
        const { data, error } = await supabase
          .rpc('execute_sql', { query: check.query })

        if (error) {
          results.push({
            check: check.name,
            status: 'failed',
            error: error.message,
            severity: 'error'
          })
          hasErrors = true
          continue
        }

        const value = data[0]?.count || 0
        let status = 'passed'
        
        if (check.threshold !== undefined) {
          switch (check.operator) {
            case 'gt':
              status = value > check.threshold ? 'failed' : 'passed'
              break
            case 'lt':
              status = value < check.threshold ? 'failed' : 'passed'
              break
            case 'eq':
              status = value === check.threshold ? 'passed' : 'failed'
              break
          }
        }

        results.push({
          check: check.name,
          status,
          value,
          threshold: check.threshold,
          severity: check.severity
        })

        if (status === 'failed') {
          if (check.severity === 'error') {
            hasErrors = true
          } else {
            hasWarnings = true
          }
        }

      } catch (checkError) {
        results.push({
          check: check.name,
          status: 'failed',
          error: checkError.message,
          severity: 'error'
        })
        hasErrors = true
      }
    }

    // Log monitoring results
    await supabase
      .from('data_quality_logs')
      .insert({
        checks_run: results.length,
        checks_passed: results.filter(r => r.status === 'passed').length,
        checks_failed: results.filter(r => r.status === 'failed').length,
        has_errors: hasErrors,
        has_warnings: hasWarnings,
        details: results
      })

    const response = {
      success: !hasErrors,
      summary: {
        total_checks: results.length,
        passed: results.filter(r => r.status === 'passed').length,
        failed: results.filter(r => r.status === 'failed').length,
        errors: hasErrors,
        warnings: hasWarnings
      },
      results
    }

    return new Response(
      JSON.stringify(response),
      { 
        status: hasErrors ? 500 : 200,
        headers: { 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Data monitoring error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  }
})
EOF

    log_success "Data quality monitoring created"
}

# Create ingestion scheduler
create_ingestion_scheduler() {
    log_info "Creating ingestion scheduler..."
    
    cat > scripts/schedule-ingestion.sh << 'EOF'
#!/bin/bash

# SceneScout Ingestion Scheduler
# Run this script via cron or GitHub Actions

set -e

SUPABASE_FUNCTION_URL="${SUPABASE_URL}/functions/v1"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to call Supabase Edge Function
call_function() {
    local function_name=$1
    local payload=$2
    
    log "Calling function: $function_name"
    
    response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -d "$payload" \
        "${SUPABASE_FUNCTION_URL}/${function_name}")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [[ $http_code -eq 200 ]]; then
        log "✅ $function_name completed successfully"
        echo "$body" | jq . 2>/dev/null || echo "$body"
    else
        log "❌ $function_name failed with code $http_code"
        echo "$body"
        return 1
    fi
}

main() {
    log "🚀 Starting scheduled ingestion..."
    
    # Cities to ingest data for
    cities='["San Francisco", "New York", "Los Angeles", "Chicago", "Austin", "Seattle"]'
    
    # Eventbrite ingestion
    if [[ -n "$EVENTBRITE_TOKEN" ]]; then
        log "📅 Starting Eventbrite ingestion..."
        call_function "ingest_eventbrite" "{\"cities\": $cities}"
    else
        log "⚠️  EVENTBRITE_TOKEN not set, skipping Eventbrite ingestion"
    fi
    
    # Ticketmaster ingestion
    if [[ -n "$TICKETMASTER_API_KEY" ]]; then
        log "🎫 Starting Ticketmaster ingestion..."
        call_function "ingest_ticketmaster" "{\"cities\": $cities}"
    else
        log "⚠️  TICKETMASTER_API_KEY not set, skipping Ticketmaster ingestion"
    fi
    
    # Data quality check
    log "🔍 Running data quality checks..."
    call_function "data_monitor" "{}"
    
    # Cleanup old data
    log "🧹 Cleaning up old data..."
    call_function "cleanup_old_events" "{\"days_old\": 30}"
    
    log "✅ Scheduled ingestion completed successfully!"
}

# Run main function
main "$@"
EOF

    chmod +x scripts/schedule-ingestion.sh
    
    # Create GitHub Actions workflow for scheduling
    cat > .github/workflows/ingestion.yml << 'EOF'
name: Data Ingestion

on:
  schedule:
    # Run every 6 hours
    - cron: '0 */6 * * *'
  workflow_dispatch:
    inputs:
      cities:
        description: 'Cities to ingest (JSON array)'
        required: false
        default: '["San Francisco", "New York", "Los Angeles"]'

jobs:
  ingest:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: |
          sudo apt-get update
          sudo apt-get install -y jq curl
          
      - name: Run ingestion
        run: ./scripts/schedule-ingestion.sh
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          EVENTBRITE_TOKEN: ${{ secrets.EVENTBRITE_TOKEN }}
          TICKETMASTER_API_KEY: ${{ secrets.TICKETMASTER_API_KEY }}
          
      - name: Notify on failure
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            const title = "🚨 Data Ingestion Failed"
            const body = `
            Data ingestion workflow failed at ${new Date().toISOString()}
            
            **Workflow**: ${context.workflow}
            **Run ID**: ${context.runId}
            **Commit**: ${context.sha}
            
            Please check the logs and resolve the issue.
            `
            
            // You can customize this to send to Slack, Discord, etc.
            console.log(title)
            console.log(body)
EOF

    log_success "Ingestion scheduler created"
}

# Create database cleanup function
create_cleanup_function() {
    log_info "Creating database cleanup function..."
    
    cat > supabase/functions/cleanup_old_events/index.ts << 'EOF'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { days_old = 30 } = await req.json()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days_old)

    console.log(`Cleaning up events older than ${cutoffDate.toISOString()}`)

    // Delete old events that have passed
    const { data: deletedEvents, error: deleteError } = await supabase
      .from('events')
      .delete()
      .lt('date', cutoffDate.toISOString().split('T')[0])
      .select('id')

    if (deleteError) {
      throw new Error(`Failed to delete old events: ${deleteError.message}`)
    }

    // Clean up orphaned venues
    const { data: orphanedVenues, error: venueError } = await supabase
      .rpc('cleanup_orphaned_venues')

    if (venueError) {
      console.warn('Venue cleanup warning:', venueError.message)
    }

    // Update statistics
    const stats = {
      events_deleted: deletedEvents?.length || 0,
      venues_cleaned: orphanedVenues?.length || 0,
      cleanup_date: new Date().toISOString(),
      days_threshold: days_old
    }

    // Log cleanup activity
    await supabase
      .from('cleanup_logs')
      .insert({
        type: 'scheduled_cleanup',
        events_deleted: stats.events_deleted,
        venues_cleaned: stats.venues_cleaned,
        days_threshold: days_old
      })

    console.log('Cleanup completed:', stats)

    return new Response(
      JSON.stringify({
        success: true,
        ...stats
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Cleanup error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
EOF

    log_success "Database cleanup function created"
}

# Create data ingestion dashboard
create_ingestion_dashboard() {
    log_info "Creating data ingestion dashboard..."
    
    mkdir -p src/pages/admin
    
    cat > src/pages/admin/DataDashboard.tsx << 'EOF'
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { 
  Database, 
  Calendar, 
  MapPin, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  TrendingUp
} from 'lucide-react'

interface DataStats {
  total_events: number
  events_today: number
  total_venues: number
  total_cities: number
  last_ingestion: string
  data_quality_score: number
}

interface IngestionLog {
  id: string
  source: string
  events_processed: number
  events_skipped: number
  events_failed: number
  execution_time_ms: number
  created_at: string
}

export function DataDashboard() {
  const [isIngesting, setIsIngesting] = useState(false)
  
  // Fetch data statistics
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['admin', 'data-stats'],
    queryFn: async (): Promise<DataStats> => {
      const { data, error } = await supabase
        .rpc('get_data_stats')
      
      if (error) throw error
      return data
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  // Fetch recent ingestion logs
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['admin', 'ingestion-logs'],
    queryFn: async (): Promise<IngestionLog[]> => {
      const { data, error } = await supabase
        .from('ingestion_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (error) throw error
      return data
    }
  })

  const handleManualIngestion = async (source: string) => {
    setIsIngesting(true)
    try {
      const { data, error } = await supabase.functions.invoke(`ingest_${source}`, {
        body: { cities: ['San Francisco', 'New York'] }
      })
      
      if (error) throw error
      
      // Refresh stats after ingestion
      await refetchStats()
      
    } catch (error) {
      console.error('Ingestion error:', error)
    } finally {
      setIsIngesting(false)
    }
  }

  if (statsLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-white" />
      </div>
    )
  }

  return (
    <div className="p-8 bg-black min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Data Dashboard</h1>
          <div className="flex space-x-4">
            <Button
              onClick={() => handleManualIngestion('eventbrite')}
              disabled={isIngesting}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isIngesting ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Ingest Eventbrite
            </Button>
            <Button
              onClick={() => handleManualIngestion('ticketmaster')}
              disabled={isIngesting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Ingest Ticketmaster
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Total Events</CardTitle>
              <Calendar className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.total_events?.toLocaleString()}</div>
              <p className="text-xs text-white/60">
                {stats?.events_today} added today
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Total Venues</CardTitle>
              <MapPin className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.total_venues?.toLocaleString()}</div>
              <p className="text-xs text-white/60">
                Across {stats?.total_cities} cities
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Data Quality</CardTitle>
              {stats?.data_quality_score > 80 ? 
                <CheckCircle className="h-4 w-4 text-green-400" /> :
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
              }
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats?.data_quality_score}%</div>
              <p className="text-xs text-white/60">
                Quality score
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white">Last Ingestion</CardTitle>
              <Database className="h-4 w-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium text-white">
                {stats?.last_ingestion ? 
                  new Date(stats.last_ingestion).toLocaleString() : 
                  'Never'
                }
              </div>
              <p className="text-xs text-white/60">
                Last data update
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Ingestion Logs */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Recent Ingestion Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="flex justify-center py-4">
                <RefreshCw className="h-6 w-6 animate-spin text-white" />
              </div>
            ) : logs && logs.length > 0 ? (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                    <div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {log.source}
                        </Badge>
                        <span className="text-sm text-white/80">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm text-white/60 mt-1">
                        Processed: {log.events_processed} | Skipped: {log.events_skipped} | Failed: {log.events_failed}
                      </div>
                    </div>
                    <div className="text-sm text-white/60">
                      {(log.execution_time_ms / 1000).toFixed(1)}s
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/60 text-center py-4">No ingestion logs found</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
EOF

    log_success "Data ingestion dashboard created"
}

# Main execution
main() {
    echo ""
    log_info "Setting up automated data ingestion..."
    
    enhance_eventbrite_function
    create_data_monitoring
    create_ingestion_scheduler
    create_cleanup_function
    create_ingestion_dashboard
    
    echo ""
    log_success "🎉 Data ingestion setup completed!"
    echo ""
    echo "========================================="
    echo "📋 CONFIGURATION REQUIRED:"
    echo "========================================="
    echo ""
    echo "1. 🔑 Set environment variables:"
    echo "   EVENTBRITE_TOKEN=your_token"
    echo "   TICKETMASTER_API_KEY=your_key"
    echo "   SUPABASE_SERVICE_ROLE_KEY=your_key"
    echo ""
    echo "2. 🗄️  Deploy Edge Functions:"
    echo "   supabase functions deploy ingest_eventbrite"
    echo "   supabase functions deploy data_monitor"
    echo "   supabase functions deploy cleanup_old_events"
    echo ""
    echo "3. ⏰ Schedule ingestion (choose one):"
    echo "   a) GitHub Actions (already configured)"
    echo "   b) Cron job: 0 */6 * * * ./scripts/schedule-ingestion.sh"
    echo ""
    echo "4. 🧪 Test ingestion manually:"
    echo "   ./scripts/schedule-ingestion.sh"
    echo ""
    echo "========================================="
    echo "🎯 SUCCESS CRITERIA:"
    echo "========================================="
    echo "✅ Events automatically ingested every 6 hours"
    echo "✅ Data quality monitored and reported"
    echo "✅ Old events cleaned up automatically"
    echo "✅ Dashboard shows real-time ingestion status"
    echo "✅ Zero manual intervention required"
    echo ""
    echo "🚀 Ready for real data!"
    echo "========================================="
}

main "$@"