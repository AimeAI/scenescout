import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/useToast'

interface IngestResult {
  success: boolean
  status?: string
  reason?: string
  venuesProcessed?: number
  eventsProcessed?: number
  groupsProcessed?: number
  totalFound?: number
  error?: string
  details?: any
}

export function AdminIngestPage() {
  const [loading, setLoading] = useState(false)
  const [lat, setLat] = useState('37.7749')
  const [lng, setLng] = useState('-122.4194')
  const [radius, setRadius] = useState('5000')
  const [source, setSource] = useState('google')
  const [result, setResult] = useState<IngestResult | null>(null)
  const { toast } = useToast()

  const sources = [
    { id: 'google', name: 'Google Places', function: 'ingest_places_google' },
    { id: 'yelp', name: 'Yelp', function: 'ingest_places_yelp' },
    { id: 'meetup', name: 'Meetup', function: 'ingest_meetup' },
    { id: 'eventbrite', name: 'Eventbrite', function: 'ingest_eventbrite' },
    { id: 'ticketmaster', name: 'Ticketmaster', function: 'ingest_ticketmaster' }
  ]

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude.toString())
          setLng(position.coords.longitude.toString())
          toast({
            title: 'Location Updated',
            description: 'Using your current location'
          })
        },
        () => {
          toast({
            title: 'Location Error',
            description: 'Could not get your location',
            variant: 'destructive'
          })
        }
      )
    }
  }

  const runIngestion = async () => {
    const selectedSource = sources.find(s => s.id === source)
    if (!selectedSource) return

    setLoading(true)
    setResult(null)

    try {
      // Call the Supabase Edge Function
      const { data, error } = await supabase.functions.invoke(selectedSource.function, {
        body: {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          location: `${lat},${lng}`,
          radius: parseInt(radius)
        }
      })

      if (error) {
        throw error
      }

      setResult(data)

      if (data.success) {
        toast({
          title: 'Ingestion Complete',
          description: `Successfully processed ${data.venuesProcessed || data.eventsProcessed || 0} items`
        })
      } else if (data.status === 'disabled') {
        toast({
          title: 'Source Disabled',
          description: data.reason,
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      console.error('Ingestion error:', error)
      const errorResult: IngestResult = {
        success: false,
        error: error.message || 'Unknown error occurred'
      }
      setResult(errorResult)
      toast({
        title: 'Ingestion Failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Data Ingestion Admin</h1>
          <p className="text-gray-400">
            Manually trigger data ingestion from various sources for the current map bounds.
          </p>
        </div>

        <Card className="bg-gray-900 border-gray-800 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Latitude</label>
              <Input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="bg-gray-800 border-gray-700"
                placeholder="37.7749"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Longitude</label>
              <Input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="bg-gray-800 border-gray-700"
                placeholder="-122.4194"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Radius (meters)</label>
              <Input
                type="number"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="bg-gray-800 border-gray-700"
                placeholder="5000"
              />
            </div>
          </div>

          <div className="flex gap-4 mb-4">
            <Button
              onClick={getCurrentLocation}
              variant="outline"
              className="border-gray-700"
            >
              Use Current Location
            </Button>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Data Source</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {sources.map((s) => (
                <Button
                  key={s.id}
                  onClick={() => setSource(s.id)}
                  variant={source === s.id ? 'default' : 'outline'}
                  className={source === s.id 
                    ? 'bg-purple-600 hover:bg-purple-700' 
                    : 'border-gray-700'
                  }
                  size="sm"
                >
                  {s.name}
                </Button>
              ))}
            </div>
          </div>

          <Button
            onClick={runIngestion}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Running Ingestion...
              </>
            ) : (
              'Run Ingestion'
            )}
          </Button>
        </Card>

        {result && (
          <Card className="bg-gray-900 border-gray-800 p-6">
            <h2 className="text-xl font-semibold mb-4">Results</h2>
            
            <div className="mb-4">
              <Badge 
                variant={result.success ? 'default' : 'destructive'}
                className={result.success 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-red-600 hover:bg-red-700'
                }
              >
                {result.success ? 'Success' : 'Failed'}
              </Badge>
              
              {result.status === 'disabled' && (
                <Badge variant="secondary" className="ml-2">
                  Disabled: {result.reason}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              {result.venuesProcessed !== undefined && (
                <div className="bg-gray-800 p-3 rounded">
                  <div className="text-2xl font-bold text-blue-400">
                    {result.venuesProcessed}
                  </div>
                  <div className="text-sm text-gray-400">Venues Processed</div>
                </div>
              )}
              
              {result.eventsProcessed !== undefined && (
                <div className="bg-gray-800 p-3 rounded">
                  <div className="text-2xl font-bold text-green-400">
                    {result.eventsProcessed}
                  </div>
                  <div className="text-sm text-gray-400">Events Processed</div>
                </div>
              )}
              
              {result.groupsProcessed !== undefined && (
                <div className="bg-gray-800 p-3 rounded">
                  <div className="text-2xl font-bold text-purple-400">
                    {result.groupsProcessed}
                  </div>
                  <div className="text-sm text-gray-400">Groups Processed</div>
                </div>
              )}
              
              {result.totalFound !== undefined && (
                <div className="bg-gray-800 p-3 rounded">
                  <div className="text-2xl font-bold text-yellow-400">
                    {result.totalFound}
                  </div>
                  <div className="text-sm text-gray-400">Total Found</div>
                </div>
              )}
            </div>

            {(result.error || result.details) && (
              <div className="bg-gray-800 p-4 rounded">
                <h3 className="font-medium mb-2">Debug Information</h3>
                <pre className="text-sm text-gray-300 overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}