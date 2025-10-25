# Sentry Quick Reference

Quick reference for common Sentry operations in SceneScout.

## Installation

```bash
npm install @sentry/nextjs
```

## Environment Variables

```bash
NEXT_PUBLIC_SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project-id]
SENTRY_AUTH_TOKEN=your-auth-token
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=scenescout
```

## Common Operations

### 1. Capture Exceptions

```typescript
import { captureException } from '@/lib/sentry';

try {
  await riskyOperation();
} catch (error) {
  captureException(error, {
    component: 'EventCard',
    action: 'add_favorite',
    page: 'events',
  });
}
```

### 2. Capture Messages

```typescript
import { captureMessage } from '@/lib/sentry';

captureMessage('User performed unusual action', 'warning', {
  userId: user.id,
  action: 'bulk_delete',
});
```

### 3. Set User Context

```typescript
import { setUserContext } from '@/lib/sentry';

// On login
setUserContext(user);

// On logout
setUserContext(null);
```

### 4. Add Breadcrumbs

```typescript
import { addBreadcrumb } from '@/lib/sentry';

addBreadcrumb('User clicked favorite button', 'user-action', 'info', {
  eventId: '123',
  eventName: 'Concert',
});
```

### 5. Set Custom Tags

```typescript
import { setTags } from '@/lib/sentry';

setTags({
  page: 'search',
  feature: 'event-search',
  category: 'music',
});
```

### 6. Set Context

```typescript
import { setContext } from '@/lib/sentry';

setContext('search', {
  query: searchTerm,
  filters: activeFilters,
  resultsCount: results.length,
});
```

## API Route Integration

### Simple Wrapper

```typescript
import { withSentryApi } from '@/lib/sentry-api-wrapper';

export const GET = withSentryApi(async (req) => {
  const data = await fetchData();
  return NextResponse.json(data);
}, 'api/events');
```

### Database Monitoring

```typescript
import { withDatabaseMonitoring } from '@/lib/sentry-api-wrapper';

const events = await withDatabaseMonitoring('fetch_events', async () => {
  return await supabase.from('events').select('*');
});
```

### External API Monitoring

```typescript
import { withExternalApiMonitoring } from '@/lib/sentry-api-wrapper';

const data = await withExternalApiMonitoring('ticketmaster', async () => {
  return await fetch('https://api.ticketmaster.com/...');
});
```

## Performance Tracking

### Track API Performance

```typescript
import { trackApiPerformance } from '@/lib/sentry';

const startTime = Date.now();
await processRequest();
const duration = Date.now() - startTime;

trackApiPerformance('/api/events', 'GET', duration, 200);
```

### Track Database Queries

```typescript
import { trackDatabaseQuery } from '@/lib/sentry';

const startTime = Date.now();
const { data, error } = await supabase.from('events').select('*');
const duration = Date.now() - startTime;

trackDatabaseQuery('fetch_events', duration, !error);
```

### Track Page Load

```typescript
import { trackPageLoad } from '@/lib/sentry';

useEffect(() => {
  const startTime = performance.now();
  return () => {
    const loadTime = performance.now() - startTime;
    trackPageLoad('events', loadTime);
  };
}, []);
```

### Track Custom Metrics

```typescript
import { trackPerformance } from '@/lib/sentry';

trackPerformance({
  name: 'search.response.time',
  value: 450,
  unit: 'ms',
  tags: { category: 'music' },
});
```

## Web Vitals

Web Vitals are automatically tracked when you add this to `app/layout.tsx`:

```typescript
import { reportWebVitals } from '@/lib/web-vitals';

export { reportWebVitals };
```

## Error Boundaries

### Global Error Boundary

```typescript
import { ErrorBoundary } from '@/components/error-boundary';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

### Specialized Boundaries

```typescript
import { EventCardErrorBoundary } from '@/components/error-boundary';

<EventCardErrorBoundary>
  <EventCard event={event} />
</EventCardErrorBoundary>
```

## Filtering Errors

### Ignore Specific Errors

Edit `sentry.client.config.ts`:

```typescript
ignoreErrors: [
  'NetworkError',
  'ChunkLoadError',
  'Your custom error message',
],
```

### Filter in beforeSend

```typescript
beforeSend(event, hint) {
  // Don't send validation errors
  if (event.exception?.values?.[0]?.value?.includes('Validation')) {
    return null;
  }
  return event;
},
```

## Testing Sentry

### Test Error Capture

```typescript
// Temporary test button
<button onClick={() => {
  throw new Error('Test Sentry Error!');
}}>
  Test Error
</button>
```

### Test Custom Capture

```typescript
import { captureException } from '@/lib/sentry';

<button onClick={() => {
  captureException(new Error('Custom Test Error'), {
    component: 'TestButton',
  });
}}>
  Test Custom Error
</button>
```

## Severity Levels

- `fatal` - Critical errors that crash the app
- `error` - Standard errors
- `warning` - Warnings (e.g., slow operations)
- `info` - Informational messages
- `debug` - Debug information

## Best Practices

### ✅ DO

- Always provide context with errors
- Track slow operations (DB >1s, API >3s)
- Set user context on login
- Add meaningful breadcrumbs
- Sanitize sensitive data
- Use appropriate severity levels

### ❌ DON'T

- Don't track expected errors (404, validation)
- Don't send sensitive data (passwords, tokens)
- Don't track browser extension errors
- Don't exceed quota limits
- Don't track user input errors

## Quota Management

### Free Tier Limits
- 5,000 errors/month
- 10,000 performance transactions/month
- 50 session replays/month

### Optimize Usage
- Set `tracesSampleRate` to 0.1 (10%) in production
- Use `ignoreErrors` to filter known issues
- Set `replaysSessionSampleRate` to 0.01 (1%)
- Filter errors with `beforeSend`

## Useful Links

- [Dashboard](https://sentry.io)
- [Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Session Replay](https://docs.sentry.io/product/session-replay/)

## Common Issues

### Errors not appearing?
1. Check `NEXT_PUBLIC_SENTRY_DSN` is set
2. Verify Sentry initialized in browser console
3. Check Network tab for Sentry requests
4. Review `ignoreErrors` configuration

### Source maps not working?
1. Verify `SENTRY_AUTH_TOKEN` permissions
2. Check build logs for upload errors
3. Confirm `SENTRY_ORG` and `SENTRY_PROJECT`

### High quota usage?
1. Check for error loops
2. Reduce `tracesSampleRate`
3. Add more `ignoreErrors` patterns
4. Use `beforeSend` to filter

## Example Files

- `/src/lib/sentry.ts` - Core utilities
- `/src/lib/sentry-api-wrapper.ts` - API wrappers
- `/src/lib/web-vitals.ts` - Web Vitals tracking
- `/src/lib/sentry-examples.ts` - Integration examples
- `/src/components/error-boundary.tsx` - Error boundaries

---

**Need more help?** See `SENTRY_SETUP.md` for detailed setup instructions.
