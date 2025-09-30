import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { Event } from '@/types'
import {
  IntelligentDeduplicationSystem,
  FuzzyMatcher,
  EventMerger,
  ConflictResolver,
  MergeHistoryTracker,
  createDeduplicationSystem,
  quickDuplicateCheck,
  batchProcessEvents
} from '@/lib/scraping/deduplication'

// Mock events for testing
const mockEvents = {
  original: {
    id: 'event-1',
    title: 'Jazz Concert at Blue Note',
    description: 'Amazing jazz performance featuring local artists',
    venue_name: 'Blue Note Jazz Club',
    city_name: 'New York',
    start_time: '2024-01-15T20:00:00Z',
    end_time: '2024-01-15T23:00:00Z',
    category: 'music',
    price_min: 25,
    price_max: 45,
    latitude: 40.7128,
    longitude: -74.0060,
    website_url: 'https://bluenotejazz.com/events/123',
    ticket_url: 'https://tickets.bluenotejazz.com/123',
    image_url: 'https://images.bluenotejazz.com/concert.jpg',
    source: 'primary',
    external_id: 'bn-123',
    tags: ['jazz', 'live music', 'evening'],
    is_featured: true,
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  } as Event,

  exactDuplicate: {
    id: 'event-2',
    title: 'Jazz Concert at Blue Note',
    description: 'Amazing jazz performance featuring local artists',
    venue_name: 'Blue Note Jazz Club',
    city_name: 'New York',
    start_time: '2024-01-15T20:00:00Z',
    end_time: '2024-01-15T23:00:00Z',
    category: 'music',
    price_min: 25,
    price_max: 45,
    latitude: 40.7128,
    longitude: -74.0060,
    website_url: 'https://bluenotejazz.com/events/123',
    source: 'eventbrite',
    external_id: 'eb-456',
    tags: ['jazz', 'live music'],
    status: 'active',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z'
  } as Event,

  nearDuplicate: {
    id: 'event-3',
    title: 'Live Jazz at Blue Note Club',
    description: 'Incredible jazz show with amazing local musicians',
    venue_name: 'Blue Note',
    city_name: 'New York',
    start_time: '2024-01-15T20:00:00Z',
    category: 'music',
    price_min: 30,
    price_max: 50,
    latitude: 40.7129,
    longitude: -74.0061,
    source: 'ticketmaster',
    external_id: 'tm-789',
    tags: ['jazz', 'music'],
    status: 'active',
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z'
  } as Event,

  different: {
    id: 'event-4',
    title: 'Rock Concert at Madison Square Garden',
    description: 'Epic rock show with international headliners',
    venue_name: 'Madison Square Garden',
    city_name: 'New York',
    start_time: '2024-01-20T19:00:00Z',
    category: 'music',
    price_min: 75,
    price_max: 150,
    latitude: 40.7505,
    longitude: -73.9934,
    source: 'primary',
    external_id: 'msg-999',
    tags: ['rock', 'concert'],
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  } as Event,

  enhancedDuplicate: {
    id: 'event-5',
    title: 'Jazz Concert at Blue Note',
    description: 'Amazing jazz performance featuring local artists with special guest appearances',
    venue_name: 'Blue Note Jazz Club',
    city_name: 'New York',
    start_time: '2024-01-15T20:00:00Z',
    end_time: '2024-01-15T23:30:00Z',
    category: 'music',
    subcategory: 'jazz',
    price_min: 25,
    price_max: 45,
    price_currency: 'USD',
    latitude: 40.7128,
    longitude: -74.0060,
    website_url: 'https://bluenotejazz.com/events/123',
    ticket_url: 'https://tickets.bluenotejazz.com/123',
    image_url: 'https://images.bluenotejazz.com/concert-hd.jpg',
    video_url: 'https://videos.bluenotejazz.com/preview.mp4',
    source: 'manual',
    external_id: 'manual-123',
    tags: ['jazz', 'live music', 'evening', 'special guests'],
    is_featured: true,
    is_free: false,
    status: 'active',
    view_count: 150,
    hotness_score: 0.85,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-04T00:00:00Z'
  } as Event
}

