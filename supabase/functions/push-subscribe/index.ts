import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
serve(async (req) => {
  const body = await req.json().catch(()=>null)
  if (!body?.user_id || !body?.endpoint || !body?.p256dh || !body?.auth) return new Response('missing fields', { status: 400 })
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
  const { error } = await supabase.from("push_subscriptions").upsert(body)
  if (error) return new Response(error.message, { status: 400 })
  return new Response('ok')
})
