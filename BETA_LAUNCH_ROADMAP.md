# SceneScout Beta Launch Roadmap

**Current Status**: ✅ Core functionality working, events loading successfully
**Target**: Production-ready beta with 200-500 users
**Timeline**: 4 weeks (20 focused prompts)
**Last Updated**: 2025-10-20

---

## 📊 Quick Stats

- **Total Source Files**: 292 TypeScript/TSX files
- **API Endpoints**: 34 routes
- **Database Migrations**: 10 migrations (RLS fixes applied)
- **Environment Variables**: 39 variables (needs validation)
- **Current State**: Events loading, both Ticketmaster + EventBrite working

---

## Phase 1: Security & Stability (Week 1) 🔒

**Goal**: Lock down security vulnerabilities and ensure data protection
**Priority**: CRITICAL - Must complete before any beta launch

### Task 1.1: Complete RLS Security Audit
**Prompt**: "Verify all Supabase RLS policies are correctly applied. Run the migration `/supabase/migrations/20251020_fix_critical_rls_vulnerabilities.sql` in Supabase dashboard. Test each policy by attempting unauthorized access to: push_subscriptions, saved_events, event_reminders, events table. Document any policy failures and fix them."

**Files to Check**:
- All migrations in `/supabase/migrations/`
- Test with different user contexts (anon, authenticated, service_role)

**Success Criteria**:
- ✅ All tables have RLS enabled
- ✅ Users can only access their own data (saved events, reminders, subscriptions)
- ✅ Public can read events but not modify
- ✅ Service role has appropriate admin access
- ✅ No data leaks when testing with curl/Postman

---

### Task 1.2: Environment Variable Validation
**Prompt**: "Create `/src/lib/env-validation.ts` that validates ALL required environment variables on app startup. For each of the 39 environment variables found in the codebase, categorize as: REQUIRED (app won't work), OPTIONAL (degrades gracefully), or FEATURE_FLAG. Use Zod for validation. Add clear error messages that tell users EXACTLY which variables are missing and where to get them (e.g., 'Get TICKETMASTER_API_KEY from https://developer.ticketmaster.com'). Call this validation in `/src/app/layout.tsx` and `/src/app/api/*/route.ts` files. Log warnings for missing optional vars."

**Environment Variables to Validate**:
```typescript
// REQUIRED
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
TICKETMASTER_API_KEY
EVENTBRITE_TOKEN

// OPTIONAL
OPENAI_API_KEY (AI features)
STRIPE_SECRET_KEY (payments)
SLACK_WEBHOOK_URL (alerts)
PUSHER_KEY (real-time features)
VAPID keys (push notifications)

// FEATURE FLAGS (all NEXT_PUBLIC_FEATURE_*)
```

**Success Criteria**:
- ✅ App crashes with clear error message if required vars missing
- ✅ Warning logs for missing optional vars
- ✅ `.env.example` file created with all variables documented
- ✅ README updated with setup instructions

---

### Task 1.3: Rate Limiting & API Error Handling
**Prompt**: "Implement comprehensive rate limiting for all external APIs (Ticketmaster, EventBrite). Current issue: Ticketmaster returns 429 errors frequently (see logs). Create `/src/lib/rate-limiter.ts` with exponential backoff (1s, 2s, 4s, 8s, max 30s). Track rate limit resets using headers. Add request queuing to batch calls. Update `/src/app/api/ticketmaster/search/route.ts` and `/src/app/api/eventbrite/search/route.ts` to use the rate limiter. Log all 429 errors to a new `api_rate_limits` Supabase table for monitoring. Add `/src/lib/retry.ts` for automatic retries with jitter."

**Current Problems** (from server logs):
```
Ticketmaster API error: 429 Too Many Requests
⚠️  Ticketmaster rate limit exceeded. Resets at: 2025-10-21T01:50:21.409Z
```

**Implementation**:
- Track requests per minute per API
- Respect `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers
- Queue requests when approaching limit
- Circuit breaker pattern for repeated failures

**Success Criteria**:
- ✅ No more 429 errors in production logs
- ✅ Graceful degradation when APIs are rate-limited
- ✅ User sees "Loading more events..." instead of errors
- ✅ Monitoring dashboard shows API health

---

### Task 1.4: Error Boundaries & User-Friendly Errors
**Prompt**: "Add React error boundaries to all major page components. Create `/src/components/error-boundary.tsx` that catches errors and shows user-friendly messages. For different error types show different UIs: 404 (cute 'nothing here' message), 500 (retry button), network errors (offline indicator), API errors (specific message like 'Events temporarily unavailable'). Add error boundaries to: `/src/app/page.tsx` (homepage), `/src/app/category/[slug]/page.tsx`, `/src/app/events/[id]/page.tsx`, `/src/app/search/page.tsx`. Log all errors to Supabase `error_logs` table with user context."

**Reference Design**: Ver

cel-style error pages

**Components Needed**:
```tsx
<ErrorBoundary fallback={<ErrorPage />}>
  <EventsList />
