import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

/**
 * Middleware for environment validation, auth, session management, and beta access control
 */
export async function middleware(request: NextRequest) {
  // Environment validation is done at module load time in env-validation.ts

  const res = NextResponse.next()

  // Check if Supabase is configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const isSupabaseConfigured = !!(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('TODO') &&
    !supabaseAnonKey.includes('TODO') &&
    supabaseUrl.startsWith('http')
  )

  // If Supabase is not configured, skip auth checks
  if (!isSupabaseConfigured) {
    return res
  }

  // Beta Access Control
  const isBetaEnabled = process.env.NEXT_PUBLIC_ENABLE_BETA_ACCESS === 'true'

  // Public routes that don't require beta access
  const publicRoutes = [
    '/',
    '/beta-access',
    '/login',
    '/signup',
    '/api/beta',
    '/api/auth',
    '/_next',
    '/favicon.ico',
  ]

  const isPublicRoute = publicRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  try {
    // Create Supabase client for middleware
    const supabase = createMiddlewareClient({ req: request, res })

    // Refresh session if it exists
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Check if session is expired
    if (session) {
      const expiresAt = session.expires_at
      if (expiresAt) {
        const now = Math.floor(Date.now() / 1000)
        const isExpired = expiresAt <= now

        // If session is expired, refresh it
        if (isExpired) {
          const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession()

          if (error) {
            console.error('Session refresh failed in middleware:', error.message)
          } else if (refreshedSession) {
            console.log('Session refreshed successfully in middleware')
          }
        }
      }
    }

    // Beta access check
    if (isBetaEnabled && !isPublicRoute) {
      let hasBetaAccess = false

      if (session?.user) {
        // Check if user has beta access in database
        const { data: betaUser } = await supabase
          .from('beta_users')
          .select('is_active, access_expires_at')
          .eq('user_id', session.user.id)
          .single()

        if (betaUser) {
          const isActive = betaUser.is_active
          const notExpired = !betaUser.access_expires_at ||
            new Date(betaUser.access_expires_at) > new Date()

          hasBetaAccess = isActive && notExpired
        }
      }

      // If no beta access, redirect to beta access page
      if (!hasBetaAccess) {
        return NextResponse.redirect(new URL('/beta-access', request.url))
      }
    }

    // Protected routes that require authentication
    const protectedRoutes = ['/account', '/saved', '/plans/create']
    const isProtectedRoute = protectedRoutes.some(route =>
      request.nextUrl.pathname.startsWith(route)
    )

    // If accessing protected route without session, redirect to login
    if (isProtectedRoute && !session) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    return res
  } catch (error) {
    console.error('Middleware error:', error)
    // On error, continue with the request
    return res
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     * - _next/data (Next.js data)
     */
    '/((?!_next/static|_next/image|_next/data|favicon.ico|api).*)',
  ],
}
