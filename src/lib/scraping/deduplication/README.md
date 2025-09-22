# Intelligent Event Deduplication System

A comprehensive, high-accuracy deduplication system for SceneScout that combines fuzzy matching, semantic analysis, and location-based detection to identify and merge duplicate events across multiple data sources.

## Features

### 🎯 Advanced Matching Algorithms
- **Fuzzy String Matching**: Levenshtein distance, Jaro-Winkler, and cosine similarity
- **Location Proximity**: Coordinate-based distance calculation and venue name matching
- **Temporal Matching**: Date/time proximity with configurable tolerance
- **Semantic Analysis**: Content and category-based similarity detection

### 🔄 Intelligent Merging
- **Conflict Resolution**: Smart field-level conflict resolution with source prioritization
- **Data Enhancement**: Automatically combines data from multiple sources for richer events
- **Quality Preservation**: Ensures merged events maintain or improve data quality
- **Configurable Strategies**: Multiple merge strategies for different scenarios

### 📊 Comprehensive Tracking
- **Audit Trail**: Complete history of all merge operations
- **Performance Metrics**: Processing time, accuracy, and efficiency tracking
- **Quality Analytics**: Precision, recall, and confidence scoring
- **Conflict Analysis**: Detailed reporting on data discrepancies

### ⚡ Performance Optimization
- **Intelligent Caching**: Multi-level caching for fingerprints and similarity scores
- **Clustering**: Groups similar events for faster candidate filtering
- **Batch Processing**: Optimized processing for large datasets
- **Parallel Execution**: Multi-threaded processing for improved performance

## Quick Start

### Basic Usage

```typescript
import { createDeduplicationSystem } from '@/lib/scraping/deduplication'

// Create a deduplication system with default configuration
const system = createDeduplicationSystem()
await system.initialize()

// Check for duplicates
const result = await system.checkForDuplicates(targetEvent, candidateEvents)

if (result.isDuplicate) {
  console.log(`Found ${result.matches.length} potential duplicates`)
  console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`)
  
  // Create and execute merge
  const decision = system.createMergeDecision(
    targetEvent,
    result.duplicateEventIds.map(id => events.find(e => e.id === id)),
    'enhance_primary'
  )
  
  const mergeResult = await system.executeMerge(decision, 'user-id')
  
  if (mergeResult.success) {
    console.log('Events merged successfully!')
    console.log('Merged event:', mergeResult.mergedEvent)
  }
}
```

### Advanced Configuration

```typescript
import { IntelligentDeduplicationSystem } from '@/lib/scraping/deduplication'

const system = new IntelligentDeduplicationSystem({
  thresholds: {
    title: 0.85,        // 85% title similarity threshold
    venue: 0.80,        // 80% venue similarity threshold
    location: 0.75,     // 75% location similarity threshold
    date: 0.90,         // 90% date similarity threshold
    semantic: 0.75,     // 75% semantic similarity threshold
    overall: 0.80       // 80% overall similarity threshold
  },
  weights: {
    title: 0.35,        // 35% weight for title matching
    venue: 0.25,        // 25% weight for venue matching
    location: 0.20,     // 20% weight for location matching
    date: 0.15,         // 15% weight for date matching
    semantic: 0.05      // 5% weight for semantic matching
  },
  algorithms: {
    stringMatching: 'hybrid',      // Use hybrid string matching
    semanticMatching: true,        // Enable semantic analysis
    locationMatching: 'hybrid',    // Use hybrid location matching
    fuzzyDate: true               // Enable fuzzy date matching
  },
  performance: {
    batchSize: 100,               // Process in batches of 100
    maxCandidates: 50,            // Limit candidates per event
    enableCaching: true,          // Enable performance caching
    parallelProcessing: true      // Enable parallel processing
  },
  quality: {
    minimumQualityScore: 0.7,     // Minimum quality threshold
    requireManualReview: false,   // Auto-merge without manual review
    autoMergeThreshold: 0.95      // Auto-merge at 95% confidence
  }
})
```

### Batch Processing

```typescript
import { batchProcessEvents } from '@/lib/scraping/deduplication'

