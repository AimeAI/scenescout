import { readFileSync } from 'fs'
import { join } from 'path'

const SUPABASE_URL = 'https://ldgbjmotttuomxzwujrt.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZ2JqbW90dHR1b214end1anJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzY1MDE0MSwiZXhwIjoyMDczMjI2MTQxfQ.4W5qDG_2ljDj01Bqjw35EYlSfVIYy3GrCMGe1pLgMFc'

async function applyMigration() {
  console.log('🔄 Reading migration file...')

  const migrationPath = join(process.cwd(), 'supabase/migrations/20251020_fix_critical_rls_vulnerabilities_v3_SAFE.sql')
  const migrationSQL = readFileSync(migrationPath, 'utf-8')

  console.log(`📄 Migration size: ${migrationSQL.length} characters`)
  console.log('🚀 Applying RLS security migration via REST API...\n')

  // Split migration into individual statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 10 && !s.startsWith('--'))

  console.log(`📝 Found ${statements.length} SQL statements\n`)

  let successCount = 0
  let failCount = 0

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]

    // Skip pure comment blocks and DO blocks
    if (stmt.match(/^DO \$\$/) || stmt.match(/^BEGIN/) || stmt.match(/^END \$\$/)) {
      console.log(`[${i + 1}/${statements.length}] ⏭️  Skipping procedural block`)
      continue
    }

    console.log(`[${i + 1}/${statements.length}] Executing...`)

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ query: stmt + ';' })
      })

      if (!response.ok) {
        const error = await response.text()
        console.log(`   ❌ Failed (${response.status}): ${error.substring(0, 100)}`)
        failCount++
      } else {
        console.log('   ✅ Success')
        successCount++
      }
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`)
      failCount++
    }

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log(`\n📊 Migration Complete:`)
  console.log(`  ✅ Succeeded: ${successCount}`)
  console.log(`  ❌ Failed: ${failCount}`)

  if (failCount > successCount / 2) {
    console.log('\n⚠️  WARNING: Many statements failed. Migration may be incomplete.')
    console.log('Please apply manually via Supabase SQL Editor.')
    process.exit(1)
  }

  console.log('\n✅ Migration applied! Verifying RLS status...')

  // Verify RLS is enabled
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/pg_tables?schemaname=eq.public&tablename=in.(events,push_subscriptions,saved_events,event_reminders)&select=tablename,rowsecurity`,
      {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
        }
      }
    )

    if (response.ok) {
      const tables = await response.json()
      console.log('\n📋 RLS Status:')
      tables.forEach((table: any) => {
        console.log(`  ${table.rowsecurity ? '✅' : '❌'} ${table.tablename}`)
      })
    }
  } catch (error) {
    console.log('⚠️  Could not verify RLS status')
  }

  console.log('\n🎉 Please test the application to ensure everything works!')
}

applyMigration().catch(console.error)
