# Seen Store & Dynamic Category Manager

## Overview

Two advanced personalization features that work together to create a fresh, non-repetitive event discovery experience:

1. **Seen Store** - Prevents showing the same events repeatedly (14-day TTL)
2. **Dynamic Category Manager** - Auto-spawns/sunsets category rails based on user behavior

## Features

### Seen Store ✅

- **14-day TTL**: Events marked as "seen" expire after 14 days
- **Client-side only**: No server tracking, uses localStorage
- **Auto-cleanup**: Expired entries automatically pruned
- **Bulk operations**: Mark multiple events at once (e.g., on scroll)
- **Statistics**: Track seen events over time (24h, 7d, 14d)
- **Feature-flagged**: `NEXT_PUBLIC_FEATURE_SEEN_STORE`

### Dynamic Category Manager ✅

- **Auto-spawn**: New category rails when affinity score crosses threshold
- **Auto-sunset**: Remove inactive rails after N days of no interaction
- **Core + Dynamic**: Render max (core_limit + dynamic_limit) rails
- **Inventory-aware**: Only spawn rails with enough events
- **Activity tracking**: Update rail activity on user interactions
- **Feature-flagged**: `NEXT_PUBLIC_FEATURE_DYNAMIC_CATEGORIES`

## Configuration

### Environment Variables

```bash
# ============================================================
# SEEN STORE - Prevent showing same events repeatedly
# ============================================================

# Enable seen store filtering
NEXT_PUBLIC_FEATURE_SEEN_STORE=false

# TTL for seen events in days (default: 14)
NEXT_PUBLIC_SEEN_STORE_TTL_DAYS=14

# ============================================================
# DYNAMIC CATEGORY MANAGER - Auto-spawn/sunset rails
# ============================================================

# Enable dynamic category manager
NEXT_PUBLIC_FEATURE_DYNAMIC_CATEGORIES=false

# Max core (static) category rails to show (default: 10)
NEXT_PUBLIC_DYNAMIC_CORE_LIMIT=10

# Max dynamic (spawned) category rails to show (default: 5)
NEXT_PUBLIC_DYNAMIC_RAILS_LIMIT=5

# Min affinity score to spawn new rail - 0.0 to 1.0 (default: 0.4)
NEXT_PUBLIC_DYNAMIC_SPAWN_THRESHOLD=0.4

# Days of inactivity before sunsetting rail (default: 7)
NEXT_PUBLIC_DYNAMIC_SUNSET_DAYS=7
```

## Architecture

### Seen Store

```
src/lib/tracking/
  └── seen-store.ts          # Seen event tracking with 14-day TTL
```

**Core Functions:**

```typescript
import {
  markEventAsSeen,         // Mark single event as seen
  markEventsAsSeen,        // Bulk mark events
  hasSeenEvent,            // Check if event seen
  getSeenEventIds,         // Get all seen IDs
  filterUnseen,            // Filter out seen events
  clearSeenEvents,         // Clear all (testing/privacy)
  getSeenStats,            // Statistics (24h, 7d, 14d counts)
  isSeenStoreEnabled       // Feature flag check
} from '@/lib/tracking/seen-store'
```

### Dynamic Category Manager

```
src/lib/personalization/
  └── dynamic-categories.ts  # Auto-spawn/sunset category rails
```

**Core Functions:**

```typescript
import {
  manageDynamicRails,        // Main orchestration function
  clearDynamicRails,         // Clear all (testing)
  getDynamicRailsStats,      // Statistics
  isDynamicCategoriesEnabled // Feature flag check
} from '@/lib/personalization/dynamic-categories'
```

**Data Types:**

```typescript
interface DynamicRail {
  id: string                 // Unique rail ID
  categoryId: string         // Category identifier
  title: string              // Display name
  emoji: string              // Category emoji
  affinityScore: number      // User affinity (0-1)
  spawnedAt: number          // Timestamp when created
  lastActiveAt: number       // Last interaction timestamp
  isCore: boolean            // Core vs dynamic rail
}
```

