# SceneScout v14 Deployment Guide

This guide covers production deployment of SceneScout v14 using Vercel and Supabase.

## 📋 Prerequisites

Before deploying to production, ensure you have:

- ✅ Completed local development setup (see [SETUP.md](./SETUP.md))
- ✅ Tested all features locally
- ✅ Verified database schema and migrations
- ✅ Configured all required environment variables
- ✅ Set up external API keys and services
- ✅ Tested payment flows with Stripe
- ✅ Verified email configurations

## 🏗️ Deployment Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│     Vercel      │    │    Supabase      │    │   External      │
│   (Frontend)    │◄──►│   (Backend)      │◄──►│   Services      │
│                 │    │                  │    │                 │
│ • Next.js App   │    │ • PostgreSQL     │    │ • Stripe        │
│ • Static Assets │    │ • Auth           │    │ • Email (Resend)│
│ • API Routes    │    │ • Edge Functions │    │ • External APIs │
│ • Edge Runtime  │    │ • Real-time      │    │ • Image CDN     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🚀 Production Deployment Steps

### 1. Supabase Production Setup

#### Create Production Project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Create new project for production
3. Choose optimal region (closest to your users)
4. Set strong database password
5. Wait for project initialization

#### Configure Production Database

```bash
# Link to production project
supabase link --project-ref your_production_project_id

# Apply schema to production
npm run db:apply

# Verify schema applied correctly
supabase db diff
```

#### Setup Authentication

1. **Configure Site URLs:**
   ```
   Site URL: https://yourdomain.com
   Redirect URLs: 
   - https://yourdomain.com/auth/callback
   - https://yourdomain.com/**
   ```

2. **Configure OAuth Providers:**
   ```bash
   # GitHub OAuth
   - Client ID: your_production_github_client_id  
   - Client Secret: your_production_github_secret
   - Redirect URL: https://your-project.supabase.co/auth/v1/callback
   
   # Google OAuth  
   - Client ID: your_production_google_client_id
   - Client Secret: your_production_google_secret
   - Redirect URL: https://your-project.supabase.co/auth/v1/callback
   ```

3. **Configure Email Templates:**
   - Customize signup confirmation email
   - Set password reset email template
   - Configure sender name and email

#### Deploy Edge Functions

```bash
# Set production environment variables
supabase secrets set RESEND_API_KEY=your_production_resend_key
supabase secrets set OPENAI_API_KEY=your_production_openai_key
supabase secrets set TICKETMASTER_API_KEY=your_production_ticketmaster_key
supabase secrets set EVENTBRITE_TOKEN=your_production_eventbrite_token
supabase secrets set SONGKICK_API_KEY=your_production_songkick_key
supabase secrets set MEETUP_ACCESS_TOKEN=your_production_meetup_token
supabase secrets set GOOGLE_PLACES_API_KEY=your_production_google_places_key
supabase secrets set YELP_API_KEY=your_production_yelp_key
supabase secrets set CLOUDINARY_CLOUD_NAME=your_cloudinary_name
supabase secrets set CLOUDINARY_API_KEY=your_cloudinary_key
supabase secrets set CLOUDINARY_API_SECRET=your_cloudinary_secret

# Deploy all functions
supabase functions deploy

# Verify deployment
supabase functions list
```

#### Configure Cron Jobs

Set up cron schedules via Supabase dashboard:

```sql
-- Daily digest at 8 AM UTC
SELECT cron.schedule('daily-digest', '0 8 * * *', 'SELECT net.http_post(''https://your-project.supabase.co/functions/v1/daily_digest'', ''{"source": "cron"}'', ''application/json'')');

-- Reminders every 15 minutes
SELECT cron.schedule('event-reminders', '*/15 * * * *', 'SELECT net.http_post(''https://your-project.supabase.co/functions/v1/reminders'', ''{"source": "cron"}'', ''application/json'')');

-- Ticketmaster ingestion every 4 hours
SELECT cron.schedule('ingest-ticketmaster', '0 */4 * * *', 'SELECT net.http_post(''https://your-project.supabase.co/functions/v1/ingest_ticketmaster'', ''{"source": "cron"}'', ''application/json'')');

-- Image enrichment every 30 minutes
SELECT cron.schedule('enrich-images', '*/30 * * * *', 'SELECT net.http_post(''https://your-project.supabase.co/functions/v1/enrich_images'', ''{"source": "cron"}'', ''application/json'')');

-- Hotness ML every hour
SELECT cron.schedule('hotness-ml', '0 * * * *', 'SELECT net.http_post(''https://your-project.supabase.co/functions/v1/hotness_ml'', ''{"source": "cron"}'', ''application/json'')');
```