</ErrorBoundary>
```

**Success Criteria**:
- ✅ App never shows white screen of death
- ✅ Users get actionable error messages
- ✅ Errors logged for debugging
- ✅ "Try again" button works

---

### Task 1.5: Authentication Edge Cases
**Prompt**: "Fix authentication edge cases in `/src/lib/supabase/client.ts`. Test and fix: 1) Expired session (should refresh automatically or redirect to login), 2) Concurrent logins from multiple devices (invalidate old sessions), 3) Logout doesn't clear all state (clear localStorage, IndexedDB, cookies), 4) Session persists after password change (force re-auth). Add session monitoring that checks validity every 5 minutes. Add 'Session expired, please login' toast. Test on iOS Safari (has aggressive session clearing) and Chrome incognito mode."

**Current Issues**:
- Users report getting logged out randomly
- Saved events disappear after session expires
- Concurrent sessions cause sync issues

**Success Criteria**:
- ✅ Sessions refresh automatically before expiring
- ✅ Users stay logged in for 7 days (configurable)
- ✅ Logout clears all data completely
- ✅ No "ghost" sessions on multiple devices

---

### Task 1.6: Input Validation & Sanitization
**Prompt**: "Add comprehensive input validation using Zod for all user-submitted data. Create schemas in `/src/lib/validation/schemas.ts` for: event search queries (max 200 chars, no SQL injection), user profiles (email format, username alphanumeric), event submissions (URL validation, date ranges), saved events (prevent duplicate saves). Use DOMPurify for HTML sanitization in event descriptions. Update all API routes to validate inputs before database operations. Return 400 errors with specific field errors (not generic 'bad request')."

**Attack Vectors to Prevent**:
- SQL injection in search queries
- XSS in event descriptions
- CSRF in form submissions
- Rate limit bypass on event saves

**Files to Update**:
- `/src/app/api/search-events/route.ts` - already has basic validation
- `/src/app/api/saved-events/route.ts`
- `/src/app/api/reminders/create/route.ts`

**Success Criteria**:
- ✅ All API endpoints validate inputs
- ✅ Malicious input caught before reaching database
- ✅ Clear error messages for invalid data
- ✅ No 500 errors from bad input

---

## Phase 2: Core UX & Critical Features (Week 2) 🎨

**Goal**: Polish user experience and fill gaps in critical user journeys

### Task 2.1: Loading States & Skeletons
**Prompt**: "Add professional loading skeletons using `react-loading-skeleton` for all async operations. Create skeleton components in `/src/components/skeletons/`: EventCardSkeleton, EventDetailSkeleton, CategoryRailSkeleton, SearchResultsSkeleton, VenueCardSkeleton. Make them match the real component layouts exactly. Add shimmer animation. Update these components to show skeletons while loading: EventsList, CategoryRail, EventDetail, SearchResults, VenueDetails. Use Suspense boundaries where appropriate. Test that skeletons show for at least 300ms (don't flash)."

**Reference**: Airbnb, Netflix loading patterns

**Success Criteria**:
- ✅ No layout shift when loading completes
- ✅ Skeletons match real component size/shape
- ✅ Smooth shimmer animation
- ✅ Accessible (screen reader announces loading state)

---

### Task 2.2: Empty States
**Prompt**: "Create compelling empty states for all 'no data' scenarios. Design components in `/src/components/empty-states/`: NoEventsFound (suggest broader search), NoSavedEvents (show featured events), NoRecommendations (explain how to get recommendations), NoSearchResults (suggest spelling check). Each should have: emoji/illustration, friendly heading, explanation text, and CTA button. Add to: homepage if no categories load, search page if no results, saved events page, recommendations section, category pages. Use Framer Motion for subtle entrance animation."

**Empty State Scenarios**:
1. No events in category → "No jazz events right now, try 'music'"
2. No saved events → "Save your first event! 💾"
3. No search results → "No events found for 'xyzabc'"
4. No recommendations → "Interact with 5+ events to get recommendations"
5. Location not found → "We couldn't find events in your area"

**Success Criteria**:
- ✅ Users never see blank white space
- ✅ Every empty state has actionable next step
- ✅ Illustrations/emojis are tasteful
- ✅ Copy is friendly but not condescending

---

### Task 2.3: Mobile Responsive Fixes
**Prompt**: "Audit mobile responsiveness and fix all issues for iOS Safari and Android Chrome. Test on real devices or BrowserStack. Fix: 1) Touch targets must be minimum 44x44px (check all buttons, cards, nav items), 2) Horizontal scrolling on category rails should use native scroll (remove custom JS), 3) Fixed bottom nav should respect safe-area insets on iPhone, 4) Input fields should not zoom on focus (font-size min 16px), 5) Images should lazy load below fold, 6) Modals should prevent body scroll. Test swipe gestures for: swipe to dismiss modals, swipe left/right on event cards, pull-to-refresh on homepage. Use Tailwind `touch-action` classes."

**Known Mobile Issues**:
- Bottom nav overlaps iPhone home indicator
- Category scrolling janky on Android
- Search input causes page zoom on iPhone
- Event cards too small to tap accurately

**Test Matrix**:
| Device | OS | Browser | Status |
|--------|----|---------| -------|
| iPhone 15 | iOS 17 | Safari | ❌ |
| Pixel 8 | Android 14 | Chrome | ❌ |
| Galaxy S23 | Android 13 | Chrome | ❌ |

**Success Criteria**:
- ✅ All touch targets 44x44px minimum
- ✅ No horizontal scroll bugs
- ✅ Safe area respected on all devices
- ✅ Smooth 60fps scrolling

---

### Task 2.4: Onboarding Flow
**Prompt**: "Create 3-step onboarding flow for new users. Build components in `/src/components/onboarding/`: Step1LocationSelect (detect or manual entry with map preview), Step2InterestsPicker (select 5+ categories with visual cards), Step3FeatureTour (swipeable carousel showing key features). Use Framer Motion for slide transitions. Store progress in localStorage so users can resume. Show onboarding only on first visit (check localStorage 'onboarding_completed'). Add skip button but track who skips. After completion, show personalized welcome message with their selected categories. Test that onboarding is under 60 seconds to complete."

**Onboarding Steps**:
1. **Location**: "Where are you based?" → Auto-detect or manual select
2. **Interests**: "What are you into?" → Show 18 category cards, select 5+
3. **Tour**: "Here's how it works" → 3 swipeable slides with features

**Tracking Events**:
- onboarding_started
- onboarding_step_completed
- onboarding_skipped
- onboarding_finished

**Success Criteria**:
- ✅ Completes in <60 seconds
- ✅ >80% completion rate (not skipped)
- ✅ Results in better personalized feed
- ✅ Mobile-friendly swipe gestures

---

### Task 2.5: Beta Feedback Widget
**Prompt**: "Add in-app feedback widget using a lightweight library or custom implementation. Create `/src/components/feedback/FeedbackWidget.tsx` with floating button (bottom right, doesn't block content). Modal should collect: feedback text (required), screenshot (auto-capture using html2canvas), current URL, user info if logged in, browser/device info. Submit to Supabase `beta_feedback` table. Add keyboard shortcut: Cmd/Ctrl + Shift + F to open. Show success toast after submission. Add admin dashboard at `/admin/feedback` to view submissions (protected route, service role only). Widget should be dismissible and remember preference."

**Feedback Form Fields**:
```typescript
{
  type: 'bug' | 'feature' | 'other',
  message: string,  // required, max 500 chars
  screenshot: string | null,  // base64
  url: string,
  userAgent: string,
  userId: string | null,
  metadata: {
    viewport: { width, height },
    timestamp: string,
    appVersion: string
  }
}
```

**Success Criteria**:
- ✅ Widget loads in <100ms
- ✅ Doesn't block any UI interactions
- ✅ Screenshot captures current view
- ✅ Submissions appear in admin dashboard
- ✅ Email notification sent to team

---

### Task 2.6: Calendar Export Fixes
**Prompt**: "Fix ICS calendar export functionality to work with Google Calendar, Apple Calendar, and Outlook. Current implementation in `/src/lib/calendar/ics.ts` may have timezone or formatting issues. Test export for single event and for multiple saved events. Fix: 1) Timezone formatting (use VTIMEZONE), 2) All-day events vs timed events, 3) Event description with HTML stripped, 4) Venue location in LOCATION field, 5) Add VALARM for reminders (30min before). Add 'Add to Calendar' button on event detail page with dropdown for: Google Calendar (URL), Apple Calendar (.ics download), Outlook (.ics download). Test each calendar app on desktop and mobile. Add analytics to track which calendar types are popular."

**ICS Format Issues**:
```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SceneScout//Event//EN
BEGIN:VEVENT
UID:event-123@scenescout.app
DTSTAMP:20250121T120000Z
DTSTART:20250125T190000Z  # Need timezone
DTEND:20250125T220000Z
SUMMARY:Concert at The Roxy
LOCATION:The Roxy Theatre, 932 Granville St
DESCRIPTION:Amazing show!
END:VEVENT
END:VCALENDAR
```

**Test Matrix**:
| Calendar | Platform | Status |
|----------|----------|--------|
| Google Calendar | Web | ❌ |
| Apple Calendar | macOS | ❌ |
| Outlook | Windows | ❌ |
| iOS Calendar | iPhone | ❌ |

**Success Criteria**:
- ✅ Events import correctly to all 3 major calendars
- ✅ Timezones display correctly
- ✅ All event details preserved
- ✅ "Add to Calendar" has >10% click rate

---

## Phase 3: Performance & Polish (Week 3) ⚡

**Goal**: Optimize for speed and create production-grade user experience

### Task 3.1: Performance Optimization
**Prompt**: "Analyze and optimize bundle size and page load performance. Run `npm run analyze` to visualize bundle. Goals: 1) Homepage initial load <2s on 3G, 2) First Contentful Paint <1.5s, 3) Time to Interactive <3s. Implement: code splitting with dynamic imports for heavy components (Framer Motion, charts, map), lazy load images with blur placeholders using Next.js Image, remove unused dependencies (check bundle analyzer), tree-shake lodash (use lodash-es), defer non-critical CSS, add preload hints for critical resources. Use Lighthouse CI in GitHub Actions to prevent performance regressions. Test on slow 3G throttling."

**Current Bundle Analysis**:
```bash
npm run build -- --profile
# Check output for bundle sizes
```

**Optimization Targets**:
- Main bundle: <200KB gzipped
- Each route chunk: <50KB gzipped
- Images: WebP format, lazy loaded
- Fonts: Preloaded, subset for Latin only

**Lazy Load Candidates**:
```tsx
const EventMap = dynamic(() => import('@/components/EventMap'), {
  loading: () => <MapSkeleton />,
  ssr: false
})
```

**Success Criteria**:
- ✅ Lighthouse score >90 (mobile)
- ✅ Bundle size reduced by 30%
- ✅ Homepage loads in <2s on 3G
- ✅ No CLS (Cumulative Layout Shift)

---

### Task 3.2: Database Query Optimization
**Prompt**: "Analyze slow database queries and optimize. Enable Supabase query logging. Look for N+1 queries, missing indexes, and slow aggregations. Queries to optimize: 1) Event search by location (use PostGIS indexes), 2) User saved events with event details (use join instead of multiple queries), 3) Trending events calculation (add materialized view), 4) Category event counts (add cached counts). Create indexes on: `events(category, date)`, `events(lat, lng)` using GIST, `saved_events(user_id, created_at)`. Add query result caching using Vercel KV or Redis for: trending events (5min TTL), category counts (10min TTL), featured events (30min TTL). Monitor query performance with Supabase dashboard."

**Slow Queries Identified**:
```sql
-- Find nearby events (missing spatial index)
SELECT * FROM events
WHERE ST_Distance(
  ST_MakePoint(lng, lat),
  ST_MakePoint(-79.39, 43.84)
) < 50000
ORDER BY date ASC
LIMIT 100;

