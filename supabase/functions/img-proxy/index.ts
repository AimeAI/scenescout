// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

serve(async (req) => {
  const url = new URL(req.url).searchParams.get('url')
  if (!url) return new Response('missing url', { status: 400 })
  try {
    const u = new URL(url)
    if (!['http:', 'https:'].includes(u.protocol)) return new Response('bad url', { status: 400 })
    const res = await fetch(u.toString(), { headers: { 'user-agent': 'SceneScoutImageProxy/1.0' } })
    if (!res.ok) return new Response('fetch error', { status: 502 })
    const ct = res.headers.get('content-type') || 'image/jpeg'
    const headers = new Headers({ 'content-type': ct, 'cache-control': 'public, max-age=86400, s-maxage=86400' })
    return new Response(res.body, { headers })
  } catch {
    return new Response('proxy error', { status: 500 })
  }
})
