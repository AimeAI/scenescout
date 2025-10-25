# Authentication Implementation Guide

## Overview

This guide documents the robust authentication edge case handling implemented for Phase 1.5 of the Beta Launch Roadmap.

## Features Implemented

### 1. Session Expiry Handling

**Files:**
- `/src/lib/auth.ts` - Core auth functions with session management
- `/src/hooks/useAuth.ts` - React hook for auth state
- `/src/components/auth/SessionExpiryAlert.tsx` - UI for session expiry alerts

**Capabilities:**
- Automatic session expiry detection (checks if session expires in less than 5 minutes)
- Auto-refresh sessions before expiry
- User-friendly alerts when session is expiring or expired
- Options to refresh session, sign out, or continue as anonymous

### 2. Logout Flow

**Files:**
- `/src/lib/auth.ts` - `clearUserData()` function
- `/src/components/auth/LogoutButton.tsx` - Logout with confirmation

**Capabilities:**
- Clears all user-specific data from localStorage
- Removes push subscription data
- Preserves saved events for anonymous mode
- Shows confirmation dialog before logout
- Emits `userSignedOut` event for app-wide cleanup

### 3. Anonymous User Support

**Files:**
- `/src/lib/auth.ts` - `migrateAnonymousData()` function
- `/src/lib/saved/store.ts` - Already uses 'anonymous' user ID

**Capabilities:**
- Anonymous users can save events (stored with userId='anonymous')
- Seamless upgrade from anonymous to authenticated
- Automatic migration of saved events on signup/login
- Preserves user's session context during migration

### 4. Error Handling

**Files:**
- `/src/lib/auth.ts` - `formatAuthError()` function
- All auth functions wrapped with try-catch

**Error Scenarios Handled:**
- Network errors during auth operations
- Invalid credentials
- Email not confirmed
- Session expired/invalid tokens
- Rate limiting
- User-friendly error messages for all cases

### 5. Middleware Protection

**Files:**
- `/src/middleware.ts` - Updated with session refresh and route protection

**Capabilities:**
- Automatic session refresh in middleware
- Protected routes require authentication
- Redirects to login with return URL
- Graceful fallback on errors

## Usage Guide

### 1. Wrap Your App with AuthProvider

In your root layout (`/src/app/layout.tsx`):

```tsx
import { AuthProvider } from '@/components/auth'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

The `AuthProvider` automatically:
- Manages auth state across your app
- Shows session expiry alerts
- Refreshes sessions automatically
- Listens to auth state changes

### 2. Use Auth in Components

```tsx
'use client'

import { useAuthContext } from '@/components/auth'

export function MyComponent() {
  const { user, isAuthenticated, isLoading, signOut } = useAuthContext()

  if (isLoading) return <div>Loading...</div>

  if (!isAuthenticated) {
    return <div>Please sign in</div>
  }

  return (
    <div>
      <p>Welcome, {user?.email}</p>
      <button onClick={signOut}>Sign Out</button>
    </div>
  )
}
```

### 3. Add Logout Button

```tsx
import { LogoutButton } from '@/components/auth'

export function Header() {
  return (
    <header>
      <LogoutButton variant="ghost" showIcon />
    </header>
  )
}
```

### 4. Sign In with Migration

```tsx
import { authHelpers } from '@/lib/auth'

async function handleSignIn(email: string, password: string) {
  try {
    await authHelpers.signInWithEmail(email, password)
    // Anonymous data is automatically migrated!
  } catch (error) {
    // Error has user-friendly message
    console.error(error.message)
  }
}
```

### 5. Check Session Health

```tsx
import { checkSessionHealth } from '@/lib/auth'

async function checkSession() {
  const health = await checkSessionHealth()

  if (!health.isValid) {
    console.log('Session expired')
  } else if (health.needsRefresh) {
    console.log(`Session expires in ${health.expiresIn} seconds`)
  }
}
```

## API Reference

### sessionHelpers

```typescript
// Check if session is expired
await sessionHelpers.isSessionExpired() // boolean

// Refresh session if needed
await sessionHelpers.refreshSessionIfNeeded() // Session | null

// Get time until expiry
await sessionHelpers.getTimeUntilExpiry() // number | null (seconds)
```

### authHelpers

```typescript
// Check authentication
await authHelpers.isAuthenticated() // boolean

// Get session with auto-refresh
await authHelpers.getSession() // Session | null

// Get user with profile
await authHelpers.getUserWithProfile() // AuthUser | null

// Sign in (auto-migrates anonymous data)
await authHelpers.signInWithEmail(email, password)

// Sign up (auto-migrates anonymous data)
await authHelpers.signUpWithEmail(email, password, metadata)

// OAuth sign in
await authHelpers.signInWithOAuth('google' | 'github' | 'apple')

// Sign out (cleans up all user data)
await authHelpers.signOut()

// Password management
await authHelpers.resetPassword(email)
await authHelpers.updatePassword(newPassword)
```

### useAuth Hook

```typescript
const {
  user,              // Current user with profile
  session,           // Current session
  isLoading,         // Loading state
  isAuthenticated,   // Boolean auth status
  sessionHealth,     // { isValid, expiresIn, needsRefresh }
  signOut,           // Sign out function
  refreshSession,    // Manual refresh
  error              // Any auth errors
} = useAuth()
```

## Events

The auth system emits custom events:

- `userSignedOut` - Fired when user signs out
- `savedEventsChanged` - Fired when saved events are modified

Listen to these events:

```typescript
useEffect(() => {
  const handleSignOut = () => {
    // Clean up personalized data
  }

  window.addEventListener('userSignedOut', handleSignOut)
  return () => window.removeEventListener('userSignedOut', handleSignOut)
}, [])
```

## Protected Routes

Routes that require authentication (configured in middleware):
- `/account`
- `/saved`
- `/plans/create`

These routes will automatically redirect to `/login?redirect=/original/path` if user is not authenticated.

## Success Criteria ✓

All success criteria from the task have been met:

✅ No white screens on session expiry
- Session expiry is detected proactively
- User sees friendly alert with options
- Can refresh, sign out, or continue anonymous

✅ Logout cleanly resets to anonymous state
- All user data cleared (except saved events)
- localStorage cleaned up properly
- User can continue browsing immediately

✅ Anonymous users can upgrade seamlessly
- Saved events automatically migrated on login/signup
- No data loss during transition
- Transparent to the user

✅ All auth errors show user-friendly messages
- Error messages formatted for end users
- Network errors handled gracefully
- Specific guidance for each error type

## Testing

To test the implementation:

1. **Session Expiry:**
   - Sign in
   - Wait for session to approach expiry (or modify code to shorten expiry)
   - Alert should appear automatically
   - Test refresh, sign out, and continue anonymous options

2. **Logout:**
   - Sign in and save some events
   - Click logout button
   - Confirm logout in dialog
   - Verify saved events are preserved
   - Verify you're redirected to home page

3. **Anonymous to Authenticated:**
   - Save events while not logged in
   - Sign up or log in
   - Check that all saved events are migrated
   - Verify events now tied to your user ID

4. **Error Handling:**
   - Try wrong password
   - Try signing up with existing email
   - Disconnect network during auth operation
   - Verify all show friendly error messages

## Notes

- The implementation does NOT break existing functionality
- Anonymous user support is preserved and enhanced
- Supabase auth configuration is not modified
- All changes are backward compatible