### 2. Stripe Production Setup

#### Configure Production Stripe

1. **Switch to Live Mode** in Stripe Dashboard
2. **Get Live API Keys:**
   - Publishable key (starts with `pk_live_`)
   - Secret key (starts with `sk_live_`)

3. **Create Products and Prices:**
   ```javascript
   // Free Plan
   {
     name: "SceneScout Free",
     prices: [{ unit_amount: 0, currency: "usd", recurring: { interval: "month" } }]
   }
   
   // Pro Plan
   {
     name: "SceneScout Pro", 
     prices: [{ unit_amount: 999, currency: "usd", recurring: { interval: "month" } }]
   }
   
   // Premium Plan
   {
     name: "SceneScout Premium",
     prices: [{ unit_amount: 1999, currency: "usd", recurring: { interval: "month" } }]
   }
   ```

4. **Configure Webhooks:**
   ```
   Endpoint URL: https://yourdomain.com/api/stripe/webhook
   Events:
   - customer.subscription.created
   - customer.subscription.updated  
   - customer.subscription.deleted
   - invoice.payment_succeeded
   - invoice.payment_failed
   - checkout.session.completed
   ```

5. **Tax Configuration:**
   - Enable Stripe Tax if required
   - Configure tax rates for your regions
   - Set up tax collection rules

### 3. Vercel Deployment

#### Connect Repository

1. **Fork/Clone Repository** to your GitHub account
2. **Connect to Vercel:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import from GitHub
   - Select your SceneScout repository

#### Environment Variables

Configure all environment variables in Vercel dashboard:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe Configuration  
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Authentication
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your_production_secret_key

# OAuth Providers
GITHUB_CLIENT_ID=your_production_github_id
GITHUB_CLIENT_SECRET=your_production_github_secret
GOOGLE_CLIENT_ID=your_production_google_id
GOOGLE_CLIENT_SECRET=your_production_google_secret

# External APIs (if used)
TICKETMASTER_API_KEY=your_ticketmaster_key
EVENTBRITE_TOKEN=your_eventbrite_token
SONGKICK_API_KEY=your_songkick_key
MEETUP_ACCESS_TOKEN=your_meetup_token
GOOGLE_PLACES_API_KEY=your_google_places_key
YELP_API_KEY=your_yelp_key
OPENAI_API_KEY=your_openai_key
RESEND_API_KEY=your_resend_key

# Image Processing
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key  
CLOUDINARY_API_SECRET=your_cloudinary_secret

# Application
NODE_ENV=production
```

#### Build Configuration

Verify `vercel.json` configuration:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "functions": {
    "src/app/api/stripe/webhook/route.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, POST, PUT, DELETE, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization" }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/api/img",
      "destination": "https://your-project.supabase.co/functions/v1/img-proxy"
    }
  ]
}
```

#### Deploy

1. **Deploy from Dashboard** or push to main branch
2. **Verify Build Success** 
3. **Test Production Site**

### 4. Domain Configuration

#### Custom Domain Setup

1. **Add Domain in Vercel:**
   - Go to Project Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

2. **DNS Configuration:**
   ```dns
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   
   Type: A  
   Name: @
   Value: 76.76.19.61
   ```

3. **SSL Certificate:**
   - Automatically provisioned by Vercel
   - Includes wildcard support for subdomains

#### Subdomain Configuration

For API or admin subdomains:

```dns
# api.yourdomain.com → Supabase
Type: CNAME
Name: api
Value: your-project.supabase.co

# admin.yourdomain.com → Vercel
Type: CNAME  
Name: admin
Value: cname.vercel-dns.com
```

### 5. Performance Optimization

#### CDN Configuration

Vercel automatically provides:
- Global CDN distribution
- Edge caching for static assets
- Image optimization
- Gzip compression

#### Cache Headers

Configure in `next.config.js`:

```javascript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control', 
            value: 'public, max-age=60, s-maxage=60'
          }
        ]
      }
    ]
  }
}
```

