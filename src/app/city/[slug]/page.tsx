import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import EventCard from '@/components/EventCard'
import BlurImage from '@/components/BlurImage'
import { MapPin, Calendar, Users } from 'lucide-react'

interface CityPageProps {
  params: {
    slug: string
  }
}

// TODO: Fetch from Supabase
async function getCityData(slug: string) {
  // Mock data - replace with Supabase query
  const cities = {
    'new-york': {
      id: '1',
      name: 'New York',
      slug: 'new-york',
      description: 'The city that never sleeps offers endless entertainment, from Broadway shows to underground music venues.',
      image: '/cities/nyc-hero.jpg',
      stats: {
        events: 245,
        venues: 89,
        followers: 12400
      }
    },
    'london': {
      id: '2', 
      name: 'London',
      slug: 'london',
      description: 'A cultural melting pot with world-class museums, historic pubs, and cutting-edge art scenes.',
      image: '/cities/london-hero.jpg',
      stats: {
        events: 189,
        venues: 67,
        followers: 9800
      }
    }
  }
  
  return cities[slug as keyof typeof cities] || null
}

// TODO: Fetch from Supabase
const mockEvents = [
  {
    id: '1',
    title: 'Rooftop Jazz Session',
    venue: 'Sky Lounge',
    city: 'New York',
    date: '2024-01-15',
    image: '/events/jazz.jpg',
    price: 35,
  },
  {
    id: '2',
    title: 'Art Gallery Opening',
    venue: 'Modern Space',
    city: 'New York', 
    date: '2024-01-16',
    image: '/events/art.jpg',
    price: 0,
  },
  {
    id: '3',
    title: 'Electronic Underground',
    venue: 'The Basement',
    city: 'New York',
    date: '2024-01-17',
    image: '/events/electronic.jpg',
    price: 25,
  }
]

const mockVenues = [
  {
    id: '1',
    name: 'Blue Note',
    type: 'Jazz Club',
    image: '/venues/blue-note.jpg',
    rating: 4.8
  },
  {
    id: '2', 
    name: 'The High Line',
    type: 'Outdoor Venue',
    image: '/venues/high-line.jpg',
    rating: 4.6
  }
]

export async function generateStaticParams() {
  // TODO: Generate from Supabase cities
  return [
    { slug: 'new-york' },
    { slug: 'london' },
    { slug: 'tokyo' },
    { slug: 'berlin' }
  ]
}

export default async function CityPage({ params }: CityPageProps) {
  const city = await getCityData(params.slug)
  
  if (!city) {
    notFound()
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-96 flex items-center justify-center">
        <BlurImage
          src={city.image}
          alt={city.name}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 text-center text-white space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold">{city.name}</h1>
          <p className="text-xl max-w-2xl mx-auto px-4">
            {city.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Button size="lg" className="bg-white text-black hover:bg-gray-100">
              <Link href={`/city/${city.slug}/map`}>
                <MapPin className="w-4 h-4 mr-2" />
                View Map
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-black">
              <Link href={`/city/${city.slug}/wall`}>
                <Users className="w-4 h-4 mr-2" />
                Community Wall
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* City Stats */}
      <section className="py-8 px-4 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl font-bold text-primary">{city.stats.events}</div>
              <div className="text-muted-foreground">Active Events</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">{city.stats.venues}</div>
              <div className="text-muted-foreground">Venues</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary">{city.stats.followers}</div>
              <div className="text-muted-foreground">Followers</div>
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Upcoming Events</h2>
            <Button variant="outline">
              <Link href={`/feed?city=${city.slug}`}>View All</Link>
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      </section>

      {/* Popular Venues */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Popular Venues</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {mockVenues.map((venue) => (
              <Card key={venue.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative h-32">
                  <BlurImage
                    src={venue.image}
                    alt={venue.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold">{venue.name}</h3>
                  <p className="text-sm text-muted-foreground">{venue.type}</p>
                  <div className="flex items-center mt-2">
                    <span className="text-yellow-500">★</span>
                    <span className="text-sm ml-1">{venue.rating}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}