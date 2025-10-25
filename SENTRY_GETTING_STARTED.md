# Getting Started with Sentry

Quick start guide to get Sentry up and running in 10 minutes.

## ✅ What's Already Done

All Sentry files and configuration have been set up for you:
- ✅ Configuration files created
- ✅ Utility libraries implemented
- ✅ API wrappers ready
- ✅ Error boundaries integrated
- ✅ Web Vitals tracking configured
- ✅ Documentation complete
- ✅ Package installed

## 🚀 Quick Start (3 Steps)

### Step 1: Create Sentry Account (2 minutes)

1. Go to **https://sentry.io**
2. Sign up (free tier includes 5,000 errors/month)
3. Create a new project:
   - Platform: **Next.js**
   - Project name: **scenescout** (or your choice)

### Step 2: Get Your Credentials (1 minute)

After creating the project, copy these values:

1. **DSN** (shown immediately after project creation)
   - Format: `https://[key]@[org].ingest.sentry.io/[project-id]`

2. **Auth Token** (Settings → Developer Settings → Auth Tokens)
   - Click "Create New Token"
   - Select scopes: `project:read`, `project:releases`, `org:read`
   - Copy immediately (won't be shown again)

3. **Organization Slug** (in your Sentry URL)
   - Format: `https://[org-slug].sentry.io`

### Step 3: Configure Environment (1 minute)

Add to your `.env.local` file:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://[YOUR-KEY]@[YOUR-ORG].ingest.sentry.io/[PROJECT-ID]
SENTRY_AUTH_TOKEN=your-auth-token-here
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=scenescout
```

**That's it! You're done!** 🎉

## 🧪 Test It Works (2 minutes)

### Test 1: Validate Setup

```bash
npx tsx scripts/validate-sentry-setup.ts
```

You should see all green checkmarks.

### Test 2: Test Error Tracking

Create a test page:

```typescript
// src/app/test-sentry/page.tsx
'use client';

export default function TestSentry() {
  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">Test Sentry</h1>
      <button
        onClick={() => {
          throw new Error('Test Sentry Error!');
        }}
        className="px-6 py-3 bg-red-600 text-white rounded-lg"
      >
        Throw Test Error
      </button>
    </div>
  );
}
```

1. Start dev server: `npm run dev`
2. Visit: `http://localhost:3000/test-sentry`
3. Click the button
4. Check Sentry dashboard - error should appear in ~10 seconds

### Test 3: Check Console

Open browser DevTools → Console, you should see:
- Sentry initialized
- No initialization errors

Open DevTools → Network, filter "sentry", you should see:
- Events being sent to Sentry

## 📊 What's Being Tracked

### Automatically Tracked ✅
- Unhandled errors
- Unhandled promise rejections
- API errors (when using wrappers)
- Performance metrics
- Web Vitals (LCP, FID, CLS, FCP, TTFB)
- Page load times
- Session replays (on errors)

### Not Tracked ❌
- Expected errors (404, validation)
- Browser extension errors
- User input errors
- PII or sensitive data

## 🔧 Usage Examples

### In API Routes

```typescript
import { withSentryApi } from '@/lib/sentry-api-wrapper';

export const GET = withSentryApi(async (req) => {
  const data = await fetchData();
  return NextResponse.json(data);
}, 'api/events');
```

### In Components

```typescript
import { captureException } from '@/lib/sentry';

try {
  await riskyOperation();
} catch (error) {
  captureException(error, {
    component: 'EventCard',
    action: 'save',
  });
}
```

### Track User

```typescript
import { setUserContext } from '@/lib/sentry';

// On login
setUserContext(user);

// On logout
setUserContext(null);
```

## 📚 Documentation

- **Full Setup Guide**: `SENTRY_SETUP.md`
- **Quick Reference**: `SENTRY_QUICK_REFERENCE.md`
- **Implementation Details**: `SENTRY_IMPLEMENTATION_SUMMARY.md`
- **Code Examples**: `src/lib/sentry-examples.ts`

## 🎯 Next Steps

1. ✅ Configure environment variables (done above)
2. ✅ Test error tracking (done above)
3. 🔲 Integrate with existing API routes
4. 🔲 Add user context on login
5. 🔲 Configure alerts in Sentry dashboard
6. 🔲 Deploy to production

## 💡 Tips

### For Development
- All errors are logged to console
- 100% of transactions are tracked
- Debug mode is enabled
- Check browser DevTools for Sentry activity

### For Production
- Only 10% of transactions are tracked (quota management)
- Source maps are uploaded for debugging
- Session replay enabled on errors
- Alerts configured for critical issues

## ❓ Common Questions

**Q: Do I need to add Sentry to every file?**
A: No! Error boundaries and the global config handle most errors automatically. Only wrap API routes and critical operations.

**Q: Will this slow down my app?**
A: No significant impact. Sentry is async and doesn't block rendering. Performance overhead is <1%.

**Q: What about privacy?**
A: All PII is automatically scrubbed. User IDs are hashed. Session replay masks all text/media by default.

**Q: What if I hit quota limits?**
A: Free tier gives 5K errors/month. Adjust `tracesSampleRate` in configs to reduce transaction tracking.

**Q: Can I use this in development?**
A: Yes! Development mode has 100% sampling and verbose logging. Disable by not setting `NEXT_PUBLIC_SENTRY_DSN`.

## 🆘 Troubleshooting

**Errors not appearing?**
- Check `NEXT_PUBLIC_SENTRY_DSN` is set
- Check browser console for initialization
- Check Network tab for Sentry requests
- Verify error isn't filtered in config

**Source maps not working?**
- Verify `SENTRY_AUTH_TOKEN` is correct
- Check build logs for upload errors
- Confirm org/project names match

**High quota usage?**
- Reduce `tracesSampleRate` to 0.05 (5%)
- Add more patterns to `ignoreErrors`
- Check for error loops

**Need more help?**
- See `SENTRY_SETUP.md` for detailed troubleshooting
- Check Sentry docs: https://docs.sentry.io
- Check Sentry status: https://status.sentry.io

## 🎉 You're All Set!

Sentry is now monitoring your app for errors and performance issues. Check your dashboard at **https://sentry.io** to see real-time data.

**Remember**: Always test in development first, then deploy to production with confidence!

---

**Questions?** See the full documentation in `SENTRY_SETUP.md` or visit https://docs.sentry.io
