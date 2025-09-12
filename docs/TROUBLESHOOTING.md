# SceneScout v14 Troubleshooting Guide

This guide covers common issues, error messages, and solutions for SceneScout v14 during development and production.

## 🔍 Quick Diagnostic

### Health Check Commands

```bash
# Check application status
npm run typecheck          # TypeScript compilation
npm run lint              # ESLint checks  
npm run build             # Production build
npm test                  # Test suite

# Check external services
curl -f https://your-project.supabase.co/rest/v1/ # Supabase API
stripe status             # Stripe CLI status
supabase status           # Local Supabase stack
```

### Common Signs of Issues

| Symptom | Likely Cause | Quick Fix |
|---------|--------------|-----------|
| 500 errors | Environment variables missing | Check `.env.local` |
| Auth redirects fail | Redirect URLs misconfigured | Update Supabase auth settings |
| Images not loading | Image proxy issues | Check Supabase edge functions |
| Database connection fails | Supabase connection issues | Verify connection string |
| Stripe webhooks failing | Webhook endpoint configuration | Check webhook URL and secrets |

## 🛠️ Development Issues

### Environment Setup Problems

#### Node.js Version Issues

**Problem**: Build fails with Node.js version errors
```
Error: The engine "node" is incompatible with this module
```

**Solution**:
```bash
# Check Node version
node --version

# Install correct version with nvm
nvm install 18
nvm use 18

# Or with n
n 18

# Verify version
node --version  # Should show v18.x.x
```

#### Environment Variables Not Loading

**Problem**: Environment variables are undefined in the application

**Solution**:
```bash
# Ensure .env.local exists
ls -la .env.local

# Check file format (no spaces around =)
cat .env.local | grep "NEXT_PUBLIC_"

# Restart development server
npm run dev
```

**Common Mistakes**:
```bash
# ❌ Wrong - spaces around equals
NEXT_PUBLIC_SUPABASE_URL = https://example.supabase.co

# ✅ Correct - no spaces  
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co

# ❌ Wrong - quotes unnecessary
NEXT_PUBLIC_SUPABASE_URL="https://example.supabase.co"

# ✅ Correct - no quotes needed
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co
```

#### Dependencies Installation Issues

**Problem**: `npm install` fails with dependency conflicts

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and lockfile
rm -rf node_modules package-lock.json

# Reinstall dependencies
npm install

# If issues persist, try yarn
yarn install
```

### Database Connection Issues

#### Supabase Connection Failed

**Problem**: 
```
Error: Invalid API key or unable to connect to Supabase
```

**Solution**:
```bash
# Verify Supabase configuration
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Test connection manually
curl -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
     "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/"

# Check project status in Supabase dashboard
supabase projects list
```

#### Row Level Security (RLS) Issues

**Problem**: 
```
Error: new row violates row-level security policy
```

**Solution**:
```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'your_table';

-- Temporarily disable RLS for debugging (NOT for production)
ALTER TABLE your_table DISABLE ROW LEVEL SECURITY;

-- Re-enable after fixing policies
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
```

#### Database Schema Mismatch

**Problem**: TypeScript types don't match database schema

**Solution**:
```bash
# Regenerate types from database
supabase gen types typescript --linked > src/types/supabase.ts

# Or if using local development
supabase gen types typescript --local > src/types/supabase.ts

