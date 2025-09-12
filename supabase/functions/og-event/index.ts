import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Simple OG: render SVG and return as PNG via resvg-wasm
import satori from "https://esm.sh/satori@0.10.14"
import initWasm, { Resvg } from "https://esm.sh/@resvg/resvg-wasm@2.6.2"
// @ts-ignore
import wasm from "https://cdn.jsdelivr.net/npm/@resvg/resvg-wasm@2.6.2/index_bg.wasm"

await initWasm(wasm)

serve(async (req) => {
  const sp = new URL(req.url).searchParams
  const id = sp.get('id')
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!)
  let title = 'SceneScout', subtitle = 'Don’t think, just go.'
  if (id) {
    const { data } = await supabase.from('events').select('title,starts_at').eq('id', id).single()
    title = data?.title || title
    subtitle = data?.starts_at ? new Date(data.starts_at).toLocaleString() : subtitle
  }
  const svg = await satori(
    { type: 'div', props: { children: [
      { type:'div', props:{ children:'SceneScout', style:{ fontSize: 22, opacity: 0.9 } } },
      { type:'div', props:{ children:[
        { type:'div', props:{ children: title, style:{ fontSize: 64, fontWeight: 700 } } },
        { type:'div', props:{ children: subtitle, style:{ fontSize: 28, opacity: 0.85 } } },
      ], style: { display:'flex', flexDirection:'column', gap: 12 } } },
      { type:'div', props:{ children:'Don’t think, just go.', style:{ fontSize: 22, opacity: 0.8 } } }
    ], style: { width: 1200, height: 630, color:'#fff', background: 'linear-gradient(135deg, #0B0B0C 0%, #111827 100%)', display:'flex', flexDirection:'column', justifyContent:'space-between', padding: 40 } } },
    { width: 1200, height: 630, fonts: [] }
  )
  const png = new Resvg(svg).render().asPng()
  return new Response(png, { headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=86400, s-maxage=86400' } })
})
