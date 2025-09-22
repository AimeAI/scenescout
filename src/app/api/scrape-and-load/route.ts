import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabaseClient } from '@/lib/supabase-server'

const supabase = getServiceSupabaseClient()

export async function GET() {
  try {
    // Get all events from database
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
    
    if (error) throw error
    
    // Group by category
    const categories = {
      trending: data.filter(e => e.price_min > 100),
      sports: data.filter(e => e.category === 'sports'),
      music: data.filter(e => e.category === 'music'),
      food: data.filter(e => e.category === 'food'),
      tech: data.filter(e => e.category === 'tech'),
      arts: data.filter(e => e.category === 'arts'),
      social: data.filter(e => e.category === 'social'),
      free: data.filter(e => e.price_min === 0)
    }
    
    return NextResponse.json({
      success: true,
      scraped_count: data.length,
      categories,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load events', details: error.message },
      { status: 500 }
    )
  }
}
