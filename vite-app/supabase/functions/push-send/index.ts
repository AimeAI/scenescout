// Note: for production, consider sending push from a Node worker using web-push.
// This function is left as a placeholder to call an external sender or integrate a Deno web-push lib.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
serve(() => new Response(JSON.stringify({ ok: false, note: "Implement server-side push sender (Node) as per v14 spec." }), { headers:{ "content-type":"application/json" } }))
