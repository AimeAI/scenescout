import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
serve(async (req) => {
  const sp = new URL(req.url).searchParams
  const id = sp.get('id')
  if (!id) return new Response('missing id', { status: 400 })
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)
  const { data: e } = await supabase.from('events').select('id,title,starts_at,ends_at,venue_name').eq('id', id).single()
  if (!e) return new Response('not found', { status: 404 })
  const dt = new Date(e.starts_at).toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z'
  const end = (e.ends_at ? new Date(e.ends_at) : new Date(new Date(e.starts_at).getTime()+2*3600e3)).toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z'
  const ics = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//SceneScout//EN','BEGIN:VEVENT',
    `UID:${e.id}@scenescout`,
    `DTSTART:${dt}`,
    `DTEND:${end}`,
    `SUMMARY:${e.title}`,
    e.venue_name ? `LOCATION:${e.venue_name}` : '',
    'END:VEVENT','END:VCALENDAR'
  ].filter(Boolean).join('\r\n')
  return new Response(ics, { headers: { 'content-type': 'text/calendar; charset=utf-8' } })
})
