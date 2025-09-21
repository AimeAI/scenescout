'use client'

import { Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import EventCard from '@/components/EventCard'
import { Skeleton } from '@/components/ui/skeleton'

interface SearchParams {
  city?: string
  category?: string
  date?: string
  page?: string
}

interface FeedPageProps {
  searchParams: SearchParams
}

// TODO: Fetch from Supabase based on filters
const mockEvents = Array.from({ length: 12 }, (_, i) => ({
  id: `event-${i + 1}`,
  title: `Event ${i + 1}`,
  venue: `Venue ${i + 1}`,
  city: ['New York', 'London', 'Berlin', 'Tokyo'][i % 4],
  date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  image: `/events/event-${(i % 6) + 1}.jpg`,
  price: Math.floor(Math.random() * 100) + 10,
  category: ['Music', 'Art', 'Food', 'Tech'][i % 4],
}))

function EventGrid({ events }: { events: typeof mockEvents }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  )
}

function EventGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 9 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <Skeleton className="h-48 w-full" />
          <CardContent className="p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

async function EventFeed({ searchParams }: { searchParams: SearchParams }) {
  // TODO: Implement proper data fetching with filters
  // const events = await getEvents({ 
  //   city: searchParams.city,
  //   category: searchParams.category,
  //   date: searchParams.date,
  //   page: parseInt(searchParams.page || '1')
  // })
  
  // Simulate loading delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  return <EventGrid events={mockEvents} />
}

export default function FeedPage({ searchParams }: FeedPageProps) {
  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Discover Events</h1>
          <p className="text-muted-foreground text-lg">
            Find the perfect events happening around you
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 p-6 bg-muted/50 rounded-lg">
          <div className="flex flex-wrap gap-4">
            {/* TODO: Implement filter components */}
            <Button variant="outline" size="sm">
              All Cities
            </Button>
            <Button variant="outline" size="sm">
              All Categories  
            </Button>
            <Button variant="outline" size="sm">
              Any Date
            </Button>
            <Button variant="outline" size="sm">
              Price Range
            </Button>
          </div>
        </div>

        {/* Events Grid */}
        <Suspense fallback={<EventGridSkeleton />}>
          <EventFeed searchParams={searchParams} />
        </Suspense>

        {/* Load More */}
        <div className="mt-12 text-center">
          <Button size="lg" variant="outline">
            Load More Events
          </Button>
        </div>
      </div>
    </div>
  )
}