-- Saved events (N+1 problem)
SELECT * FROM saved_events WHERE user_id = $1;
-- Then for each: SELECT * FROM events WHERE id = $2;
```

**Indexes to Add**:
```sql
CREATE INDEX CONCURRENTLY idx_events_location ON events USING GIST(ST_MakePoint(lng, lat));
CREATE INDEX CONCURRENTLY idx_events_category_date ON events(category, date) WHERE deleted_at IS NULL;
CREATE INDEX CONCURRENTLY idx_saved_events_user ON saved_events(user_id, created_at);
```

**Success Criteria**:
- ✅ All queries <100ms p95
- ✅ Homepage loads with 3 queries max (not 20+)
- ✅ Cached queries return in <10ms
- ✅ Supabase CPU usage <50%

---

### Task 3.3: PWA Optimization
**Prompt**: "Fix Progressive Web App manifest and service worker for offline functionality. Update `/public/manifest.json` with correct icons (192x192, 512x512), app name, theme colors. Test service worker in `/public/sw.js` caches critical assets: homepage, event images, API responses for saved events. Use workbox for service worker generation. Add offline fallback page showing cached events. Test: install PWA on iOS (add to home screen), Android (install prompt), check offline mode works. Add 'Install App' banner for users on mobile browsers. Track PWA install rate in analytics."

**PWA Manifest**:
```json
{
  "name": "SceneScout - Discover Local Events",
  "short_name": "SceneScout",
  "description": "Never miss out on what's happening in your city",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#7c3aed",
  "background_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

**Service Worker Strategy**:
- **Cache First**: Images, fonts, static assets
- **Network First**: API calls, user data
- **Stale While Revalidate**: Event lists

**Success Criteria**:
- ✅ PWA installs on iOS and Android
- ✅ Offline mode shows saved events
- ✅ App feels native when installed
- ✅ >10% of users install PWA

---

### Task 3.4: SEO Basics
**Prompt**: "Add proper SEO meta tags and structured data for event pages. Update `/src/app/layout.tsx` with default meta tags (title, description, OG image). For each event page `/src/app/events/[id]/page.tsx`, generate dynamic meta tags with event name, description, image, date, venue. Add JSON-LD structured data for Event schema (https://schema.org/Event). Include: name, startDate, endDate, location (Place schema), image, description, offers (price). Add sitemap.xml generation for all events and categories. Test with Google Rich Results Test. Add robots.txt allowing all. Ensure all images have alt text. Add canonical URLs to prevent duplicate content."

**Meta Tags Template**:
```tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const event = await getEvent(params.id)

  return {
    title: `${event.name} | SceneScout`,
    description: event.description.slice(0, 160),
    openGraph: {
      title: event.name,
      description: event.description,
      images: [event.image_url],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: event.name,
      description: event.description,
      images: [event.image_url],
    },
  }
}
```

**Structured Data**:
```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Jazz Night at The Roxy",
  "startDate": "2025-01-25T19:00:00-08:00",
  "endDate": "2025-01-25T22:00:00-08:00",
  "location": {
    "@type": "Place",
    "name": "The Roxy Theatre",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "932 Granville St",
      "addressLocality": "Vancouver",
      "addressRegion": "BC",
      "postalCode": "V6Z 1L2"
    }
  },
  "image": "https://scenescout.app/events/jazz-night.jpg",
  "description": "Amazing jazz performance...",
  "offers": {
    "@type": "Offer",
    "price": "35.00",
    "priceCurrency": "CAD"
  }
}
```

**Success Criteria**:
- ✅ Event pages appear in Google rich results
- ✅ Social media shares show correct preview
- ✅ Sitemap has all events
- ✅ Search console shows no errors

---

### Task 3.5: Image Optimization
**Prompt**: "Implement comprehensive image optimization across the app. Replace all `<img>` tags with Next.js `<Image>` component. Configure image loader in `next.config.js` to use Supabase Storage or Cloudinary. Generate WebP and AVIF versions for all images. Add responsive image sizes based on viewport (mobile: 400px, tablet: 800px, desktop: 1200px). Lazy load all images below the fold with blur placeholders (use `placeholder='blur'`). Add image CDN caching headers (Cache-Control: public, max-age=31536000). Optimize event poster images: compress to <100KB, crop to 16:9 aspect ratio, add fallback placeholder. Test with Lighthouse image audit."

**Image Optimization Config**:
```ts
// next.config.js
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    domains: ['supabase.co', 'ticketmaster.com', 'eventbrite.com'],
    loader: 'default',
  },
}
```

**Image Component Usage**:
```tsx
<Image
  src={event.image_url}
  alt={event.name}
  width={400}
  height={225}
  placeholder="blur"
  blurDataURL={event.blur_placeholder}
  loading="lazy"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

**Success Criteria**:
- ✅ All images use WebP/AVIF
- ✅ Lighthouse image score >90
- ✅ Images load progressively
- ✅ Total image size reduced by 60%

---

## Phase 4: Beta Infrastructure (Week 4) 📊

**Goal**: Set up monitoring, analytics, and production infrastructure

### Task 4.1: Analytics Setup
**Prompt**: "Integrate PostHog (or Mixpanel) for comprehensive event tracking. Create `/src/lib/analytics/posthog.ts` wrapper. Track these events: page_view, event_search, event_click, event_save, event_share, category_view, swipe_left, swipe_right, filter_applied, notification_enabled. Add user properties: location, interests, join_date, total_saves. Create custom dashboards for: user acquisition funnel, event engagement rates, category popularity, feature usage. Add A/B test framework for testing: homepage layouts, event card designs, CTA copy. Respect user privacy: anonymize IPs, honor Do Not Track, allow opt-out. Add GDPR-compliant consent banner (required before tracking)."

**Events to Track**:
```typescript
// Page views
analytics.track('page_view', {
  page: '/events/123',
  referrer: document.referrer
})

// Interactions
analytics.track('event_save', {
  event_id: '123',
  event_name: 'Jazz Night',
  category: 'music-concerts'
})

// Searches
analytics.track('event_search', {
  query: 'jazz toronto',
  results_count: 42,
  filters: { category: 'music' }
})
```

**Custom Properties**:
```typescript
analytics.identify(userId, {
  location: 'Toronto, ON',
  interests: ['music', 'food', 'art'],
  join_date: '2025-01-20',
  lifetime_saves: 12,
  plan: 'free'
})
```

**Success Criteria**:
- ✅ All key interactions tracked
- ✅ Dashboard shows user funnel
- ✅ A/B tests running successfully
- ✅ Privacy compliant (GDPR, CCPA)

---

### Task 4.2: Error Monitoring with Sentry
**Prompt**: "Set up Sentry error tracking with proper source maps and context. Install `@sentry/nextjs` and configure in `sentry.client.config.ts` and `sentry.server.config.ts`. Capture: unhandled errors, API failures, React errors, console errors in production. Add breadcrumbs for: page navigations, API calls, user clicks. Tag errors with: environment (staging/production), user ID, browser, device type. Set up error alerts: Slack notification for >10 errors/hour, email for critical errors. Add performance monitoring for slow transactions (>3s). Create Sentry release on each deploy to track error rates by version. Test error capture works in production."

**Sentry Configuration**:
```typescript
// sentry.client.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event, hint) {
    // Anonymize user data
    if (event.user) {
      delete event.user.email
      delete event.user.ip_address
    }
    return event
  },
  ignoreErrors: [
    /Network request failed/,
    /ResizeObserver loop/
  ]
})
```

**Error Context**:
```typescript
Sentry.setContext('event_details', {
  event_id: currentEvent.id,
  category: currentEvent.category
})

