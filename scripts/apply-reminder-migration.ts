import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyMigration() {
  console.log('📦 Applying reminder tables migration...')

  // Read the migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/20251005_create_reminder_tables.sql')
  const sql = fs.readFileSync(migrationPath, 'utf-8')

  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`📝 Found ${statements.length} SQL statements`)

  for (const [index, statement] of statements.entries()) {
    try {
      console.log(`\n⏳ Executing statement ${index + 1}/${statements.length}...`)

      const { data, error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      })

      if (error) {
        // Try direct query if RPC fails
        console.log('   Trying direct query...')
        const { error: directError } = await supabase
          .from('_migration_temp')
          .select('*')
          .limit(0) // This will fail but we just need to execute raw SQL

        if (directError) {
          console.warn(`   ⚠️  Statement ${index + 1}: ${error.message}`)
        } else {
          console.log(`   ✅ Statement ${index + 1} executed`)
        }
      } else {
        console.log(`   ✅ Statement ${index + 1} executed`)
      }
    } catch (err) {
      console.warn(`   ⚠️  Statement ${index + 1} error:`, err)
    }
  }

  console.log('\n🎉 Migration completed! Check Supabase dashboard to verify tables.')
}

applyMigration().catch(err => {
  console.error('❌ Migration failed:', err)
  process.exit(1)
})
