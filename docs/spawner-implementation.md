# Spawner Implementation Documentation

## Overview

The SceneScout Spawner is a robust, concurrent processing system designed to handle event data ingestion and processing from multiple sources. It provides parallel task execution, error handling, retry mechanisms, and comprehensive monitoring.

## Architecture

### Core Components

1. **EventSpawner** - Main spawner class that manages worker pools and task queues
2. **EventProcessor** - Event-specific processor with source handlers
3. **Error Handler** - Comprehensive error classification and recovery
4. **Configuration** - Environment-specific settings and limits
5. **React Hook** - Easy integration with React components

### Key Features

- **Parallel Processing**: Configurable worker pools with concurrency limits
- **Queue Management**: Automatic task queuing when at capacity
- **Error Handling**: Retry mechanisms with exponential backoff
- **Event Monitoring**: Comprehensive metrics and event emission
- **Type Safety**: Full TypeScript support with detailed types
- **Source Support**: Eventbrite, Yelp, and manual submissions

## Usage Examples

### Basic Spawner Usage

```typescript
import { createSpawner } from '@/lib/spawner';

// Create spawner with custom config
const spawner = createSpawner({
  maxWorkers: 5,
  timeout: 30000,
  retryAttempts: 3
});

// Single task
const task = {
  name: 'process-event',
  data: { eventId: '123' },
  handler: async (data) => {
    // Process event data
    return { processed: true };
  }
};

const result = await spawner.spawn(task);

// Batch processing
const tasks = events.map(event => ({
  name: `process-${event.id}`,
  data: event,
  handler: processEventHandler
}));

const results = await spawner.spawnBatch(tasks);
```

### Event Processing

```typescript
import { createEventProcessor } from '@/lib/spawner/event-processor';

// Create processor
const processor = createEventProcessor({
  batchSize: 50,
  deduplicationEnabled: true,
  enrichmentEnabled: true
});

// Process different event sources
const eventbriteResults = await processor.processEventbriteEvents(eventbriteData);
const yelpResults = await processor.processYelpEvents(yelpData);
const manualResult = await processor.processManualEvent(formData);

// Get processing stats
const stats = processor.getStats();
console.log(`Processed ${stats.processedCount} events`);
```

### React Hook Integration

```typescript
import { useEventProcessor } from '@/hooks/useEventProcessor';

function EventIngestionPage() {
  const {
    isProcessing,
    stats,
    errors,
    processEventbriteEvents,
    clearErrors
  } = useEventProcessor({
    autoRefresh: true,
    onSuccess: (results) => {
      console.log(`Successfully processed ${results.length} events`);
    },
    onError: (error) => {
      console.error('Processing failed:', error);
    }
  });

  const handleImport = async () => {
    try {
      await processEventbriteEvents(importData);
    } catch (error) {
      // Error handling via hook
    }
  };

  return (
    <div>
      <button onClick={handleImport} disabled={isProcessing}>
        {isProcessing ? 'Processing...' : 'Import Events'}
      </button>
      
      <div>
        Workers: {stats.workers} | Queue: {stats.queued}
      </div>
      
      {errors.length > 0 && (
        <div>
          {errors.map(error => <p key={error.message}>{error.message}</p>)}
          <button onClick={clearErrors}>Clear Errors</button>
        </div>
      )}
    </div>
  );
}
```

### API Route Usage

```typescript
// POST /api/events/process
const response = await fetch('/api/events/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source: 'eventbrite',
    events: eventbriteData,
    options: {
      batchSize: 25,
      deduplicationEnabled: true
    }
  })
});

const result = await response.json();
// {
//   success: true,
//   summary: { total: 100, processed: 95, skipped: 3, failed: 2 },
//   stats: { workers: 5, metrics: {...} },
//   results: { successful: [...], skipped: [...], failed: [...] }
// }
```

## Configuration

### Environment-Specific Settings

```typescript
// Production settings
const prodConfig = getSpawnerConfig('production');
// { maxWorkers: 10, timeout: 60000, retryAttempts: 5 }

// Development settings
const devConfig = getSpawnerConfig('development');
// { maxWorkers: 3, timeout: 30000, retryAttempts: 2 }

// Use case specific
const eventConfig = getConfigByUseCase('EVENT_PROCESSING');
// { maxWorkers: 8, timeout: 45000, batchSize: 50, ... }
```

### Rate Limiting

```typescript
import { RATE_LIMITS } from '@/lib/spawner/config';

// API rate limits
RATE_LIMITS.EVENTBRITE_API.requestsPerMinute; // 100
RATE_LIMITS.YELP_API.requestsPerMinute; // 500
```

