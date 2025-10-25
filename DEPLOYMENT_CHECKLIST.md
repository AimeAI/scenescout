# 🚀 SceneScout Beta Deployment Checklist

## Pre-Deployment Tasks

### 1. ✅ Console Errors - FIXED
- [x] Sentry debug bundle warning - Fixed (set debug: false)
- [x] Missing module error - Fixed (removed example file)
- [x] 500 error on homepage - Resolved (clean build)

**Note:** Console errors only appear in development. Production builds are clean.

---

### 2. 🔧 Database Migrations (REQUIRED)

Apply these migrations in Supabase Dashboard → SQL Editor:

```bash
# Order matters - apply in sequence:

1. supabase/migrations/20251020_fix_critical_rls_vulnerabilities_v3_SAFE.sql
2. supabase/migrations/20251022_create_beta_feedback_table.sql
3. supabase/migrations/20251022_performance_indexes.sql
4. supabase/migrations/20251022_beta_access_system.sql
5. supabase/migrations/20251022_gdpr_compliance.sql
```

**How to apply:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in left sidebar
4. Click "New Query"
5. Copy/paste each migration file contents
6. Click "Run" button
7. Verify "Success" message
8. Repeat for all 5 migrations

---

### 3. 🔑 Environment Variables

Add these to **Vercel Dashboard** → Your Project → Settings → Environment Variables:

#### Required (Core Functionality)
```bash
# Supabase (ALREADY SET)
NEXT_PUBLIC_SUPABASE_URL=https://ldgbjmotttuomxzwujrt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# APIs (ALREADY SET)
NEXT_PUBLIC_TICKETMASTER_API_KEY=your_ticketmaster_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

#### Optional (Analytics & Monitoring)
```bash
# PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_your_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Sentry Error Tracking
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=your_auth_token
SENTRY_ORG=your_org_slug
SENTRY_PROJECT=scenescout

# Resend Email Notifications
RESEND_API_KEY=re_your_key_here
RESEND_FROM_EMAIL=noreply@scenescout.app
```

#### Optional (Beta Access & Admin)
```bash
# Beta Access Control
NEXT_PUBLIC_BETA_ENABLED=false  # Set to "true" to enable invite-only mode
ADMIN_EMAILS=your-email@example.com
ADMIN_BEARER_TOKEN=your-secret-token
CRON_SECRET=your-cron-secret
```

---

### 4. 🔍 SEO Setup

#### Vercel Configuration
Your site will be publicly accessible at:
- Production: `https://your-project.vercel.app`
- Custom domain (if added): `https://scenescout.app`

#### Google Search Console
1. Go to https://search.google.com/search-console
2. Add your Vercel URL
3. Verify ownership (use DNS or HTML file method)
4. Submit sitemap: `https://your-site.vercel.app/sitemap.xml`

#### Robots.txt
Already configured at `/public/robots.txt`:
```
User-agent: *
Allow: /

# Disallow admin and API routes
Disallow: /api/
Disallow: /admin/

Sitemap: https://your-domain.com/sitemap.xml
```

**After deployment:** Update sitemap URL in robots.txt with your real domain

---

### 5. 📧 Email Setup (If Using Resend)

#### Get API Key
1. Sign up at https://resend.com
2. Create new API key
3. Add to Vercel environment variables

#### Verify Domain (For Production)
1. Go to Resend Dashboard → Domains
2. Add your domain (scenescout.app)
3. Add DNS records provided by Resend:
   - SPF record
   - DKIM record
   - Custom tracking domain (optional)
4. Wait for verification (usually 1-2 hours)

#### Test Email
Once deployed, test with:
```bash
curl -X POST https://your-site.vercel.app/api/beta/request-access \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'
```

---

### 6. 📊 Analytics Setup (If Using PostHog)

#### Get API Key
1. Sign up at https://posthog.com (free tier available)
2. Create new project
3. Copy Project API Key (starts with `phc_`)
4. Add to Vercel environment variables

#### PostHog Dashboard
After deployment:
1. Events will start appearing in PostHog dashboard
2. Create insights for key metrics:
   - Event views
   - Saved events
   - Search queries
   - User signups
3. Set up funnels:
   - Homepage → Search → Event View → Save
   - Onboarding completion rate

---

### 7. 🚨 Error Monitoring (If Using Sentry)

#### Get Credentials
1. Sign up at https://sentry.io
2. Create new project (Next.js)
3. Copy DSN (starts with `https://`)
4. Create auth token for releases
5. Add all to Vercel environment variables

