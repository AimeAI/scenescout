# Environment Variables Setup Guide

This guide will help you configure all required environment variables for SceneScout.

## Quick Start

1. **Copy the example file:**
   ```bash
   cp .env.example .env.local
   ```

2. **Validate your configuration:**
   ```bash
   npm run validate:env
   ```

3. **Fix any errors shown in the validation report**

---

## Required Variables

### ✅ Core Application

#### `NODE_ENV`
- **Description:** Application environment
- **Example:** `development`
- **Values:** `development`, `production`, `test`
- **Where to get it:** Set automatically, or manually for local development

---

### ✅ Supabase Database (REQUIRED)

#### `NEXT_PUBLIC_SUPABASE_URL`
- **Description:** Your Supabase project URL
- **Example:** `https://your-project.supabase.co`
- **Where to get it:**
  1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
  2. Select your project
  3. Go to Settings → API
  4. Copy the "Project URL"

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Description:** Supabase anonymous (public) key
- **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Where to get it:**
  1. Same location as URL above
  2. Copy the "anon" key under "Project API keys"
- **Security:** Safe to expose to the client (respects RLS policies)

#### `SUPABASE_SERVICE_ROLE_KEY`
- **Description:** Supabase service role key (server-side only)
- **Example:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Where to get it:**
  1. Same location as URL above
  2. Copy the "service_role" key under "Project API keys"
- **⚠️ SECURITY:** NEVER expose this key to the client! Server-side only!

---

## Optional Variables

### External APIs (Optional - App works without these)

