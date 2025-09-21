import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Types for ingestion
interface IngestResponse {
  source: string
  success: boolean
  eventsProcessed: number
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const { source } = await request.json()
    
    // Check if Supabase is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('TODO') || supabaseServiceKey.includes('TODO')) {
      return NextResponse.json(
        { error: 'Supabase not configured for ingestion' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Call the appropriate Supabase Edge Function
    let functionName: string
    switch (source) {
      case 'eventbrite':
        functionName = 'ingest_eventbrite'
        break
      case 'ticketmaster':
        functionName = 'ingest_ticketmaster'
        break
      case 'songkick':
        functionName = 'ingest_songkick'
        break
      default:
        return NextResponse.json(
          { error: `Unsupported source: ${source}` },
          { status: 400 }
        )
    }

    // Invoke the edge function
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { 
        location: 'Toronto', // Default location, could be parameterized
        limit: 50 
      }
    })

    if (error) {
      console.error(`Error calling ${functionName}:`, error)
      return NextResponse.json(
        { error: `Failed to call ${functionName}: ${error.message}` },
        { status: 500 }
      )
    }

    const result: IngestResponse = {
      source,
      success: true,
      eventsProcessed: data?.eventsProcessed || 0
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Ingestion API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Simple endpoint to test ingestion status
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  const isConfigured = !!(
    supabaseUrl && 
    supabaseServiceKey && 
    !supabaseUrl.includes('TODO') && 
    !supabaseServiceKey.includes('TODO')
  )

  if (!isConfigured) {
    return NextResponse.json({
      configured: false,
      message: 'Supabase not configured for ingestion'
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // Check if events table exists and has data
    const { data, error } = await supabase
      .from('events')
      .select('id, source, created_at')
      .limit(5)

    if (error) {
      return NextResponse.json({
        configured: true,
        database: false,
        message: 'Database schema not ready',
        error: error.message
      })
    }

    return NextResponse.json({
      configured: true,
      database: true,
      sampleEvents: data?.length || 0,
      message: 'Ready for ingestion'
    })
  } catch (error) {
    return NextResponse.json({
      configured: true,
      database: false,
      error: 'Database connection failed'
    })
  }
}