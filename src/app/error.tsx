'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  const isNetworkError = error.message.toLowerCase().includes('fetch') || 
                        error.message.toLowerCase().includes('network')
  
  const isNotFoundError = error.message.toLowerCase().includes('not found') ||
                         error.message.toLowerCase().includes('404')

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="w-16 h-16 text-destructive" />
          </div>
          <CardTitle className="text-2xl">
            {isNotFoundError ? 'Page Not Found' : 
             isNetworkError ? 'Connection Error' : 
             'Something went wrong'}
          </CardTitle>
          <CardDescription>
            {isNotFoundError ? 
              "The page you're looking for doesn't exist or has been moved." :
             isNetworkError ?
              "We're having trouble connecting to our servers. Please check your internet connection." :
              "We've encountered an unexpected error. Our team has been notified."}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Error details for development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Error Details (Development)</h4>
              <p className="text-xs text-muted-foreground font-mono">
                {error.message}
              </p>
              {error.digest && (
                <p className="text-xs text-muted-foreground mt-2">
                  Digest: {error.digest}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            {!isNotFoundError && (
              <Button onClick={reset} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try again
              </Button>
            )}
            
            <Button variant="outline" asChild className="w-full">
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                Go to Homepage
              </Link>
            </Button>
            
            <Button variant="ghost" asChild className="w-full">
              <Link href="/contact">
                Report this issue
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}