## How It Works

### Seen Store Flow

```typescript
// 1. User clicks event
<EventCard onClick={() => {
  markEventAsSeen(event.id, 'click')
  // Event now marked, won't show for 14 days
}} />

// 2. Filter out seen events when generating rails
const unseenEvents = filterUnseen(allEvents)

// 3. Auto-cleanup happens on read
const seenEvents = readSeenEvents() // Expired entries removed automatically
```

**Storage Format** (localStorage):

```json
{
  "sceneScout_seenEvents": [
    {
      "eventId": "event_123",
      "seenAt": 1696118400000,
      "source": "click"
    },
    {
      "eventId": "event_456",
      "seenAt": 1696204800000,
      "source": "view"
    }
  ]
}
```

### Dynamic Category Manager Flow

```typescript
// 1. User interacts with music events
trackEvent('click', { category: 'music', eventId: 'event_1' })
trackEvent('save', { category: 'music', eventId: 'event_2' })

// 2. Affinity score for "music" increases
const affinity = computeAffinity(interactions)
// affinity.categories['music'] = 0.85

// 3. Dynamic Category Manager checks thresholds
const dynamicRails = manageDynamicRails(
  coreCategories,    // Original 18 categories
  affinity,          // User affinity scores
  categoryEvents,    // Available events
  interactions       // Recent interactions
)

// 4. If affinity.categories['music'] >= 0.4:
//    - Check inventory (need >= 4 events)
//    - Spawn "Music" rail if not already exists
//    - Update lastActiveAt if user interacted recently

// 5. After 7 days of inactivity:
//    - Rail sunsets (removed from homepage)
```

**Storage Format** (localStorage):

```json
{
  "sceneScout_dynamicRails": [
    {
      "id": "core_music-concerts",
      "categoryId": "music-concerts",
      "title": "Music & Concerts",
      "emoji": "🎵",
      "affinityScore": 0.92,
      "spawnedAt": 1696118400000,
      "lastActiveAt": 1696204800000,
      "isCore": true
    },
    {
      "id": "dynamic_jazz_1696118400000",
      "categoryId": "jazz",
      "title": "Jazz",
      "emoji": "🎷",
      "affinityScore": 0.67,
      "spawnedAt": 1696118400000,
      "lastActiveAt": 1696204800000,
      "isCore": false
    }
  ]
}
```

## Integration

### PersonalizedRails Component

Seen Store is automatically integrated:

```typescript
// src/components/personalization/PersonalizedRails.tsx

// Events are filtered to exclude seen ones
const seenEventIds = isSeenStoreEnabled() ? getSeenEventIds() : new Set()

const categoryEvents = allEvents.filter(event => {
  if (vetoedEventIds.has(event.id)) return false
  if (seenEventIds.has(event.id)) return false  // ← Seen filtering
  // ... category matching
})

// Mark as seen on click
<EventCard onClick={() => {
  if (isSeenStoreEnabled()) {
    markEventAsSeen(event.id, 'click')
  }
  onEventClick?.(event)
}} />
```

### Homepage

Dynamic Category Manager integrated in displayCategories:

```typescript
// src/app/page.tsx

const displayCategories = useMemo(() => {
  const interactions = readInteractions()
  const affinity = computeAffinity(interactions)

  // Use dynamic category manager if enabled
  if (isDynamicCategoriesEnabled()) {
    const dynamicRails = manageDynamicRails(
      CATEGORIES,      // 18 core categories
      affinity,
      categoryEvents,
      interactions
    )

    // Converts to category format for rendering
    return dynamicRails.map(rail => ({
      id: rail.categoryId,
      title: rail.title,
      emoji: rail.emoji,
      query: CATEGORIES.find(c => c.id === rail.categoryId)?.query || ''
    }))
  }

  // Fallback to standard reordering
  return reorderRows(CATEGORIES, affinity, categoryEvents)
}, [categoryEvents])
```

