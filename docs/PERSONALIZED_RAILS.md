# Personalized Rails Implementation

## Overview

Dynamic, personalized event rails ("You might like") that adapt to user behavior (clicks, saves, searches) with intelligent guardrails to prevent filter bubbles and ensure discovery.

## Features

✅ **Inventory Threshold** - Only show rails with enough events (min 4)
✅ **Min Interactions** - Require at least 5 user interactions before personalizing
✅ **Discovery Floor** - Keep 30% of events from general categories
✅ **Veto Logic** - Hide heavily downvoted events (2+ downvotes)
✅ **Max Rails** - Limit to 3-5 personalized rails
✅ **Feature Flagged** - Instantly reversible via `NEXT_PUBLIC_FEATURE_PERSONALIZED_RAILS`

## Configuration

### Environment Variables (`.env.local`)

```bash
# Enable tracking (REQUIRED for personalized rails)
NEXT_PUBLIC_FEATURE_TRACKING_V1=true

# Enable personalized rails
NEXT_PUBLIC_FEATURE_PERSONALIZED_RAILS=true

# Tunables
NEXT_PUBLIC_PERSONALIZED_RAILS_MAX=3                  # Max rails to show (3-5 recommended)
NEXT_PUBLIC_PERSONALIZED_RAILS_MIN_EVENTS=4           # Min events per rail (inventory threshold)
NEXT_PUBLIC_PERSONALIZED_RAILS_MIN_INTERACTIONS=5     # Min user actions before personalizing
NEXT_PUBLIC_PERSONALIZED_DISCOVERY_FLOOR=0.3          # % of events from general categories (0.0-1.0)
NEXT_PUBLIC_PERSONALIZED_VETO_THRESHOLD=2             # Downvotes needed to hide event
```

## Architecture

### Components

```
src/components/personalization/
  └── PersonalizedRails.tsx       # Main component with rail generation logic
```

### Dependencies

```
src/lib/tracking/
  ├── client.ts                    # Interaction tracking (localStorage)
  └── affinity.ts                  # Affinity scoring with exponential decay
```

## How It Works

### 1. Interaction Tracking

User actions are tracked client-side to localStorage:

```typescript
import { trackEvent } from '@/lib/tracking/client'

// Track event click
trackEvent('click', {
  eventId: event.id,
  category: event.category,
  price: event.price_min,
  venue: event.venue_name
})

// Track event save
trackEvent('save', { eventId: event.id, category: event.category })

// Track search
trackEvent('search', { query: 'jazz concerts' })
```

**Interaction Weights:**
- `view`: 1 point
- `click`: 10 points
- `search`: 30 points
- `save`: 50 points

### 2. Affinity Computation

Compute user preferences with exponential decay (30-day half-life):

```typescript
import { computeAffinity } from '@/lib/tracking/affinity'

const affinity = computeAffinity(interactions)
// {
//   categories: { 'music': 1.0, 'comedy': 0.7, ... },
//   priceRanges: { 'under25': 0.8, ... },
//   venues: { 'Blue Note': 0.6, ... },
//   ...
// }
```

### 3. Rail Generation

PersonalizedRails component generates rails based on top affinity scores:

```typescript
<PersonalizedRails
  allEvents={allEventsFromAllCategories}
  onEventClick={handleEventClick}
/>
```

**Generation Logic:**
1. Check if tracking enabled + enough interactions (≥5)
2. Compute affinity from interactions
3. Extract vetoed event IDs (≥2 downvotes)
4. Sort categories by affinity score
5. For top 3 categories:
   - Filter events matching category
   - Remove vetoed events
   - Check inventory threshold (≥4 events)
   - Create rail if threshold met

### 4. Veto Logic

Events with multiple downvotes are hidden:

```typescript
// Track downvote (extended InteractionEvent interface)
trackEvent('view', {
  eventId: event.id,
  vote: 'down'  // Custom field
})

// Events with ≥2 downvotes are filtered out
```

## Testing Personalized Rails

### Enable Feature Flags

```bash
# .env.local
NEXT_PUBLIC_FEATURE_TRACKING_V1=true
NEXT_PUBLIC_FEATURE_PERSONALIZED_RAILS=true
```