#### Sentry Dashboard
After deployment:
1. Errors will appear automatically
2. Set up alerts for critical errors
3. Configure release tracking
4. Enable performance monitoring

---

### 8. 🧪 Pre-Deployment Testing

Run these commands locally:

```bash
# 1. Clean build test
npm run build

# 2. Test production mode locally
npm start

# 3. Check for TypeScript errors
npm run typecheck

# 4. Run linter
npm run lint

# 5. Test API endpoints
curl http://localhost:3000/api/search-events?q=concert&limit=5

# 6. Verify sitemap
curl http://localhost:3000/sitemap.xml

# 7. Check robots.txt
curl http://localhost:3000/robots.txt
```

All should pass before deploying!

---

### 9. 🌐 Deploy to Vercel

#### Option 1: Git Deploy (Recommended)
```bash
# Commit changes
git add .
git commit -m "feat: complete beta launch roadmap"
git push origin main

# Vercel will auto-deploy if connected to GitHub
```

#### Option 2: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

#### Option 3: Vercel Dashboard
1. Go to https://vercel.com/new
2. Import your Git repository
3. Configure project settings
4. Add environment variables
5. Click "Deploy"

---

### 10. ✅ Post-Deployment Verification

#### Check These URLs
- [ ] Homepage: `https://your-site.vercel.app`
- [ ] Search: `https://your-site.vercel.app/search`
- [ ] Event detail: `https://your-site.vercel.app/events/test-id`
- [ ] API health: `https://your-site.vercel.app/api/health`
- [ ] Sitemap: `https://your-site.vercel.app/sitemap.xml`
- [ ] Robots: `https://your-site.vercel.app/robots.txt`

#### Test Features
- [ ] Search for events
- [ ] Save an event
- [ ] Set a reminder
- [ ] Export calendar (.ics download)
- [ ] Submit feedback (feedback widget)
- [ ] Install PWA (mobile)
- [ ] Test offline mode
- [ ] Privacy settings (cookie consent)
- [ ] Data export

#### Monitor Services
- [ ] Check Vercel Logs for errors
- [ ] Check Sentry for crashes
- [ ] Check PostHog for events
- [ ] Check Supabase for database activity

---

## Common Issues & Solutions

### Issue: "Module not found" errors
**Solution:**
```bash
rm -rf .next node_modules
npm install
npm run build
```

### Issue: Environment variables not working
**Solution:**
- Vercel: Redeploy after adding/updating env vars
- Local: Restart dev server after changing `.env.local`

### Issue: Database queries failing
**Solution:**
- Verify all migrations applied in Supabase
- Check RLS policies are active
- Verify service role key is correct

### Issue: Sentry not capturing errors
**Solution:**
- Verify DSN is set correctly
- Check Sentry project settings
- Ensure source maps are uploaded (Vercel does this automatically)

### Issue: PostHog not tracking
**Solution:**
- Check browser console for blocked requests
- Verify API key starts with `phc_`
- Disable ad blockers during testing
- Check PostHog project settings

---

## Vercel & Google Search

**Yes, Google can see Vercel sites!**

Vercel sites are fully public and crawlable by search engines. In fact:
- ✅ Vercel has excellent SEO performance
- ✅ Static pages are pre-rendered (great for SEO)
- ✅ Fast load times (improves ranking)
- ✅ Automatic HTTPS (ranking factor)
- ✅ Global CDN (better Core Web Vitals)

**To improve Google visibility:**
1. Submit sitemap to Google Search Console
2. Get backlinks from other sites
3. Share on social media
4. Create quality content
5. Optimize meta tags (already done!)

---

## Performance Expectations

After deployment, you should see:

- **Lighthouse Score:** 85-95 (Performance)
- **First Load:** < 2 seconds
- **SEO Score:** 95-100
- **PWA Score:** 90-100
- **Accessibility:** 90-95

---

## Support & Documentation

If you encounter issues, check:
- `/POSTHOG_SETUP.md` - Analytics setup
- `/SENTRY_SETUP.md` - Error monitoring
- `/BETA_INVITE_SETUP.md` - Beta access system
- `/GDPR_COMPLIANCE_SETUP.md` - Privacy features
- `/DATABASE_PERFORMANCE_OPTIMIZATION.md` - DB optimization

---

## Ready to Deploy? ✅

Once you've completed:
1. ✅ Applied database migrations
2. ✅ Set environment variables in Vercel
3. ✅ Tested locally (`npm run build && npm start`)
4. ✅ Committed code to Git

Then:
```bash
git push origin main
# or
vercel --prod
```

**Your app is production-ready!** 🎉
