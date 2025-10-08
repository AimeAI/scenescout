# SceneScout: Current State & Roadmap to 1% App

**Date**: 2025-10-06
**Vision**: Uber for going out + Netflix for local culture

---

## 🎯 The Vision (True North)

**SceneScout solves**: "What do I do this week / tonight / right now that matches me?"

### Core Value Props:
1. **Always-On Awareness**: Never miss the punk show, underground comedy, pop-up ramen, haunted house
2. **Personal Feed**: Taste profile evolves → niche AI-punk shows + Persian food become your rails
3. **Spontaneity Layer**: "What's cool within 15 min right now?" → instant discovery
4. **Save & Remind Loop**: One tap → push reminder when happening → calendar sync
5. **Effortless Planning**: 5 mins/week, not 5 hours of Googling

### Why This Beats Competitors:
- **Facebook Events**: Social proof, not taste
- **Eventbrite**: Ticketing, not discovery
- **Meetup**: Groups, not spontaneity
- **Fever**: Editorial curation, not personalization

**SceneScout's wedge**: Taste-based + spontaneous + comprehensive

---

## ✅ What We Have Now (Current Stack)

### 1. **Data Foundation** ✅
- ✅ Ticketmaster API integration
- ✅ Eventbrite API integration
- ✅ Event caching system (rate limit protection)
- ✅ Multi-source event normalization
- ✅ Location-based search (lat/lng)
- ✅ Date/time normalization (timezone-safe, DST-aware)

### 2. **Discovery Layer** ✅ (Partial)
- ✅ **Category Rails**: 17 static categories (Music, Comedy, Food, etc.)
- ✅ **Near Me**: Location-aware events with distance filtering (5/10/25/50 mi)
- ✅ **Quick Chips**: Tonight / Happening Now / Free / Near Me filters
- ✅ **Search**: Full-text search with form submission
- ⚠️ **Personalized Rails**: Framework exists but NOT visibly working
- ❌ **"Surprise Me" / Spontaneity Mode**: Not implemented
- ❌ **Contextual Push Alerts**: Not implemented

### 3. **Save & Remind System** ✅ (Partial)
- ✅ Save events to localStorage + Supabase
- ✅ Real-time saved count updates
- ✅ Saved events page with working UI
- ✅ Reminders API endpoints created
- ✅ Push notification infrastructure (service worker, subscriptions)
- ⚠️ **Notification permissions flow**: Implemented but needs UX polish
- ❌ **Calendar sync**: Not implemented
- ❌ **Smart reminder timing**: Created in DB but cron job not verified working

### 4. **Personalization Engine** ⚠️ (Built but Not Working Visibly)
- ✅ Interaction tracking (clicks, saves, searches, views)
- ✅ Affinity scoring algorithm (categories, venues, price, time)
- ✅ Exponential decay (30-day half-life)
- ✅ Discovery floor (prevents filter bubbles)
- ✅ Dynamic rail spawning logic
- ❌ **Rails NOT reordering visibly**
- ❌ **No "Your Taste" section in UI**
- ❌ **No visual feedback that personalization is working**

