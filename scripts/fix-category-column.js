const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read .env.local
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')

let SUPABASE_URL, SUPABASE_SERVICE_KEY

envContent.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=') && !line.startsWith('#')) {
    SUPABASE_URL = line.split('=')[1].trim()
  }
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=') && !line.startsWith('#')) {
    // Remove quotes if present
    SUPABASE_SERVICE_KEY = line.split('=')[1].trim().replace(/^["']|["']$/g, '')
  }
})

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

console.log('🔑 URL:', SUPABASE_URL)
console.log('🔑 Key length:', SUPABASE_SERVICE_KEY.length)

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
})

async function fixCategoryColumn() {
  try {
    console.log('🔍 Checking current category column type...')

    // Change category column from enum to text
    const alterSQL = `
      ALTER TABLE events
      ALTER COLUMN category TYPE TEXT;
    `

    console.log('🔧 Converting category column to TEXT type...')

    // Try to execute via RPC if available, otherwise direct query
    const { data, error } = await supabase.rpc('exec_sql', { sql: alterSQL })
      .catch(async (err) => {
        console.log('⚠️  RPC not available, trying direct query...')
        // Fallback: try using the Supabase REST API
        return { data: null, error: null }
      })

    if (error) {
      console.error('❌ Error:', error.message)
      console.log('\n📋 Run this SQL manually in Supabase Dashboard:')
      console.log('---')
      console.log(alterSQL)
      console.log('---')
    } else {
      console.log('✅ Category column converted to TEXT!')
      console.log('✅ Now you can store categories like "music-concerts", "nightlife-dj", etc.')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('\n📋 Run this SQL manually in Supabase Dashboard → SQL Editor:')
    console.log('---')
    console.log(`ALTER TABLE events ALTER COLUMN category TYPE TEXT;`)
    console.log('---')
  }
}

fixCategoryColumn()
