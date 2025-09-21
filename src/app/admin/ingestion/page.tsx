'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, XCircle, Play } from 'lucide-react'

interface IngestResult {
  source: string
  success: boolean
  eventsProcessed?: number
  error?: string
}

const SOURCES = [
  { id: 'eventbrite', name: 'Eventbrite', description: 'Community events and ticketed experiences' },
  { id: 'ticketmaster', name: 'Ticketmaster', description: 'Major concerts and sports events' },
  { id: 'songkick', name: 'Songkick', description: 'Music events and concerts' }
]

export default function IngestionPage() {
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [results, setResults] = useState<Record<string, IngestResult>>({})
  const [status, setStatus] = useState<any>(null)

  // Check status on component mount
  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/ingest')
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error('Failed to check status:', error)
    }
  }

  const runIngestion = async (source: string) => {
    setLoading(prev => ({ ...prev, [source]: true }))
    
    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source })
      })
      
      const result = await response.json()
      
      setResults(prev => ({
        ...prev,
        [source]: {
          source,
          success: response.ok,
          eventsProcessed: result.eventsProcessed,
          error: result.error
        }
      }))
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [source]: {
          source,
          success: false,
          error: 'Network error'
        }
      }))
    } finally {
      setLoading(prev => ({ ...prev, [source]: false }))
    }
  }

  const runAllIngestion = async () => {
    for (const source of SOURCES) {
      await runIngestion(source.id)
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">Data Ingestion Console</h1>
          <p className="text-gray-400">
            Trigger event ingestion from various upstream sources into the SceneScout database.
          </p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current configuration and database status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Configuration Status</span>
              {status ? (
                <Badge variant={status.configured ? 'default' : 'destructive'}>
                  {status.configured ? 'Ready' : 'Not Configured'}
                </Badge>
              ) : (
                <Badge variant="outline">Unknown</Badge>
              )}
            </div>
            
            {status?.configured && (
              <div className="flex items-center justify-between">
                <span>Database Status</span>
                <Badge variant={status.database ? 'default' : 'destructive'}>
                  {status.database ? 'Connected' : 'Error'}
                </Badge>
              </div>
            )}
            
            <Button onClick={checkStatus} variant="outline">
              Refresh Status
            </Button>
            
            {status?.message && (
              <div className="text-sm text-gray-400 mt-2">
                {status.message}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sources */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Ingestion Sources</h2>
            <Button 
              onClick={runAllIngestion}
              disabled={Object.values(loading).some(Boolean) || !status?.configured}
            >
              <Play className="w-4 h-4 mr-2" />
              Run All Sources
            </Button>
          </div>

          <div className="grid gap-4">
            {SOURCES.map((source) => (
              <Card key={source.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{source.name}</CardTitle>
                      <CardDescription>{source.description}</CardDescription>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {results[source.id] && (
                        <div className="flex items-center space-x-2 text-sm">
                          {results[source.id].success ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span>
                            {results[source.id].success 
                              ? `${results[source.id].eventsProcessed} events`
                              : 'Failed'
                            }
                          </span>
                        </div>
                      )}
                      
                      <Button
                        onClick={() => runIngestion(source.id)}
                        disabled={loading[source.id] || !status?.configured}
                        size="sm"
                      >
                        {loading[source.id] ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Run Ingestion'
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                {results[source.id]?.error && (
                  <CardContent>
                    <div className="text-sm text-red-400 bg-red-900/20 p-3 rounded">
                      <strong>Error:</strong> {results[source.id].error}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">1. Configure Supabase</h4>
              <p className="text-gray-400">
                Set up your Supabase project URL and service role key in the environment variables.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">2. Deploy Edge Functions</h4>
              <p className="text-gray-400">
                Deploy the ingestion functions to your Supabase project using the CLI.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">3. Set Secrets</h4>
              <p className="text-gray-400">
                Configure API keys for external services (Eventbrite, Ticketmaster, etc.) in Supabase secrets.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}