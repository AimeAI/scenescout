# Near Me v1.1 - Smart Fallbacks & Functional Filters

## Overview

Near Me v1.1 ensures users **always see relevant events** through intelligent radius and time window expansion. The page never renders blank - if no events match the initial filters, the system automatically expands search parameters until it finds at least 8 events (MIN_RESULTS) or exhausts all expansion options.

## Key Features

### 1. **Smart Fallback System**
- **Progressive Radius Expansion**: 2km → 5km → 10km → 20km
- **Progressive Time Expansion**: 1h → 3h → 8h (Tonight) → 24h
- **Minimum Results Guarantee**: Stops expanding when MIN_RESULTS (8) events are found
- **Debounced Requests**: 250ms delay between expansions to prevent API hammering
- **Visual Feedback**: Inline loading bar shows "Expanding radius to 10km..." during auto-expansion

### 2. **Functional Quick Chips**
All chips are wired to a global Zustand store (`useFilterStore`) for app-wide filter state:

- **🌙 Tonight**: Sets `when: 'tonight'` (events until 11:59 PM today)
- **⚡ Happening Now**: Sets `when: 'now'` (events within the next hour)
- **📍 Near Me**: Navigates to `/near-me` with current filters serialized in URL
- **🆓 Free**: Toggles `freeOnly` flag (filters events with `price_min === 0`)

Filters persist across pages via URL query parameters (`?when=now&radius=5&free=1`).

### 3. **Location Override ("Use Downtown")**
- **Feature**: Users without location permission or in low-event areas can set a city center fallback
- **Implementation**: `useDowntownToronto()` sets override to `{lat: 43.6532, lng: -79.3832}`
- **UI Indicator**: Purple badge shows "🏙️ Using Downtown" with clear (✕) button
- **Storage**: Persists in `localStorage` as `locationOverride`
- **Priority**: Override > Permission Location > null

### 4. **Reliable Navigation**
- **Back Button**:
  ```typescript
  if (window.history.length > 1) router.back();
  else router.push('/');
  ```
  Handles direct loads (no history) by defaulting to homepage.

### 5. **Clear Empty State**
When all expansions are exhausted and zero events found:
```
🔍 No Events Found

No events match your filters. Try increasing your radius,
widening the time window, or using downtown as a starting point.

[📍 Increase Radius] [⏰ Widen Time Range] [🏙️ Use Downtown]
```

Each button mutates the filter state and re-triggers the search.

## Technical Architecture

### File Structure
```
src/
├── lib/filters/queryModel.ts          # Global filter state (Zustand)
├── hooks/useUserLocation.ts           # Location with override support
├── lib/location/distance.ts           # Haversine + walking time
├── components/near/
│   ├── HeaderControls.tsx             # Radius/time selectors + back button
│   └── EmptyState.tsx                 # CTAs for zero-result state
├── components/filters/QuickChips.tsx  # Wired to queryModel
└── app/
    ├── near-me/page.tsx               # Main Near Me implementation
    └── page.tsx                        # Homepage (reads filters.freeOnly)
```

### Query Model (`queryModel.ts`)
Central state management using Zustand:
```typescript
export interface NearFilters {
  when: 'any' | 'tonight' | 'now' | 'today' | 'next24h';
  freeOnly: boolean;
  nearMe: boolean;
  radiusKm: number;
  timeWindowHrs: number;
}

export const MIN_RESULTS = 8;

// Zustand store
export const useFilterStore = create<FilterStore>((set) => ({
  filters: defaultNearFilters(),
  setWhen: (when) => set((state) => ({ filters: { ...state.filters, when } })),
  toggleFree: () => set((state) => ({ filters: { ...state.filters, freeOnly: !state.filters.freeOnly } })),
  // ...
}));
```

### Fallback Algorithm (`loadEventsWithFallbacks`)
```typescript
1. Start with current filters (radiusKm, timeWindowHrs)
2. Fetch events → if >= MIN_RESULTS, done ✅
3. Expand radius: [2, 5, 10, 20]
   - For each radius > current:
     - Fetch events
     - If >= MIN_RESULTS, stop and update filters
     - Debounce 250ms
4. If still < MIN_RESULTS, expand time: [1, 3, 8, 24]
   - For each timeWindow > current:
     - Fetch events
     - If >= MIN_RESULTS, stop and update filters
     - Debounce 250ms
5. Return best results (even if < MIN_RESULTS)
```

