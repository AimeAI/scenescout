// Example usage of the SceneScout Data Processing Pipeline

import { 
  DataProcessor, 
  createDataProcessor,
  createPipelineComponents 
} from './index';

// Example 1: Basic event processing
export async function basicEventProcessing() {
  // Create processor with default settings
  const processor = createDataProcessor();

  // Sample raw event data (as might come from a scraper)
  const rawEvent = {
    title: 'Live Jazz Night at Blue Note',
    description: 'Join us for an evening of smooth jazz featuring local artists. Doors open at 7 PM, show starts at 8 PM. Food and drinks available.',
    startDate: '2024-12-25T20:00:00',
    venue: 'Blue Note Jazz Club',
    address: '131 W 3rd St, New York, NY 10012',
    price: 35,
    website: 'https://bluenotejazz.com',
    images: [
      'https://example.com/jazz-night-1.jpg',
      'https://example.com/jazz-night-2.jpg'
    ],
    tags: ['jazz', 'music', 'live', 'nightlife'],
    sourceUrl: 'https://eventsite.com/jazz-night',
    externalId: 'jazz-2024-12-25'
  };

  try {
    const result = await processor.processEvent(rawEvent, {}, 'example-scraper');
    
    console.log('Processing Result:');
    console.log('- Success:', result.success);
    console.log('- Quality Score:', Math.round((result.event.qualityScore || 0) * 100));
    console.log('- Quality Tier:', result.event.qualityTier);
    console.log('- Categories:', result.event.categories);
    console.log('- Coordinates:', result.event.coordinates);
    console.log('- Processing Time:', result.processingTime, 'ms');
    
    if (result.warnings.length > 0) {
      console.log('Warnings:', result.warnings);
    }
    
    if (result.errors.length > 0) {
      console.log('Errors:', result.errors);
    }
    
    return result;
  } catch (error) {
    console.error('Processing failed:', error);
    throw error;
  }
}

// Example 2: Batch processing with custom options
export async function batchEventProcessing() {
  const processor = createDataProcessor({
    batchSize: 5,
    maxConcurrent: 3,
    saveToDatabase: false, // Skip database for this example
    
    // Custom component options
    cleaning: {
      removeHtml: true,
      validateEmail: true,
      maxTitleLength: 150
    },
    
    geocoding: {
      cacheEnabled: true,
      cacheTTL: 720, // 12 hours
      fallbackToApproximateLocation: true
    },
    
    classification: {
      maxCategories: 2,
      maxTags: 6,
      includeReasoning: true,
      fallbackToRuleBased: true
    },
    
    scoring: {
      includeBreakdown: true,
      includeRecommendations: true
    }
  });

  // Sample batch of events
  const rawEvents = [
    {
      title: 'Art Gallery Opening',
      description: 'Contemporary art exhibition featuring local artists',
      startDate: '2024-12-20T18:00:00',
      venue: 'Modern Art Gallery',
      address: '123 Art Street, Brooklyn, NY',
      price: 0,
      priceText: 'Free admission'
    },
    {
      title: 'Food Truck Festival',
      description: 'Over 20 food trucks serving diverse cuisines',
      startDate: '2024-12-22T11:00:00',
      endDate: '2024-12-22T21:00:00',
      venue: 'Central Park',
      address: 'Central Park, New York, NY',
      price: 5,
      website: 'https://foodtruckfest.com'
    },
    {
      title: 'Tech Startup Pitch Night',
      description: 'Local entrepreneurs present their innovative ideas',
      startDate: '2024-12-28T19:30:00',
      venue: 'Innovation Hub',
      address: '456 Tech Ave, Manhattan, NY',
      price: 15,
      email: 'contact@innovationhub.com'
    }
  ];

  try {
    const batchResult = await processor.batchProcess(rawEvents, {
      sourceReputation: 0.8,
      locationPopularity: 0.9
    }, 'batch-example');

    console.log('Batch Processing Summary:');
    console.log('- Total Events:', batchResult.summary.total);
    console.log('- Successful:', batchResult.summary.successful);
    console.log('- Failed:', batchResult.summary.failed);
    console.log('- Average Quality Score:', Math.round(batchResult.summary.averageQualityScore * 100));
    console.log('- Total Processing Time:', batchResult.summary.processingTime, 'ms');

    // Show individual results
    batchResult.results.forEach((result, index) => {
      console.log(`\nEvent ${index + 1}: ${result.event.title}`);
      console.log('- Quality Score:', Math.round((result.event.qualityScore || 0) * 100));
      console.log('- Categories:', result.event.categories);
      console.log('- Success:', result.success);
    });

    return batchResult;
  } catch (error) {
    console.error('Batch processing failed:', error);
    throw error;
  }
}