## Error Handling

### Error Types

- **SpawnerError** - Base error class with retry information
- **TaskTimeoutError** - Task execution timeout
- **WorkerLimitError** - Worker capacity exceeded
- **ValidationError** - Data validation failure
- **ExternalAPIError** - External service errors
- **DatabaseError** - Database operation errors

### Error Recovery

```typescript
import { attemptRecovery, classifyError } from '@/lib/spawner/error-handler';

try {
  await processor.processEvents(events);
} catch (error) {
  const classified = classifyError(error);
  
  if (classified.retryable) {
    // Attempt recovery
    await attemptRecovery(error, { events });
  } else {
    // Handle non-recoverable error
    console.error('Fatal error:', error);
  }
}
```

## Monitoring and Metrics

### Event Monitoring

```typescript
spawner.on('worker:start', ({ workerId, task }) => {
  console.log(`Worker ${workerId} started task ${task.name}`);
});

spawner.on('worker:complete', ({ workerId, result, duration }) => {
  console.log(`Worker ${workerId} completed in ${duration}ms`);
});

spawner.on('worker:error', ({ workerId, error }) => {
  console.error(`Worker ${workerId} failed:`, error);
});

spawner.on('task:queued', ({ task, queueLength }) => {
  console.log(`Task ${task.name} queued (${queueLength} waiting)`);
});
```

### Performance Metrics

```typescript
const status = spawner.getStatus();
// {
//   status: 'processing',
//   workers: 3,
//   queued: 2,
//   metrics: {
//     totalTasks: 150,
//     completedTasks: 145,
//     failedTasks: 2,
//     averageTime: 1250
//   }
// }
```

## Testing

### Unit Tests

```bash
npm test spawner.test.ts
```

### Integration Tests

```bash
npm test spawner-integration.test.ts
```

### Performance Tests

```bash
npm test spawner-performance.test.ts
```

## Best Practices

### Performance Optimization

1. **Batch Size**: Use appropriate batch sizes (25-100 events)
2. **Worker Limits**: Set reasonable worker limits based on resources
3. **Timeout Values**: Configure timeouts based on operation complexity
4. **Memory Management**: Monitor memory usage in long-running processes

### Error Handling

1. **Retry Strategy**: Use exponential backoff for external API errors
2. **Circuit Breaker**: Implement circuit breakers for failing services
3. **Graceful Degradation**: Provide fallback mechanisms
4. **Logging**: Comprehensive error logging and monitoring

### Resource Management

1. **Connection Pooling**: Reuse database connections
2. **Memory Limits**: Set per-worker memory limits
3. **Queue Size**: Limit queue size to prevent memory issues
4. **Cleanup**: Always shutdown spawners properly

## Production Deployment

### Environment Variables

```bash
NODE_ENV=production
MAX_WORKERS=10
SPAWNER_TIMEOUT=60000
RETRY_ATTEMPTS=5
```

### Monitoring

- **Metrics**: Worker count, queue length, error rates
- **Alerts**: High error rates, queue backups, timeout spikes
- **Logging**: Structured logging with error context
- **Health Checks**: Regular spawner health verification

### Scaling

- **Horizontal**: Multiple spawner instances
- **Vertical**: Increase worker limits and timeouts
- **Database**: Connection pooling and read replicas
- **Cache**: Redis for deduplication and session data

## Troubleshooting

### Common Issues

1. **High Error Rates**
   - Check external API status
   - Verify database connectivity
   - Review error logs for patterns

2. **Performance Issues**
   - Monitor worker utilization
   - Check queue backlog
   - Review timeout configurations

3. **Memory Leaks**
   - Monitor worker memory usage
   - Check for proper cleanup
   - Review error handling paths

### Debug Mode

```typescript
const spawner = createSpawner({
  maxWorkers: 1, // Easier debugging
  timeout: 60000, // Longer timeout
  retryAttempts: 0 // No retries
});

// Enable verbose logging
spawner.on('worker:start', console.log);
spawner.on('worker:complete', console.log);
spawner.on('worker:error', console.error);
```

## API Reference

See the TypeScript definitions in:
- `/src/lib/spawner/types.ts` - Core types and interfaces
- `/src/lib/spawner/index.ts` - Main spawner implementation
- `/src/lib/spawner/event-processor.ts` - Event processing logic
- `/src/lib/spawner/error-handler.ts` - Error handling utilities
- `/src/lib/spawner/config.ts` - Configuration options