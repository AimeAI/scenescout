/**
 * Usage examples for the venue scraping system
 */

import {
  VenueScraper,
  scrapeVenue,
  scrapeAllVenues,
  scrapeByCity,
  scrapeByType,
  configManager,
  addNewVenue,
  createVenueTemplate,
  createLocationTemplate,
  VenueConfiguration
} from '../config/index';

/**
 * Example 1: Basic venue scraping
 */
export async function basicScrapingExample() {
  console.log('Example 1: Basic venue scraping');
  
  // Scrape a specific venue
  const fillmoreResult = await scrapeVenue('fillmore');
  console.log(`Fillmore events found: ${fillmoreResult.events.length}`);
  
  // Scrape all venues in a city
  const sfResults = await scrapeByCity('San Francisco', 'CA');
  console.log(`San Francisco venues scraped: ${sfResults.size}`);
  
  // Scrape venues by type
  const concertHalls = await scrapeByType('concert_hall');
  console.log(`Concert halls scraped: ${concertHalls.size}`);
}

/**
 * Example 2: Advanced scraper usage with custom configuration
 */
export async function advancedScrapingExample() {
  console.log('Example 2: Advanced scraper usage');
  
  const scraper = new VenueScraper();
  
  try {
    // Scrape all venues with custom options
    const results = await scraper.scrapeAllVenues({
      maxConcurrent: 2, // Limit concurrent requests
      includeDisabled: false
    });
    
    // Analyze results
    for (const [venueId, result] of results) {
      console.log(`\nVenue: ${venueId}`);
      console.log(`Success: ${result.success}`);
      console.log(`Events found: ${result.events.length}`);
      console.log(`Data quality: ${result.metadata.dataQuality}%`);
      console.log(`Processing time: ${result.metadata.processingTime}ms`);
      
      if (result.errors.length > 0) {
        console.log('Errors:');
        result.errors.forEach(error => {
          console.log(`  - ${error.type}: ${error.message}`);
        });
      }
      
      if (result.metadata.fallbacksUsed.length > 0) {
        console.log(`Fallbacks used: ${result.metadata.fallbacksUsed.join(', ')}`);
      }
    }
    
  } finally {
    await scraper.cleanup();
  }
}

/**
 * Example 3: Adding a new venue configuration
 */
export async function addVenueExample() {
  console.log('Example 3: Adding a new venue');
  
  // Create a new venue configuration
  const newVenue = createVenueTemplate(
    'blue-note',
    'Blue Note',
    'club',
    'https://www.bluenotejazz.com'
  );
  
  // Add locations
  const nycLocation = createLocationTemplate(
    'blue-note-nyc',
    'New York',
    'NY',
    'US',
    'https://www.bluenotejazz.com/nyc'
  );
  
  newVenue.locations.push(nycLocation);
  
  // Customize selectors for this venue
  newVenue.scrapeConfig.eventSelectors = {
    title: ['.show-title', '.event-name'],
    date: ['.show-date', '.event-date'],
    time: ['.show-time', '.doors-time'],
    price: ['.ticket-price', '.admission'],
    ticketUrl: ['.buy-tickets', 'a[href*="ticket"]'],
    image: ['.show-image img'],
    performers: ['.artist-name', '.musician']
  };
  
  // Add fallback configurations
  newVenue.fallbacks = [
    {
      id: 'alternative-container',
      description: 'Try alternative container selectors',
      triggers: [
        {
          type: 'selector_missing',
          condition: '.events'
        }
      ],
      action: {
        type: 'alternative_selectors',
        config: {
          container: ['.shows', '.calendar', '.upcoming-events']
        }
      }
    }
  ];
  
  // Save the configuration
  try {
    await addNewVenue(newVenue);
    console.log('Venue added successfully!');
    
    // Test the new venue
    const result = await scrapeVenue('blue-note');
    console.log(`Blue Note scraping result: ${result.success}`);
    
  } catch (error) {
    console.error('Failed to add venue:', error);
  }
}

/**
 * Example 4: Configuration management
 */
export async function configManagementExample() {
  console.log('Example 4: Configuration management');
  
  // Get configuration statistics
  const stats = await configManager.getStats();
  console.log('Configuration statistics:', stats);
  
  // Load all venue configurations
  const allConfigs = await configManager.loadVenueConfigs();
  console.log(`Total configurations loaded: ${allConfigs.length}`);
  
  // Export configurations to a backup file
  await configManager.exportConfigs('./config-backup.json');
  console.log('Configurations exported to backup file');
  
  // Update an existing venue
  await configManager.updateVenueConfig('fillmore', {
    priority: 1,
    enabled: true
  });
  console.log('Fillmore configuration updated');
}

/**
 * Example 5: Creating a custom venue with complex selectors
 */