### 5. **UX/UI** ✅ (Basic)
- ✅ Responsive layout (mobile + desktop)
- ✅ Netflix-style horizontal scrolling rails
- ✅ Event cards with images, pricing, distance
- ✅ Sidebar navigation
- ✅ Dark theme
- ⚠️ **Onboarding**: None (users don't know about features)
- ❌ **Empty states**: Generic messages, not helpful
- ❌ **Loading states**: Basic spinner, not engaging

### 6. **Backend Infrastructure** ✅
- ✅ Next.js 14 (App Router)
- ✅ Supabase (PostgreSQL, real-time, auth-ready)
- ✅ TypeScript (strict typing)
- ✅ API routes for events, saved, reminders, notifications
- ✅ Service worker for push notifications
- ⚠️ **Cron jobs**: Created but not verified on Vercel
- ❌ **User authentication**: Not implemented (using anonymous IDs)

---

## 🚧 Critical Gaps (Blocking 1% Status)

### **Phase 1 (MVP) - Core Loop**
**Goal**: Working event detail → Save → Reminder

| Feature | Status | Gap |
|---------|--------|-----|
| Event detail page | ✅ Working | - |
| Save button | ✅ Working | - |
| Reminder creation | ⚠️ Backend ready | **Cron job not verified sending** |
| Push notifications | ⚠️ Infrastructure ready | **User flow clunky, permissions UX poor** |
| "Near Me Now" rail | ✅ Working | Distance defaults could be more inclusive |
| Personalization rails | ⚠️ Code exists | **NOT VISIBLE TO USERS** |

**Critical Blockers**:
1. ❌ **Reminders not actually sending** → Users save but never get reminded
2. ❌ **Personalization invisible** → Feels like generic event list, not "taste-based"
3. ❌ **No onboarding** → Users don't know features exist

---

### **Phase 2 (Differentiation) - Magic Layer**
**Goal**: Contextual, intelligent, feels magical

| Feature | Status | Gap |
|---------|--------|-----|
| Surprise Me / Spontaneity mode | ❌ Not built | **Needs design + implementation** |
| Contextual push alerts | ❌ Not built | "Band you liked last month playing tonight" |
| Calendar sync | ❌ Not built | iCal export / Google Calendar integration |
| Lightweight social | ❌ Not built | "3 friends saved this show" |
| Taste profile visibility | ❌ Not built | Show user their evolving taste graph |

**Critical Blockers**:
1. ❌ **No "magic moments"** → App feels utilitarian, not delightful
2. ❌ **No serendipity** → Missing the Netflix "you might also like" feeling
3. ❌ **No social proof** → Can't see friends' activity

---

### **Phase 3 (Scale) - Network Effects**
**Goal**: Becomes the city OS

| Feature | Status | Gap |
|---------|--------|-----|
| Expanded data sources | ⚠️ Partial | Need venues, restaurants, bars, galleries |
| Social layer | ❌ Not built | Friend graph, who's going, group plans |
| User authentication | ❌ Not built | Using anonymous localStorage IDs |
| Multi-city support | ⚠️ Partial | Hardcoded to SF/Toronto |
| Monetization | ❌ Not built | Affiliate tickets, sponsored events, premium |

---

## 📋 Detailed Roadmap

### **Sprint 1: Make Personalization Visible** (1-2 weeks)
**Goal**: Users SEE their taste evolving

#### Tasks:
1. **Fix Rail Reordering**
   - Debug why `reorderRows()` isn't visibly changing rail order
   - Add console logs to track affinity scores
   - Ensure homepage re-renders when affinity changes
   - File: `src/app/page.tsx` line 100+

2. **Add "For You" Section**
   - Create hero rail at top: "Based on your taste"
   - Pull events from top 3 affinity categories
   - Show affinity score visually (optional)
   - File: Create `src/components/personalization/ForYouRail.tsx`

3. **Show Taste Profile**
   - Create `/taste` page showing:
     - Top categories (with %)
     - Favorite venues
     - Price sweet spot
     - Time patterns (weeknight vs weekend)
   - File: Create `src/app/taste/page.tsx`

4. **Visual Feedback on Interactions**
   - Animate rail reorder when user clicks/saves
   - Toast notification: "We noticed you like [category]"
   - File: Update `src/lib/tracking/client.ts`

**Success Metric**: Users can open app and see "Your taste: Comedy 65%, Indie Music 40%"

---

### **Sprint 2: Fix Reminder Loop** (1 week)
**Goal**: Save → Actually get reminded

#### Tasks:
1. **Verify Cron Job**
   - Test `/api/cron/reminders` locally
   - Deploy to Vercel and verify cron runs
   - Add logging to track reminder sends
   - File: `src/app/api/cron/reminders/route.ts`

2. **Improve Push Permission UX**
   - Show banner after 1st save: "Get reminded when this event is happening"
   - Inline permission request (not browser popup)
   - Show permission status in settings
   - File: `src/lib/saved/store.ts` line 118+

3. **Add Calendar Sync**
   - Generate `.ics` file for saved events
   - Add "Add to Calendar" button on event detail
   - Support Google Calendar direct link
   - File: Create `src/lib/calendar/ics.ts`

4. **Test Full Loop**
   - Save event → Check DB reminder created
   - Wait for cron → Verify push sent
   - Click notification → Opens event detail
   - Manual test checklist

**Success Metric**: 80% of saved events successfully send reminder notification

---

### **Sprint 3: Spontaneity Mode** (1-2 weeks)
**Goal**: "What's cool near me RIGHT NOW?" works perfectly

#### Tasks:
1. **"Happening Now" Smart Filter**
   - Events starting within 2 hours
   - Sort by: distance + affinity score
   - Progressive radius (5min walk → 15min → 30min → Uber distance)
   - File: Update `src/lib/filters/applyChips.ts`

2. **"Surprise Me" Button**
   - Random event from top 20% affinity match
   - Swipe UI (like Tinder): Save / Pass / Details
   - Each swipe trains the model
   - File: Create `src/app/surprise/page.tsx`

3. **Contextual Suggestions**
   - "It's Friday 8pm, here's what's happening"
   - Use time-of-day + day-of-week affinity
   - Weather-aware (rain → indoor events)
   - File: Create `src/lib/context/suggestions.ts`

4. **Quick Add Widget**
   - iOS/Android home screen widget
   - Shows 1 event "happening near you now"
   - One-tap to save or get directions
   - File: Research PWA widget options

**Success Metric**: Users discover events they wouldn't have searched for

---

### **Sprint 4: Social Layer (Lightweight)** (2 weeks)
**Goal**: See friends' activity without building full social network

#### Tasks:
1. **User Authentication**
   - Supabase Auth (email/phone)
   - Migrate anonymous saves to authenticated user
   - File: Create `src/lib/auth/supabase.ts`

2. **Friend Connections**
   - Phone number import (privacy-first)
   - QR code "add friend" at events
   - No friend requests, just follow
   - File: Create `src/app/friends/page.tsx`

3. **Passive Social Signals**
   - Event card shows: "3 friends saved this"
   - Activity feed: "Emma saved 2 comedy shows this week"
   - NOT real-time chat (too much scope)
   - File: Create `src/components/social/FriendActivity.tsx`

4. **Group Plans (Minimal)**
   - "Invite to event" → SMS link
   - "Who's going?" count
   - No RSVPs, no event pages
   - File: Create `src/lib/social/invites.ts`

**Success Metric**: 30% of saved events have social signal ("friend saved this")

---

### **Sprint 5: Expand Data Sources** (2-3 weeks)
**Goal**: Comprehensive coverage, not just ticketed events

#### Tasks:
1. **Venue Scraping**
   - Top 50 venues per city (manual curation)
   - Scrape venue websites for events
   - Use Cheerio/Puppeteer for scraping
   - File: Create `src/lib/scrapers/venues/`

2. **Restaurant Events**
   - OpenTable API (reservations)
   - Resy API (hot spots)
   - Yelp Events
   - File: Create `src/lib/scrapers/dining/`

3. **Bar/Nightlife**
   - Resident Advisor (electronic music)
   - Bandsintown (concerts)
   - Local bar websites
   - File: Create `src/lib/scrapers/nightlife/`

4. **Art Galleries**
   - Artsy API
   - Gallery websites
   - Museum exhibitions
   - File: Create `src/lib/scrapers/art/`

5. **Deduplication**
   - Same event from multiple sources
   - Fuzzy matching (title + date + venue)
   - Prefer official source (Ticketmaster > scrape)
   - File: Create `src/lib/events/dedupe.ts`

**Success Metric**: 3x more events than Eventbrite alone

---

### **Sprint 6: Multi-City Expansion** (1 week)
**Goal**: Works in any city

#### Tasks:
1. **City Detection**
   - IP geolocation → auto-detect city
   - Manual city selector
   - Remember last city
   - File: Create `src/lib/location/city.ts`

2. **City-Specific Config**
   - Default coords
   - Timezone
   - Top venues
   - Local categories (e.g., "BBQ" in Texas)
   - File: Create `src/config/cities.ts`

3. **Launch Cities** (pick 5)
   - San Francisco ✅
   - New York
   - Los Angeles
   - Toronto ✅
   - Chicago

4. **City Switcher UI**
   - Header dropdown
   - "/city/[slug]" routes
   - File: Update `src/components/layout/AppLayout.tsx`

**Success Metric**: App works in 5 major cities

---

### **Sprint 7: Monetization (MVP)** (1-2 weeks)
**Goal**: Sustainable revenue model

#### Tasks:
1. **Affiliate Links**
   - Ticketmaster affiliate program
   - Eventbrite affiliate program
   - Track conversions
   - File: Create `src/lib/affiliate/tracking.ts`

2. **Sponsored Events**
   - Venues pay to boost events
   - Clearly labeled "Sponsored"
   - Blends with organic results
   - File: Create `src/app/api/sponsored/route.ts`

3. **Premium Tier** (optional)
   - Early access to hot events
   - VIP concierge (text-based)
   - Ad-free
   - $9.99/month
   - File: Create `src/app/premium/page.tsx`

**Success Metric**: $500 MRR from 50 users

---

## 🔧 Technical Debt to Address

### High Priority:
1. ❌ **TypeScript errors in production build** → Fix before deploy
2. ❌ **Event caching strategy** → Currently 1hr TTL, needs smarter invalidation
3. ❌ **Mobile performance** → Large images, slow scroll on iPhone
4. ❌ **Error handling** → Silent failures, no user feedback
5. ❌ **Rate limiting** → Ticketmaster API limits not properly handled

### Medium Priority:
6. ⚠️ **Accessibility** → No ARIA labels, keyboard nav broken
7. ⚠️ **SEO** → Event pages not indexed, no meta tags
8. ⚠️ **Analytics** → Tracking exists but no dashboard
9. ⚠️ **Testing** → No E2E tests, integration tests incomplete

### Low Priority:
10. 📝 **Code organization** → Some files 500+ lines
11. 📝 **Documentation** → Missing API docs
12. 📝 **Storybook** → Component library not set up

---

## 📊 Success Metrics (1% App Criteria)

### User Engagement:
- [ ] **DAU/MAU > 40%** (daily active / monthly active)
- [ ] **Session length > 5 min** (browsing multiple events)
- [ ] **Return rate > 60%** (come back within 7 days)

### Core Loop:
- [ ] **Save rate > 15%** (saves per session)
- [ ] **Reminder click-through > 30%** (notifications → app opens)
- [ ] **Discovery rate > 50%** (found via browsing, not search)

### Personalization:
- [ ] **Affinity convergence < 2 weeks** (taste profile stabilizes)
- [ ] **Rail reorder visible > 80%** (users notice personalization)
- [ ] **Serendipity saves > 20%** (saved from "Surprise Me")

### Growth:
- [ ] **Organic WoM > 30%** (friend referrals)
- [ ] **NPS > 50** (would recommend)
- [ ] **Retention 30-day > 40%**

---

## 🎬 Next Immediate Steps

### This Week (Sprint 1 Start):
1. **Debug rail reordering** → Make personalization visible
2. **Add "For You" section** → Hero rail at top of homepage
3. **Verify reminder cron job** → Test on Vercel, ensure it runs
4. **Improve push permission UX** → Inline prompt, not browser popup

### This Month:
- Complete Sprint 1 (Personalization Visible)
- Complete Sprint 2 (Reminder Loop)
- Start Sprint 3 (Spontaneity Mode)

### This Quarter (3 months):
- Launch Sprints 1-4
- User auth + lightweight social
- Expand to 3 cities
- Hit 1000 MAU

---

## 💭 Philosophy

**Uber didn't just aggregate taxis — it made getting a ride effortless.**

**Netflix didn't just list movies — it learned your taste and surfaced what you'd love.**

**SceneScout won't just list events — it becomes your cultural concierge.**

The magic is in:
1. **Removing friction** (no planning, just show up)
2. **Learning taste** (gets better over time)
3. **Creating serendipity** (discover things you'd never search for)

That's how we get to 1%.

---

**Status**: Current app is **Phase 1 (60% complete)**
**Blockers**: Personalization invisible, reminders not verified, no onboarding
**Next milestone**: Make personalization work visibly + fix reminder loop = **MVP complete**