// Process large datasets efficiently
const events = await getEventsFromDatabase()
const result = await batchProcessEvents(events, 'batch')

console.log(`Processed ${result.processedCount} events`)
console.log(`Found ${result.duplicatesFound} duplicates`)
console.log(`Completed ${result.mergesCompleted} merges`)
console.log(`Processing time: ${result.performance.processingTime}ms`)
```

## Components

### FuzzyMatcher

Implements advanced similarity algorithms for event comparison.

```typescript
import { FuzzyMatcher } from '@/lib/scraping/deduplication'

const matcher = new FuzzyMatcher({
  thresholds: { overall: 0.8 },
  algorithms: { stringMatching: 'jaro_winkler' }
})

// Generate event fingerprints
const fingerprint1 = matcher.generateFingerprint(event1)
const fingerprint2 = matcher.generateFingerprint(event2)

// Calculate similarity
const similarity = matcher.calculateSimilarity(fingerprint1, fingerprint2)
console.log(`Title similarity: ${(similarity.title * 100).toFixed(1)}%`)
console.log(`Overall similarity: ${(similarity.overall * 100).toFixed(1)}%`)

// Find matches
const matches = await matcher.findMatches(targetEvent, candidateEvents)
```

### EventMerger

Handles intelligent merging of duplicate events with conflict resolution.

```typescript
import { EventMerger } from '@/lib/scraping/deduplication'

const merger = new EventMerger(config)

// Create merge decision
const decision = merger.createMergeDecision(
  primaryEvent,
  duplicateEvents,
  'quality_based'
)

// Validate decision
const validation = merger.validateMergeDecision(decision)
if (validation.isValid) {
  // Execute merge
  const result = await merger.executeMerge(decision)
  console.log('Merged event:', result.mergedEvent)
}
```

### ConflictResolver

Resolves data conflicts using intelligent strategies.

```typescript
import { ConflictResolver } from '@/lib/scraping/deduplication'

const resolver = new ConflictResolver(config)

// Register data sources
resolver.registerDataSource('eventbrite', {
  name: 'eventbrite',
  reliability: 0.88,
  dataQuality: 0.85
})

// Resolve conflicts
const resolution = resolver.resolveFieldConflict('title', [
  { value: 'Jazz Concert', event: event1, source: 'primary' },
  { value: 'Live Jazz Show', event: event2, source: 'eventbrite' }
])

console.log('Resolved value:', resolution.resolvedValue)
console.log('Confidence:', resolution.confidence)
```

### MergeHistoryTracker

Tracks and analyzes merge operations for audit and optimization.

```typescript
import { MergeHistoryTracker } from '@/lib/scraping/deduplication'

const tracker = new MergeHistoryTracker()

// Record merge
const historyId = tracker.recordMerge(
  decision,
  beforeEvent,
  afterEvent,
  'user-id',
  processingTime,
  qualityImprovement
)

// Get event history
const history = tracker.getEventHistory(eventId)

// Generate analytics
const analytics = tracker.getAnalytics({
  dateRange: { start: lastWeek, end: now },
  strategy: 'enhance_primary'
})

// Generate audit report
const report = tracker.generateAuditReport()
```

### PerformanceOptimizer

Optimizes processing performance for large-scale operations.

```typescript
import { PerformanceOptimizer } from '@/lib/scraping/deduplication'

const optimizer = new PerformanceOptimizer(config, matcher)

// Process with optimization
const result = await optimizer.processEventsOptimized(events, 'batch')

// Get performance stats
const stats = optimizer.getPerformanceStats()
console.log('Cache hit rate:', stats.cacheStats.fingerprintCache.hitRate)
console.log('Average cluster size:', stats.clusterStats.avgClusterSize)