export async function complexVenueExample() {
  console.log('Example 5: Complex venue configuration');
  
  const customVenue: VenueConfiguration = {
    id: 'custom-venue',
    name: 'Custom Venue',
    type: 'theater',
    baseUrl: 'https://example-venue.com',
    enabled: true,
    priority: 3,
    locations: [
      {
        id: 'custom-main',
        city: 'San Francisco',
        state: 'CA',
        country: 'US',
        url: 'https://example-venue.com/events',
        customConfig: {
          // Location-specific overrides
          javascript: true,
          headers: {
            'Accept': 'application/json'
          }
        }
      }
    ],
    scrapeConfig: {
      listingSelectors: {
        container: '.events-grid',
        eventItem: '.event-card',
        nextPage: '.pagination .next',
        hasMoreEvents: '.load-more[data-has-more="true"]'
      },
      eventSelectors: {
        title: ['.event-title h2', '.title'],
        date: ['.event-date', '[data-event-date]'],
        time: ['.event-time', '[data-event-time]'],
        description: ['.event-description', '.summary'],
        price: ['.price-range', '.ticket-price', '.cost'],
        ticketUrl: ['.ticket-link a', 'a[href*="tickets"]'],
        image: ['.event-poster img', '.event-image img'],
        performers: ['.performers .name', '.artists'],
        category: ['.event-category', '.genre'],
        status: ['.event-status', '.availability']
      },
      pagination: {
        type: 'button',
        selector: '.pagination .next',
        maxPages: 10
      },
      filters: {
        dateRange: {
          startParam: 'start_date',
          endParam: 'end_date',
          format: 'YYYY-MM-DD'
        },
        category: {
          param: 'category',
          values: {
            'music': 'music',
            'theater': 'theater',
            'comedy': 'comedy'
          }
        }
      },
      rateLimit: {
        requestsPerMinute: 20,
        delayBetweenRequests: 3000,
        respectRobotsTxt: true
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SceneScout/1.0)',
        'Accept': 'text/html,application/json'
      },
      javascript: true,
      proxy: {
        enabled: false,
        rotation: false
      }
    },
    fallbacks: [
      {
        id: 'alternative-selectors',
        description: 'Use backup selectors if primary ones fail',
        triggers: [
          {
            type: 'selector_missing',
            condition: '.events-grid'
          }
        ],
        action: {
          type: 'alternative_selectors',
          config: {
            container: ['.event-list', '.shows', '.calendar']
          }
        }
      },
      {
        id: 'rate-limit-handler',
        description: 'Handle rate limiting gracefully',
        triggers: [
          {
            type: 'rate_limited',
            condition: '429'
          }
        ],
        action: {
          type: 'wait_and_retry',
          config: {
            delay: 60000,
            maxRetries: 3
          }
        }
      },
      {
        id: 'blocked-fallback',
        description: 'Try alternative URL if blocked',
        triggers: [
          {
            type: 'blocked',
            condition: '403'
          }
        ],
        action: {
          type: 'different_url',
          config: {
            url: 'https://example-venue.com/calendar'
          }
        }
      }
    ]
  };
  
  // Save and test the custom venue
  try {
    await addNewVenue(customVenue);
    console.log('Custom venue configuration saved');
    
    const result = await scrapeVenue('custom-venue');
    console.log(`Custom venue scraping result:`, {
      success: result.success,
      eventsFound: result.events.length,
      dataQuality: result.metadata.dataQuality,
      processingTime: result.metadata.processingTime
    });
    
  } catch (error) {
    console.error('Failed to configure custom venue:', error);
  }
}

/**
 * Example 6: Event data analysis
 */
export async function eventAnalysisExample() {
  console.log('Example 6: Event data analysis');
  
  const results = await scrapeAllVenues();
  
  // Aggregate all events
  const allEvents = Array.from(results.values())
    .flatMap(result => result.events);
  
  console.log(`Total events found: ${allEvents.length}`);
  
  // Analyze by venue type
  const eventsByVenueType = allEvents.reduce((acc, event) => {
    const type = event.venue.type;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('Events by venue type:', eventsByVenueType);
  
  // Analyze by category
  const eventsByCategory = allEvents.reduce((acc, event) => {
    event.categories.forEach(category => {
      acc[category] = (acc[category] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);
  
  console.log('Events by category:', eventsByCategory);
  
  // Find events with pricing information
  const eventsWithPricing = allEvents.filter(event => event.priceRange);
  console.log(`Events with pricing: ${eventsWithPricing.length}`);
  
  // Calculate average price range
  if (eventsWithPricing.length > 0) {
    const avgMinPrice = eventsWithPricing.reduce((sum, event) => 
      sum + (event.priceRange?.min || 0), 0) / eventsWithPricing.length;
    
    const avgMaxPrice = eventsWithPricing.reduce((sum, event) => 
      sum + (event.priceRange?.max || 0), 0) / eventsWithPricing.length;
    
    console.log(`Average price range: $${avgMinPrice.toFixed(2)} - $${avgMaxPrice.toFixed(2)}`);
  }
  
  // Find upcoming events (next 30 days)
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const upcomingEvents = allEvents.filter(event => 
    event.date >= now && event.date <= thirtyDaysFromNow
  );
  
  console.log(`Upcoming events (next 30 days): ${upcomingEvents.length}`);
  
  // Quality analysis
  const qualityScores = Array.from(results.values())
    .map(result => result.metadata.dataQuality);
  
  const avgQuality = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;
  console.log(`Average data quality: ${avgQuality.toFixed(1)}%`);
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('='.repeat(50));
  console.log('VENUE SCRAPING SYSTEM EXAMPLES');
  console.log('='.repeat(50));
  
  try {
    await basicScrapingExample();
    console.log('\n' + '-'.repeat(50) + '\n');
    
    await advancedScrapingExample();
    console.log('\n' + '-'.repeat(50) + '\n');
    
    await addVenueExample();
    console.log('\n' + '-'.repeat(50) + '\n');
    
    await configManagementExample();
    console.log('\n' + '-'.repeat(50) + '\n');
    
    await complexVenueExample();
    console.log('\n' + '-'.repeat(50) + '\n');
    
    await eventAnalysisExample();
    
  } catch (error) {
    console.error('Example execution failed:', error);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('EXAMPLES COMPLETED');
  console.log('='.repeat(50));
}

// Export for CLI usage
if (require.main === module) {
  runAllExamples();
}