// Example 3: Using individual components
export async function individualComponentsExample() {
  const components = createPipelineComponents({
    cleaning: { removeHtml: true },
    normalization: { defaultTimezone: 'America/New_York' },
    geocoding: { cacheEnabled: true },
    classification: { maxCategories: 3 },
    scoring: { includeBreakdown: true }
  });

  const rawEvent = {
    title: '<h1>Comedy Show Tonight!</h1>',
    description: 'Hilarious stand-up comedy with featured comedians',
    startDate: '12/25/2024 8:00 PM',
    venue: 'Comedy Club NYC',
    address: '789 Laugh Lane, New York',
    price: '$25.00',
    images: ['https://example.com/comedy.jpg']
  };

  console.log('Processing with individual components:');

  // Step 1: Clean the data
  const cleanResult = await components.dataCleaner.clean(rawEvent);
  console.log('1. Cleaning - Valid:', cleanResult.isValid);
  console.log('   Title cleaned:', cleanResult.data.title);

  if (!cleanResult.isValid) {
    console.log('   Errors:', cleanResult.errors);
    return;
  }

  // Step 2: Normalize the data
  const normalizeResult = await components.eventNormalizer.normalize(cleanResult.data);
  console.log('2. Normalization - Confidence:', normalizeResult.confidence);
  console.log('   Normalized start date:', normalizeResult.event.normalizedStartDate);
  console.log('   Normalized price:', normalizeResult.event.normalizedPrice);

  // Step 3: Geocode the address
  if (normalizeResult.event.address) {
    const geocodeResult = await components.geocodingService.geocode(normalizeResult.event.address);
    console.log('3. Geocoding - Confidence:', geocodeResult.confidence);
    console.log('   Coordinates:', geocodeResult.coordinates);
    console.log('   Formatted address:', geocodeResult.formattedAddress);
  }

  // Step 4: Classify the event
  const classifyResult = await components.categoryClassifier.classify({
    title: normalizeResult.event.title || '',
    description: normalizeResult.event.description,
    venue: normalizeResult.event.venue
  });
  console.log('4. Classification - AI Generated:', classifyResult.aiGenerated);
  console.log('   Categories:', classifyResult.categories);
  console.log('   Tags:', classifyResult.tags);
  console.log('   Confidence:', classifyResult.confidence);

  // Step 5: Score the quality
  const qualityScore = await components.qualityScorer.scoreEvent(normalizeResult.event);
  console.log('5. Quality Scoring - Overall:', Math.round(qualityScore.overall * 100));
  console.log('   Tier:', qualityScore.tier);
  console.log('   Recommendations:', qualityScore.recommendations);

  return {
    cleaned: cleanResult,
    normalized: normalizeResult,
    classified: classifyResult,
    scored: qualityScore
  };
}

// Example 4: Custom processing pipeline
export async function customProcessingPipeline() {
  const processor = createDataProcessor({
    // Skip expensive operations for fast processing
    skipSteps: ['imageProcessing'],
    
    // Handle errors gracefully
    failOnError: false,
    
    // Custom weights for quality scoring
    scoring: {
      weights: {
        completeness: 0.3,  // Increased importance
        accuracy: 0.25,     // Increased importance
        relevance: 0.2,
        freshness: 0.1,     // Decreased importance
        engagement: 0.1,
        trustworthiness: 0.05 // Decreased importance
      }
    }
  });

  const musicEvent = {
    title: 'Underground Hip-Hop Show',
    description: 'Raw, authentic hip-hop in an intimate venue. 21+ only.',
    startDate: '2024-12-30T22:00:00',
    venue: 'The Underground',
    address: 'Brooklyn, NY',
    price: 20,
    tags: ['hip-hop', 'underground', 'music']
  };

  const result = await processor.processEvent(musicEvent, {
    categoryCompetition: 0.7, // High competition in music category
    locationPopularity: 0.6,  // Moderate location popularity
    seasonalRelevance: 0.8,   // High seasonal relevance (New Year's Eve weekend)
    userInterest: 0.9         // High user interest in hip-hop
  }, 'custom-scraper');

  console.log('Custom Processing Result:');
  console.log('- Final Quality Score:', Math.round((result.event.qualityScore || 0) * 100));
  console.log('- Quality Breakdown:');
  
  if (result.stepResults.scoring?.breakdown) {
    Object.entries(result.stepResults.scoring.breakdown).forEach(([metric, data]) => {
      console.log(`  ${metric}: ${Math.round(data.score * 100)} (weight: ${data.weight})`);
    });
  }

  return result;
}

