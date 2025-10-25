# Authentication Quick Reference Card

## Quick Start

### 1. Add to Root Layout (Required)
```tsx
import { AuthProvider } from '@/components/auth'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
```

### 2. Use Auth in Any Component
```tsx
'use client'
import { useAuthContext } from '@/components/auth'

export function MyComponent() {
  const { user, isAuthenticated, signOut } = useAuthContext()

  if (isAuthenticated) {
    return <div>Hello {user?.email}!</div>
  }
  return <div>Not logged in</div>
}
```

### 3. Add Logout Button
```tsx
import { LogoutButton } from '@/components/auth'

<LogoutButton variant="ghost" showIcon />
```

---

## Common Use Cases

### Check if User is Logged In
```tsx
const { isAuthenticated, isLoading } = useAuthContext()

if (isLoading) return <Spinner />
if (!isAuthenticated) return <LoginPrompt />
```

### Get Current User
```tsx
const { user } = useAuthContext()
console.log(user?.email)
console.log(user?.profile?.name)
console.log(user?.profile?.subscription_tier)
```

### Manual Sign Out
```tsx
const { signOut } = useAuthContext()
await signOut() // Shows confirmation dialog
```

### Check Session Health
```tsx
const { sessionHealth } = useAuthContext()
console.log(sessionHealth.isValid)      // Is session valid?
console.log(sessionHealth.expiresIn)    // Seconds until expiry
console.log(sessionHealth.needsRefresh) // Should refresh?
```

### Manual Session Refresh
```tsx
const { refreshSession } = useAuthContext()
await refreshSession()
```

### Handle Auth Errors
```tsx
const { error } = useAuthContext()
if (error) {
  console.log(error.message) // User-friendly message
  console.log(error.code)    // Error code
}
```

---

## Direct Auth Functions (Without Hook)

### Sign In
```tsx
import { authHelpers } from '@/lib/auth'

try {
  await authHelpers.signInWithEmail(email, password)
  // Anonymous data automatically migrated!
} catch (error) {
  console.error(error.message) // User-friendly error
}
```

### Sign Up
```tsx
await authHelpers.signUpWithEmail(email, password, {
  name: 'John Doe',
  username: 'johndoe'
})
```

### OAuth Sign In
```tsx
await authHelpers.signInWithOAuth('google')
// or 'github', 'apple'
```

### Sign Out (No Confirmation)
```tsx
await authHelpers.signOut()
```

### Password Reset
```tsx
await authHelpers.resetPassword(email)
```

### Update Password
```tsx
await authHelpers.updatePassword(newPassword)
```

---

## Session Management

### Check Session Status
```tsx
import { sessionHelpers } from '@/lib/auth'

const isExpired = await sessionHelpers.isSessionExpired()
const session = await sessionHelpers.refreshSessionIfNeeded()
const timeLeft = await sessionHelpers.getTimeUntilExpiry()
```

### Check Session Health
```tsx
import { checkSessionHealth } from '@/lib/auth'

const health = await checkSessionHealth()
console.log(health.isValid)      // boolean
console.log(health.expiresIn)    // number | null
console.log(health.needsRefresh) // boolean
```

---

## Protected Routes

Routes that auto-redirect to login if not authenticated:
- `/account`
- `/saved`
- `/plans/create`

Add more in `/src/middleware.ts`:
```tsx
const protectedRoutes = ['/account', '/your-route']
```

---

## Events

### Listen to Auth Events
```tsx
useEffect(() => {
  const handleSignOut = () => {
    // Clear personalized data
  }

  window.addEventListener('userSignedOut', handleSignOut)
  return () => window.removeEventListener('userSignedOut', handleSignOut)
}, [])
```

Available events:
- `userSignedOut` - User signed out
- `savedEventsChanged` - Saved events modified

---

## Error Codes

Common error codes returned:
- `INVALID_CREDENTIALS` - Wrong email/password
- `SESSION_EXPIRED` - Session expired
- `REFRESH_FAILED` - Failed to refresh session
- `NETWORK_ERROR` - Network/connection error
- `AUTH_STATE_ERROR` - Auth state change error
- `LOAD_ERROR` - Failed to load user

All errors have user-friendly messages!

---

## Components Reference

### AuthProvider
Wraps your app, provides auth state
```tsx
<AuthProvider>{children}</AuthProvider>
```

### SessionExpiryAlert
Auto-appears when session expiring (included in AuthProvider)

### LogoutButton
```tsx
<LogoutButton
  variant="ghost|outline|default"
  size="sm|default|lg"
  showIcon={true}
/>
```

---

## Hook Return Values

```tsx
const {
  user,              // AuthUser | null
  session,           // Session | null
  isLoading,         // boolean
  isAuthenticated,   // boolean
  sessionHealth,     // { isValid, expiresIn, needsRefresh }
  signOut,           // () => Promise<void>
  refreshSession,    // () => Promise<void>
  error              // AuthError | null
} = useAuthContext()
```

---

## Tips

1. **Always use `useAuthContext()`** in client components
2. **Session auto-refreshes** - no manual intervention needed
3. **Anonymous mode preserved** - saved events kept after logout
4. **Data auto-migrates** - anonymous → authenticated seamlessly
5. **Errors are friendly** - safe to show to users
6. **Protected routes** - automatically redirect to login

---

## Need More Info?

- **Full Guide:** `/AUTH_IMPLEMENTATION_GUIDE.md`
- **Summary:** `/AUTH_IMPLEMENTATION_SUMMARY.md`
- **Source Code:** `/src/lib/auth.ts`, `/src/hooks/useAuth.ts`
