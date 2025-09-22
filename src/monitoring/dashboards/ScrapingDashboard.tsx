/**
 * Scraping Performance Dashboard
 * Real-time monitoring of scraping job performance, success rates, and data quality
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Database,
  Zap
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ScrapingMetrics {
  jobMetrics: {
    id: string
    job_id: string
    source: string
    status: string
    start_time: string
    end_time?: string
    events_discovered: number
    events_processed: number
    events_saved: number
    duplicates_found: number
    errors_count: number
    processing_time_ms?: number
    success_rate?: number
    performance_stats: any
  }[]
  summary: {
    source: string
    total_jobs: number
    completed_jobs: number
    failed_jobs: number
    avg_success_rate: number
    total_events_saved: number
    avg_processing_time_ms: number
  }[]
  dataQuality: {
    source: string
    metric_type: string
    score: number
    total_records: number
    passed_records: number
    failed_records: number
    failure_reasons: any
    measured_at: string
  }[]
  realtimeStats: {
    activeJobs: number
    jobsPerHour: number
    eventsPerSecond: number
    errorRate: number
    avgProcessingTime: number
  }
}

export default function ScrapingDashboard() {
  const [metrics, setMetrics] = useState<ScrapingMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h')

  // Fetch scraping metrics
  const fetchMetrics = async () => {
    try {
      setRefreshing(true)
      
      // Get time range filter
      const timeFilter = {
        '1h': new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        '24h': new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        '30d': new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      }[selectedTimeRange]

      // Fetch job metrics
      const { data: jobMetrics, error: jobError } = await supabase
        .from('scraping_job_metrics')
        .select('*')
        .gte('start_time', timeFilter)
        .order('start_time', { ascending: false })
        .limit(100)

      if (jobError) throw jobError

      // Fetch summary data (materialized view)
      const { data: summary, error: summaryError } = await supabase
        .from('scraping_dashboard_summary')
        .select('*')

      if (summaryError) throw summaryError

      // Fetch data quality metrics
      const { data: dataQuality, error: qualityError } = await supabase
        .from('data_quality_metrics')
        .select('*')
        .gte('measured_at', timeFilter)
        .order('measured_at', { ascending: false })

      if (qualityError) throw qualityError

      // Calculate real-time stats
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const recentJobs = jobMetrics?.filter(job => 
        new Date(job.start_time) >= oneHourAgo
      ) || []

      const activeJobs = jobMetrics?.filter(job => job.status === 'running').length || 0
      const completedRecent = recentJobs.filter(job => job.status === 'completed')
      const failedRecent = recentJobs.filter(job => job.status === 'failed')
      
      const realtimeStats = {
        activeJobs,
        jobsPerHour: recentJobs.length,
        eventsPerSecond: completedRecent.reduce((sum, job) => sum + (job.events_processed || 0), 0) / 3600,
        errorRate: recentJobs.length > 0 ? (failedRecent.length / recentJobs.length) * 100 : 0,
        avgProcessingTime: completedRecent.length > 0 
          ? completedRecent.reduce((sum, job) => sum + (job.processing_time_ms || 0), 0) / completedRecent.length
          : 0
      }

      setMetrics({
        jobMetrics: jobMetrics || [],
        summary: summary || [],
        dataQuality: dataQuality || [],
        realtimeStats
      })
      
      setError(null)
    } catch (err) {
      console.error('Error fetching scraping metrics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [selectedTimeRange])

  // Calculate status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500'
      case 'running': return 'bg-blue-500'
      case 'failed': return 'bg-red-500'
      case 'cancelled': return 'bg-gray-500'
      default: return 'bg-gray-300'
    }
  }

  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  // Calculate trends
  const sourceTrends = useMemo(() => {
    if (!metrics?.summary) return {}
    
    return metrics.summary.reduce((acc, source) => {
      const successRate = source.avg_success_rate || 0
      const trend = successRate >= 90 ? 'up' : successRate < 70 ? 'down' : 'stable'
      acc[source.source] = { rate: successRate, trend }
      return acc
    }, {} as Record<string, { rate: number, trend: string }>)
  }, [metrics?.summary])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin h-8 w-8 text-gray-500" />
        <span className="ml-2 text-gray-500">Loading scraping metrics...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6">
          <div className="flex items-center text-red-600">
            <XCircle className="h-5 w-5 mr-2" />
            <span>Error loading metrics: {error}</span>
          </div>
          <Button onClick={fetchMetrics} className="mt-4" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Scraping Performance Dashboard</h1>
          <p className="text-gray-600">Real-time monitoring of data scraping operations</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <Button onClick={fetchMetrics} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Real-time Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Jobs</p>
                <p className="text-2xl font-bold">{metrics?.realtimeStats.activeJobs || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Jobs/Hour</p>
                <p className="text-2xl font-bold">{metrics?.realtimeStats.jobsPerHour || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Events/Second</p>
                <p className="text-2xl font-bold">{(metrics?.realtimeStats.eventsPerSecond || 0).toFixed(1)}</p>
              </div>
              <Zap className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Error Rate</p>
                <p className="text-2xl font-bold text-red-500">{(metrics?.realtimeStats.errorRate || 0).toFixed(1)}%</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Processing</p>
                <p className="text-2xl font-bold">{formatDuration(metrics?.realtimeStats.avgProcessingTime || 0)}</p>
              </div>
              <Database className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sources">By Source</TabsTrigger>
          <TabsTrigger value="quality">Data Quality</TabsTrigger>
          <TabsTrigger value="recent">Recent Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Source Performance Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Source Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {metrics?.summary.map((source) => {
                  const trend = sourceTrends[source.source]
                  return (
                    <Card key={source.source} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold capitalize">{source.source}</h3>
                          <div className="flex items-center">
                            {trend?.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                            {trend?.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                            <span className="text-sm text-gray-500 ml-1">{trend?.rate.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Total Jobs:</span>
                            <span className="font-medium">{source.total_jobs}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Completed:</span>
                            <span className="text-green-600">{source.completed_jobs}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Failed:</span>
                            <span className="text-red-600">{source.failed_jobs}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Events Saved:</span>
                            <span className="font-medium">{source.total_events_saved.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Avg Time:</span>
                            <span className="font-medium">{formatDuration(source.avg_processing_time_ms)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          {/* Detailed Source Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(
              metrics?.jobMetrics.reduce((acc, job) => {
                if (!acc[job.source]) acc[job.source] = []
                acc[job.source].push(job)
                return acc
              }, {} as Record<string, typeof metrics.jobMetrics>) || {}
            ).map(([source, jobs]) => (
              <Card key={source}>
                <CardHeader>
                  <CardTitle className="capitalize">{source} Jobs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {jobs.slice(0, 10).map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(job.status)}`} />
                          <span className="text-sm font-mono">{job.job_id.slice(0, 8)}...</span>
                          <Badge variant={job.status === 'completed' ? 'default' : job.status === 'failed' ? 'destructive' : 'secondary'}>
                            {job.status}
                          </Badge>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <div>{job.events_saved} events</div>
                          <div>{job.processing_time_ms ? formatDuration(job.processing_time_ms) : '-'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          {/* Data Quality Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Data Quality Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(
                  metrics?.dataQuality.reduce((acc, metric) => {
                    const key = `${metric.source}-${metric.metric_type}`
                    if (!acc[key] || new Date(metric.measured_at) > new Date(acc[key].measured_at)) {
                      acc[key] = metric
                    }
                    return acc
                  }, {} as Record<string, typeof metrics.dataQuality[0]>) || {}
                ).map(([key, metric]) => (
                  <Card key={key} className="border">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-sm capitalize">{metric.source}</h3>
                          <Badge variant={metric.score >= 90 ? 'default' : metric.score >= 70 ? 'secondary' : 'destructive'}>
                            {metric.score.toFixed(1)}%
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 capitalize">{metric.metric_type}</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span>Total:</span>
                            <span>{metric.total_records.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Passed:</span>
                            <span className="text-green-600">{metric.passed_records.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Failed:</span>
                            <span className="text-red-600">{metric.failed_records.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          {/* Recent Jobs Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Scraping Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Job ID</th>
                      <th className="text-left py-2">Source</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-right py-2">Events</th>
                      <th className="text-right py-2">Success Rate</th>
                      <th className="text-right py-2">Duration</th>
                      <th className="text-left py-2">Started</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics?.jobMetrics.slice(0, 20).map((job) => (
                      <tr key={job.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 font-mono text-xs">{job.job_id.slice(0, 12)}...</td>
                        <td className="py-2 capitalize">{job.source}</td>
                        <td className="py-2">
                          <Badge variant={
                            job.status === 'completed' ? 'default' : 
                            job.status === 'failed' ? 'destructive' : 
                            'secondary'
                          }>
                            {job.status}
                          </Badge>
                        </td>
                        <td className="py-2 text-right">
                          <div>{job.events_saved}/{job.events_processed}</div>
                          {job.duplicates_found > 0 && (
                            <div className="text-xs text-gray-500">{job.duplicates_found} dups</div>
                          )}
                        </td>
                        <td className="py-2 text-right">
                          {job.success_rate ? `${job.success_rate.toFixed(1)}%` : '-'}
                        </td>
                        <td className="py-2 text-right">
                          {job.processing_time_ms ? formatDuration(job.processing_time_ms) : '-'}
                        </td>
                        <td className="py-2 text-xs text-gray-500">
                          {new Date(job.start_time).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}