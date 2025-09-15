#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function ingestEvents() {
  console.log('🚀 Starting event ingestion...')
  
  const sources = [
    { name: 'Eventbrite', function: 'ingest_eventbrite' },
    { name: 'Ticketmaster', function: 'ingest_ticketmaster' },
    { name: 'Meetup', function: 'ingest_meetup' }
  ]

  const results = []

  for (const source of sources) {
    console.log(`\n📅 Ingesting from ${source.name}...`)
    
    try {
      const { data, error } = await supabase.functions.invoke(source.function, {
        body: {
          city: 'San Francisco',
          stateCode: 'CA',
          lat: 37.7749,
          lng: -122.4194,
          radius: 10000, // 10km
          size: 200
        }
      })

      if (error) {
        console.error(`❌ ${source.name} error:`, error.message)
        results.push({ source: source.name, success: false, error: error.message })
      } else if (data?.status === 'disabled') {
        console.warn(`⚠️  ${source.name} is disabled:`, data.reason)
        results.push({ source: source.name, success: false, reason: data.reason })
      } else {
        console.log(`✅ ${source.name} success:`)
        console.log(`   - Events processed: ${data?.eventsProcessed || 0}`)
        console.log(`   - Venues processed: ${data?.venuesProcessed || 0}`)
        results.push({ 
          source: source.name, 
          success: true, 
          eventsProcessed: data?.eventsProcessed || 0,
          venuesProcessed: data?.venuesProcessed || 0
        })
      }
    } catch (error) {
      console.error(`❌ ${source.name} error:`, error)
      results.push({ source: source.name, success: false, error: error.message })
    }

    // Small delay between sources
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // Check total events in database
  try {
    const { count, error } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .gte('date', new Date().toISOString().split('T')[0])
      .is('deleted_at', null)

    if (!error) {
      console.log(`\n📊 Total active events in database: ${count}`)
    }
  } catch (error) {
    console.error('Error counting events:', error)
  }

  // Summary
  console.log('\n📈 Ingestion Summary:')
  console.log('===================')
  results.forEach(result => {
    if (result.success) {
      console.log(`✅ ${result.source}: ${result.eventsProcessed} events`)
    } else {
      console.log(`❌ ${result.source}: ${result.error || result.reason}`)
    }
  })

  const totalEvents = results.reduce((sum, r) => sum + (r.eventsProcessed || 0), 0)
  console.log(`\nTotal new events ingested: ${totalEvents}`)
}

// Run the ingestion
ingestEvents()
  .then(() => {
    console.log('\n✨ Event ingestion complete!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })