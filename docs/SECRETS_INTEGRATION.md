# SceneScout v14 - Secrets & Integration Guide

This document provides a comprehensive checklist of all API keys, secrets, and integration points required for SceneScout v14.

## 🔐 Required Secrets Checklist

### 🟢 Core Infrastructure (Required)

#### Supabase Configuration
```bash
# Get these from Supabase Dashboard > Settings > API
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co  
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Where to find:**
- Supabase Dashboard → Project Settings → API
- Copy "Project URL" and "Project API keys"

#### Web Push Notifications
```bash
# Generated via: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=BOG2444pP0y_vAdzKvrTQ-GPfwCfl_XjExZ6eyX8Ze4M4Yg3hZGL4_HXqMbKSyY61UrdB0Ze6ueewBDZgTcPjyY
VAPID_PRIVATE_KEY=u2SRPGaSrDJDYg5NnNTshmxJrNvQEQstCHopWwz2hY0
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BOG2444pP0y_vAdzKvrTQ-GPfwCfl_XjExZ6eyX8Ze4M4Yg3hZGL4_HXqMbKSyY61UrdB0Ze6ueewBDZgTcPjyY
```

**Setup steps:**
1. Run `npx web-push generate-vapid-keys`
2. Copy public key to both VAPID_PUBLIC_KEY and NEXT_PUBLIC_VAPID_PUBLIC_KEY
3. Copy private key to VAPID_PRIVATE_KEY

---

### 🟡 Payment Processing (Optional Now, Required for Billing)

#### Stripe Integration
```bash
# Stripe Dashboard > Developers > API Keys
STRIPE_SECRET_KEY=sk_test_...  # Live: sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Live: pk_live_...

# Create a recurring price in Stripe Dashboard > Products
NEXT_PUBLIC_STRIPE_PRICE_ID=price_...

# Stripe Dashboard > Developers > Webhooks
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Setup steps:**
1. Create Stripe account at [stripe.com](https://stripe.com)
2. Get API keys from Dashboard → Developers → API Keys
3. Create a product with recurring pricing
4. Set up webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
5. Copy webhook signing secret

---

### 🟡 Email Service (Optional Now, Required for Notifications)

#### Resend Integration
```bash
# Resend Dashboard > API Keys
RESEND_API_KEY=re_...
```

**Setup steps:**
1. Create account at [resend.com](https://resend.com)
2. Verify your domain or use resend.dev for testing
3. Create API key in dashboard
4. Add your domain to verified senders

---

### 🟡 Event Data Sources (Optional Now, Required for Content)

#### Ticketmaster Discovery API
```bash
# Ticketmaster Developer Portal
TICKETMASTER_API_KEY=your-api-key-here
TICKETMASTER_API_SECRET=your-secret-here
```

**Setup steps:**
1. Register at [developer.ticketmaster.com](https://developer.ticketmaster.com)
2. Create an app and get API key
3. Rate limit: 5,000 requests/day

#### Eventbrite API
```bash
# Eventbrite App Management
EVENTBRITE_API_KEY=your-private-token-here
```

**Setup steps:**
1. Create account at [eventbrite.com](https://eventbrite.com)
2. Go to Account Settings → Developer Links → App Management
3. Create a new app and get Private Token
4. Rate limit: 1,000 requests/hour

#### Songkick API
```bash
# Songkick API Documentation
SONGKICK_API_KEY=your-api-key-here
```

**Setup steps:**
1. Register at [songkick.com/developer](https://www.songkick.com/developer)
2. Get API key from developer account
3. Rate limit: 60 requests/minute

#### Meetup API
```bash
# Meetup Pro Account required
MEETUP_API_KEY=your-api-key-here
```

**Setup steps:**
1. Requires Meetup Pro account
2. Get API key from [secure.meetup.com/meetup_api](https://secure.meetup.com/meetup_api)
3. Rate limit: 200 requests/hour

---

### 🟡 Venue Data Sources (Optional Now, Required for Venues)

#### Google Places API
```bash
# Google Cloud Console
GOOGLE_PLACES_API_KEY=your-api-key-here
```

**Setup steps:**
1. Create project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable Places API
3. Create credentials (API Key)
4. Restrict key to Places API
5. Enable billing (required for production usage)

#### Yelp Fusion API
```bash
# Yelp Developers
YELP_API_KEY=your-api-key-here
```

**Setup steps:**
1. Create account at [yelp.com/developers](https://www.yelp.com/developers)
2. Create an app and get API key
3. Rate limit: 5,000 requests/day

---

### 🟡 AI Features (Optional Now, Required for ML)

#### OpenAI API
```bash
# OpenAI Platform
OPENAI_API_KEY=sk-...
```

**Setup steps:**
1. Create account at [platform.openai.com](https://platform.openai.com)
2. Add billing information
3. Create API key
4. Used for image analysis and ML features

---

## 🔧 Integration Setup Priority

### Phase 1: Core Development
✅ **Required for basic development:**
- Supabase credentials
- VAPID keys (generated)
- Basic .env setup

### Phase 2: Content Integration
📋 **Required for full event data:**
- At least one event source (Ticketmaster OR Eventbrite)
- At least one venue source (Google Places OR Yelp)
- Email service (Resend)

### Phase 3: Production Features
💼 **Required for production:**
- Stripe for payments
- All event sources for comprehensive data
- OpenAI for AI features
- Full monitoring and analytics

---

## 🌍 Environment Configuration

### Development (.env.local)
```bash
# Core
SUPABASE_URL=your-dev-project-url
SUPABASE_SERVICE_ROLE_KEY=your-dev-service-key
NEXT_PUBLIC_SUPABASE_URL=your-dev-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-dev-anon-key

# Base URL for development
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Environment
NODE_ENV=development
```

### Production (Vercel Environment Variables)
```bash
# Core - same as development but with production Supabase
SUPABASE_URL=your-prod-project-url
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-key
NEXT_PUBLIC_SUPABASE_URL=your-prod-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-prod-anon-key

# Production URL
NEXT_PUBLIC_BASE_URL=https://yourapp.vercel.app

# Environment
NODE_ENV=production

# All API keys (same as development or production versions)
```

---

## 🔒 Security Best Practices

### API Key Management
- ✅ Never commit API keys to version control
- ✅ Use environment variables for all secrets
- ✅ Rotate keys regularly (quarterly recommended)
- ✅ Use different keys for development/production
- ✅ Restrict API keys by domain/IP when possible

### Supabase Security
- ✅ Enable Row Level Security (RLS) on all tables
- ✅ Use service role key only on server-side
- ✅ Configure proper CORS settings
- ✅ Review database permissions regularly

### Stripe Security  
- ✅ Use webhook signatures to verify requests
- ✅ Never log sensitive payment information
- ✅ Use test mode for development
- ✅ Enable fraud detection features

---

## 🚨 Troubleshooting Common Issues

### "Supabase connection failed"
- ✅ Verify URL format: `https://abcdefgh.supabase.co`
- ✅ Check API key is service role key (starts with `eyJ`)
- ✅ Ensure database is accessible (not paused)

### "API rate limit exceeded"
- ✅ Check current usage in provider dashboards
- ✅ Implement caching to reduce API calls
- ✅ Stagger requests across time periods

### "VAPID keys not working"
- ✅ Ensure same public key in both variables
- ✅ Regenerate keys if corrupted
- ✅ Check service worker is properly registered

### "Environment variables not loading"
- ✅ File should be `.env` not `.env.txt`
- ✅ No spaces around equals: `KEY=value` not `KEY = value`
- ✅ Restart development server after changes

---

## 📊 Quick Setup Verification

Run the verification script to check your setup:

```bash
npm run verify-setup
# or
node scripts/verify-setup.js
```

This will check:
- ✅ All required files exist
- ✅ Environment variables are configured
- ✅ Database connection works
- ✅ API endpoints are accessible
- ✅ Build process completes successfully

---

## 🆘 Support & Resources

### Official Documentation
- [Supabase Docs](https://supabase.com/docs)
- [Next.js 14 Docs](https://nextjs.org/docs)
- [Stripe Integration](https://stripe.com/docs/nextjs)

### Community Support
- Supabase Discord
- Next.js GitHub Discussions
- Stack Overflow with relevant tags

### SceneScout Specific
- Check `docs/TROUBLESHOOTING.md` for common issues
- Run verification script for detailed diagnostics
- Review edge function logs in Supabase Dashboard

---

**Last Updated**: January 2024  
**Next Review**: Quarterly  
**Maintainer**: Development Team