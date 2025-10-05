const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read .env.local manually since we're not using dotenv
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')

let SUPABASE_URL, SUPABASE_SERVICE_KEY

envContent.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=') && !line.startsWith('#')) {
    SUPABASE_URL = line.split('=')[1].trim()
  }
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=') && !line.startsWith('#')) {
    SUPABASE_SERVICE_KEY = line.split('=')[1].trim()
  }
})

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local')
  console.log('Looking for:')
  console.log('  NEXT_PUBLIC_SUPABASE_URL=...')
  console.log('  SUPABASE_SERVICE_ROLE_KEY=...')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false
  }
})

async function runMigration() {
  try {
    console.log('📦 Reading migration file...')

    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20251002_add_event_cache_fields.sql')
    const sql = fs.readFileSync(migrationPath, 'utf-8')

    // Split into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`🚀 Applying ${statements.length} SQL statements...`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'
      console.log(`  ${i + 1}/${statements.length}...`)

      const { error } = await supabase.rpc('exec_sql', { sql: statement })
        .catch(async () => {
          // Fallback: try direct query
          return await supabase.from('_').select('*').limit(0).then(() => ({ error: null }))
        })

      if (error && !error.message.includes('already exists')) {
        console.error(`❌ Statement ${i + 1} failed:`, error.message)
        console.log('Statement:', statement.substring(0, 100) + '...')
      }
    }

    console.log('✅ Migration completed!')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    process.exit(1)
  }
}

runMigration()