Sentry.setUser({
  id: user.id,
  username: user.username
  // No email or PII
})
```

**Success Criteria**:
- ✅ All errors captured in Sentry
- ✅ Source maps uploaded for each deploy
- ✅ Alerts configured in Slack
- ✅ Error rate trending downward

---

### Task 4.3: Beta Access Control
**Prompt**: "Implement invite-code system for beta access with usage tracking. Create `beta_invites` table in Supabase with fields: code, created_by, max_uses, used_count, expires_at, status. Add middleware in `/src/middleware.ts` to check for valid invite code on signup. Create admin dashboard at `/admin/invites` to: generate new codes, view usage stats, revoke codes. Add public `/join` page where users enter invite code before signup. Track metrics: invite conversion rate, time to first event view, retention by invite source. Allow existing users to generate 3 invite codes to share. Add waitlist signup for users without invite codes (save to `waitlist` table)."

**Beta Invites Table**:
```sql
CREATE TABLE beta_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,  -- e.g., "BETAJAZZ2025"
  created_by UUID REFERENCES auth.users(id),
  max_uses INTEGER DEFAULT 10,
  used_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',  -- active, expired, revoked
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB  -- source, campaign, notes
);

CREATE TABLE beta_signups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  invite_code TEXT REFERENCES beta_invites(code),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Invite Code Flow**:
1. User visits `/join` or tries to sign up
2. Prompted to enter invite code
3. Validate code (not expired, uses remaining)
4. Allow signup, increment used_count
5. Track user acquisition source

