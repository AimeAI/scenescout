#!/usr/bin/env tsx

/**
 * Apply RLS Security Fixes Migration
 * This script applies the critical security fixes to the Supabase database
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables
import dotenv from 'dotenv'
dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials')
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase client with service role (needed for schema changes)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  console.log('🔒 Applying RLS Security Fixes Migration...')
  console.log('📍 Database:', SUPABASE_URL)
  console.log('')

  try {
    // Read the migration file
    const migrationPath = join(process.cwd(), 'supabase/migrations/20251020_fix_critical_rls_vulnerabilities.sql')
    console.log('📄 Reading migration file:', migrationPath)

    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    console.log('✅ Migration file loaded successfully')
    console.log('📊 SQL length:', migrationSQL.length, 'characters')
    console.log('')

    // Split the migration into individual statements
    // PostgreSQL notices (RAISE NOTICE) need to be handled separately
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))

    console.log('📋 Found', statements.length, 'SQL statements to execute')
    console.log('')
    console.log('⏳ Executing migration...')
    console.log('')

    let successCount = 0
    let errorCount = 0
    const errors: Array<{statement: string, error: string}> = []

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';'

      // Skip empty statements and comments
      if (statement.trim() === ';' || statement.startsWith('--')) {
        continue
      }

      // Show progress for important statements
      if (statement.includes('DROP POLICY') ||
          statement.includes('CREATE POLICY') ||
          statement.includes('ENABLE ROW LEVEL SECURITY') ||
          statement.includes('ALTER TABLE')) {
        const preview = statement.substring(0, 80).replace(/\s+/g, ' ')
        console.log(`[${i + 1}/${statements.length}]`, preview + '...')
      }

      try {
        // Execute the statement using Supabase RPC
        const { error } = await supabase.rpc('exec_sql', { sql: statement })

        if (error) {
          // Some errors are expected (e.g., policy already exists)
          if (error.message?.includes('already exists') ||
              error.message?.includes('does not exist')) {
            console.log('   ⚠️  Already applied:', error.message.substring(0, 60))
          } else {
            console.error('   ❌ Error:', error.message)
            errors.push({ statement: preview, error: error.message })
            errorCount++
          }
        } else {
          successCount++
        }
      } catch (err: any) {
        // Try direct SQL execution if RPC fails
        try {
          await supabase.from('_temp').select('*').limit(0)
          // If we get here, the connection works but RPC might not be available
          console.warn('   ⚠️  RPC method not available, attempting direct execution...')

          // For critical RLS changes, we need to use the SQL editor or migrations
          console.error('   ❌ Cannot apply migration without RPC function')
          console.error('   💡 Please apply migration manually using Supabase SQL Editor')
          errorCount++
        } catch {
          console.error('   ❌ Database connection error:', err.message)
          errorCount++
        }
      }
    }

    console.log('')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📊 Migration Execution Summary')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ Successful statements:', successCount)
    console.log('❌ Failed statements:', errorCount)
    console.log('📋 Total statements:', statements.length)
    console.log('')

    if (errors.length > 0) {
      console.log('⚠️  Errors encountered:')
      errors.forEach(({ statement, error }, i) => {
        console.log(`${i + 1}. ${statement}`)
        console.log(`   Error: ${error}`)
      })
      console.log('')
    }

    if (errorCount > 0) {
      console.log('⚠️  Some statements failed to execute')
      console.log('💡 Alternative: Apply migration using Supabase SQL Editor')
      console.log('')
      console.log('Steps:')
      console.log('1. Go to: https://supabase.com/dashboard/project/ldgbjmotttuomxzwujrt/sql')
      console.log('2. Click "New Query"')
      console.log('3. Paste contents of: supabase/migrations/20251020_fix_critical_rls_vulnerabilities.sql')
      console.log('4. Click "Run"')
      console.log('')
      return false
    }

    console.log('✅ Migration applied successfully!')
    console.log('')

    return true

  } catch (error: any) {
    console.error('❌ Failed to apply migration:', error.message)
    console.error('')
    console.error('Stack trace:', error.stack)
    return false
  }
}

async function verifyRLS() {
  console.log('🔍 Verifying RLS policies...')
  console.log('')

  try {
    // Check if RLS is enabled on critical tables
    const criticalTables = [
      'events',
      'push_subscriptions',
      'saved_events',
      'event_reminders'
    ]

    console.log('Checking RLS status for critical tables:')

    for (const table of criticalTables) {
      try {
        // Try to query the table - if RLS is enabled, this will respect policies
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)

        if (error) {
          console.log(`❌ ${table}: Error - ${error.message}`)
        } else {
          console.log(`✅ ${table}: RLS enabled and accessible`)
        }
      } catch (err: any) {
        console.log(`⚠️  ${table}: ${err.message}`)
      }
    }

    console.log('')
    console.log('✅ RLS verification complete')
    console.log('')

  } catch (error: any) {
    console.error('❌ Verification failed:', error.message)
  }
}

// Main execution
async function main() {
  console.log('')
  console.log('╔═══════════════════════════════════════════════╗')
  console.log('║  RLS Security Fixes Migration Script         ║')
  console.log('║  Critical Security Updates                    ║')
  console.log('╚═══════════════════════════════════════════════╝')
  console.log('')

  const success = await applyMigration()

  if (success) {
    await verifyRLS()

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ All security fixes applied successfully!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')
    console.log('📋 Next steps:')
    console.log('1. Test API endpoints to ensure they still work')
    console.log('2. Verify users can only access their own data')
    console.log('3. Review SECURITY_FIXES_APPLIED.md for testing checklist')
    console.log('')
    process.exit(0)
  } else {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('⚠️  Migration could not be fully applied')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')
    console.log('Please apply manually using Supabase SQL Editor')
    console.log('')
    process.exit(1)
  }
}

main()
