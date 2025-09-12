import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import EventCard from '@/components/EventCard'
import BlurImage from '@/components/BlurImage'
import Link from 'next/link'

// TODO: Fetch from Supabase
const featuredCities = [
  { id: '1', name: 'New York', slug: 'new-york', image: '/cities/nyc.jpg', eventCount: 245 },
  { id: '2', name: 'London', slug: 'london', image: '/cities/london.jpg', eventCount: 189 },
  { id: '3', name: 'Tokyo', slug: 'tokyo', image: '/cities/tokyo.jpg', eventCount: 156 },
  { id: '4', name: 'Berlin', slug: 'berlin', image: '/cities/berlin.jpg', eventCount: 134 },
]

// TODO: Fetch from Supabase
const featuredEvents = [
  {
    id: '1',
    title: 'Underground Electronic Night',
    venue: 'Warehouse 23',
    city: 'Berlin',
    date: '2024-01-15',
    image: '/events/electronic.jpg',
    price: 25,
  },
  {
    id: '2',
    title: 'Jazz & Wine Evening',
    venue: 'Blue Note',
    city: 'New York',
    date: '2024-01-16',
    image: '/events/jazz.jpg',
    price: 45,
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center gradient-bg text-white">
        <div className="text-center z-10 space-y-8">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            SceneScout
          </h1>
          <p className="text-xl md:text-2xl max-w-2xl mx-auto px-4">
            Discover the pulse of urban culture. Find events, venues, and experiences that define your city.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-black hover:bg-gray-100">
              <Link href="/feed">Explore Events</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-black">
              <Link href="/submit">Submit Event</Link>
            </Button>
          </div>
        </div>
        <div className="absolute inset-0 bg-black/20" />
      </section>

      {/* Featured Cities */}
      <section className="py-16 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Explore Cities</h2>
          <p className="text-muted-foreground text-lg">
            Discover what's happening in cities around the world
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredCities.map((city) => (
            <Link key={city.id} href={`/city/${city.slug}`} className="group">
              <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative h-48">
                  <BlurImage
                    src={city.image}
                    alt={city.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="text-xl font-bold">{city.name}</h3>
                    <p className="text-sm opacity-90">{city.eventCount} events</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Events */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Trending Events</h2>
            <p className="text-muted-foreground text-lg">
              Don't miss these popular happenings
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          <div className="text-center mt-12">
            <Button size="lg">
              <Link href="/feed">View All Events</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 gradient-bg text-white">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold">Ready to Explore?</h2>
          <p className="text-xl">
            Join thousands of culture enthusiasts discovering the best events in their cities
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-black hover:bg-gray-100">
              <Link href="/feed">Start Exploring</Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-black">
              <Link href="/pricing">View Plans</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}