describe('Intelligent Deduplication System', () => {
  let system: IntelligentDeduplicationSystem

  beforeEach(async () => {
    system = createDeduplicationSystem({
      thresholds: {
        title: 0.8,
        venue: 0.7,
        location: 0.7,
        date: 0.9,
        semantic: 0.7,
        overall: 0.75
      },
      performance: {
        batchSize: 10,
        maxCandidates: 20,
        enableCaching: true,
        parallelProcessing: false // Disable for tests
      }
    })
    await system.initialize()
  })

  afterEach(() => {
    system.cleanup()
  })

  describe('Duplicate Detection', () => {
    it('should detect exact duplicates', async () => {
      const result = await system.checkForDuplicates(
        mockEvents.original,
        [mockEvents.exactDuplicate, mockEvents.different]
      )

      expect(result.isDuplicate).toBe(true)
      expect(result.matches).toHaveLength(1)
      expect(result.matches[0].eventId).toBe(mockEvents.exactDuplicate.id)
      expect(result.confidence).toBeGreaterThan(0.8)
    })

    it('should detect near duplicates', async () => {
      const result = await system.checkForDuplicates(
        mockEvents.original,
        [mockEvents.nearDuplicate, mockEvents.different]
      )

      expect(result.isDuplicate).toBe(true)
      expect(result.matches).toHaveLength(1)
      expect(result.matches[0].eventId).toBe(mockEvents.nearDuplicate.id)
      expect(result.confidence).toBeGreaterThan(0.7)
    })

    it('should not detect false positives', async () => {
      const result = await system.checkForDuplicates(
        mockEvents.original,
        [mockEvents.different]
      )

      expect(result.isDuplicate).toBe(false)
      expect(result.matches).toHaveLength(0)
    })

    it('should provide detailed match reasons', async () => {
      const result = await system.checkForDuplicates(
        mockEvents.original,
        [mockEvents.exactDuplicate]
      )

      expect(result.matches[0].reasons).toContain(expect.stringMatching(/title similarity/i))
      expect(result.matches[0].reasons).toContain(expect.stringMatching(/same.*venue/i))
      expect(result.matches[0].reasons).toContain(expect.stringMatching(/same.*date/i))
    })
  })

  describe('Event Merging', () => {
    it('should create merge decisions', () => {
      const decision = system.createMergeDecision(
        mockEvents.original,
        [mockEvents.enhancedDuplicate],
        'enhance_primary'
      )

      expect(decision.primaryEventId).toBe(mockEvents.original.id)
      expect(decision.duplicateEventIds).toContain(mockEvents.enhancedDuplicate.id)
      expect(decision.fieldResolutions).toHaveLength(expect.any(Number))
      expect(decision.confidence).toBeGreaterThan(0)
    })

    it('should execute merge with enhanced data', async () => {
      const decision = system.createMergeDecision(
        mockEvents.original,
        [mockEvents.enhancedDuplicate],
        'enhance_primary'
      )

      const result = await system.executeMerge(decision, 'test-user')

      expect(result.success).toBe(true)
      expect(result.mergedEvent).toBeDefined()
      expect(result.historyId).toBeDefined()
      
      // Should preserve original ID
      expect(result.mergedEvent.id).toBe(mockEvents.original.id)
      
      // Should enhance with better data
      expect(result.mergedEvent.description?.length).toBeGreaterThan(
        mockEvents.original.description?.length || 0
      )
    })

    it('should handle merge validation errors', async () => {
      const invalidDecision = system.createMergeDecision(
        { ...mockEvents.original, title: '' }, // Invalid: empty title
        [mockEvents.enhancedDuplicate],
        'enhance_primary'
      )

      const result = await system.executeMerge(invalidDecision)

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(expect.any(Number))
    })
  })

  describe('Conflict Resolution', () => {
    it('should resolve field conflicts intelligently', () => {
      const events = [mockEvents.original, mockEvents.enhancedDuplicate]
      const resolvedValues = system.resolveConflicts(events, [
        'title', 'description', 'end_time', 'video_url', 'tags'
      ])

      expect(resolvedValues.get('title')).toBe(mockEvents.original.title)
      expect(resolvedValues.get('description')).toBe(mockEvents.enhancedDuplicate.description) // More complete
      expect(resolvedValues.get('video_url')).toBe(mockEvents.enhancedDuplicate.video_url) // Only in enhanced
      expect(Array.isArray(resolvedValues.get('tags'))).toBe(true)
    })

    it('should prefer primary source for critical fields', () => {
      const events = [mockEvents.original, mockEvents.nearDuplicate]
      const resolvedValues = system.resolveConflicts(events, ['title', 'start_time'])

      expect(resolvedValues.get('title')).toBe(mockEvents.original.title)
      expect(resolvedValues.get('start_time')).toBe(mockEvents.original.start_time)
    })
  })

  describe('Performance and Optimization', () => {
    it('should process multiple events efficiently', async () => {
      const events = [
        mockEvents.original,
        mockEvents.exactDuplicate,
        mockEvents.nearDuplicate,
        mockEvents.different,
        mockEvents.enhancedDuplicate
      ]

      const startTime = Date.now()
      const result = await system.processEvents(events, 'batch')
      const processingTime = Date.now() - startTime

      expect(result.processedCount).toBe(events.length)
      expect(result.duplicatesFound).toBeGreaterThan(0)
      expect(processingTime).toBeLessThan(5000) // Should complete in under 5 seconds
      expect(result.performance).toBeDefined()
    })

    it('should cache fingerprints for performance', async () => {
      // First processing - should cache fingerprints
      await system.checkForDuplicates(mockEvents.original, [mockEvents.exactDuplicate])
      
      // Second processing - should use cache
      const startTime = Date.now()
      await system.checkForDuplicates(mockEvents.original, [mockEvents.exactDuplicate])
      const processingTime = Date.now() - startTime

      expect(processingTime).toBeLessThan(100) // Should be very fast with cache
    })

    it('should provide performance metrics', () => {
      const metrics = system.getPerformanceMetrics()

      expect(metrics.fuzzyMatcher).toBeDefined()
      expect(metrics.conflictResolver).toBeDefined()
      expect(metrics.performanceOptimizer).toBeDefined()
      expect(metrics.historyTracker).toBeDefined()
    })
  })

  describe('History and Audit Trail', () => {
    it('should track merge history', async () => {
      const decision = system.createMergeDecision(
        mockEvents.original,
        [mockEvents.exactDuplicate],
        'enhance_primary'
      )

      const result = await system.executeMerge(decision, 'test-user')
      expect(result.success).toBe(true)

      const history = system.getEventHistory(mockEvents.original.id)
      expect(history).toHaveLength(1)
      expect(history[0].primaryEventId).toBe(mockEvents.original.id)
      expect(history[0].mergedBy).toBe('test-user')
    })

    it('should generate comprehensive reports', async () => {
      // Perform some merges
      const decision1 = system.createMergeDecision(
        mockEvents.original,
        [mockEvents.exactDuplicate],
        'enhance_primary'
      )
      await system.executeMerge(decision1, 'test-user')

      const decision2 = system.createMergeDecision(
        mockEvents.different,
        [mockEvents.nearDuplicate],
        'quality_based'
      )
      await system.executeMerge(decision2, 'test-user')

      const report = await system.generateReport()

      expect(report.summary).toBeDefined()
      expect(report.performance).toBeDefined()
      expect(report.quality).toBeDefined()
      expect(report.recommendations).toBeInstanceOf(Array)
      expect(report.summary.totalMerges).toBe(2)
    })
  })

  describe('Configuration and Customization', () => {
    it('should allow configuration updates', () => {
      const newConfig = {
        thresholds: {
          overall: 0.9
        },
        weights: {
          title: 0.5
        }
      }

      system.updateConfiguration(newConfig)
      const config = system.getConfiguration()

      expect(config.thresholds.overall).toBe(0.9)
      expect(config.weights.title).toBe(0.5)
    })

    it('should provide health check', () => {
      const health = system.healthCheck()

      expect(health.status).toMatch(/healthy|warning|error/)
      expect(health.components).toBeDefined()
      expect(health.recommendations).toBeInstanceOf(Array)
    })
  })

  describe('Data Import/Export', () => {
    it('should export system data', () => {
      const exported = system.exportData('json')

      expect(exported.mergeHistory).toBeDefined()
      expect(exported.configuration).toBeDefined()
      expect(exported.performance).toBeDefined()
    })

    it('should import system data', () => {
      const config = JSON.stringify({
        thresholds: { overall: 0.85 }
      })

      const result = system.importData({ configuration: config })

      expect(result.imported.configuration).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(system.getConfiguration().thresholds.overall).toBe(0.85)
    })
  })
})

