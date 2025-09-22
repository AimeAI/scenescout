/**
 * System Health Dashboard
 * Real-time monitoring of system components, APIs, and infrastructure health
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Heart,
  Server,
  Database,
  Globe,
  Zap,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface HealthMetrics {
  healthChecks: {
    id: string
    component: string
    status: string
    response_time_ms?: number
    error_message?: string
    details: any
    check_time: string
  }[]
  summary: {
    component: string
    total_checks: number
    healthy_checks: number
    degraded_checks: number
    unhealthy_checks: number
    avg_response_time: number
    last_check_time: string
  }[]
  edgeFunctions: {
    function_name: string
    invocation_count: number
    success_count: number
    error_count: number
    avg_duration_ms: number
    timeout_count: number
    date: string
    hour: number
  }[]
  apiMetrics: {
    endpoint: string
    method: string
    status_code: number
    response_time_ms: number
    timestamp: string
  }[]
  realtimeMetrics: {
    metric_name: string
    metric_value: number
    metric_unit: string
    labels: any
    timestamp: string
  }[]
  alerts: {
    id: string
    alert_type: string
    severity: string
    title: string
    message: string
    triggered_at: string
    resolved_at?: string
  }[]
}

interface ComponentStatus {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  uptime: number
  responseTime: number
  lastCheck: string
  issues: string[]
}

export default function SystemHealthDashboard() {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Fetch health metrics
  const fetchMetrics = async () => {
    try {
      setRefreshing(true)
      
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      // Fetch health check results
      const { data: healthChecks, error: healthError } = await supabase
        .from('health_check_results')
        .select('*')
        .gte('check_time', oneHourAgo.toISOString())
        .order('check_time', { ascending: false })

      if (healthError) throw healthError

      // Fetch health summary
      const { data: summary, error: summaryError } = await supabase
        .from('system_health_summary')
        .select('*')

      if (summaryError) throw summaryError

      // Fetch edge function metrics
      const { data: edgeFunctions, error: edgeError } = await supabase
        .from('edge_function_metrics')
        .select('*')
        .gte('date', oneDayAgo.toISOString().split('T')[0])
        .order('date', { ascending: false })
        .order('hour', { ascending: false })

      if (edgeError) throw edgeError

      // Fetch recent API metrics
      const { data: apiMetrics, error: apiError } = await supabase
        .from('api_endpoint_metrics')
        .select('*')
        .gte('timestamp', oneHourAgo.toISOString())
        .order('timestamp', { ascending: false })
        .limit(100)

      if (apiError) throw apiError

      // Fetch real-time metrics
      const { data: realtimeMetrics, error: realtimeError } = await supabase
        .from('realtime_metrics')
        .select('*')
        .gte('timestamp', oneHourAgo.toISOString())
        .order('timestamp', { ascending: false })
        .limit(200)

      if (realtimeError) throw realtimeError

      // Fetch recent alerts
      const { data: alerts, error: alertsError } = await supabase
        .from('alert_history')
        .select('*')
        .gte('triggered_at', oneDayAgo.toISOString())
        .order('triggered_at', { ascending: false })
        .limit(50)

      if (alertsError) throw alertsError

      setMetrics({
        healthChecks: healthChecks || [],
        summary: summary || [],
        edgeFunctions: edgeFunctions || [],
        apiMetrics: apiMetrics || [],
        realtimeMetrics: realtimeMetrics || [],
        alerts: alerts || []
      })
      
      setError(null)
    } catch (err) {
      console.error('Error fetching health metrics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Auto-refresh functionality
  useEffect(() => {
    fetchMetrics()
    
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 30000) // 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  // Calculate overall system health
  const systemHealth = useMemo(() => {
    if (!metrics?.summary.length) return { status: 'unknown', uptime: 0 }

    const components = metrics.summary
    const totalChecks = components.reduce((sum, c) => sum + c.total_checks, 0)
    const healthyChecks = components.reduce((sum, c) => sum + c.healthy_checks, 0)
    const degradedChecks = components.reduce((sum, c) => sum + c.degraded_checks, 0)
    const unhealthyChecks = components.reduce((sum, c) => sum + c.unhealthy_checks, 0)

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (unhealthyChecks > 0) status = 'unhealthy'
    else if (degradedChecks > 0) status = 'degraded'

    const uptime = totalChecks > 0 ? (healthyChecks / totalChecks) * 100 : 0

    return { status, uptime }
  }, [metrics?.summary])

  // Component status mapping
  const componentStatuses: ComponentStatus[] = useMemo(() => {
    if (!metrics?.summary) return []

    return metrics.summary.map(component => {
      const totalChecks = component.total_checks
      const healthyChecks = component.healthy_checks
      const degradedChecks = component.degraded_checks
      const unhealthyChecks = component.unhealthy_checks

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
      if (unhealthyChecks > 0) status = 'unhealthy'
      else if (degradedChecks > 0) status = 'degraded'

      const uptime = totalChecks > 0 ? (healthyChecks / totalChecks) * 100 : 0
      const issues: string[] = []

      if (component.avg_response_time > 5000) {
        issues.push('High response time')
      }
      if (unhealthyChecks > 0) {
        issues.push(`${unhealthyChecks} failed checks`)
      }

      return {
        name: component.component,
        status,
        uptime,
        responseTime: component.avg_response_time || 0,
        lastCheck: component.last_check_time,
        issues
      }
    })
  }, [metrics?.summary])

  // Format uptime percentage
  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(2)}%`
  }

  // Format response time
  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100'
      case 'degraded': return 'text-yellow-600 bg-yellow-100'
      case 'unhealthy': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'degraded': return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'unhealthy': return <XCircle className="h-5 w-5 text-red-500" />
      default: return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin h-8 w-8 text-gray-500" />
        <span className="ml-2 text-gray-500">Loading system health...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6">
          <div className="flex items-center text-red-600">
            <XCircle className="h-5 w-5 mr-2" />
            <span>Error loading health metrics: {error}</span>
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
          <h1 className="text-3xl font-bold">System Health Dashboard</h1>
          <p className="text-gray-600">Real-time system component monitoring and health checks</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
          >
            <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button onClick={fetchMetrics} disabled={refreshing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall System Health */}
      <Card className={`border-2 ${
        systemHealth.status === 'healthy' ? 'border-green-200 bg-green-50' :
        systemHealth.status === 'degraded' ? 'border-yellow-200 bg-yellow-50' :
        'border-red-200 bg-red-50'
      }`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {getStatusIcon(systemHealth.status)}
                <h2 className="text-2xl font-bold capitalize">{systemHealth.status}</h2>
              </div>
              <div className="text-sm text-gray-600">
                System Uptime: <span className="font-semibold">{formatUptime(systemHealth.uptime)}</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Active Alerts</p>
                <p className="text-2xl font-bold text-red-600">
                  {metrics?.alerts.filter(a => !a.resolved_at).length || 0}
                </p>
              </div>
              <Heart className={`h-8 w-8 ${systemHealth.status === 'healthy' ? 'text-green-500' : 'text-red-500'}`} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="components" className="space-y-4">
        <TabsList>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="functions">Edge Functions</TabsTrigger>
          <TabsTrigger value="apis">API Endpoints</TabsTrigger>
          <TabsTrigger value="metrics">Live Metrics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="components" className="space-y-4">
          {/* Component Health Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {componentStatuses.map((component) => (
              <Card key={component.name} className="border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(component.status)}
                      <h3 className="font-semibold capitalize">{component.name}</h3>
                    </div>
                    <Badge className={getStatusColor(component.status)}>
                      {component.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Uptime:</span>
                      <span className="font-medium">{formatUptime(component.uptime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Response Time:</span>
                      <span className="font-medium">{formatResponseTime(component.responseTime)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Check:</span>
                      <span className="text-xs text-gray-500">
                        {new Date(component.lastCheck).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {component.issues.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium text-red-600 mb-1">Issues:</p>
                      <ul className="text-xs text-red-600 space-y-1">
                        {component.issues.map((issue, idx) => (
                          <li key={idx}>• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent Health Checks */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Health Check Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Component</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-right py-2">Response Time</th>
                      <th className="text-left py-2">Check Time</th>
                      <th className="text-left py-2">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics?.healthChecks.slice(0, 10).map((check) => (
                      <tr key={check.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 capitalize">{check.component}</td>
                        <td className="py-2">
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(check.status)}
                            <span className="capitalize">{check.status}</span>
                          </div>
                        </td>
                        <td className="py-2 text-right">
                          {check.response_time_ms ? formatResponseTime(check.response_time_ms) : '-'}
                        </td>
                        <td className="py-2 text-xs text-gray-500">
                          {new Date(check.check_time).toLocaleString()}
                        </td>
                        <td className="py-2 text-xs text-red-600 max-w-xs truncate">
                          {check.error_message || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="functions" className="space-y-4">
          {/* Edge Functions Performance */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics?.edgeFunctions.map((func) => {
              const successRate = func.invocation_count > 0 
                ? (func.success_count / func.invocation_count) * 100 
                : 0
              
              return (
                <Card key={`${func.function_name}-${func.date}-${func.hour}`} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm">{func.function_name}</h3>
                      <Badge variant={successRate >= 95 ? 'default' : successRate >= 90 ? 'secondary' : 'destructive'}>
                        {successRate.toFixed(1)}%
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>Invocations:</span>
                        <span className="font-medium">{func.invocation_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Errors:</span>
                        <span className="text-red-600">{func.error_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Duration:</span>
                        <span className="font-medium">{formatResponseTime(func.avg_duration_ms)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Timeouts:</span>
                        <span className="text-orange-600">{func.timeout_count}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="apis" className="space-y-4">
          {/* API Endpoint Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Recent API Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Endpoint</th>
                      <th className="text-left py-2">Method</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-right py-2">Response Time</th>
                      <th className="text-left py-2">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics?.apiMetrics.slice(0, 20).map((api, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="py-2 font-mono text-xs max-w-xs truncate">{api.endpoint}</td>
                        <td className="py-2">
                          <Badge variant="outline" className="text-xs">
                            {api.method}
                          </Badge>
                        </td>
                        <td className="py-2">
                          <Badge variant={
                            api.status_code < 300 ? 'default' :
                            api.status_code < 400 ? 'secondary' :
                            api.status_code < 500 ? 'secondary' : 'destructive'
                          }>
                            {api.status_code}
                          </Badge>
                        </td>
                        <td className="py-2 text-right">{formatResponseTime(api.response_time_ms)}</td>
                        <td className="py-2 text-xs text-gray-500">
                          {new Date(api.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {/* Real-time Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(
              metrics?.realtimeMetrics.reduce((acc, metric) => {
                if (!acc[metric.metric_name] || new Date(metric.timestamp) > new Date(acc[metric.metric_name].timestamp)) {
                  acc[metric.metric_name] = metric
                }
                return acc
              }, {} as Record<string, typeof metrics.realtimeMetrics[0]>) || {}
            ).map(([name, metric]) => (
              <Card key={name} className="border">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">{name.replace(/_/g, ' ').toUpperCase()}</h3>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">
                        {metric.metric_value.toLocaleString()}
                      </span>
                      <span className="text-xs text-gray-500">{metric.metric_unit}</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Updated: {new Date(metric.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {/* Recent Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>Recent System Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics?.alerts.slice(0, 10).map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`p-4 border rounded-lg ${
                      alert.resolved_at ? 'bg-gray-50 border-gray-200' : 
                      alert.severity === 'critical' ? 'bg-red-50 border-red-200' :
                      alert.severity === 'high' ? 'bg-orange-50 border-orange-200' :
                      'bg-yellow-50 border-yellow-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge variant={
                            alert.severity === 'critical' ? 'destructive' :
                            alert.severity === 'high' ? 'secondary' : 'outline'
                          }>
                            {alert.severity.toUpperCase()}
                          </Badge>
                          <span className="text-sm font-medium">{alert.alert_type}</span>
                          {alert.resolved_at && (
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              RESOLVED
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-semibold">{alert.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span>Triggered: {new Date(alert.triggered_at).toLocaleString()}</span>
                          {alert.resolved_at && (
                            <span>Resolved: {new Date(alert.resolved_at).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        {alert.resolved_at ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {(!metrics?.alerts || metrics.alerts.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>No alerts in the last 24 hours</p>
                    <p className="text-sm">System is running smoothly!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}