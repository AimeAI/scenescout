# SceneScout — React Adapter Pack (v14R)

This pack adapts the **SceneScout v14** spec (originally Next.js App Router) to **React + Vite + TypeScript** for Lovable.

## What’s included
- **React Router** routes mirroring the Next pages: `/feed`, `/city/:slug/map`, `/city/:slug/wall`, `/plan`, `/plan/:id`, `/account`, `/pricing`, `/admin/*`, `/submit`, `/submit/venue`.
- **Supabase client** (`src/lib/supabaseClient.ts`) using `import.meta.env.*` variables (works with Lovable’s Supabase integration).
- **Service worker** for push: `public/sw.js`.
- **Image proxy + ICS + OG Image** moved to **Supabase Edge Functions** (`supabase/functions/*`).
- **Components** ported to React (no Next-only APIs).

## Env (Vite / Lovable)
Use these in Lovable env settings or `.env` in local Vite:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_NEXT_PUBLIC_BASE_URL` (for OG links)
- `VITE_VAPID_PUBLIC_KEY`

Server-side/Edge (set in Supabase):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

## Supabase Edge Functions (Deno)
Deploy the functions in `supabase/functions/`:
- `img-proxy` — GET remote images and cache (replaces Next `/api/img`).
- `ics` — Return an ICS for an event (replaces Next `/api/ics`).
- `og-event` — Generate OG PNG with Satori (replaces Next `/og/event`). 
- `push-subscribe` — Save push subscription.
- `push-send` — Send push to a user (uses Web Push; Node alt script provided in original spec).

## Routing
Vite + React Router is used. See `src/router.tsx` and `src/main.tsx`.

## Using with Lovable
1. Create a **React + Vite + TS** project in Lovable, enable **Supabase** (green button).
2. Upload this zip and merge `src/**`, `public/sw.js`, and `supabase/functions/**` into the project.
3. Set env vars (above) in Lovable and Supabase.
4. Use the **Lovable Super Prompt (React)** from the chat to scaffold any remaining UI wrappers (Tailwind, theme, nav).