describe('Fuzzy Matcher', () => {
  let matcher: FuzzyMatcher

  beforeEach(() => {
    matcher = new FuzzyMatcher()
  })

  describe('String Similarity', () => {
    it('should calculate accurate string similarities', () => {
      const fp1 = matcher.generateFingerprint(mockEvents.original)
      const fp2 = matcher.generateFingerprint(mockEvents.nearDuplicate)

      const similarity = matcher.calculateSimilarity(fp1, fp2)

      expect(similarity.title).toBeGreaterThan(0.7)
      expect(similarity.venue).toBeGreaterThan(0.6)
      expect(similarity.date).toBe(1) // Same date
      expect(similarity.location).toBeGreaterThan(0.8)
      expect(similarity.overall).toBeGreaterThan(0.7)
    })

    it('should handle edge cases gracefully', () => {
      const emptyEvent = { id: 'empty', title: '', category: 'other' } as Event
      const fp1 = matcher.generateFingerprint(emptyEvent)
      const fp2 = matcher.generateFingerprint(mockEvents.original)

      const similarity = matcher.calculateSimilarity(fp1, fp2)

      expect(similarity.title).toBe(0)
      expect(similarity.overall).toBeLessThan(0.3)
    })
  })

  describe('Location Matching', () => {
    it('should match nearby coordinates', () => {
      const event1 = { ...mockEvents.original, latitude: 40.7128, longitude: -74.0060 }
      const event2 = { ...mockEvents.original, latitude: 40.7129, longitude: -74.0061 }

      const fp1 = matcher.generateFingerprint(event1)
      const fp2 = matcher.generateFingerprint(event2)

      const similarity = matcher.calculateSimilarity(fp1, fp2)

      expect(similarity.location).toBeGreaterThan(0.8) // Very close coordinates
    })

    it('should match similar venue names', () => {
      const event1 = { ...mockEvents.original, venue_name: 'Blue Note Jazz Club' }
      const event2 = { ...mockEvents.original, venue_name: 'Blue Note' }

      const fp1 = matcher.generateFingerprint(event1)
      const fp2 = matcher.generateFingerprint(event2)

      const similarity = matcher.calculateSimilarity(fp1, fp2)

      expect(similarity.venue).toBeGreaterThan(0.7)
    })
  })

  describe('Configuration', () => {
    it('should allow threshold customization', () => {
      matcher.updateConfig({
        thresholds: { title: 0.9 },
        weights: { title: 0.5 }
      })

      const config = matcher.getConfig()
      expect(config.thresholds.title).toBe(0.9)
      expect(config.weights.title).toBe(0.5)
    })

    it('should clear cache when requested', () => {
      // Generate some cache entries
      const fp1 = matcher.generateFingerprint(mockEvents.original)
      const fp2 = matcher.generateFingerprint(mockEvents.exactDuplicate)
      matcher.calculateSimilarity(fp1, fp2)

      matcher.clearCache()
      const stats = matcher.getCacheStats()
      expect(stats.similarityCache.size).toBe(0)
    })
  })
})

