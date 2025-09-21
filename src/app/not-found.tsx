'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Search, Home, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const popularPages = [
  { name: 'Events', href: '/feed', icon: Search },
  { name: 'New York', href: '/city/new-york', icon: MapPin },
  { name: 'London', href: '/city/london', icon: MapPin },
  { name: 'Tokyo', href: '/city/tokyo', icon: MapPin },
]

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* 404 Illustration */}
        <div className="space-y-4">
          <div className="text-9xl font-bold text-muted-foreground/20">404</div>
          <h1 className="text-4xl font-bold">Page Not Found</h1>
          <p className="text-xl text-muted-foreground max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved to a new location.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Link>
          </Button>
          <Button variant="outline" size="lg" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>

        {/* Popular Pages */}
        <Card>
          <CardHeader>
            <CardTitle>Popular Destinations</CardTitle>
            <CardDescription>
              Maybe one of these pages is what you're looking for?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {popularPages.map((page) => {
                const Icon = page.icon
                return (
                  <Link
                    key={page.name}
                    href={page.href}
                    className="flex flex-col items-center p-4 rounded-lg border hover:bg-accent hover:border-accent-foreground/20 transition-colors"
                  >
                    <Icon className="w-8 h-8 mb-2 text-muted-foreground" />
                    <span className="text-sm font-medium">{page.name}</span>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Help Section */}
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">
            Still can't find what you're looking for?
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/contact"
              className="text-primary hover:underline text-sm"
            >
              Contact Support
            </Link>
            <Link
              href="/help"
              className="text-primary hover:underline text-sm"
            >
              Help Center
            </Link>
            <Link
              href="/feed"
              className="text-primary hover:underline text-sm"
            >
              Browse Events
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}