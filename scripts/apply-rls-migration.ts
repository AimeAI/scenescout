import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('   SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  console.log('🔄 Reading migration file...')

  const migrationPath = join(process.cwd(), 'supabase/migrations/20251020_fix_critical_rls_vulnerabilities_v3_SAFE.sql')
  const migrationSQL = readFileSync(migrationPath, 'utf-8')

  console.log(`📄 Migration file size: ${migrationSQL.length} characters`)
  console.log('🚀 Applying RLS security migration...\n')

  try {
    // Execute the migration SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_string: migrationSQL
    })

    if (error) {
      console.error('❌ Migration failed:', error.message)

      // Try alternative method - split by semicolons and execute one by one
      console.log('\n🔄 Trying alternative execution method...')

      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      console.log(`📝 Found ${statements.length} SQL statements\n`)

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i]
        if (stmt.length < 20) continue // Skip very short statements

        console.log(`[${i + 1}/${statements.length}] Executing...`)

        const { error: stmtError } = await supabase.rpc('exec_sql', {
          sql_string: stmt + ';'
        })

        if (stmtError) {
          console.error(`   ❌ Failed: ${stmtError.message}`)
          console.error(`   SQL: ${stmt.substring(0, 100)}...`)
        } else {
          console.log('   ✅ Success')
        }
      }

      return
    }

    console.log('✅ Migration applied successfully!')
    console.log('\n📊 Verifying RLS status...')

    // Verify RLS is enabled on key tables
    const { data: rlsCheck, error: rlsError } = await supabase
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('schemaname', 'public')
      .in('tablename', ['events', 'push_subscriptions', 'saved_events', 'event_reminders'])

    if (rlsError) {
      console.error('⚠️  Could not verify RLS status:', rlsError.message)
    } else {
      console.log('\nRLS Status:')
      rlsCheck?.forEach((table: any) => {
        console.log(`  ${table.rowsecurity ? '✅' : '❌'} ${table.tablename}`)
      })
    }

    console.log('\n🎉 Migration complete! Please test the application.')

  } catch (err: any) {
    console.error('❌ Unexpected error:', err.message)
    process.exit(1)
  }
}

applyMigration()