describe('Utility Functions', () => {
  describe('quickDuplicateCheck', () => {
    it('should provide quick duplicate detection', async () => {
      const result = await quickDuplicateCheck(
        mockEvents.original,
        [mockEvents.exactDuplicate, mockEvents.different],
        0.8
      )

      expect(result.isDuplicate).toBe(true)
      expect(result.matches).toHaveLength(1)
    })
  })

  describe('batchProcessEvents', () => {
    it('should process events in batch mode', async () => {
      const events = [
        mockEvents.original,
        mockEvents.exactDuplicate,
        mockEvents.different
      ]

      const result = await batchProcessEvents(events, 'batch')

      expect(result.processedCount).toBe(events.length)
      expect(result.performance).toBeDefined()
    })
  })
})

describe('Error Handling', () => {
  let system: IntelligentDeduplicationSystem

  beforeEach(async () => {
    system = createDeduplicationSystem()
    await system.initialize()
  })

  afterEach(() => {
    system.cleanup()
  })

  it('should handle malformed events gracefully', async () => {
    const malformedEvent = {
      id: 'malformed',
      title: null,
      start_time: 'invalid-date'
    } as any

    const result = await system.checkForDuplicates(
      malformedEvent,
      [mockEvents.original]
    )

    expect(result.isDuplicate).toBe(false)
    expect(result.matches).toHaveLength(0)
  })

  it('should handle empty candidate lists', async () => {
    const result = await system.checkForDuplicates(mockEvents.original, [])

    expect(result.isDuplicate).toBe(false)
    expect(result.matches).toHaveLength(0)
  })

  it('should handle processing errors gracefully', async () => {
    const events = [
      mockEvents.original,
      { id: 'invalid' } as any // Malformed event
    ]

    const result = await system.processEvents(events, 'batch')

    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.processedCount).toBeGreaterThanOrEqual(1)
  })
})