**Success Criteria**:
- ✅ Only users with valid codes can sign up
- ✅ Admin can generate and manage codes
- ✅ Invite usage tracked accurately
- ✅ Waitlist captures interested users

---

### Task 4.4: Email Notifications with Resend
**Prompt**: "Set up Resend for transactional emails with beautiful templates. Create email templates in `/emails/` using React Email: WelcomeEmail (sent after signup), EventRecommendationsEmail (weekly digest of personalized events), ReminderEmail (24h before saved event), WeeklyDigestEmail (summary of upcoming events in city). Use Tailwind CSS for email styling. Configure Resend API in `/src/lib/email/resend.ts`. Add email preferences page at `/settings/notifications` where users can: toggle email types, set digest frequency, unsubscribe from all. Create cron job at `/app/api/cron/send-digests/route.ts` to send weekly emails. Track email metrics: open rate, click rate, unsubscribe rate. Test emails render correctly in Gmail, Outlook, Apple Mail."

**Email Templates**:

```tsx
// emails/Welcome.tsx
export function WelcomeEmail({ userName, topEvents }) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to SceneScout! Here's what's happening...</Preview>
      <Body className="bg-gray-50 font-sans">
        <Container className="mx-auto p-8">
          <Text className="text-2xl font-bold">
            Welcome to SceneScout, {userName}! 🎉
          </Text>
          <Text className="text-gray-600">
            We found {topEvents.length} events you might love...
          </Text>
          {topEvents.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
          <Button href="https://scenescout.app">
            Explore All Events
          </Button>
        </Container>
      </Body>
    </Html>
  )
}
```