// Toggle optimization strategies
optimizer.toggleOptimizationStrategy('clustering', true)
optimizer.updateOptimizationConfig('aggressive_caching', {
  maxCacheSize: 20000,
  ttlMinutes: 120
})
```

## Merge Strategies

### keep_primary
Preserves the primary event data, only filling in missing fields from duplicates.

### merge_fields
Intelligently combines fields from all events using quality-based selection.

### enhance_primary
Enhances the primary event with higher-quality data from duplicates.

### quality_based
Selects the best value for each field based on data quality scores.

### temporal_priority
Prioritizes more recent data for time-sensitive fields.

### source_priority
Uses configured source reliability for field selection.

## Conflict Resolution Strategies

### primary_wins
Always chooses the value from the primary event.

### latest_wins
Selects the most recently updated value.

### most_complete
Chooses the most complete or detailed value.

### highest_quality
Uses the value with the highest quality score.

### merge_values
Combines values when possible (e.g., merging tag arrays).

### manual_review
Flags conflicts for manual review.

## Configuration Options

### Thresholds
Control sensitivity of duplicate detection:
- `title`: Title similarity threshold (0-1)
- `venue`: Venue similarity threshold (0-1)
- `location`: Location similarity threshold (0-1)
- `date`: Date similarity threshold (0-1)
- `semantic`: Semantic similarity threshold (0-1)
- `overall`: Overall similarity threshold (0-1)

### Weights
Control importance of different matching factors:
- `title`: Weight for title matching (0-1)
- `venue`: Weight for venue matching (0-1)
- `location`: Weight for location matching (0-1)
- `date`: Weight for date matching (0-1)
- `semantic`: Weight for semantic matching (0-1)

### Algorithms
Choose specific algorithms:
- `stringMatching`: 'levenshtein' | 'jaro_winkler' | 'cosine' | 'hybrid'
- `semanticMatching`: Enable/disable semantic analysis
- `locationMatching`: 'coordinates' | 'address' | 'venue' | 'hybrid'
- `fuzzyDate`: Enable/disable fuzzy date matching

### Performance
Optimize for different scenarios:
- `batchSize`: Events per processing batch
- `maxCandidates`: Maximum candidates per event
- `enableCaching`: Enable/disable caching
- `parallelProcessing`: Enable/disable parallel processing

### Quality
Control merge quality and review requirements:
- `minimumQualityScore`: Minimum quality threshold for merges
- `requireManualReview`: Require manual review for low-confidence merges
- `autoMergeThreshold`: Confidence threshold for automatic merging

## Error Handling

The system gracefully handles various error conditions:

```typescript
try {
  const result = await system.processEvents(events)
  
  if (result.errors.length > 0) {
    console.warn('Processing errors:', result.errors)
  }
  
} catch (error) {
  console.error('System error:', error.message)
  
  // Check system health
  const health = system.healthCheck()
  if (health.status === 'error') {
    console.error('System health issues:', health.recommendations)
  }
}
```

## Monitoring and Analytics

### Performance Monitoring

```typescript
// Get real-time performance metrics
const metrics = system.getPerformanceMetrics()

// Generate comprehensive report
const report = await system.generateReport({
  dateRange: { start: lastWeek, end: now }
})

console.log('Quality metrics:')
console.log(`Precision: ${(report.quality.precision * 100).toFixed(1)}%`)
console.log(`Recall: ${(report.quality.recall * 100).toFixed(1)}%`)
console.log(`F1 Score: ${(report.quality.f1Score * 100).toFixed(1)}%`)
```

### Health Monitoring

```typescript
// Regular health checks
const health = system.healthCheck()

if (health.status === 'warning') {
  console.warn('System warnings:', health.recommendations)
}

