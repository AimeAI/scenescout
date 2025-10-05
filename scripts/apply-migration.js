const https = require('https')
const fs = require('fs')
const path = require('path')

// Read .env.local
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')

let SUPABASE_URL, SUPABASE_ANON_KEY

envContent.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    SUPABASE_URL = line.split('=')[1].trim()
  }
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
    SUPABASE_ANON_KEY = line.split('=')[1].trim()
  }
})

console.log('🔑 URL:', SUPABASE_URL)
console.log('🔑 Anon Key length:', SUPABASE_ANON_KEY.length)

// Read migration SQL
const migrationSQL = fs.readFileSync('/tmp/migrate.sql', 'utf-8')

console.log('\n📋 Migration SQL:')
console.log('---')
console.log(migrationSQL)
console.log('---\n')

console.log('⚠️  Supabase REST API does not support DDL (ALTER TABLE) with anon key.')
console.log('\n✅ MANUAL STEPS REQUIRED:')
console.log('\n1. Open Supabase SQL Editor:')
console.log('   https://supabase.com/dashboard/project/ldgbjmotttuomxzwujrt/sql/new')
console.log('\n2. Paste this SQL:')
console.log('---')
console.log(migrationSQL)
console.log('---')
console.log('\n3. Click "Run"')
console.log('\n4. Then run: curl -X POST http://localhost:3000/api/admin/refresh-cache')