## Testing

### Enable All Features

```bash
# .env.local
NEXT_PUBLIC_FEATURE_TRACKING_V1=true
NEXT_PUBLIC_FEATURE_PERSONALIZED_RAILS=true
NEXT_PUBLIC_FEATURE_SEEN_STORE=true
NEXT_PUBLIC_FEATURE_DYNAMIC_CATEGORIES=true
```

### Test Seen Store

```typescript
import { markEventAsSeen, hasSeenEvent, getSeenStats, clearSeenEvents } from '@/lib/tracking/seen-store'

// Mark events as seen
markEventAsSeen('event_1', 'click')
markEventAsSeen('event_2', 'view')

// Check if seen
console.log(hasSeenEvent('event_1')) // true
console.log(hasSeenEvent('event_999')) // false

// Get statistics
console.log(getSeenStats())
// {
//   total: 2,
//   last24h: 2,
//   last7d: 2,
//   last14d: 2
// }

// Clear all (for testing)
clearSeenEvents()
```

### Test Dynamic Category Manager

```typescript
import { manageDynamicRails, getDynamicRailsStats } from '@/lib/personalization/dynamic-categories'

// Simulate user loving music events
for (let i = 0; i < 15; i++) {
  trackEvent('click', { category: 'music', eventId: `music_${i}` })
  trackEvent('save', { category: 'music', eventId: `music_${i}` })
}

// Refresh page - "Music" rail should spawn if affinity >= 0.4

// Check stats
console.log(getDynamicRailsStats())
// {
//   total: 11,          // 10 core + 1 dynamic
//   core: 10,
//   dynamic: 1,
//   spawned24h: 1,
//   sunsetCandidates: 0
// }

// Simulate 8 days passing with no music interactions
// (Set lastActiveAt to 8 days ago manually in localStorage)
// Next page load will sunset the "Music" rail
```

### Test Inventory Threshold

```typescript
// Dynamic rails require >= 4 events
const mockEvents = [
  { id: '1', category: 'jazz' },
  { id: '2', category: 'jazz' },
  { id: '3', category: 'jazz' }
  // Only 3 events - below threshold
]

// Even if affinity.categories['jazz'] = 0.9
// Rail will NOT spawn because inventory < 4
```

## Behavior Examples

### Example 1: User Loves Jazz

**Day 1-3:**
- User clicks 10 jazz events
- Affinity score: `jazz = 0.85`
- Dynamic Category Manager spawns "Jazz" rail
- Core limit: 10, Dynamic limit: 5
- Homepage shows: 10 core + 1 jazz = **11 total rails**

**Day 4-7:**
- User continues interacting with jazz
- `lastActiveAt` updates on each interaction
- Rail remains active

**Day 8-15:**
- User stops interacting with jazz
- No updates to `lastActiveAt`
- After 7 days (Day 15), rail sunsets
- Homepage shows: **10 core rails only**

### Example 2: Seen Events Filtered

**User Session 1:**
- Views 20 music events on homepage
- Clicks 5 events (marked as seen)
- Closes browser

**User Session 2 (next day):**
- Opens homepage
- PersonalizedRails filters out 5 seen events
- Shows 15 fresh music events

**User Session 3 (15 days later):**
- Seen events expired (14-day TTL)
- Can see previously viewed events again

### Example 3: Max Rails Limit

**Configuration:**
```bash
NEXT_PUBLIC_DYNAMIC_CORE_LIMIT=8
NEXT_PUBLIC_DYNAMIC_RAILS_LIMIT=3
```

**User Behavior:**
- High affinity for: music (0.9), comedy (0.8), sports (0.7), food (0.6), tech (0.5)

**Result:**
- Core rails: Top 8 static categories
- Dynamic rails: Top 3 by affinity (music, comedy, sports)
- **Total: 11 rails shown (8 core + 3 dynamic)**
- Food and tech rails hidden (over limit)