// Component-specific health
Object.entries(health.components).forEach(([component, status]) => {
  console.log(`${component}: ${status.status} - ${status.details}`)
})
```

## Best Practices

### 1. Configuration Tuning
- Start with default settings and adjust based on your data
- Monitor precision/recall metrics to optimize thresholds
- Use A/B testing to evaluate configuration changes

### 2. Data Quality
- Ensure consistent data normalization before deduplication
- Validate input data to prevent processing errors
- Implement data quality scoring for better conflict resolution

### 3. Performance Optimization
- Enable caching for repeated operations
- Use clustering for large datasets
- Process in batches appropriate for your system resources

### 4. Monitoring
- Set up alerts for high error rates or low confidence scores
- Regular health checks to identify performance issues
- Monitor merge quality through audit reports

### 5. Manual Review
- Implement manual review workflows for low-confidence merges
- Train reviewers on conflict resolution strategies
- Use feedback to improve automatic resolution rules

## Integration Examples

### With SceneScout Pipeline

```typescript
// In your event ingestion pipeline
import { createDeduplicationSystem } from '@/lib/scraping/deduplication'

const deduplicationSystem = createDeduplicationSystem({
  thresholds: { overall: 0.8 }
})

export async function processIngestedEvents(newEvents: Event[]) {
  // Get existing events as candidates
  const existingEvents = await getExistingEvents()
  
  const duplicates = []
  const uniqueEvents = []
  
  for (const newEvent of newEvents) {
    const result = await deduplicationSystem.checkForDuplicates(
      newEvent,
      existingEvents
    )
    
    if (result.isDuplicate) {
      // Create merge decision
      const decision = deduplicationSystem.createMergeDecision(
        result.primaryEventId ? 
          existingEvents.find(e => e.id === result.primaryEventId) : 
          newEvent,
        [newEvent],
        'enhance_primary'
      )
      
      // Execute merge
      const mergeResult = await deduplicationSystem.executeMerge(
        decision, 
        'ingestion-pipeline'
      )
      
      if (mergeResult.success) {
        await updateEvent(mergeResult.mergedEvent)
        duplicates.push(newEvent.id)
      }
    } else {
      uniqueEvents.push(newEvent)
    }
  }
  
  // Save unique events
  if (uniqueEvents.length > 0) {
    await saveEvents(uniqueEvents)
  }
  
  return {
    saved: uniqueEvents.length,
    merged: duplicates.length
  }
}
```

### With Background Processing

```typescript
// Background job for deduplication cleanup
import { batchProcessEvents } from '@/lib/scraping/deduplication'

export async function runDeduplicationCleanup() {
  const events = await getEventsForCleanup()
  
  if (events.length === 0) return
  
  const result = await batchProcessEvents(events, 'full_scan')
  
  console.log(`Cleanup completed:`)
  console.log(`- Processed: ${result.processedCount} events`)
  console.log(`- Duplicates found: ${result.duplicatesFound}`)
  console.log(`- Merges completed: ${result.mergesCompleted}`)
  console.log(`- Processing time: ${result.performance.processingTime}ms`)
  
  // Generate and store report
  const system = createDeduplicationSystem()
  const report = await system.generateReport()
  await storeCleanupReport(report)
}
```

## Troubleshooting

### Common Issues

1. **High False Positive Rate**
   - Increase similarity thresholds
   - Adjust field weights to emphasize critical fields
   - Review and improve data normalization

2. **High False Negative Rate**
   - Decrease similarity thresholds
   - Enable fuzzy date matching for events with time variations
   - Improve location matching for venue variations

3. **Performance Issues**
   - Enable caching and clustering
   - Reduce batch sizes for memory-constrained environments
   - Limit candidate pool size

4. **Merge Quality Issues**
   - Review conflict resolution strategies
   - Adjust data source reliability scores
   - Implement manual review for low-confidence merges

### Debug Mode

```typescript
// Enable detailed logging
const system = createDeduplicationSystem({
  performance: { enableCaching: false } // Disable caching for debugging
})

// Get detailed match information
const result = await system.checkForDuplicates(event, candidates)
result.matches.forEach(match => {
  console.log(`Match: ${match.eventId}`)
  console.log(`Confidence: ${match.confidence}`)
  console.log(`Reasons: ${match.reasons.join(', ')}`)
  console.log(`Risk factors: ${match.riskFactors.join(', ')}`)
  console.log(`Similarity scores:`, match.similarityScore)
})
```

## License

This deduplication system is part of the SceneScout project and follows the same licensing terms.