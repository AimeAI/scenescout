export const dynamic = 'force-dynamic'
/**
 * API route for batch event processing using spawner
 */

import { NextRequest, NextResponse } from 'next/server';
import { createEventProcessor } from '@/lib/spawner/event-processor';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Get auth session (simplified for this implementation)
    // const { data: { session } } = await supabase.auth.getSession();

    // Auth check disabled for this implementation
    // if (!session) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized' },
    //     { status: 401 }
    //   );
    // }

    // Parse request body
    const body = await request.json();
    const { source, events, options = {} } = body;

    if (!source || !events || !Array.isArray(events)) {
      return NextResponse.json(
        { error: 'Invalid request. Required: source, events array' },
        { status: 400 }
      );
    }

    // Create processor
    const processor = createEventProcessor({
      batchSize: options.batchSize || 50,
      deduplicationEnabled: options.deduplicationEnabled !== false,
      enrichmentEnabled: options.enrichmentEnabled !== false,
      validateLocation: options.validateLocation !== false
    });

    // Process events based on source
    let results;
    switch (source) {
      case 'eventbrite':
        results = await processor.processEventbriteEvents(events);
        break;
      
      case 'yelp':
        results = await processor.processYelpEvents(events);
        break;
      
      default:
        return NextResponse.json(
          { error: `Unknown source: ${source}` },
          { status: 400 }
        );
    }

    // Get final stats
    const stats = processor.getStats();
    
    // Shutdown processor
    await processor.shutdown();

    // Prepare response
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const skipped = results.filter(r => r.data?.skipped);

    return NextResponse.json({
      success: true,
      summary: {
        total: events.length,
        processed: successful.length - skipped.length,
        skipped: skipped.length,
        failed: failed.length
      },
      stats: {
        workers: stats.workers,
        metrics: stats.metrics
      },
      results: {
        successful: successful.map(r => ({
          eventId: r.data?.eventId,
          source: r.data?.source,
          duration: r.duration
        })),
        skipped: skipped.map(r => ({
          reason: r.data?.reason,
          duration: r.duration
        })),
        failed: failed.map(r => ({
          error: r.error?.message,
          duration: r.duration
        }))
      }
    });
  } catch (error) {
    console.error('Batch processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint for checking processor status
export async function GET(request: NextRequest) {
  try {
    // This would typically check a global processor instance
    // For now, return basic status
    return NextResponse.json({
      status: 'ready',
      version: '1.0.0',
      capabilities: ['eventbrite', 'yelp'],
      limits: {
        maxWorkers: 5,
        maxBatchSize: 100,
        timeout: 30000
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    );
  }
}