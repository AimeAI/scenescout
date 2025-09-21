/**
 * Event Pipeline API Routes
 * Main API endpoints for controlling and monitoring the event pipeline
 */

import { NextRequest, NextResponse } from 'next/server'
import { pipelineOrchestrator } from '@/lib/pipeline/event-pipeline-orchestrator'
import { realtimeEventStream } from '@/lib/pipeline/realtime-stream'
import { dataQualityGates } from '@/lib/pipeline/data-quality-gates'
import { monitoringSystem } from '@/lib/pipeline/monitoring-system'

// GET /api/pipeline - Get pipeline status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'status':
        return NextResponse.json({
          pipeline: pipelineOrchestrator.getStatus(),
          realtime: {
            connected: realtimeEventStream.isStreamConnected(),
            metrics: realtimeEventStream.getMetrics(),
            subscriptions: realtimeEventStream.getSubscriptions().length
          },
          quality: {
            metrics: dataQualityGates.getMetrics(),
            gates: dataQualityGates.getGates().length
          },
          monitoring: {
            metrics: monitoringSystem.getMetrics(),
            alerts: monitoringSystem.getActiveAlerts().length
          }
        })

      case 'health':
        const healthReport = await monitoringSystem.performHealthCheck()
        return NextResponse.json(healthReport)

      case 'metrics':
        const timeframe = searchParams.get('timeframe') || '24'
        const metricHistory = monitoringSystem.getMetricHistory(undefined, parseInt(timeframe))
        return NextResponse.json({
          current: monitoringSystem.getMetrics(),
          history: metricHistory
        })

      case 'jobs':
        const status = pipelineOrchestrator.getStatus()
        return NextResponse.json({
          active: status.activeJobs,
          total: status.activeJobs.length
        })

      case 'alerts':
        return NextResponse.json({
          active: monitoringSystem.getActiveAlerts(),
          rules: monitoringSystem.getAlertRules()
        })

      default:
        return NextResponse.json({
          message: 'Event Pipeline API',
          version: '1.0.0',
          endpoints: {
            'GET /api/pipeline?action=status': 'Get overall pipeline status',
            'GET /api/pipeline?action=health': 'Get system health check',
            'GET /api/pipeline?action=metrics': 'Get performance metrics',
            'GET /api/pipeline?action=jobs': 'Get active jobs',
            'GET /api/pipeline?action=alerts': 'Get alerts status',
            'POST /api/pipeline': 'Control pipeline operations'
          }
        })
    }
  } catch (error) {
    console.error('Pipeline API GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}

// POST /api/pipeline - Control pipeline operations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, ...params } = body

    switch (action) {
      case 'start':
        if (!pipelineOrchestrator.getStatus().isRunning) {
          await pipelineOrchestrator.start()
          await realtimeEventStream.connect()
          await monitoringSystem.startMonitoring()
        }
        return NextResponse.json({ 
          message: 'Pipeline started successfully',
          status: pipelineOrchestrator.getStatus()
        })

      case 'stop':
        if (pipelineOrchestrator.getStatus().isRunning) {
          await pipelineOrchestrator.stop()
          await realtimeEventStream.disconnect()
          await monitoringSystem.stopMonitoring()
        }
        return NextResponse.json({ 
          message: 'Pipeline stopped successfully' 
        })

      case 'discovery':
        const discoveryJob = await pipelineOrchestrator.orchestrateDiscovery({
          sources: params.sources || ['eventbrite', 'yelp'],
          locations: params.locations || ['San Francisco, CA', 'New York, NY'],
          categories: params.categories,
          dateRange: params.dateRange,
          maxEventsPerSource: params.maxEventsPerSource || 50
        })
        return NextResponse.json({
          message: 'Discovery job started',
          job: discoveryJob
        })

      case 'validate':
        if (!params.events || !Array.isArray(params.events)) {
          return NextResponse.json(
            { error: 'Events array required for validation' },
            { status: 400 }
          )
        }

        const validationResults = await dataQualityGates.validateEventBatch(params.events)
        return NextResponse.json({
          message: 'Validation completed',
          results: validationResults
        })

      case 'realtime_connect':
        if (!realtimeEventStream.isStreamConnected()) {
          await realtimeEventStream.connect()
        }
        return NextResponse.json({
          message: 'Real-time stream connected',
          status: realtimeEventStream.isStreamConnected()
        })

      case 'realtime_disconnect':
        if (realtimeEventStream.isStreamConnected()) {
          await realtimeEventStream.disconnect()
        }
        return NextResponse.json({
          message: 'Real-time stream disconnected'
        })

      case 'subscribe':
        const subscriptionId = realtimeEventStream.subscribe(
          params.type || 'event_update',
          (message) => {
            // In a real implementation, you'd send this via WebSocket
            console.log('Stream message:', message)
          },
          params.filters
        )
        return NextResponse.json({
          message: 'Subscription created',
          subscriptionId
        })

      case 'unsubscribe':
        if (!params.subscriptionId) {
          return NextResponse.json(
            { error: 'Subscription ID required' },
            { status: 400 }
          )
        }
        const unsubscribed = realtimeEventStream.unsubscribe(params.subscriptionId)
        return NextResponse.json({
          message: unsubscribed ? 'Unsubscribed successfully' : 'Subscription not found',
          success: unsubscribed
        })

      case 'cancel_job':
        if (!params.jobId) {
          return NextResponse.json(
            { error: 'Job ID required' },
            { status: 400 }
          )
        }
        const cancelled = pipelineOrchestrator.cancelJob(params.jobId)
        return NextResponse.json({
          message: cancelled ? 'Job cancelled' : 'Job not found or not cancellable',
          success: cancelled
        })

      case 'cleanup_jobs':
        const hours = params.hours || 24
        pipelineOrchestrator.cleanupJobs(hours)
        return NextResponse.json({
          message: `Cleaned up jobs older than ${hours} hours`
        })

      case 'resolve_alert':
        if (!params.alertId) {
          return NextResponse.json(
            { error: 'Alert ID required' },
            { status: 400 }
          )
        }
        const resolved = monitoringSystem.resolveAlert(params.alertId)
        return NextResponse.json({
          message: resolved ? 'Alert resolved' : 'Alert not found',
          success: resolved
        })

      case 'add_alert_rule':
        if (!params.rule) {
          return NextResponse.json(
            { error: 'Alert rule required' },
            { status: 400 }
          )
        }
        monitoringSystem.addAlertRule(params.rule)
        return NextResponse.json({
          message: 'Alert rule added',
          ruleId: params.rule.id
        })

      case 'broadcast_notification':
        realtimeEventStream.broadcastNotification(
          params.title || 'System Notification',
          params.message || 'No message provided',
          params.type || 'info',
          params.metadata
        )
        return NextResponse.json({
          message: 'Notification broadcasted'
        })

      case 'export_config':
        return NextResponse.json({
          pipeline: pipelineOrchestrator.getStatus().config,
          quality: dataQualityGates.exportConfiguration(),
          monitoring: monitoringSystem.exportConfiguration()
        })

      case 'import_config':
        if (params.quality) {
          dataQualityGates.importConfiguration(params.quality)
        }
        return NextResponse.json({
          message: 'Configuration imported successfully'
        })

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Pipeline API POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}

// PUT /api/pipeline - Update pipeline configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { component, config } = body

    switch (component) {
      case 'quality_gates':
        if (config.gates) {
          config.gates.forEach((gate: any) => {
            dataQualityGates.toggleGate(gate.id, gate.enabled)
          })
        }
        return NextResponse.json({
          message: 'Quality gates configuration updated'
        })

      case 'monitoring':
        if (config.alertRules) {
          config.alertRules.forEach((rule: any) => {
            monitoringSystem.addAlertRule(rule)
          })
        }
        return NextResponse.json({
          message: 'Monitoring configuration updated'
        })

      default:
        return NextResponse.json(
          { error: `Unknown component: ${component}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Pipeline API PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}

// DELETE /api/pipeline - Remove pipeline resources
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')

    if (!type || !id) {
      return NextResponse.json(
        { error: 'Type and ID parameters required' },
        { status: 400 }
      )
    }

    switch (type) {
      case 'job':
        const cancelled = pipelineOrchestrator.cancelJob(id)
        return NextResponse.json({
          message: cancelled ? 'Job cancelled and removed' : 'Job not found',
          success: cancelled
        })

      case 'alert_rule':
        const removed = monitoringSystem.removeAlertRule(id)
        return NextResponse.json({
          message: removed ? 'Alert rule removed' : 'Alert rule not found',
          success: removed
        })

      case 'subscription':
        const unsubscribed = realtimeEventStream.unsubscribe(id)
        return NextResponse.json({
          message: unsubscribed ? 'Subscription removed' : 'Subscription not found',
          success: unsubscribed
        })

      case 'quality_gate':
        const gateRemoved = dataQualityGates.removeGate(id)
        return NextResponse.json({
          message: gateRemoved ? 'Quality gate removed' : 'Quality gate not found',
          success: gateRemoved
        })

      default:
        return NextResponse.json(
          { error: `Unknown type: ${type}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Pipeline API DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}