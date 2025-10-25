# PostHog Analytics Setup Guide

Comprehensive event tracking and user behavior analysis for SceneScout using PostHog.

## Table of Contents
- [Installation](#installation)
- [Configuration](#configuration)
- [Integration](#integration)
- [Event Tracking](#event-tracking)
- [User Identification](#user-identification)
- [Feature Flags](#feature-flags)
- [Privacy Controls](#privacy-controls)
- [Best Practices](#best-practices)

---

## Installation

PostHog has been installed and integrated. Dependencies:

```bash
npm install posthog-js
```

**Files Created:**
- `/src/providers/PostHogProvider.tsx` - Main provider with privacy controls
- `/src/hooks/useTracking.ts` - Type-safe tracking hooks
- `/src/lib/tracking-examples.tsx` - Integration examples for all components

**Files Modified:**
- `/src/app/layout.tsx` - Added PostHogProvider wrapper
- `.env.example` - Added PostHog configuration

---

## Configuration

### 1. Environment Variables

Add to your `.env.local`:

```bash
# PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_your_posthog_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### 2. Get Your PostHog Key

1. Sign up at [PostHog](https://posthog.com/)
2. Create a new project
3. Copy your Project API Key (starts with `phc_`)
4. Add to `.env.local`

### 3. Privacy-First Configuration

The implementation includes:
- ✅ IP masking enabled by default
- ✅ Respects Do Not Track
- ✅ Session recording disabled by default
- ✅ User opt-out functionality
- ✅ Only meaningful interactions tracked
- ✅ Batch event sending for performance

---

## Integration

### Already Integrated

The PostHogProvider is already wrapped around your app in `layout.tsx`:

```tsx
<PostHogProvider>
  {/* Your app */}
</PostHogProvider>
```

### Auto-Tracking Enabled

- ✅ Pageviews (automatically tracked on route changes)
- ✅ Click events on buttons and links
- ✅ Performance metrics

---

## Event Tracking

### Using the Tracking Hook

```tsx
import { useTracking } from '@/hooks/useTracking'

function MyComponent() {
  const { trackEvent, trackEventView, trackSearch } = useTracking()

  // Generic event
  trackEvent('custom_event', {
    custom_property: 'value'
  })

  // Event view
  trackEventView({
    event_id: '123',
    event_title: 'Concert at The Opera House',
    event_category: 'Music',
    source: 'recommendation'
  })

  // Search
  trackSearch({
    query: 'jazz concerts',
    results_count: 15,
    filters_applied: ['Music', 'Tonight']
  })
}
```

### Key Events to Track

All events are type-safe and documented:

| Event | Description | Example Properties |
|-------|-------------|-------------------|
| `event_viewed` | User views event details | `event_id`, `event_title`, `source` |
| `event_saved` | User saves an event | `event_id`, `total_saved_count` |
| `event_unsaved` | User removes saved event | `event_id` |
| `reminder_created` | User sets reminder | `event_id`, `reminder_time` |
| `calendar_export` | Calendar download | `event_id`, `format` |
| `search_performed` | Search query | `query`, `results_count` |
| `category_filter` | QuickChips interaction | `category`, `action` |
| `map_opened` | Map page view | `events_count`, `location` |
| `onboarding_completed` | Onboarding flow done | `step` |
| `pwa_installed` | App installation | `platform` |
| `feedback_submitted` | Beta feedback | `feedback_type`, `rating` |
| `swipe_like` | Surprise Me like | `event_id`, `position_in_deck` |
| `swipe_dislike` | Surprise Me dislike | `event_id` |
| `near_me_opened` | Near Me page view | `location_permission` |

### Integration Examples

See `/src/lib/tracking-examples.tsx` for 15 complete examples including:
- Event detail pages
- Save/unsave buttons
- Search components
- Category filters
- Onboarding flows
- Swipe interfaces
- PWA install prompts
- Feedback widgets
- And more...

---

## User Identification

### Identify Users

```tsx
const { identifyUser, setUserProperties } = useTracking()

// On login/signup
identifyUser('user-123', {
  email: 'user@example.com',
  location: 'Toronto',
  signup_date: '2025-10-22',
  saved_events_count: 5
})

// Update properties
setUserProperties({
  preferred_categories: ['Music', 'Art'],
  notification_enabled: true
})
```

### Anonymous Users

PostHog automatically creates anonymous user IDs. You can identify them later:

```tsx
// Anonymous user browses
trackEvent('event_viewed', { event_id: '123' })

// User signs up - link anonymous activity
identifyUser('user-123', { email: 'user@example.com' })
```

### Increment Properties

```tsx
const { incrementUserProperty } = useTracking()

// When user saves an event
incrementUserProperty('saved_events_count', 1)

// When user unsaves
incrementUserProperty('saved_events_count', -1)
```

### Reset on Logout

```tsx
const { resetUser } = useTracking()

// Clear user identity on logout
resetUser()
```

---

## Feature Flags

### Check Feature Flags

```tsx
const { isFeatureEnabled, getFeatureFlag } = useTracking()

// Boolean flag
if (isFeatureEnabled('new-event-card-design')) {
  return <NewEventCard />
}

// Variant flag (A/B test)
const variant = getFeatureFlag('recommendation-algorithm')
if (variant === 'variant-a') {
  return <AlgorithmA />
} else if (variant === 'variant-b') {
  return <AlgorithmB />
}
```

### Creating Feature Flags in PostHog

1. Go to PostHog dashboard → Feature Flags
2. Create new flag
3. Set conditions (user properties, percentage rollout, etc.)
4. Deploy - no code changes needed!

---

## Privacy Controls

### User Opt-Out

```tsx
import { optOutOfAnalytics, optInToAnalytics, hasOptedOut } from '@/providers/PostHogProvider'

// Allow user to opt out
function PrivacySettings() {
  const [optedOut, setOptedOut] = useState(hasOptedOut())

  const handleToggle = () => {
    if (optedOut) {
      optInToAnalytics()
      setOptedOut(false)
    } else {
      optOutOfAnalytics()
      setOptedOut(true)
    }
  }

  return (
    <button onClick={handleToggle}>
      {optedOut ? 'Enable' : 'Disable'} Analytics
    </button>
  )
}
```

### Session Recording (Opt-In)

Session recording is **disabled by default**. Users must opt-in:

```tsx
import { enableSessionRecording, disableSessionRecording } from '@/providers/PostHogProvider'

// Only enable if user consents
enableSessionRecording()

// Disable anytime
disableSessionRecording()
```

### Privacy Features

- ✅ **IP Masking**: IPs are never stored
- ✅ **Do Not Track**: Respects browser DNT header
- ✅ **User Opt-Out**: Persistent opt-out via localStorage
- ✅ **Session Recording Disabled**: Must explicitly enable
- ✅ **Minimal Auto-Capture**: Only clicks on buttons/links
- ✅ **No Sensitive Data**: Never track passwords, emails in URLs, etc.

---

## Best Practices

### 1. Track User Intent, Not Just Actions

```tsx
// ❌ Bad: Just tracking clicks
trackEvent('button_clicked', { button_id: 'save' })

// ✅ Good: Track the intent and outcome
trackEventSave({
  event_id: event.id,
  event_title: event.title,
  total_saved_count: userSavedCount
})
```

### 2. Add Context to Events

```tsx
trackEventView({
  event_id: event.id,
  event_title: event.title,
  event_category: event.category,
  source: 'recommendation', // How they found this event
  position: 3, // Position in list
  list_type: 'personalized' // What list they came from
})
```

### 3. Use Type-Safe Events

The `useTracking` hook provides type safety:

```tsx
// TypeScript will autocomplete event names
trackEvent('event_viewed', { ... }) // ✅
trackEvent('evnt_viewed', { ... })  // ❌ Type error
```

### 4. Track Error States

```tsx
try {
  await saveEvent(eventId)
  trackEventSave({ event_id: eventId })
} catch (error) {
  trackEvent('error_occurred', {
    error_type: 'save_failed',
    event_id: eventId,
    error_message: error.message
  })
}
```

### 5. Performance Tracking

```tsx
import { usePerformanceTracking } from '@/hooks/useTracking'

const { trackAPICall } = usePerformanceTracking()

const fetchEvents = async () => {
  const start = Date.now()
  try {
    const response = await fetch('/api/events')
    trackAPICall('/api/events', Date.now() - start, response.ok)
    return response
  } catch (error) {
    trackAPICall('/api/events', Date.now() - start, false)
    throw error
  }
}
```

### 6. Funnel Analysis

Track sequential steps for funnels:

```tsx
// Step 1: User sees event
trackEvent('funnel_event_discovered', { event_id })

// Step 2: User views details
trackEventView({ event_id, source: 'discovery' })

// Step 3: User saves event
trackEventSave({ event_id })

// Step 4: User sets reminder
trackReminder({ event_id, reminder_time })

// Step 5: User exports to calendar
trackEvent('calendar_export', { event_id })
```

### 7. Cohort Properties

Set properties for segmentation:

```tsx
identifyUser(userId, {
  // Demographics
  location: 'Toronto',
  age_group: '25-34',

  // Behavior
  user_type: 'power_user', // based on activity
  signup_date: '2025-10-22',

  // Preferences
  preferred_categories: ['Music', 'Art'],
  notification_enabled: true,

  // Engagement
  saved_events_count: 15,
  events_attended: 3,
  last_active: new Date().toISOString()
})
```

---

## PostHog Dashboard

### Recommended Dashboards

Create these in PostHog:

1. **Overview**
   - Daily/Weekly/Monthly active users
   - Page views
   - Event interactions (saves, reminders, exports)

2. **Discovery Funnel**
   - Event discovered → Viewed → Saved → Reminder set

3. **Search Performance**
   - Search queries
   - Results count distribution
   - Most searched terms
   - Zero-result searches

4. **Category Performance**
   - Events by category
   - Category filter usage
   - Most popular categories

5. **User Retention**
   - Day 1, 7, 30 retention
   - Churn analysis
   - Re-engagement campaigns

6. **Feature Usage**
   - Surprise Me swipes
   - Near Me usage
   - Map interactions
   - PWA installations

---

## Common Queries

### Top Events

```sql
-- In PostHog Insights
event_viewed
GROUP BY properties.event_title
COUNT(*)
ORDER BY count DESC
```

### Search Analysis

```sql
search_performed
GROUP BY properties.query
WITH properties.results_count
```

### User Journey

Use PostHog's **Session Recordings** (when opted-in) and **User Paths** to see:
- How users navigate the app
- Where they drop off
- Which features they use

---

## Testing

### Verify Integration

1. **Check Network Tab**: Look for requests to `app.posthog.com`
2. **PostHog Dashboard**: Go to Live Events to see real-time tracking
3. **Browser Console**: In development, PostHog logs debug info

### Test Events

```tsx
// In development, test tracking
if (process.env.NODE_ENV === 'development') {
  const { trackEvent } = useTracking()

  // Test event
  trackEvent('test_event', {
    test: true,
    timestamp: Date.now()
  })
}
```

---

## Troubleshooting

### Events Not Appearing

1. **Check API Key**: Verify `NEXT_PUBLIC_POSTHOG_KEY` is set
2. **Check Browser Console**: Look for PostHog errors
3. **Check Ad Blockers**: Some ad blockers block PostHog
4. **Check DNT**: If Do Not Track is enabled, PostHog won't track

### Session Recording Not Working

- Session recording is **disabled by default**
- Must call `enableSessionRecording()` after user consent
- Check if user has opted out via `hasOptedOut()`

### Feature Flags Not Loading

- Feature flags load asynchronously
- Use `useEffect` to wait for flags to load
- Check PostHog dashboard to verify flag is active

---

## Next Steps

1. ✅ PostHog is installed and configured
2. ✅ Add tracking to existing components (use examples in `/src/lib/tracking-examples.tsx`)
3. ⬜ Set up PostHog dashboards for key metrics
4. ⬜ Create feature flags for A/B tests
5. ⬜ Add privacy settings page with opt-out
6. ⬜ Set up alerts for critical metrics

---

## Resources

- [PostHog Documentation](https://posthog.com/docs)
- [PostHog React Integration](https://posthog.com/docs/libraries/react)
- [Feature Flags Guide](https://posthog.com/docs/feature-flags)
- [Session Recording](https://posthog.com/docs/session-recording)
- [Privacy Guide](https://posthog.com/docs/privacy)

---

## Support

Questions? Check:
1. `/src/lib/tracking-examples.tsx` - 15 real-world examples
2. `/src/hooks/useTracking.ts` - All available methods with TypeScript types
3. `/src/providers/PostHogProvider.tsx` - Configuration and privacy controls

Happy tracking! 📊
