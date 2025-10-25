# Empty States Component System

A comprehensive, reusable empty state system for SceneScout that provides consistent, helpful messaging when no data is available.

## Overview

The empty state system consists of:
- **EmptyState**: Base component for displaying empty states
- **EMPTY_STATE_VARIANTS**: Pre-configured empty state variants
- **getEmptyState**: Helper function for customizing variants

## Usage

### Basic Usage

```tsx
import { EmptyState, EMPTY_STATE_VARIANTS } from '@/components/empty-states'

// Use a pre-configured variant
<EmptyState
  {...EMPTY_STATE_VARIANTS.noSearchResults}
  action={{
    label: 'Browse Events',
    onClick: () => router.push('/')
  }}
/>
```

### Custom Empty State

```tsx
<EmptyState
  icon={Search}
  title="Custom Title"
  description="Custom description text"
  suggestions={['Suggestion 1', 'Suggestion 2']}
  action={{
    label: 'Primary Action',
    onClick: handleAction,
    variant: 'default'
  }}
  secondaryAction={{
    label: 'Secondary Action',
    onClick: handleSecondary,
    variant: 'outline'
  }}
/>
```

### Customizing Variants

```tsx
import { getEmptyState } from '@/components/empty-states'

<EmptyState
  {...getEmptyState('noSearchResults', {
    description: `No results for "${query}"`,
    emoji: '🔍'
  })}
  action={{ label: 'Try Again', onClick: retry }}
/>
```

## Available Variants

### Search & Discovery

#### `noSearchResults`
**When to use**: No events match search query
**Icon**: Search
**Includes**: Suggestions for improving search

#### `searchInitial`
**When to use**: Before user has searched
**Icon**: Search
**Includes**: Instructions on how to search

#### `noFilterResults`
**When to use**: Filters are too restrictive
**Icon**: Filter
**Includes**: Suggestions to adjust filters

### Category & Events

#### `noCategoryEvents`
**When to use**: Category has no events
**Icon**: Calendar
**Includes**: Suggestions for other categories

#### `noUpcomingEvents`
**When to use**: No future events scheduled
**Icon**: Calendar
**Includes**: Browse alternatives

#### `noEventsToday`
**When to use**: Nothing happening today
**Icon**: Calendar
**Includes**: Try different dates

### Location

#### `locationDenied`
**When to use**: User denied location permission
**Icon**: MapPin
**Includes**: Step-by-step instructions, privacy note

#### `locationUnavailable`
**When to use**: Browser doesn't support geolocation
**Icon**: Navigation
**Includes**: Manual location selection option

#### `noNearbyEvents`
**When to use**: No events within radius
**Icon**: MapPin
**Includes**: Increase radius suggestion

### User Data

#### `noSavedEvents`
**When to use**: User hasn't saved anything
**Icon**: Heart
**Includes**: How to save events, browse CTA

### Errors

#### `genericError`
**When to use**: Unknown error occurred
**Emoji**: ⚠️
**Includes**: Troubleshooting steps

#### `loadingError`
**When to use**: Failed to load data
**Emoji**: 😕
**Includes**: Retry option

#### `noConnection`
**When to use**: Offline/no internet
**Icon**: WifiOff
**Includes**: Connection check prompt

### Special

#### `noSurpriseEvents`
**When to use**: All swipe cards viewed
**Icon**: Sparkles
**Includes**: Check back later message

## Component Props

### EmptyState

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `icon` | `LucideIcon` | No | Icon component to display |
| `emoji` | `string` | No | Emoji to display (alternative to icon) |
| `title` | `string` | Yes | Main heading text |
| `description` | `string \| ReactNode` | Yes | Explanation text (can be JSX) |
| `suggestions` | `string[]` | No | Bulleted list of helpful tips |
| `action` | `ActionConfig` | No | Primary action button |
| `secondaryAction` | `ActionConfig` | No | Secondary action button |
| `className` | `string` | No | Additional CSS classes |

### ActionConfig

```tsx
{
  label: string          // Button text
  onClick: () => void    // Click handler
  variant?: 'default' | 'outline' | 'secondary'  // Button style
}
```

## Design Guidelines

### Visual Hierarchy
1. **Icon/Emoji** (80px): Friendly, recognizable visual
2. **Title** (2xl, bold): Clear, concise statement
3. **Description** (gray-400): Helpful explanation
4. **Suggestions** (optional): Actionable tips in bordered box
5. **Actions**: 1-2 buttons for next steps

### Writing Guidelines

**Titles**:
- Clear and specific: "No Events Found" not "Nothing Here"
- Avoid blame: "No Saved Events Yet" not "You Forgot to Save"
- Use present tense

**Descriptions**:
- Explain why: "We couldn't find any events matching your search"
- Keep it brief: 1-2 sentences max
- Be helpful: Suggest what to do next

**Suggestions**:
- Start with action verbs: "Try", "Check", "Browse"
- Be specific: "Increase your search radius" not "Try something else"
- Limit to 3-5 items

**Action Labels**:
- Clear intent: "Browse All Events" not "Continue"
- Specific: "Increase Radius" not "Change Settings"
- Max 3 words preferred

### Accessibility

All empty states include:
- Semantic HTML structure
- Proper heading hierarchy
- Sufficient color contrast (gray-400 on black = 7:1)
- Clear, actionable CTAs
- Screen reader friendly icons

## Where Used

| Page | Empty State(s) |
|------|---------------|
| `/search` | `searchInitial`, `noSearchResults`, `loadingError` |
| `/saved` | `noSavedEvents`, `loadingError` |
| `/near-me` | `locationDenied`, `locationUnavailable`, `noNearbyEvents` |
| `/category/[slug]` | `noCategoryEvents` |
| `/surprise` | `noSurpriseEvents` |
| Filter results | `noFilterResults` |

## Examples

### Search Page
```tsx
// No results found
<EmptyState
  {...EMPTY_STATE_VARIANTS.noSearchResults}
  description={`No events found for "${query}"`}
  action={{
    label: 'Browse All Events',
    onClick: () => router.push('/')
  }}
  secondaryAction={{
    label: 'Clear Search',
    onClick: clearSearch,
    variant: 'outline'
  }}
/>
```

### Saved Events
```tsx
// First-time user
<EmptyState
  {...EMPTY_STATE_VARIANTS.noSavedEvents}
  action={{
    label: 'Browse Events',
    onClick: () => router.push('/')
  }}
/>
```

### Location Permission
```tsx
// Permission denied
<EmptyState
  {...EMPTY_STATE_VARIANTS.locationDenied}
  action={{
    label: 'Try Again',
    onClick: requestLocation
  }}
  secondaryAction={{
    label: 'Select City',
    onClick: () => router.push('/'),
    variant: 'outline'
  }}
/>
```

### Category Empty
```tsx
// No events in category
<EmptyState
  {...getEmptyState('noCategoryEvents', {
    emoji: category.emoji,
    title: `No ${category.title} Events`,
    description: `No ${category.title.toLowerCase()} events right now.`
  })}
  action={{
    label: 'Browse All Events',
    onClick: () => router.push('/')
  }}
/>
```

## Future Enhancements

Potential additions:
- [ ] Animated illustrations using Lottie
- [ ] Contextual help links
- [ ] Offline mode with cached data
- [ ] A/B tested copy variants
- [ ] Analytics tracking on empty states
- [ ] Progressive disclosure for complex suggestions
