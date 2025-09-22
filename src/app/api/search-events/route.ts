import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabaseClient } from '@/lib/supabase-server'

const supabase = getServiceSupabaseClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || 'events'
    
    console.log(`🔍 Searching for: "${query}"`)
    
    // Search in existing events with simpler query
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .textSearch('title', query)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(20)
    
    if (error) {
      // Fallback to simple filter if text search fails
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('events')
        .select('*')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(20)
      
      if (fallbackError) throw fallbackError
      
      // Filter results manually
      const filteredData = fallbackData.filter(event => 
        event.title?.toLowerCase().includes(query.toLowerCase()) ||
        event.description?.toLowerCase().includes(query.toLowerCase()) ||
        event.category?.toLowerCase().includes(query.toLowerCase())
      )
      
      console.log(`✅ Found ${filteredData.length} events for "${query}" (fallback)`)
      
      return NextResponse.json({
        success: true,
        query,
        events: filteredData,
        count: filteredData.length,
        timestamp: new Date().toISOString()
      })
    }
    
    console.log(`✅ Found ${data.length} events for "${query}"`)
    
    return NextResponse.json({
      success: true,
      query,
      events: data,
      count: data.length,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Search failed', details: error.message },
      { status: 500 }
    )
  }
}
