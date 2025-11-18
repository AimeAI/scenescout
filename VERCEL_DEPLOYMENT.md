# SceneScout - Vercel Deployment Guide

## Quick Deploy to Vercel via GitHub

### Step 1: Go to Vercel
1. Visit **https://vercel.com/new**
2. Login with your GitHub account

### Step 2: Import Repository
1. Click **"Import Git Repository"**
2. Search for **"AimeAI/scenescout"**
3. Click **"Import"**

### Step 3: Configure Project
- **Project Name:** scenescout (or custom name)
- **Framework Preset:** Next.js (auto-detected)
- **Root Directory:** `./` (default)
- **Build Command:** `npm run build` (default)

### Step 4: Add Environment Variables

Click **"Environment Variables"** and add ALL of these:

#### API Keys (Required for events)
```
TICKETMASTER_API_KEY=3DsSM2m9sXBDf8P5uuYnksqs8AwQ7hG6
TICKETMASTER_CONSUMER_KEY=3DsSM2m9sXBDf8P5uuYnksqs8AwQ7hG6
TICKETMASTER_CONSUMER_SECRET=pWOchFMiZ1ZYqCVQ

EVENTBRITE_PRIVATE_TOKEN=X2O44MNDA2V5OAZILC7C
EVENTBRITE_TOKEN=X2O44MNDA2V5OAZILC7C
EVENTBRITE_API_KEY=HJADY7ISSGOPPI6IBQ
```

#### Supabase (Required for database)
```
SUPABASE_URL=https://ldgbjmotttuomxzwujrt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZ2JqbW90dHR1b214end1anJ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzY1MDE0MSwiZXhwIjoyMDczMjI2MTQxfQ.4W5qDG_2ljDj01Bqjw35EYlSfVIYy3GrCMGe1pLgMFc

NEXT_PUBLIC_SUPABASE_URL=https://ldgbjmotttuomxzwujrt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkZ2JqbW90dHR1b214end1anJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NTAxNDEsImV4cCI6MjA3MzIyNjE0MX0.-Egs3tytI55SyURyPLzKe-FQpDGpOpUyPdQ7YJkbeh0
```

#### Feature Flags (Required)
```
NEXT_PUBLIC_FEATURE_DYNAMIC_CATEGORIES=false
NEXT_PUBLIC_FEATURE_ENGAGEMENT_PRICING=true
NEXT_PUBLIC_PRICE_FALLBACK_LABEL=tickets
NEXT_PUBLIC_FEATURE_TRACKING_V1=true
NEXT_PUBLIC_FEATURE_PERSONALIZED_RAILS=true
NEXT_PUBLIC_PERSONALIZED_RAILS_MAX=3
NEXT_PUBLIC_PERSONALIZED_RAILS_MIN_EVENTS=4
NEXT_PUBLIC_PERSONALIZED_RAILS_MIN_INTERACTIONS=5
NEXT_PUBLIC_PERSONALIZED_DISCOVERY_FLOOR=0.3
NEXT_PUBLIC_PERSONALIZED_VETO_THRESHOLD=2
NEXT_PUBLIC_FEATURE_SEEN_STORE=true
NEXT_PUBLIC_SEEN_STORE_TTL_DAYS=14
NEXT_PUBLIC_FEATURE_FILTER_CHIPS_V1=true
NEXT_PUBLIC_FEATURE_SIDEBAR_V1=true
NEXT_PUBLIC_FEATURE_SAVED_V1=true
NEXT_PUBLIC_FEATURE_DAILY_SHUFFLE=true
NEXT_PUBLIC_FEATURE_CACHED_EVENTS=false
```

#### Push Notifications (Optional)
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BDfjDNa6RXKPdsSQnKEP-H3Z4oQAWHd7lDj13z8WGR7Ul5ZeyVTbF7oDlniBCFv_BQ1FwhsIZhjR8B8a5qU8T8E
VAPID_PRIVATE_KEY=GZEBUO8T2A498TWxBFFZgBStLJfAKw8g9ukl1A8F2EY
VAPID_SUBJECT=mailto:support@scenescout.app
```

#### Other Settings
```
CRON_SECRET=scenescout_cron_secret_2025
DAILY_SHUFFLE_SEED_SCOPE=city
CACHE_TTL_MINUTES=30
CACHE_MAX_ITEMS=2000
NEXT_PUBLIC_DYNAMIC_CORE_LIMIT=18
NEXT_PUBLIC_DYNAMIC_RAILS_LIMIT=5
NEXT_PUBLIC_DYNAMIC_SPAWN_THRESHOLD=0.4
NEXT_PUBLIC_DYNAMIC_SUNSET_DAYS=7
```

### Step 5: Deploy
1. Click **"Deploy"**
2. Wait 2-3 minutes for build to complete
3. You'll get a URL like: `https://scenescout.vercel.app`

### Step 6: Auto-Deploy Setup
Once deployed, Vercel will automatically:
- Redeploy whenever you push to `main` branch
- Build previews for pull requests
- Provide deployment logs

## What's Included in This Deployment

### Features Working:
- 16 event categories (Concerts, Theatre, Art, etc.)
- Underground category with RA.co events (43+ events)
- Real-time event scraping from:
  - Ticketmaster
  - EventBrite
  - RA.co GraphQL API
- User preferences/saved events
- Push notifications
- PWA support
- Mobile responsive

### Recent Updates:
- RA.co GraphQL API integration for underground electronic events
- Fixed dynamic categories interfering with user preferences
- Underground category returning 20+ real events from RA.co
- Disabled AI-generated categories for stable UX

## Troubleshooting

### If categories don't load:
Check that `NEXT_PUBLIC_FEATURE_DYNAMIC_CATEGORIES=false` is set

### If no events show:
Verify all API keys are added correctly in Vercel dashboard

### If build fails:
Check build logs in Vercel dashboard for missing environment variables

## Custom Domain (Optional)

To add a custom domain:
1. Go to your Vercel project settings
2. Click **"Domains"**
3. Add your domain (e.g., `scenescout.app`)
4. Follow DNS configuration instructions

## Monitoring

View your deployment:
- **Dashboard:** https://vercel.com/dashboard
- **Logs:** Real-time function logs available in Vercel
- **Analytics:** Built-in analytics for traffic monitoring

---

**Last Updated:** November 2025
**Deployment Status:** Ready for production
**Main Branch:** https://github.com/AimeAI/scenescout
