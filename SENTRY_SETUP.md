# Sentry Setup Guide for SceneScout

This guide will help you set up comprehensive error tracking and performance monitoring with Sentry.

## 1. Create Sentry Account

1. Go to [sentry.io](https://sentry.io) and sign up
2. Create a new project and select **Next.js** as the platform
3. Choose a project name: `scenescout` (or your preferred name)

## 2. Get Your DSN and Credentials

After creating the project, you'll receive:

- **DSN (Data Source Name)**: `https://[key]@[org].ingest.sentry.io/[project-id]`
- **Organization Slug**: Your organization name in Sentry
- **Project Slug**: Your project name
- **Auth Token**: Generate from Settings > Auth Tokens

### Generate Auth Token

1. Go to Settings > Developer Settings > Auth Tokens
2. Click "Create New Token"
3. Select scopes:
   - `project:read`
   - `project:releases`
   - `org:read`
4. Copy the token immediately (you won't see it again)

## 3. Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project-id]
SENTRY_AUTH_TOKEN=your_auth_token_here
SENTRY_ORG=your_org_slug
SENTRY_PROJECT=scenescout
```

**Important**:
- The `NEXT_PUBLIC_SENTRY_DSN` is public and safe to expose to the client
- The `SENTRY_AUTH_TOKEN` should be kept secret (used only during build)
- Never commit these values to git

## 4. Environment-Specific Configuration

### Development
- All errors are logged to console
- Debug mode is enabled
- 100% of transactions are traced
- Session replay is disabled

### Production
- Only 10% of transactions are traced (to manage quota)
- 1% of sessions have replay enabled
- 100% of error sessions have replay enabled
- Source maps are uploaded for debugging

## 5. Verify Installation

### Test Error Tracking

Add this to any page temporarily:

```typescript
// src/app/test-sentry/page.tsx
'use client';

import { captureException } from '@/lib/sentry';

export default function TestPage() {
  const throwError = () => {
    throw new Error('Test Sentry Error!');
  };

  const captureCustomError = () => {
    try {
      throw new Error('Custom Error Test');
    } catch (error) {
      captureException(error, {
        component: 'TestPage',
        action: 'test',
      });
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">Test Sentry</h1>
      <button
        onClick={throwError}
        className="px-4 py-2 bg-red-600 text-white rounded mr-4"
      >
        Throw Unhandled Error
      </button>
      <button
        onClick={captureCustomError}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Capture Custom Error
      </button>
    </div>
  );
}
```

Click the buttons and check your Sentry dashboard to see the errors appear.

## 6. Integration Points

### API Routes

Wrap your API routes with Sentry monitoring:

```typescript
// src/app/api/events/route.ts
import { withSentryApi } from '@/lib/sentry-api-wrapper';

export const GET = withSentryApi(async (req) => {
  // Your API logic
  const data = await fetchEvents();
  return NextResponse.json(data);
}, 'events/list');
```

### Database Queries

Track database performance:

```typescript
import { withDatabaseMonitoring } from '@/lib/sentry-api-wrapper';

const events = await withDatabaseMonitoring('fetch_events', async () => {
  const { data } = await supabase.from('events').select('*');
  return data;
});
```

### User Context

Set user context when a user logs in:

```typescript
import { setUserContext } from '@/lib/sentry';

// After successful login
setUserContext(user);

// After logout
setUserContext(null);
```

### Web Vitals

Already configured in `sentry.client.config.ts`. Web Vitals (LCP, FID, CLS, etc.) are automatically tracked.

## 7. Sentry Dashboard Features

### Error Tracking
- View all errors in real-time
- Filter by browser, OS, environment
- See stack traces with source maps
- Assign errors to team members

### Performance Monitoring
- Track API response times
- Monitor database query performance
- View page load times
- Analyze Web Vitals

### Session Replay
- Watch user sessions that encountered errors
- See exactly what the user did before the error
- Privacy-focused (all text and media masked by default)

### Alerts
Set up alerts in Sentry for:
- New error types
- Error rate spikes
- Performance degradation
- Quota warnings

## 8. Best Practices

### What to Track
✅ Unhandled exceptions
✅ API errors
✅ Database errors
✅ Failed external API calls
✅ Slow operations (>1s for DB, >3s for API)
✅ Poor Web Vitals

### What NOT to Track
❌ Expected errors (404, validation errors)
❌ User input errors
❌ Rate limit errors from APIs
❌ Browser extension errors

### Sanitize Sensitive Data
The configuration already sanitizes:
- Cookies
- Authorization headers
- Query parameters with keywords: `token`, `api_key`, `password`, `secret`
- Environment variables with sensitive keywords

### Set Meaningful Context
Always provide context when capturing errors:

```typescript
captureException(error, {
  component: 'EventCard',
  action: 'add_favorite',
  page: 'events',
  userId: user?.id,
});
```

## 9. Managing Quotas

Sentry has quotas based on your plan:

### Error Events
- Free tier: 5,000 errors/month
- Paid: Unlimited with volume pricing

### Performance Transactions
- Free tier: 10,000 transactions/month
- Production is set to 10% sampling to manage this

### Session Replays
- Free tier: 50 replays/month
- Production is set to 1% sampling

### Optimize Quota Usage
- Use `ignoreErrors` in config to filter out known issues
- Adjust `tracesSampleRate` for your needs
- Use `beforeSend` to filter errors programmatically

## 10. Deployment

### Vercel
Environment variables are automatically loaded from Vercel.
Make sure to add all Sentry variables to your Vercel project settings.

### Other Platforms
Ensure these environment variables are set in your deployment platform:
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `SENTRY_ORG`
- `SENTRY_PROJECT`

## 11. Monitoring Checklist

After deployment, verify:
- [ ] Errors are appearing in Sentry dashboard
- [ ] Performance transactions are being recorded
- [ ] Source maps are uploading correctly
- [ ] User context is being set
- [ ] Web Vitals are being tracked
- [ ] API routes are being monitored
- [ ] Database queries are being tracked
- [ ] Session replays are working (if enabled)

## 12. Troubleshooting

### Errors Not Appearing
1. Check `NEXT_PUBLIC_SENTRY_DSN` is set correctly
2. Verify Sentry is initialized (check browser console)
3. Check browser DevTools Network tab for Sentry requests
4. Ensure errors aren't filtered by `ignoreErrors`

### Source Maps Not Working
1. Verify `SENTRY_AUTH_TOKEN` has correct permissions
2. Check build logs for upload errors
3. Ensure `SENTRY_ORG` and `SENTRY_PROJECT` are correct

### High Quota Usage
1. Check for error loops
2. Review `tracesSampleRate` (reduce if needed)
3. Add more patterns to `ignoreErrors`
4. Filter errors with `beforeSend`

## 13. Resources

- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Session Replay](https://docs.sentry.io/product/session-replay/)
- [Error Tracking Best Practices](https://docs.sentry.io/product/issues/)

## 14. Support

If you encounter issues:
1. Check Sentry's status page: [status.sentry.io](https://status.sentry.io)
2. Review Sentry documentation
3. Check GitHub issues: [getsentry/sentry-javascript](https://github.com/getsentry/sentry-javascript)
4. Contact Sentry support (paid plans)

---

**Remember**: Sentry is a powerful tool, but it's only as useful as the data you send it. Always provide meaningful context, sanitize sensitive data, and monitor your quotas.