#### Database Performance

Optimize Supabase configuration:

```sql
-- Add database indexes for common queries
CREATE INDEX CONCURRENTLY idx_events_date_city ON events(event_date, city_id) WHERE is_active = true;
CREATE INDEX CONCURRENTLY idx_events_featured ON events(is_featured) WHERE is_featured = true;
CREATE INDEX CONCURRENTLY idx_user_events_user_favorite ON user_events(user_id, is_favorite);

-- Enable connection pooling
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
```

### 6. Monitoring & Analytics

#### Vercel Analytics

Enable in Vercel dashboard:
- Core Web Vitals monitoring
- Real User Metrics (RUM)
- Speed Insights
- Function performance metrics

#### Custom Monitoring

```typescript
// Add to app/layout.tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

#### Error Monitoring

Add Sentry or similar:

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
})
```

### 7. Security Configuration

#### Headers Security

```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection', 
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
]
```

#### Rate Limiting

```typescript
// middleware.ts
import { Ratelimit } from '@upstash/ratelimit'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 h')
})

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1'
  const { success, limit, reset, remaining } = await ratelimit.limit(ip)

  if (!success) {
    return new Response('Rate limit exceeded', { 
      status: 429,
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': new Date(reset).toISOString()
      }
    })
  }
}
```

### 8. Backup & Recovery

#### Database Backups

Supabase provides automatic backups:
- Point-in-time recovery (PITR) 
- Daily automated backups
- Manual backup creation

```bash
# Create manual backup
supabase db dump --local > backup.sql

# Restore from backup  
supabase db reset
psql -h localhost -p 54322 -U postgres -d postgres < backup.sql
```

#### Code Backups

Ensure code is backed up:
- GitHub repository with proper branching
- Vercel deployment history
- Environment variables documented

### 9. Testing Production

#### Pre-deployment Checklist

- [ ] All environment variables configured
- [ ] Database schema applied successfully  
- [ ] Edge functions deployed and working
- [ ] Stripe webhooks receiving events
- [ ] OAuth providers configured
- [ ] Email notifications working
- [ ] Cron jobs scheduled
- [ ] SSL certificate active
- [ ] Performance metrics acceptable

#### Load Testing

```bash
# Install artillery for load testing
npm install -g artillery

# Create test configuration
cat > load-test.yml << EOF
config:
  target: https://yourdomain.com
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Browse events"
    requests:
      - get:
          url: "/"
      - get:
          url: "/feed"
      - get:
          url: "/city/new-york"
EOF

# Run load test
artillery run load-test.yml
```

#### Monitoring Setup

```bash
# Set up uptime monitoring
curl -X POST "https://api.uptimerobot.com/v2/newMonitor" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "api_key=your_api_key&format=json&type=1&url=https://yourdomain.com&friendly_name=SceneScout Production"
```

## 🔄 Deployment Workflows

### Continuous Deployment

Configure GitHub Actions for automated deployment:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test
        
      - name: Build application
        run: npm run build
        
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### Environment Promotion

```bash
# Staging to Production deployment
npm run build
npm run test:production
vercel --prod

# Database migration
supabase db push --linked
```

## 🚨 Rollback Procedures

### Application Rollback

```bash
# Rollback to previous Vercel deployment
vercel rollback --timeout 30s

# Rollback specific deployment
vercel rollback https://scenescout-abc123.vercel.app
```

### Database Rollback

```bash
# Point-in-time recovery
supabase db restore --target-time "2024-01-15 10:30:00+00"

# Restore from specific backup
supabase db restore --backup-id backup_123456789
```

## 📈 Post-Deployment

### Launch Checklist

- [ ] Test all user flows end-to-end
- [ ] Verify payment processing
- [ ] Test email notifications  
- [ ] Check mobile responsiveness
- [ ] Validate SEO metadata
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify analytics tracking
- [ ] Test cron job execution
- [ ] Validate API responses

### Maintenance Tasks

#### Daily
- Monitor error rates and logs
- Check cron job execution
- Review performance metrics
- Monitor payment processing

#### Weekly  
- Review user feedback
- Update content and events
- Check security alerts
- Optimize database queries

#### Monthly
- Update dependencies
- Review and rotate secrets
- Analyze usage patterns
- Plan feature updates

---

**For additional deployment support and troubleshooting, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) or contact support.**