### Generate Test Data

```typescript
import { trackEvent } from '@/lib/tracking/client'

// Simulate user liking music events
for (let i = 0; i < 10; i++) {
  trackEvent('click', { category: 'music', eventId: `music_${i}` })
  trackEvent('save', { category: 'music', eventId: `music_${i}` })
}

// Refresh page - personalized "Music You Love" rail should appear
```

### Clear Tracking Data

```typescript
import { clearAllInteractions } from '@/lib/tracking/client'

clearAllInteractions()  // Removes all tracking data from localStorage
```

## Guardrails

### Inventory Threshold
Rails won't show if there aren't enough events:

```typescript
// Need ≥4 events per rail
const events = allEvents.filter(e => e.category === 'music')
if (events.length < 4) {
  // Skip this rail
}
```

### Discovery Floor
30% of events come from general (non-personalized) categories to prevent filter bubbles.

### Veto Logic
```typescript
// Event downvoted 2+ times → hidden
const vetoedEvents = new Set(['event_123', 'event_456'])
const filteredEvents = events.filter(e => !vetoedEvents.has(e.id))
```

### Max Rails Limit
Only show top 3 personalized rails to avoid overwhelming users.

## Rollback Plan

### Instant Disable

```bash
# .env.local
NEXT_PUBLIC_FEATURE_PERSONALIZED_RAILS=false
```

Restart dev server:
```bash
npm run dev
```

Personalized rails will immediately stop rendering. General categories remain unchanged.

### Clear User Data

If needed, add UI button to clear tracking:

```tsx
import { clearAllInteractions } from '@/lib/tracking/client'

<button onClick={clearAllInteractions}>
  Clear My Data
</button>
```

## Performance

- **Client-side only**: No server requests, all computation in browser
- **Debounced writes**: Tracking events batched (500ms) to avoid excessive localStorage writes
- **Max 1000 events**: Automatic pruning to prevent localStorage overflow
- **60-day retention**: Old interactions auto-expire
- **Memo Rails**: Rails recomputed only when `allEvents` changes

## Privacy

- **No server tracking**: All data stored in browser localStorage
- **No cookies**: Uses sessionStorage for session ID only
- **User control**: Easy to add "Clear My Data" button
- **Anonymous**: No user ID or personal data collected

## Future Enhancements

- [ ] Thumbs up/down UI for explicit feedback
- [ ] "More like this" button on event cards
- [ ] A/B test different affinity weights
- [ ] Time-of-day preferences (morning/evening events)
- [ ] Venue proximity scoring
- [ ] Cross-category discovery ("If you like jazz, try comedy")

## Troubleshooting

### Rails not showing

1. Check feature flags enabled:
   ```bash
   NEXT_PUBLIC_FEATURE_TRACKING_V1=true
   NEXT_PUBLIC_FEATURE_PERSONALIZED_RAILS=true
   ```

2. Check interaction count:
   ```typescript
   import { readInteractions } from '@/lib/tracking/client'
   console.log(readInteractions().length)  // Need ≥5
   ```

3. Check inventory:
   ```typescript
   // Need ≥4 events per category
   console.log(categoryEvents['music'].length)
   ```

### Stale rails

Clear localStorage:
```typescript
localStorage.removeItem('sceneScout_interactions')
```

### Rails showing wrong events

Check affinity scores:
```typescript
import { computeAffinity, readInteractions } from '@/lib/tracking'
const affinity = computeAffinity(readInteractions())
console.log(affinity.categories)
```

## Implementation Checklist

- [x] Add feature flags to `.env.example`
- [x] Create `PersonalizedRails` component
- [x] Implement veto logic
- [x] Integrate into homepage with feature flag
- [x] Add tests for rail generation
- [x] Document in README
- [ ] Add thumbs up/down UI (optional)
- [ ] Add "Clear My Data" button (optional)
- [ ] A/B test configuration (optional)

## References

- **Tracking**: `/src/lib/tracking/client.ts`
- **Affinity**: `/src/lib/tracking/affinity.ts`
- **Component**: `/src/components/personalization/PersonalizedRails.tsx`
- **Tests**: `/src/__tests__/personalization/PersonalizedRails.test.tsx`