**Email Triggers**:
- Welcome: On signup
- Weekly Digest: Every Monday 9am local time
- Reminder: 24h before event (if user saved it)
- Recommendations: When 5+ new events match interests

**Success Criteria**:
- ✅ Emails render correctly in all clients
- ✅ >40% open rate for welcome email
- ✅ >10% click rate for digest
- ✅ Users can unsubscribe easily

---

## Phase 5: Legal & Compliance (Week 4) ⚖️

**Goal**: Ensure legal compliance for public beta launch

### Task 5.1: Privacy Policy & Terms of Service
**Prompt**: "Create comprehensive privacy policy and terms of service pages. Use a template from Termly or iubenda as starting point. Privacy policy must cover: what data we collect (email, location, interactions), how we use it (personalization, analytics), who we share with (none, except service providers), user rights (access, deletion, export), cookie usage, third-party services (Supabase, Sentry, PostHog). Terms of service must cover: acceptable use, intellectual property, disclaimers, limitation of liability. Create pages at `/privacy` and `/terms`. Add links in footer. Show consent flow on first visit: checkbox 'I agree to Terms and Privacy Policy' before allowing signup. Store acceptance in `user_consents` table with timestamp."

**Privacy Policy Sections**:
1. Information We Collect
   - Account info (email, username)
   - Location data (city, lat/lng)
   - Usage data (events viewed, saved, shared)
   - Device info (browser, OS)

2. How We Use Information
   - Personalized recommendations
   - Event notifications
   - App improvements
   - Analytics (anonymized)

3. Data Sharing
   - Service providers (Supabase, Vercel)
   - Analytics (PostHog - anonymized)
   - No selling of data

4. User Rights
   - Access your data
   - Delete your account
   - Export your data
   - Opt-out of emails

5. Cookies
   - Essential cookies (auth)
   - Analytics cookies (optional)
   - No third-party advertising

