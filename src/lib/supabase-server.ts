import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Singleton for server-side Supabase client using service-role credentials
let serverSupabase: SupabaseClient | null = null

function createServerClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) {
    throw new Error('SUPABASE_URL is not set. Check your environment configuration.')
  }

  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. Check your environment configuration.')
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
    },
  })
}

export function getServiceSupabaseClient(): SupabaseClient {
  if (serverSupabase) {
    return serverSupabase
  }

  serverSupabase = createServerClient()
  return serverSupabase
}
