import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(url, key)

async function checkTable() {
  console.log('🔍 Checking push_subscriptions table...')

  // Try to query the table
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .limit(1)

  if (error) {
    console.error('❌ Table does not exist or query failed:', error.message)
    console.log('\n📋 Need to create table. Run this SQL in Supabase dashboard:')
    console.log('https://supabase.com/dashboard/project/ldgbjmotttuomxzwujrt/sql/new')
    console.log('\nSQL:')
    console.log(`
-- Create push_subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  endpoint TEXT NOT NULL UNIQUE,
  keys JSONB NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Public access policy
CREATE POLICY "Anyone can manage their push subscriptions" ON push_subscriptions
  FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);
`)
    return
  }

  console.log('✅ push_subscriptions table exists!')
  console.log('📊 Current subscriptions:', data?.length || 0)

  if (data && data.length > 0) {
    console.log('\n📋 Sample subscription:')
    console.log(JSON.stringify(data[0], null, 2))
  }
}

checkTable()