**Success Criteria**:
- ✅ Privacy policy covers all data collection
- ✅ Terms clearly outline user responsibilities
- ✅ Consent flow before signup
- ✅ Links in footer on every page

---

### Task 5.2: GDPR Cookie Consent
**Prompt**: "Add GDPR-compliant cookie consent banner using react-cookie-consent or custom component. Banner should: appear on first visit, clearly explain cookies used (essential, analytics, marketing), allow granular opt-in/out for each type, link to privacy policy, remember user choice in localStorage. Create `/settings/privacy` page where users can change consent preferences anytime. Essential cookies (auth, session) don't require consent. Analytics and marketing cookies should be disabled by default until user consents. Integrate with analytics (PostHog) to only track after consent. Test that banner shows correctly in EU countries. Add 'Cookie Policy' page explaining each cookie."

**Cookie Categories**:
```typescript
type CookieConsent = {
  essential: true,  // Always enabled (auth, session)
  analytics: boolean,  // PostHog tracking
  marketing: boolean,  // Future ad pixels
  preferences: boolean  // UI state, theme
}
```

**Cookie Banner Component**:
```tsx
<CookieConsent
  location="bottom"
  buttonText="Accept All"
  declineButtonText="Reject Non-Essential"
  enableDeclineButton
  onAccept={() => {
    analytics.init()
    updateConsent({ analytics: true })
  }}
  onDecline={() => {
    updateConsent({ analytics: false })
  }}
>
  This website uses cookies to enhance your experience.
  You can manage your preferences in{' '}
  <Link href="/settings/privacy">settings</Link>.
</CookieConsent>
```

**Cookies Used**:
| Name | Purpose | Duration | Category |
|------|---------|----------|----------|
| sb-access-token | Authentication | 7 days | Essential |
| theme | UI preference | 1 year | Preferences |
| posthog-session | Analytics | Session | Analytics |

**Success Criteria**:
- ✅ Banner shows on first visit
- ✅ User can accept/reject granularly
- ✅ Preferences persist across sessions
- ✅ Analytics only track after consent

---

### Task 5.3: Data Export & Account Deletion
**Prompt**: "Implement GDPR-compliant data export and account deletion workflows. Create `/settings/data` page with two buttons: 'Export My Data' and 'Delete Account'. Export: generate JSON file with all user data (profile, saved events, interactions, reminders, preferences), include metadata (data generated date, account created date), send download link via email (don't store file), format should be human-readable JSON. Delete Account: show confirmation modal explaining what will be deleted, require password re-entry, soft-delete user (mark deleted_at, keep data 30 days for recovery), send confirmation email, immediately log user out, after 30 days: hard delete all user data, anonymize any analytics data. Add `/api/user/export` and `/api/user/delete` endpoints."

**Data Export Format**:
```json
{
  "export_date": "2025-01-20T12:00:00Z",
  "account_created": "2024-12-01T10:30:00Z",
  "user_id": "abc123",
  "profile": {
    "email": "user@example.com",
    "username": "jazzlover",
    "location": "Toronto, ON"
  },
  "saved_events": [
    {
      "event_id": "evt_123",
      "event_name": "Jazz Night",
      "saved_at": "2025-01-15T18:00:00Z"
    }
  ],
  "interactions": [
    {
      "type": "view",
      "event_id": "evt_456",
      "timestamp": "2025-01-14T20:00:00Z"
    }
  ],
  "reminders": [],
  "preferences": {
    "email_digest": true,
    "theme": "dark"
  }
}
```

**Account Deletion Flow**:
1. User clicks "Delete Account"
2. Show warning modal listing what will be deleted
3. Require password confirmation
4. Send confirmation email
5. Soft delete (set deleted_at timestamp)
6. Log user out immediately
7. After 30 days: cron job hard deletes data

**Success Criteria**:
- ✅ Export includes all user data
- ✅ Export completes in <5 seconds
- ✅ Account deletion is reversible for 30 days
- ✅ Hard delete removes all traces after 30 days

---

## Quick Start Path (MVP Beta) 🚀

**For fastest launch with minimum viable features (10 prompts over 2 weeks)**

1. **Security Audit** (Combine Tasks 1.1, 1.2)
   - Verify RLS policies + environment validation
   - 1 day

2. **API Resilience** (Combine Tasks 1.3, 1.5)
   - Rate limiting + retry logic + error handling
   - 2 days

3. **Auth & Validation** (Combine Tasks 1.5, 1.6)
   - Session management + input sanitization
   - 1 day

4. **Loading & Empty States** (Combine Tasks 2.1, 2.2)
   - Skeletons + empty state designs
   - 1 day

5. **Mobile Fixes** (Task 2.3)
   - Responsive design + touch targets
   - 1 day

6. **Feedback Widget** (Task 2.5)
   - In-app bug reporting
   - Half day

7. **Performance Basics** (Task 3.1)
   - Code splitting + image optimization
   - 1 day