# Update imports in your code
```

### Authentication Issues

#### OAuth Redirect Loops

**Problem**: OAuth login keeps redirecting back to login page

**Solution**:
1. **Check redirect URLs in provider settings**:
   ```
   GitHub: https://your-project.supabase.co/auth/v1/callback
   Google: https://your-project.supabase.co/auth/v1/callback
   ```

2. **Verify Supabase auth configuration**:
   ```
   Site URL: http://localhost:3000 (development)
   Redirect URLs: http://localhost:3000/auth/callback
   ```

3. **Check auth callback handler**:
   ```typescript
   // app/auth/callback/route.ts
   import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
   import { cookies } from 'next/headers'
   import { NextRequest, NextResponse } from 'next/server'

   export async function GET(request: NextRequest) {
     const requestUrl = new URL(request.url)
     const code = requestUrl.searchParams.get('code')

     if (code) {
       const supabase = createRouteHandlerClient({ cookies })
       await supabase.auth.exchangeCodeForSession(code)
     }

     return NextResponse.redirect(requestUrl.origin)
   }
   ```

#### Session Persistence Issues

**Problem**: Users get logged out on page refresh

**Solution**:
```typescript
// Check session initialization in layout.tsx
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  return (
    <html>
      <body>
        <AuthProvider session={session}>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

### Build and Deployment Issues

#### Next.js Build Failures

**Problem**: Build fails with TypeScript errors

**Solution**:
```bash
# Check TypeScript compilation
npx tsc --noEmit

# Fix common issues:
# - Missing types for external libraries
npm install @types/library-name

# - Strict mode violations
# Update tsconfig.json temporarily:
{
  "compilerOptions": {
    "strict": false  // Only for debugging
  }
}
```

#### Vercel Deployment Failures

**Problem**: Deployment fails with build or runtime errors

**Solution**:
1. **Check Vercel build logs** in the dashboard
2. **Verify environment variables** are set in Vercel
3. **Test build locally**:
   ```bash
   npm run build
   npm start
   ```

4. **Common fixes**:
   ```bash
   # Function size limits
   # Add to vercel.json:
   {
     "functions": {
       "app/api/*/route.js": {
         "maxDuration": 30
       }
     }
   }
   ```

### Edge Functions Issues

#### Function Deployment Failures

**Problem**: 
```
Error: Failed to deploy function to edge runtime
```

**Solution**:
```bash
# Check function syntax locally
deno run --allow-net --allow-env supabase/functions/your_function/index.ts

# Verify imports use correct Deno URLs
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

# Deploy with verbose logging
supabase functions deploy your_function --debug
```

#### Function Runtime Errors

**Problem**: Functions work locally but fail in production

**Solution**:
```typescript
// Add comprehensive error handling
serve(async (req) => {
  try {
    // Your function logic
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})

// Check function logs
supabase functions logs your_function
```

## 💳 Payment Integration Issues

### Stripe Configuration

#### Webhook Verification Failed

**Problem**:
```
Error: Invalid signature in webhook
```

**Solution**:
```typescript
// Verify webhook endpoint secret
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

// Check webhook signing in API route
import Stripe from 'stripe'
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      endpointSecret!
    )
    // Process event
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }
}
```

#### Test Mode vs Live Mode Issues

**Problem**: Payments work in test but not in production

**Solution**:
```bash
# Verify you're using correct API keys
echo "Test keys start with:"
echo "pk_test_..."
echo "sk_test_..."

echo "Live keys start with:"
echo "pk_live_..."  
echo "sk_live_..."

# Check webhook endpoints are configured for both modes
```

### Subscription Management Issues

#### Subscription Status Sync

**Problem**: Subscription status doesn't update in database

**Solution**:
```typescript
// Ensure webhook handlers update database
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Failed to update subscription:', error)
    throw error
  }
}
```

## 📧 Email and Notifications

### Email Delivery Issues

#### Emails Not Sending

**Problem**: Email notifications fail to send

**Solution**:
```typescript
// Check Resend API key in edge function
const resendApiKey = Deno.env.get('RESEND_API_KEY')
if (!resendApiKey) {
  throw new Error('Resend API key not configured')
}

// Test email API manually
const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${resendApiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: 'SceneScout <noreply@scenescout.app>',
    to: ['test@example.com'],
    subject: 'Test Email',
    html: '<p>Test content</p>'
  })
})

console.log('Email API response:', await response.json())
```

#### Email Templates Rendering Incorrectly

**Problem**: Email HTML appears broken or unstyled

**Solution**:
```typescript
// Use inline CSS for email compatibility
const emailHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!-- Avoid external CSS -->
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto;">
    <!-- Content with inline styles -->
  </div>
</body>
</html>
`

// Test with email preview tools
// https://litmus.com/email-previews
```

### Push Notification Issues

#### Service Worker Not Registering

**Problem**: Push notifications don't work

**Solution**:
```javascript
// Check service worker registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(registration => {
      console.log('SW registered:', registration.scope)
    })
    .catch(error => {
      console.error('SW registration failed:', error)
    })
}

// Verify sw.js file exists in public/ folder
// Check Content-Type header is correct
```

## 🖼️ Image Processing Issues

### Image Upload Failures

#### Large File Upload Errors

**Problem**:
```
Error: File size exceeds limit
```

**Solution**:
```typescript
// Check file size limits in next.config.js
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'  // Increase limit
    }
  }
}

// Implement client-side compression
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    
    img.onload = () => {
      // Resize logic
      canvas.toBlob((blob) => {
        resolve(new File([blob!], file.name, { type: 'image/jpeg' }))
      }, 'image/jpeg', 0.8)
    }
    
    img.src = URL.createObjectURL(file)
  })
}
```

### Image Optimization Issues

#### Images Not Loading from CDN

**Problem**: Images return 404 or fail to load

**Solution**:
```typescript
// Check image proxy function
const testImageProxy = async (imageUrl: string) => {
  const response = await fetch(`/api/img`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: imageUrl })
  })
  
  console.log('Image proxy response:', response.status)
  return response.json()
}

// Verify Supabase edge function deployment
supabase functions list
supabase functions logs img-proxy
```

## 🔍 Search and Filtering Issues

### Search Performance Problems

#### Slow Search Queries

**Problem**: Search takes too long or times out

**Solution**:
```sql
-- Add search indexes
CREATE INDEX CONCURRENTLY idx_events_search 
ON events USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Add filtering indexes
CREATE INDEX CONCURRENTLY idx_events_city_date 
ON events(city_id, event_date) WHERE is_active = true;

-- Check query performance
EXPLAIN ANALYZE SELECT * FROM events 
WHERE to_tsvector('english', name || ' ' || COALESCE(description, '')) 
@@ plainto_tsquery('english', 'concert');
```

### Geolocation Issues

#### Location Services Not Working

**Problem**: User location detection fails

**Solution**:
```typescript
// Check HTTPS requirement for geolocation
if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
  console.error('Geolocation requires HTTPS')
  return
}

// Implement fallback location detection
const getUserLocation = async (): Promise<GeolocationCoordinates | null> => {
  try {
    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported')
    }

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position.coords),
        (error) => {
          console.error('Geolocation error:', error.message)
          // Fallback to IP-based location
          resolve(null)
        },
        {
          timeout: 10000,
          enableHighAccuracy: false,
          maximumAge: 300000  // 5 minutes
        }
      )
    })
  } catch (error) {
    console.error('Location detection failed:', error)
    return null
  }
}
```

## 📊 Analytics and Monitoring

### Performance Issues

#### Slow Page Loading

**Problem**: Pages load slowly or have poor Core Web Vitals

**Solution**:
```typescript
// Use dynamic imports for heavy components
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <div>Loading...</div>,
  ssr: false
})

// Optimize database queries
const getEventsOptimized = async (cityId: string) => {
  // Only fetch required fields
  const { data } = await supabase
    .from('events')
    .select('id, name, event_date, featured_image_url')
    .eq('city_id', cityId)
    .limit(20)
    
  return data
}

// Add caching headers
export async function GET() {
  const data = await fetchData()
  
  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
    }
  })
}
```

### Error Tracking

#### Unhandled Errors

**Problem**: Users report errors that aren't logged

**Solution**:
```typescript
// Add global error boundary
'use client'

import { ErrorBoundary } from 'react-error-boundary'

function ErrorFallback({ error, resetErrorBoundary }: any) {
  // Log to your error tracking service
  console.error('Application error:', error)
  
  return (
    <div role="alert">
      <h2>Something went wrong:</h2>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <YourApp />
    </ErrorBoundary>
  )
}
```

## 🛠️ Debugging Tools

### Browser DevTools

```javascript
// Debug Supabase queries in console
window.supabase = createClient(url, key)

// Check auth state
console.log(await window.supabase.auth.getUser())

// Test database queries
console.log(await window.supabase.from('events').select('*').limit(5))
```

### Network Debugging

```bash
# Test API endpoints
curl -X GET "https://yourapp.com/api/events" \
  -H "Authorization: Bearer your_token"

# Test webhook delivery
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### Database Debugging

```sql
-- Check active queries
SELECT query, state, query_start 
FROM pg_stat_activity 
WHERE state = 'active';

-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

## 📞 Getting Help

### Self-Service Resources

1. **Check the docs**: Review relevant documentation sections
2. **Search issues**: Look for similar problems in GitHub issues
3. **Check logs**: Review application and function logs
4. **Test in isolation**: Create minimal reproduction case

### Community Support

- **GitHub Discussions**: Ask questions and share solutions
- **Discord Community**: Real-time help from other developers
- **Stack Overflow**: Tag questions with `scenescout` and relevant tech tags

### Professional Support

For critical production issues:
- **Email**: [support@scenescout.app](mailto:support@scenescout.app)
- **Priority Support**: Available with enterprise plans

### Issue Templates

When reporting bugs, include:

```markdown
**Environment**: Development/Production
**Next.js Version**: 14.x.x
**Node.js Version**: 18.x.x
**Browser**: Chrome/Firefox/Safari
**Error Message**: Full error message
**Steps to Reproduce**: 1, 2, 3...
**Expected Behavior**: What should happen
**Actual Behavior**: What actually happens
**Additional Context**: Any other relevant information
```

---

**Remember**: Most issues have been encountered before. Check existing documentation and issues before creating new ones. When in doubt, start with the basics: environment variables, dependencies, and service status.