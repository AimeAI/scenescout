#!/usr/bin/env tsx
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Apply Supabase migrations using service role key
 * Usage: npm run db:migrate [migration-file]
 *
 * Examples:
 *   npm run db:migrate
 *   npm run db:migrate 20251005_create_reminder_tables.sql
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials')
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗')
  console.error('\nMake sure these are set in your .env.local file')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration(migrationFile?: string) {
  try {
    console.log('🔄 Starting database migration...\n')

    // Determine which migration to run
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
    const sqlFile = migrationFile
      ? path.join(migrationsDir, migrationFile)
      : path.join(migrationsDir, '20251005_create_reminder_tables.sql')

    console.log(`📦 Reading migration: ${path.basename(sqlFile)}\n`)

    if (!fs.existsSync(sqlFile)) {
      console.error(`❌ Migration file not found: ${sqlFile}`)
      console.error('\nAvailable migrations:')
      const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'))
      files.forEach(f => console.error(`   - ${f}`))
      process.exit(1)
    }

    const migrationSQL = fs.readFileSync(sqlFile, 'utf-8')

    console.log('📊 Migration Preview:')
    console.log('─'.repeat(60))
    const preview = migrationSQL.split('\n').slice(0, 15).join('\n')
    console.log(preview)
    if (migrationSQL.split('\n').length > 15) {
      console.log('...')
    }
    console.log('─'.repeat(60))
    console.log()

    console.log('⚡ Executing migration...\n')

    // Split into individual statements and execute each
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\s*$/))

    let successCount = 0
    let errorCount = 0

    for (const statement of statements) {
      if (!statement) continue

      try {
        const { error } = await supabase.rpc('exec', {
          query: statement + ';'
        })

        if (error && error.message && !error.message.includes('already exists')) {
          // Try alternative method
          const result = await fetch(`${SUPABASE_URL}/rest/v1/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ query: statement })
          })

          if (!result.ok && !error.message.includes('already exists')) {
            console.error(`   ⚠️  Statement warning:`, statement.substring(0, 60) + '...')
            errorCount++
          } else {
            successCount++
          }
        } else {
          successCount++
        }
      } catch (err: any) {
        if (!err.message?.includes('already exists')) {
          console.error(`   ❌ Statement failed:`, statement.substring(0, 60) + '...')
          console.error(`      Error:`, err.message)
          errorCount++
        } else {
          successCount++
        }
      }
    }

    console.log(`\n📈 Executed ${statements.length} statements (${successCount} successful, ${errorCount} warnings)\n`)

    // Verify tables were created
    console.log('🔍 Verifying tables...\n')

    const tables = ['push_subscriptions', 'saved_events', 'event_reminders']
    let verifiedCount = 0

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(0)

      if (error) {
        console.log(`   ⚠️  ${table}: ${error.message}`)
      } else {
        console.log(`   ✅ ${table}`)
        verifiedCount++
      }
    }

    if (verifiedCount === tables.length) {
      console.log('\n🎉 Migration completed successfully!\n')
    } else {
      console.log('\n⚠️  Migration completed with warnings. Some tables may need manual creation.\n')
      console.log('💡 Fallback: Run SQL manually in Supabase Dashboard:')
      console.log(`   ${SUPABASE_URL.replace(/^https?:\/\/([^.]+)\.supabase\.co/, 'https://supabase.com/dashboard/project/$1')}/sql/new`)
    }

  } catch (error: any) {
    console.error('\n❌ Migration failed!')
    console.error('Error:', error.message)
    console.log('\n💡 Fallback: Copy SQL and run in Supabase Dashboard SQL Editor')
    process.exit(1)
  }
}

// Get migration file from command line args
const migrationFile = process.argv[2]
applyMigration(migrationFile)