## Rollback Plan

### Instant Disable

```bash
# .env.local
NEXT_PUBLIC_FEATURE_SEEN_STORE=false
NEXT_PUBLIC_FEATURE_DYNAMIC_CATEGORIES=false
```

Restart dev server:
```bash
npm run dev
```

### Clear User Data

If needed, add UI buttons:

```tsx
import { clearSeenEvents } from '@/lib/tracking/seen-store'
import { clearDynamicRails } from '@/lib/personalization/dynamic-categories'

<button onClick={clearSeenEvents}>
  Clear Seen History
</button>

<button onClick={clearDynamicRails}>
  Reset Category Rails
</button>
```

## Performance

### Seen Store

- **Storage**: ~50 bytes per event × 2000 max = ~100KB localStorage
- **Lookup**: O(n) linear scan, optimized with Set for filtering
- **Cleanup**: Automatic on read, no background process needed

### Dynamic Category Manager

- **Storage**: ~200 bytes per rail × 15 max = ~3KB localStorage
- **Computation**: Runs in useMemo, only when `categoryEvents` changes
- **Spawn/Sunset**: O(c) where c = number of categories (~18)

## Privacy

- **Client-side only**: No server tracking
- **No cookies**: Uses localStorage only
- **Anonymous**: No user ID or personal data
- **User control**: Easy to add clear data buttons

## Troubleshooting

### Seen events not filtering

1. Check feature flag enabled:
   ```bash
   NEXT_PUBLIC_FEATURE_SEEN_STORE=true
   ```

2. Check localStorage:
   ```typescript
   console.log(localStorage.getItem('sceneScout_seenEvents'))
   ```

3. Check if TTL expired:
   ```typescript
   import { getSeenStats } from '@/lib/tracking/seen-store'
   console.log(getSeenStats()) // Check if total > 0
   ```

### Dynamic rails not spawning

1. Check affinity score:
   ```typescript
   const affinity = computeAffinity(readInteractions())
   console.log(affinity.categories) // Must be >= spawn threshold (0.4)
   ```

2. Check inventory:
   ```typescript
   console.log(categoryEvents['music'].length) // Must be >= 4
   ```

3. Check limits not exceeded:
   ```typescript
   import { getDynamicRailsStats } from '@/lib/personalization/dynamic-categories'
   console.log(getDynamicRailsStats())
   // dynamic < DYNAMIC_RAILS_LIMIT (5)
   ```

### Rails not sunsetting

1. Check inactivity period:
   ```typescript
   const rails = JSON.parse(localStorage.getItem('sceneScout_dynamicRails'))
   const now = Date.now()
   const sunsetThreshold = 7 * 24 * 60 * 60 * 1000

   rails.forEach(rail => {
     const daysSinceActive = (now - rail.lastActiveAt) / (24 * 60 * 60 * 1000)
     console.log(`${rail.title}: ${daysSinceActive.toFixed(1)} days inactive`)
   })
   ```

## Implementation Checklist

- [x] Add Seen Store feature flags
- [x] Create SeenStore module with 14-day TTL
- [x] Integrate Seen Store into PersonalizedRails
- [x] Add Dynamic Category Manager feature flags
- [x] Create DynamicCategoryManager module
- [x] Integrate into homepage displayCategories
- [x] Update .env.local with all flags
- [x] Test compilation
- [x] Document in README
- [ ] Add clear data UI buttons (optional)
- [ ] Add admin dashboard for stats (optional)

## References

- **Seen Store**: `/src/lib/tracking/seen-store.ts`
- **Dynamic Categories**: `/src/lib/personalization/dynamic-categories.ts`
- **PersonalizedRails**: `/src/components/personalization/PersonalizedRails.tsx`
- **Homepage Integration**: `/src/app/page.tsx`
- **Config**: `/config/.env.example`, `/.env.local`
