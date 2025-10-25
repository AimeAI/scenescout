# PostHog Quick Reference

Quick copy-paste snippets for common PostHog tracking scenarios.

## Setup Checklist

- [x] Install `posthog-js` package
- [x] Create PostHogProvider
- [x] Integrate in layout.tsx
- [ ] Add environment variables to `.env.local`
- [ ] Get PostHog API key from dashboard
- [ ] Test tracking in development

## Environment Variables

Add to `.env.local`:

```bash
NEXT_PUBLIC_POSTHOG_KEY=phc_your_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

## Import Hook

```tsx
import { useTracking } from '@/hooks/useTracking'
```

## Common Tracking Patterns

### 1. Track Page/Component View

```tsx
import { useTracking } from '@/hooks/useTracking'
import { useEffect } from 'react'

function MyPage() {
  const { trackEvent } = useTracking()

  useEffect(() => {
    trackEvent('page_viewed', {
      page_name: 'My Page',
      // Add any context
    })
  }, [trackEvent])

  return <div>...</div>
}
```

### 2. Track Button Click

```tsx
function MyButton() {
  const { trackEvent } = useTracking()

  const handleClick = () => {
    // Your button logic
    doSomething()

    // Track the action
    trackEvent('button_clicked', {
      button_name: 'My Button',
      context: 'header'
    })
  }

  return <button onClick={handleClick}>Click Me</button>
}
```

### 3. Track Event View

```tsx
function EventDetail({ event }) {
  const { trackEventView } = useTracking()

  useEffect(() => {
    trackEventView({
      event_id: event.id,
      event_title: event.title,
      event_category: event.category,
      event_date: event.date,
      venue_name: event.venue,
      source: 'recommendation' // or 'search', 'near_me', etc.
    })
  }, [event.id, trackEventView])

  return <div>...</div>
}
```

### 4. Track Save/Unsave

```tsx
function SaveButton({ event, isSaved }) {
  const { trackEventSave, incrementUserProperty } = useTracking()

  const handleToggleSave = async () => {
    const newSavedState = !isSaved
    await toggleSave(event.id)

    // Track the action
    trackEventSave({
      event_id: event.id,
      event_title: event.title,
      event_category: event.category,
      total_saved_count: getUserSavedCount()
    }, !newSavedState) // true = unsave, false = save

    // Update user property
    incrementUserProperty('saved_events_count', newSavedState ? 1 : -1)
  }

  return <button onClick={handleToggleSave}>Save</button>
}
```

### 5. Track Search

```tsx
function SearchBar() {
  const { trackSearch } = useTracking()

  const handleSearch = async (query: string) => {
    const results = await searchEvents(query)

    trackSearch({
      query,
      results_count: results.length,
      filters_applied: getActiveFilters(),
      location: getUserLocation()
    })

    return results
  }

  return <input onChange={(e) => handleSearch(e.target.value)} />
}
```

### 6. Track Category Filter

```tsx
function CategoryChip({ category, isActive }) {
  const { trackCategoryFilter } = useTracking()

  const handleClick = () => {
    toggleCategory(category)

    trackCategoryFilter({
      category,
      action: isActive ? 'removed' : 'applied',
      active_filters: getActiveFilters()
    })
  }

  return <button onClick={handleClick}>{category}</button>
}
```

### 7. Track Swipe (Surprise Me)

```tsx
function SwipeCard({ event }) {
  const { trackSwipe } = useTracking()

  const handleSwipe = (direction: 'like' | 'dislike') => {
    trackSwipe({
      event_id: event.id,
      event_category: event.category,
      swipe_direction: direction,
      position_in_deck: getCurrentPosition()
    })

    // Handle swipe logic
  }

  return <div onSwipe={handleSwipe}>...</div>
}
```

### 8. Track Reminder

```tsx
function ReminderButton({ event }) {
  const { trackReminder } = useTracking()

  const handleSetReminder = (reminderTime: string) => {
    createReminder(event.id, reminderTime)

    trackReminder({
      event_id: event.id,
      reminder_time: reminderTime,
      notification_enabled: hasNotificationPermission()
    })
  }

  return <button onClick={() => handleSetReminder('1h')}>Remind Me</button>
}
```

### 9. Track Feedback

```tsx
function FeedbackForm() {
  const { trackFeedback } = useTracking()

  const handleSubmit = (feedback: any) => {
    submitFeedback(feedback)

    trackFeedback({
      feedback_type: feedback.type,
      rating: feedback.rating,
      page: window.location.pathname
    })
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

### 10. Track PWA Install

```tsx
function InstallPrompt() {
  const { trackPWAInstall, trackEvent } = useTracking()

  const handlePromptShown = () => {
    trackEvent('pwa_prompt_shown', {
      platform: navigator.platform
    })
  }

  const handleInstall = () => {
    trackPWAInstall()
    // Install logic
  }

  return <button onClick={handleInstall}>Install App</button>
}
```

## User Identification

### Identify User on Login

```tsx
function LoginPage() {
  const { identifyUser } = useTracking()

  const handleLogin = async (userId: string) => {
    const user = await login(userId)

    identifyUser(userId, {
      email: user.email,
      name: user.name,
      location: user.location,
      signup_date: user.createdAt,
      saved_events_count: user.savedEvents.length
    })
  }

  return <form onSubmit={handleLogin}>...</form>
}
```

### Update User Properties

```tsx
function SettingsPage() {
  const { setUserProperties } = useTracking()

  const handleUpdateLocation = (location: string) => {
    updateUserLocation(location)

    setUserProperties({
      location,
      last_location_update: new Date().toISOString()
    })
  }

  return <div>...</div>
}
```

### Reset on Logout

```tsx
function LogoutButton() {
  const { resetUser } = useTracking()

  const handleLogout = () => {
    logout()
    resetUser() // Clear PostHog identity
  }

  return <button onClick={handleLogout}>Logout</button>
}
```

## Feature Flags

### Check Boolean Flag

```tsx
function NewFeature() {
  const { isFeatureEnabled } = useTracking()

  if (!isFeatureEnabled('new-ui-design')) {
    return <OldUI />
  }

  return <NewUI />
}
```

### A/B Test with Variants

```tsx
function ABTest() {
  const { getFeatureFlag } = useTracking()

  const variant = getFeatureFlag('recommendation-algorithm')

  switch (variant) {
    case 'variant-a':
      return <AlgorithmA />
    case 'variant-b':
      return <AlgorithmB />
    default:
      return <DefaultAlgorithm />
  }
}
```

## Privacy Controls

### Opt Out/In

```tsx
import { optOutOfAnalytics, optInToAnalytics } from '@/providers/PostHogProvider'

function PrivacySettings() {
  const handleOptOut = () => {
    optOutOfAnalytics()
    // User data will no longer be tracked
  }

  const handleOptIn = () => {
    optInToAnalytics()
    // Resume tracking
  }

  return <div>...</div>
}
```

### Check Opt-Out Status

```tsx
import { hasOptedOut } from '@/providers/PostHogProvider'

function AnalyticsStatus() {
  const optedOut = hasOptedOut()

  return <p>{optedOut ? 'Analytics Off' : 'Analytics On'}</p>
}
```

### Session Recording

```tsx
import { enableSessionRecording, disableSessionRecording } from '@/providers/PostHogProvider'

function SessionRecordingSettings() {
  const handleEnable = () => {
    enableSessionRecording()
    // User sessions will be recorded
  }

  const handleDisable = () => {
    disableSessionRecording()
    // Stop recording
  }

  return <div>...</div>
}
```

## Performance Tracking

### Track API Call

```tsx
import { usePerformanceTracking } from '@/hooks/useTracking'

function DataLoader() {
  const { trackAPICall } = usePerformanceTracking()

  const loadData = async () => {
    const start = Date.now()
    try {
      const data = await fetch('/api/events')
      trackAPICall('/api/events', Date.now() - start, data.ok)
      return data
    } catch (error) {
      trackAPICall('/api/events', Date.now() - start, false)
      throw error
    }
  }

  return <div>...</div>
}
```

## Event Types Reference

| Event | Use Case |
|-------|----------|
| `event_viewed` | User views event detail |
| `event_saved` | User saves event |
| `event_unsaved` | User removes saved event |
| `reminder_created` | User sets reminder |
| `calendar_export` | User exports to calendar |
| `search_performed` | User searches |
| `category_filter` | User filters by category |
| `map_opened` | User opens map |
| `onboarding_completed` | User completes onboarding |
| `pwa_installed` | User installs PWA |
| `feedback_submitted` | User submits feedback |
| `swipe_like` | User likes in Surprise Me |
| `swipe_dislike` | User dislikes in Surprise Me |
| `near_me_opened` | User opens Near Me |

## Files Reference

| File | Purpose |
|------|---------|
| `/src/providers/PostHogProvider.tsx` | Provider component |
| `/src/hooks/useTracking.ts` | Tracking hook |
| `/src/lib/tracking-examples.tsx` | 15 complete examples |
| `/src/components/analytics/AnalyticsPrivacySettings.tsx` | Privacy UI |
| `/POSTHOG_SETUP.md` | Full documentation |

## Testing

### Verify Tracking Works

1. Open browser DevTools → Network tab
2. Filter by "posthog"
3. Interact with app
4. See requests to `app.posthog.com`

### View Live Events

1. Go to PostHog dashboard
2. Click "Live Events" in sidebar
3. See events in real-time as you use the app

---

For full documentation, see `/POSTHOG_SETUP.md`