8. **Analytics + Monitoring** (Combine Tasks 4.1, 4.2)
   - PostHog + Sentry setup
   - 1 day

9. **Beta Access** (Task 4.3)
   - Invite code system
   - Half day

10. **Privacy Policy** (Task 5.1)
    - Legal pages + consent flow
    - Half day

**Total**: ~9-10 days of focused work

---

## Testing Checklist ✅

Before each phase completion, verify:

### Automated Tests
- [ ] All API endpoints return 200 or appropriate error codes
- [ ] RLS policies prevent unauthorized access
- [ ] Input validation rejects malicious data
- [ ] Rate limiting triggers correctly
- [ ] Error boundaries catch and display errors

### Manual Tests
- [ ] Test on real iOS device (iPhone)
- [ ] Test on real Android device (Pixel/Galaxy)
- [ ] Test signup/login/logout flow
- [ ] Test save event → see in saved list
- [ ] Test search → get results
- [ ] Test calendar export → import to Google Calendar
- [ ] Test offline mode (airplane mode)
- [ ] Test slow 3G (Chrome DevTools throttling)

### Cross-Browser Tests
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari iOS
- [ ] Mobile Chrome Android

### Accessibility Tests
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly (VoiceOver/TalkBack)
- [ ] Color contrast passes WCAG AA
- [ ] Focus indicators visible
- [ ] ARIA labels present

---

## Success Metrics 📈

Track these KPIs throughout beta:

### Engagement
- Daily Active Users (DAU)
- Events viewed per session
- Save rate (saves / views)
- Return rate (7-day retention)

### Performance
- Page load time (p95 <3s)
- API response time (p95 <500ms)
- Error rate (<1%)
- Crash-free sessions (>99%)

### Growth
- Invite conversion rate (>30%)
- Signups per week
- Waitlist additions
- Referral rate

### Quality
- Bug reports per 100 users
- Feedback sentiment (>80% positive)
- App store rating (target 4.5+)
- Net Promoter Score (target >40)

---

## Risk Mitigation 🛡️

### High-Risk Areas

1. **Ticketmaster Rate Limits**
   - **Risk**: Getting banned for excessive requests
   - **Mitigation**: Implement rate limiter (Task 1.3), cache aggressively
   - **Fallback**: Use only EventBrite if Ticketmaster unavailable

2. **Database Performance**
   - **Risk**: Slow queries under load
   - **Mitigation**: Add indexes (Task 3.2), implement caching
   - **Fallback**: Serve stale cached data if DB slow

3. **Security Vulnerabilities**
   - **Risk**: User data leaked via RLS bugs
   - **Mitigation**: Audit RLS (Task 1.1), pen testing
   - **Fallback**: Take app offline if breach detected

4. **Poor Mobile Experience**
   - **Risk**: Users bounce on mobile
   - **Mitigation**: Mobile testing (Task 2.3), PWA (Task 3.3)
   - **Fallback**: Desktop-first messaging if mobile unfixable

5. **Legal Compliance**
   - **Risk**: GDPR/CCPA violations
   - **Mitigation**: Privacy policy (Task 5.1), consent (Task 5.2)
   - **Fallback**: Geographic blocking if needed

---

## Deployment Plan 🚢

### Environments

1. **Development** (localhost:3000)
   - Local Supabase + local APIs
   - Hot reload, no caching

2. **Staging** (staging.scenescout.app)
   - Vercel preview deployments
   - Production Supabase (staging project)
   - Test all features before production

3. **Production** (scenescout.app)
   - Vercel production
   - Production Supabase
   - Beta access controlled

### Release Schedule

**Week 1**: Phase 1 to Staging
**Week 2**: Phase 2 to Staging, Phase 1 to Production
**Week 3**: Phase 3 to Staging, Phase 2 to Production
**Week 4**: Phase 4 + 5 to Staging, Phase 3 to Production
**Week 5**: Full production launch (Phases 4+5)

### Rollback Plan
- Keep previous production build in Vercel
- Database migrations have down migrations
- Can revert to previous deploy in <5 minutes
- Monitor error rates after each deploy (alert if >5x baseline)

---

## Post-Launch Monitoring 👀

### Daily Checks
- [ ] Error rate in Sentry
- [ ] API rate limits not exceeded
- [ ] User signups
- [ ] Feedback submissions

### Weekly Reviews
- [ ] Analytics dashboard (PostHog)
- [ ] Performance metrics (Vercel Analytics)
- [ ] Database query performance (Supabase)
- [ ] User feedback themes

### Monthly Audits
- [ ] Security scan (npm audit)
- [ ] Dependency updates
- [ ] RLS policy review
- [ ] Legal compliance check

---

## Contact & Support

**Feedback**: feedback@scenescout.app
**Bugs**: File in GitHub Issues or use in-app widget
**Security**: security@scenescout.app (encrypted emails welcome)

---

**Ready to start?** Begin with Phase 1, Task 1.1 and work through sequentially. Good luck! 🎉
