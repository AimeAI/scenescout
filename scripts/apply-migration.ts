#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function applyMigration() {
  try {
    console.log('📦 Reading migration file...')

    const migrationPath = path.join(
      process.cwd(),
      'supabase/migrations/20251002_add_event_cache_fields.sql'
    )

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

    console.log('🚀 Applying migration to production...')

    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL,
    })

    if (error) {
      console.error('❌ Migration failed:', error)
      throw error
    }

    console.log('✅ Migration applied successfully!')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

applyMigration()
