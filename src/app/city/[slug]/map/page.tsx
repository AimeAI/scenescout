import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, Filter, List } from 'lucide-react'

interface MapPageProps {
  params: {
    slug: string
  }
}

// TODO: Fetch from Supabase
async function getCityData(slug: string) {
  const cities = {
    'new-york': { name: 'New York', slug: 'new-york' },
    'london': { name: 'London', slug: 'london' },
    'tokyo': { name: 'Tokyo', slug: 'tokyo' },
    'berlin': { name: 'Berlin', slug: 'berlin' }
  }
  
  return cities[slug as keyof typeof cities] || null
}

// TODO: Fetch from Supabase with coordinates
const mockMapData = [
  {
    id: '1',
    name: 'Blue Note Jazz Club',
    type: 'venue',
    lat: 40.7306,
    lng: -73.9866,
    events: 3
  },
  {
    id: '2', 
    name: 'Central Park Concert',
    type: 'event',
    lat: 40.7829,
    lng: -73.9654,
    date: '2024-01-15'
  },
  {
    id: '3',
    name: 'Brooklyn Art Gallery',
    type: 'venue', 
    lat: 40.6892,
    lng: -73.9442,
    events: 2
  }
]

export default async function MapPage({ params }: MapPageProps) {
  const city = await getCityData(params.slug)
  
  if (!city) {
    notFound()
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{city.name} Map</h1>
              <p className="text-muted-foreground">Discover events and venues around the city</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
              <Button variant="outline" size="sm">
                <List className="w-4 h-4 mr-2" />
                List View
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-120px)]">
        {/* Map Container */}
        <div className="flex-1 relative bg-gray-100">
          {/* TODO: Integrate with Mapbox or Google Maps */}
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-4">
              <MapPin className="w-16 h-16 mx-auto" />
              <h3 className="text-xl font-semibold">Interactive Map</h3>
              <p>Map integration coming soon</p>
              <p className="text-sm">Will show venues, events, and user locations</p>
            </div>
          </div>
          
          {/* Map Overlay Controls */}
          <div className="absolute top-4 left-4 space-y-2">
            <Button size="sm" className="bg-white text-black hover:bg-gray-100 shadow-md">
              Events
            </Button>
            <Button size="sm" variant="outline" className="bg-white shadow-md">
              Venues
            </Button>
            <Button size="sm" variant="outline" className="bg-white shadow-md">
              Food & Drink
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-muted/50 border-l overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold mb-4">Nearby Locations</h3>
            <div className="space-y-3">
              {mockMapData.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        <p className="text-xs text-muted-foreground capitalize">
                          {item.type}
                        </p>
                        {item.type === 'venue' && (
                          <p className="text-xs text-primary mt-1">
                            {item.events} upcoming events
                          </p>
                        )}
                        {item.type === 'event' && item.date && (
                          <p className="text-xs text-primary mt-1">
                            {new Date(item.date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="mt-6 pt-4 border-t">
              <h4 className="font-semibold text-sm mb-3">Quick Actions</h4>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <MapPin className="w-4 h-4 mr-2" />
                  Find Near Me
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  Save Location
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}