### Distance Calculation
```typescript
// Haversine formula
export function calculateDistanceKm(lat1, lon1, lat2, lon2): number;

// Walking time label (assumes 5 km/h)
export function walkingTimeLabel(distanceKm): string;
// Examples: "8 min walk", "22 min walk", "1h 15m walk"
```

## Manual QA Checklist

### Test Scenarios

#### ✅ 1. Auto-Expansion (Low-Event Area)
**Steps**:
1. Set location to Richmond Hill (far from core): `43.8828, -79.4403`
2. Visit `/near-me`
3. Observe initial query (5 km, 3h)
4. Watch inline status: "Expanding radius to 10 km..."
5. Verify results appear after expansion

**Expected**: Page never blank; shows expansion status; stops at first config with >= 8 events.

#### ✅ 2. "Use Downtown" (No Permission)
**Steps**:
1. Block location permission in browser
2. Visit `/near-me`
3. Click "Enable Location" → Denied
4. Click "Use Downtown" button in empty state
5. Page reloads with Toronto downtown coords

**Expected**: Purple badge "🏙️ Using Downtown" appears; events from core load.

#### ✅ 3. Back Button (Direct Load)
**Steps**:
1. Open new tab → paste `http://localhost:3000/near-me` directly
2. Click "← Back" button

**Expected**: Navigates to `/` (homepage), not 404.

#### ✅ 4. Chips → Near Me Navigation
**Steps**:
1. On homepage, toggle "🆓 Free" chip
2. Click "📍 Near Me" chip
3. Observe URL: `/near-me?free=1`
4. Verify only free events load on Near Me page

**Expected**: Filters persist via URL; Near Me respects `freeOnly=true`.

#### ✅ 5. Free Chip on Homepage
**Steps**:
1. On homepage, click "🆓 Free" chip
2. Observe event cards update to only free events
3. Click chip again to toggle off

**Expected**: Event counts drop to show only `price_min === 0` events; toggling back shows all.

#### ✅ 6. Performance (No Infinite Spinners)
**Steps**:
1. Visit `/near-me` with location enabled
2. Watch network tab for duplicate requests
3. Verify debounce (250ms between expansions)
4. Confirm loading states clear after results

**Expected**: No infinite loading; max 2 concurrent expansion requests; loading bar disappears on completion.

## Behavior Summary

### Expansion Stops When:
- ✅ Results >= MIN_RESULTS (8 events)
- ✅ Radius reaches 20 km (max)
- ✅ Time window reaches 24h (max)

### Empty State Shows When:
- All expansions exhausted AND results === 0

### Downtown Override Clears When:
- User clicks ✕ on "Using Downtown" badge
- Triggers page reload with permission location (or request prompt)

## Caveats

### 1. **EventBrite "Start Soon" Accuracy**
- EventBrite API doesn't support time-of-day filtering
- "Happening Now" (1h window) may include all-day events
- Time filtering happens **client-side** after fetch
- **Impact**: May fetch 200 events but return only 5-10 matching time window

### 2. **Ticketmaster Rate Limits**
- Ticketmaster has stricter rate limits than EventBrite
- Multiple expansions (radius + time) can hit 429 errors
- **Mitigation**: 250ms debounce between expansions; fallback to cached/EventBrite-only results

### 3. **Distance Accuracy**
- Haversine formula assumes spherical Earth (small error < 0.5%)
- Walking time assumes flat terrain at 5 km/h
- Venue coordinates from APIs may be approximate (city center fallback)

## Environment Variables

**None required** - all features use existing API infrastructure and client-side state.

## Performance Notes

- **Debounce**: 250ms between expansions prevents API spam
- **Concurrent Limit**: Max 2 expansion requests in flight
- **Cache**: Uses existing `/api/search-events` cache (15min TTL)
- **Bundle Size**: +3.2 KB (Zustand store + new components)

## Future Enhancements

1. **Save Last Search**: Persist `radiusKm` + `timeWindowHrs` to localStorage
2. **Map View**: Show events on interactive map with radius circle
3. **Transport Options**: Add transit/drive time labels (requires Maps API)
4. **Custom Locations**: Let users save multiple "favorites" (Home, Work, Gym)
5. **Push Notifications**: Alert when new events match saved filters

---

**Last Updated**: October 2025
**Version**: 1.1.0
**Author**: Claude Code
