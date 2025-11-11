# Sentry Error Monitoring Setup

Sentry is now configured! Follow these steps to complete the setup:

## 1. Create a Sentry Account

1. Go to https://sentry.io/signup/
2. Sign up for a free account (supports 5k errors/month free)
3. Create a new project and select "Next.js"

## 2. Get Your DSN

After creating the project, you'll see a DSN (Data Source Name) that looks like:
```
https://abc123def456@o123456.ingest.sentry.io/7890123
```

## 3. Add Environment Variables

Add these to your `.env.local` file:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=your_dsn_here
SENTRY_ORG=your-org-name
SENTRY_PROJECT=your-project-name
SENTRY_AUTH_TOKEN=your-auth-token
```

To get the auth token:
1. Go to https://sentry.io/settings/account/api/auth-tokens/
2. Create a new token with "project:releases" and "org:read" permissions
3. Copy the token

## 4. Test Error Tracking

Add this button to any page to test:

```tsx
<button onClick={() => { throw new Error('Test Sentry!') }}>
  Test Error Tracking
</button>
```

Or use the browser console:
```javascript
throw new Error('Sentry test error from console')
```

## 5. Features You Get

✅ **Error Tracking**: All unhandled errors are automatically captured
✅ **Session Replay**: See what users did before an error (10% sample rate)
✅ **Performance Monitoring**: Track page load times and API calls
✅ **Source Maps**: See original TypeScript code in error stack traces
✅ **Breadcrumbs**: User actions leading up to errors
✅ **Release Tracking**: Track errors by deployment version

## 6. Production Deployment

When deploying to Vercel:

1. Add the environment variables to Vercel:
   - Go to Project Settings → Environment Variables
   - Add all 4 Sentry variables

2. Sentry will automatically:
   - Upload source maps on build
   - Track releases
   - Monitor performance
   - Capture errors

## 7. Monitoring Dashboard

After deployment, check your Sentry dashboard for:
- Real-time error alerts
- Error frequency and trends
- User impact (how many users affected)
- Performance bottlenecks

## Optional: Set Up Alerts

1. Go to your Sentry project → Alerts
2. Create alerts for:
   - More than 10 errors in 5 minutes
   - New error types
   - Performance degradation

You'll get email/Slack notifications when things go wrong!