// Example 5: Error handling and validation
export async function errorHandlingExample() {
  const processor = createDataProcessor({
    failOnError: false, // Continue processing despite errors
    retryAttempts: 1
  });

  // Intentionally problematic data
  const problematicEvents = [
    {
      title: '', // Missing title
      description: 'Event with missing title',
      startDate: 'invalid-date', // Invalid date
      venue: 'Test Venue'
    },
    {
      title: 'Event with bad images',
      description: 'This event has invalid image URLs',
      startDate: '2024-12-25T19:00:00',
      images: ['not-a-url', 'https://invalid-domain-12345.com/image.jpg'],
      website: 'not-a-website'
    },
    {
      title: 'Valid Event',
      description: 'This is a properly formatted event',
      startDate: '2024-12-25T20:00:00',
      venue: 'Good Venue',
      address: '123 Main St, New York, NY'
    }
  ];

  console.log('Testing error handling with problematic data:');

  const batchResult = await processor.batchProcess(problematicEvents, {}, 'error-test');

  console.log('\nResults Summary:');
  console.log('- Total:', batchResult.summary.total);
  console.log('- Successful:', batchResult.summary.successful);
  console.log('- Failed:', batchResult.summary.failed);

  batchResult.results.forEach((result, index) => {
    console.log(`\nEvent ${index + 1}:`);
    console.log('- Success:', result.success);
    console.log('- Quality Score:', Math.round((result.event.qualityScore || 0) * 100));
    
    if (result.errors.length > 0) {
      console.log('- Errors:', result.errors);
    }
    
    if (result.warnings.length > 0) {
      console.log('- Warnings:', result.warnings);
    }
  });

  return batchResult;
}

// Example 6: Performance monitoring
export async function performanceMonitoringExample() {
  const processor = createDataProcessor();

  // Generate test events
  const testEvents = Array.from({ length: 20 }, (_, i) => ({
    title: `Test Event ${i + 1}`,
    description: `This is test event number ${i + 1} for performance testing`,
    startDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
    venue: `Venue ${i + 1}`,
    address: `${100 + i} Test Street, New York, NY`,
    price: 10 + i,
    tags: ['test', 'performance', 'monitoring']
  }));

  console.log('Performance monitoring test:');
  const startTime = Date.now();

  const result = await processor.batchProcess(testEvents, {}, 'performance-test');

  const totalTime = Date.now() - startTime;
  const avgTimePerEvent = totalTime / testEvents.length;

  console.log('\nPerformance Metrics:');
  console.log('- Total Events:', testEvents.length);
  console.log('- Total Processing Time:', totalTime, 'ms');
  console.log('- Average Time per Event:', Math.round(avgTimePerEvent), 'ms');
  console.log('- Success Rate:', Math.round((result.summary.successful / result.summary.total) * 100), '%');
  console.log('- Average Quality Score:', Math.round(result.summary.averageQualityScore * 100));

  // Show component stats
  const stats = processor.getProcessingStats();
  console.log('\nProcessor Configuration:');
  console.log('- Version:', stats.version);
  console.log('- Batch Size:', stats.options.batchSize);
  console.log('- Max Concurrent:', stats.options.maxConcurrent);

  return {
    result,
    metrics: {
      totalTime,
      avgTimePerEvent,
      successRate: result.summary.successful / result.summary.total
    }
  };
}

// Helper function to run all examples
export async function runAllExamples() {
  console.log('=== SceneScout Data Processing Pipeline Examples ===\n');

  try {
    console.log('1. Basic Event Processing:');
    await basicEventProcessing();
    console.log('\n' + '='.repeat(50) + '\n');

    console.log('2. Batch Event Processing:');
    await batchEventProcessing();
    console.log('\n' + '='.repeat(50) + '\n');

    console.log('3. Individual Components:');
    await individualComponentsExample();
    console.log('\n' + '='.repeat(50) + '\n');

    console.log('4. Custom Processing Pipeline:');
    await customProcessingPipeline();
    console.log('\n' + '='.repeat(50) + '\n');

    console.log('5. Error Handling:');
    await errorHandlingExample();
    console.log('\n' + '='.repeat(50) + '\n');

    console.log('6. Performance Monitoring:');
    await performanceMonitoringExample();

    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('❌ Example execution failed:', error);
  }
}

// Export for testing
export const examples = {
  basicEventProcessing,
  batchEventProcessing,
  individualComponentsExample,
  customProcessingPipeline,
  errorHandlingExample,
  performanceMonitoringExample,
  runAllExamples
};