describe('Integration Tests', () => {
  it('should handle complex real-world scenario', async () => {
    const system = createDeduplicationSystem({
      thresholds: { overall: 0.75 },
      performance: { batchSize: 5 }
    })
    await system.initialize()

    // Simulate events from multiple sources
    const events = [
      mockEvents.original,        // Primary source
      mockEvents.exactDuplicate,  // From Eventbrite
      mockEvents.nearDuplicate,   // From Ticketmaster
      mockEvents.enhancedDuplicate, // Manual entry
      mockEvents.different,       // Different event
      {
        ...mockEvents.original,
        id: 'event-6',
        title: 'Jazz Night at Blue Note',
        source: 'facebook',
        external_id: 'fb-123',
        description: 'Great jazz evening'
      } as Event
    ]

    // Process all events
    const batchResult = await system.processEvents(events, 'batch')
    expect(batchResult.duplicatesFound).toBeGreaterThan(0)

    // Create merge decisions for detected duplicates
    const duplicateGroups = [
      {
        primary: mockEvents.original,
        duplicates: [mockEvents.exactDuplicate, mockEvents.nearDuplicate]
      }
    ]

    for (const group of duplicateGroups) {
      const decision = system.createMergeDecision(
        group.primary,
        group.duplicates,
        'enhance_primary'
      )

      const mergeResult = await system.executeMerge(decision, 'integration-test')
      expect(mergeResult.success).toBe(true)
    }

    // Generate comprehensive report
    const report = await system.generateReport()
    expect(report.summary.totalMerges).toBeGreaterThan(0)
    expect(report.recommendations).toBeInstanceOf(Array)

    // Verify system health
    const health = system.healthCheck()
    expect(['healthy', 'warning']).toContain(health.status)

    system.cleanup()
  })
})