#### `TICKETMASTER_API_KEY`
- **Description:** Ticketmaster API key for enhanced event data
- **Where to get it:**
  1. Go to [Ticketmaster Developer Portal](https://developer.ticketmaster.com/)
  2. Create an account
  3. Create a new app
  4. Copy the API key
- **Without it:** App will work but won't fetch Ticketmaster events

#### `EVENTBRITE_OAUTH_TOKEN`
- **Description:** Eventbrite OAuth token for event ingestion
- **Where to get it:**
  1. Go to [Eventbrite API](https://www.eventbrite.com/platform/)
  2. Create an app
  3. Generate an OAuth token
- **Without it:** App will work but won't fetch Eventbrite events

#### `OPENAI_API_KEY`
- **Description:** OpenAI API key for AI-powered categorization
- **Where to get it:**
  1. Go to [OpenAI Platform](https://platform.openai.com/)
  2. Create an account
  3. Go to API keys
  4. Create a new secret key
- **Without it:** Events will use rule-based categorization instead

---

### Push Notifications (Optional Feature)

#### `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- **Description:** VAPID public key for push notifications
- **How to generate:**
  ```bash
  npx web-push generate-vapid-keys
  ```
- **Without it:** Push notifications won't work

#### `VAPID_PRIVATE_KEY`
- **Description:** VAPID private key for push notifications
- **How to generate:** Same command as above (comes in pair)
- **⚠️ SECURITY:** Server-side only! Never expose to client!

#### `VAPID_SUBJECT`
- **Description:** Contact info for push notification service
- **Example:** `mailto:support@scenescout.com`
- **Default:** `mailto:noreply@scenescout.com`

---

### Payments (Optional Feature)

#### `STRIPE_SECRET_KEY`
- **Description:** Stripe secret key for payment processing
- **Where to get it:**
  1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
  2. Get your API keys
  3. Use test key for development: `sk_test_...`
- **Without it:** Payment features won't work

#### `STRIPE_WEBHOOK_SECRET`
- **Description:** Stripe webhook signing secret
- **Where to get it:**
  1. Stripe Dashboard → Developers → Webhooks
  2. Add endpoint
  3. Copy the signing secret
- **Without it:** Webhook verification will fail

---

### Monitoring & Alerts (Optional)

#### `SLACK_WEBHOOK_URL`
- **Description:** Slack webhook URL for alerts
- **Where to get it:**
  1. Go to your Slack workspace
  2. Create an Incoming Webhook app
  3. Copy the webhook URL
- **Without it:** No Slack alerts (system still works)

#### `LOG_ENDPOINT`
- **Description:** External logging endpoint
- **Example:** `https://logs.example.com/ingest`
- **Without it:** Local logging only

---

### Security

#### `CRON_SECRET`
- **Description:** Secret for authenticating cron job requests
- **How to generate:**
  ```bash
  openssl rand -base64 32
  ```
- **Without it:** Cron jobs won't be authenticated (security risk)

---

### Cache Configuration

#### `CACHE_TTL_MINUTES`
- **Description:** Cache time-to-live in minutes
- **Default:** `30`
- **Example:** `60`

#### `CACHE_MAX_ITEMS`
- **Description:** Maximum number of cached items
- **Default:** `500`
- **Example:** `1000`

---

## Feature Flags

All feature flags default to `true` if not specified.

- `NEXT_PUBLIC_FEATURE_CACHED_EVENTS` - Enable event caching
- `NEXT_PUBLIC_FEATURE_DAILY_SHUFFLE` - Enable personalized shuffle
- `NEXT_PUBLIC_FEATURE_SAVED_EVENTS` - Enable saved events
- `NEXT_PUBLIC_FEATURE_THUMBS` - Enable thumbs up/down
- `NEXT_PUBLIC_FEATURE_TRACKING_V1` - Enable analytics tracking
- `NEXT_PUBLIC_FEATURE_PRICE_V2` - Enable price display v2

Set to `false` to disable a feature.

---

## Validation

### Manual Validation
```bash
npm run validate:env
```

### Auto-validation on Build
The validation runs automatically when you build:
```bash
npm run build
```

### Validation Report Format

```
════════════════════════════════════════════════════════════
Environment Variable Validation Report
════════════════════════════════════════════════════════════

❌ Environment validation failed

Found 2 error(s):

━ Supabase Database ━

  ❌ NEXT_PUBLIC_SUPABASE_URL
     Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL

     💡 Suggestion:
        Add NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co to your .env file
        Description: Supabase project URL
```

---

## Programmatic Access

Use the type-safe environment helpers:

```typescript
import { supabase, apis, features } from '@/lib/env'

// Access Supabase config
const url = supabase.url
const anonKey = supabase.anonKey

// Check if API is configured
import { hasApiKey } from '@/lib/env'
if (hasApiKey('ticketmaster')) {
  // Use Ticketmaster API
}

// Check feature flags
if (features.savedEvents) {
  // Show saved events UI
}
```

---

## Security Best Practices

### ✅ DO:
- ✅ Use `.env.local` for local development (gitignored)
- ✅ Use environment-specific files (`.env.development`, `.env.production`)
- ✅ Store secrets in secure environment variable managers (Vercel, Railway, etc.)
- ✅ Validate environment on startup
- ✅ Use different keys for development and production

### ❌ DON'T:
- ❌ Commit `.env` or `.env.local` to git
- ❌ Expose service role keys to the client
- ❌ Use production keys in development
- ❌ Share API keys in public repositories
- ❌ Use placeholder values in production

---

## Troubleshooting

### "Missing required environment variable"

1. Check if `.env.local` exists
2. Verify the variable name matches exactly (case-sensitive)
3. Make sure there are no extra spaces around `=`
4. Restart your development server

### "Invalid value for environment variable"

1. Check the format matches the example
2. Remove any quotes around the value (unless the example has them)
3. Make sure you're not using placeholder values like `your-api-key`

### "Environment variable is still using placeholder value"

You have a placeholder value like `TODO_XXX` or `your-api-key`. Replace it with a real value or remove the variable if it's optional.

### Variables not loading

```bash
# Check which .env files are being loaded
npm run validate:env
```

The output will show which files are loaded and in what order.

---

## Environment File Priority

Next.js loads environment files in this order (later files override earlier ones):

1. `.env` - Committed to git, shared defaults
2. `.env.local` - Local overrides (gitignored)
3. `.env.development` / `.env.production` - Environment-specific
4. `.env.development.local` / `.env.production.local` - Local env overrides

**Recommended setup:**
- `.env.example` - Template with placeholder values (commit this)
- `.env.local` - Your actual values (gitignored)

---

## Getting Help

If you're still having issues:

1. Run the validation: `npm run validate:env`
2. Check the error messages - they include suggestions
3. Review this guide for the specific variable
4. Check [Supabase docs](https://supabase.com/docs) for Supabase-related issues
5. Open an issue with the validation output

---

## Example .env.local

```bash
# Core
NODE_ENV=development

# Supabase (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# External APIs (Optional)
TICKETMASTER_API_KEY=your-ticketmaster-key
EVENTBRITE_OAUTH_TOKEN=your-eventbrite-token
OPENAI_API_KEY=sk-...

# Push Notifications (Optional)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BMl8...
VAPID_PRIVATE_KEY=abc123...
VAPID_SUBJECT=mailto:support@scenescout.com

# Security
CRON_SECRET=your-random-secret-here

# Feature Flags (Optional)
NEXT_PUBLIC_FEATURE_CACHED_EVENTS=true
NEXT_PUBLIC_FEATURE_DAILY_SHUFFLE=true
NEXT_PUBLIC_FEATURE_SAVED_EVENTS=true
```

---

**Last Updated:** 2025-10-20
