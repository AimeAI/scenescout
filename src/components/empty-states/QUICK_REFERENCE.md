# Empty States Quick Reference

## Import
```tsx
import { EmptyState, EMPTY_STATE_VARIANTS } from '@/components/empty-states'
```

## Common Patterns

### No Search Results
```tsx
<EmptyState
  {...EMPTY_STATE_VARIANTS.noSearchResults}
  description={`No results for "${query}"`}
  action={{ label: 'Browse All', onClick: () => router.push('/') }}
  secondaryAction={{ label: 'Clear Search', onClick: clear, variant: 'outline' }}
/>
```

### Location Permission Denied
```tsx
<EmptyState
  {...EMPTY_STATE_VARIANTS.locationDenied}
  action={{ label: 'Try Again', onClick: requestLocation }}
  secondaryAction={{ label: 'Select City', onClick: manualSelect, variant: 'outline' }}
/>
```

### Empty Category
```tsx
<EmptyState
  {...getEmptyState('noCategoryEvents', {
    emoji: category.emoji,
    title: `No ${category.title} Events`
  })}
  action={{ label: 'Browse All', onClick: goHome }}
/>
```

### No Saved Events
```tsx
<EmptyState
  {...EMPTY_STATE_VARIANTS.noSavedEvents}
  action={{ label: 'Browse Events', onClick: browse }}
/>
```

### Loading Error
```tsx
<EmptyState
  {...EMPTY_STATE_VARIANTS.loadingError}
  description={errorMessage}
  action={{ label: 'Retry', onClick: retry }}
/>
```

### No Nearby Events
```tsx
<EmptyState
  {...EMPTY_STATE_VARIANTS.noNearbyEvents}
  description={`No events within ${radius} miles`}
  action={{ label: 'Increase Radius', onClick: increaseRadius }}
  secondaryAction={{ label: 'Browse All', onClick: browseAll, variant: 'outline' }}
/>
```

## All Available Variants

| Variant | Best For |
|---------|----------|
| `noSearchResults` | Empty search results |
| `searchInitial` | Before user searches |
| `noFilterResults` | Overly restrictive filters |
| `noCategoryEvents` | Empty category pages |
| `noUpcomingEvents` | No future events |
| `noEventsToday` | Nothing today |
| `locationDenied` | Location permission denied |
| `locationUnavailable` | Geolocation not supported |
| `noNearbyEvents` | Nothing within radius |
| `noSavedEvents` | User hasn't saved anything |
| `noConnection` | Offline/no internet |
| `genericError` | Unknown errors |
| `loadingError` | Failed to load data |
| `noSurpriseEvents` | All swipe cards viewed |

## Props Quick Reference

```tsx
interface EmptyStateProps {
  icon?: LucideIcon           // Lucide icon component
  emoji?: string              // Emoji string (alternative to icon)
  title: string               // Main heading
  description: string | JSX   // Explanation (can be JSX)
  suggestions?: string[]      // Bulleted tips
  action?: {                  // Primary button
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary'
  }
  secondaryAction?: {         // Secondary button
    label: string
    onClick: () => void
    variant?: 'default' | 'outline' | 'secondary'
  }
  className?: string          // Additional CSS
}
```

## Tips

1. **Always provide an action** - Users should know what to do next
2. **Use specific descriptions** - Include context like search query or filter values
3. **Customize when needed** - Use `getEmptyState()` to override title/description
4. **Keep it friendly** - Avoid blame ("You forgot") or vague messages ("Nothing here")
5. **Test empty states early** - They're often the first thing new users see
