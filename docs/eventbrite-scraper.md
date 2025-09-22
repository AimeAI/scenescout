# Eventbrite Public Page Scraper

A comprehensive, ethical web scraper for Eventbrite's public event discovery pages. This scraper extracts event data without requiring API access and follows responsible scraping practices.

## Features

### Core Functionality
- **City-based Event Discovery**: Search events by city name
- **Category Filtering**: Filter by event categories (music, arts, food, etc.)
- **Date Range Filtering**: Find events within specific time periods
- **Price Filtering**: Filter by price range or free events only
- **Pagination Handling**: Automatically handles multiple pages of results
- **Image Extraction**: Extracts event images and thumbnails

### Technical Features
- **Browser Automation**: Uses Playwright for reliable scraping
- **Rate Limiting**: Respects Eventbrite's servers with configurable delays
- **Error Handling**: Robust retry logic and graceful failure handling
- **Data Validation**: Validates and normalizes extracted data
- **SceneScout Integration**: Converts data to SceneScout's Event format
- **Infinite Scroll**: Handles dynamic content loading

### Ethical Practices
- **Respectful Scraping**: Implements rate limiting and reasonable delays
- **User-Agent Rotation**: Uses realistic browser headers
- **Robots.txt Compliance**: Option to respect robots.txt directives
- **Resource Management**: Proper cleanup of browser resources

## Installation

The scraper requires Playwright, which should already be installed in your project:

```bash
npm install playwright @types/node
```

## Quick Start

### Basic Usage

```typescript
import { scrapeEventbriteEvents } from './src/lib/scraping/sources/eventbrite'

// Scrape events for a city
const result = await scrapeEventbriteEvents({
  city: 'New York, NY',
  limit: 50
})

console.log(`Found ${result.events.length} events`)
```

### SceneScout Integration

```typescript
import { getEventbriteEventsForSceneScout } from './src/lib/scraping/sources/eventbrite'

// Get events in SceneScout format
const events = await getEventbriteEventsForSceneScout({
  city: 'San Francisco, CA',
  categories: ['music', 'arts'],
  limit: 100
})

// Events are ready to save to your database
```

## Configuration

### Scraping Config

```typescript
interface EventbriteScrapingConfig {
  headless?: boolean            // Run browser in headless mode (default: true)
  timeout?: number             // Page timeout in ms (default: 30000)
  maxRetries?: number          // Retry failed requests (default: 3)
  rateLimitDelay?: number      // Delay between requests in ms (default: 2000)
  userAgent?: string           // Custom user agent string
  viewport?: { width: number; height: number }  // Browser viewport size
  maxConcurrentPages?: number  // Max concurrent browser pages (default: 2)
  respectRobotsTxt?: boolean   // Respect robots.txt (default: true)
}
```

### Search Filters

```typescript
interface ScrapingFilters {
  city: string                 // Required: city to search
  categories?: string[]        // Event categories to filter by
  dateRange?: {               // Date range filter
    start: Date
    end: Date
  }
  priceRange?: {              // Price range filter
    min: number
    max: number
  }
  radius?: number             // Search radius in kilometers
  freeOnly?: boolean          // Only free events
  page?: number               // Starting page number
  limit?: number              // Maximum events to return
}
```

## Advanced Usage

### Custom Scraper Instance

```typescript
import { EventbritePublicScraper } from './src/lib/scraping/sources/eventbrite'

const scraper = new EventbritePublicScraper({
  headless: false,  // See browser for debugging
  timeout: 45000,
  rateLimitDelay: 3000
})

try {
  await scraper.initialize()
  
  const result = await scraper.scrapeEvents({
    city: 'Los Angeles, CA',
    categories: ['music'],
    limit: 200
  })
  
  console.log(`Scraped ${result.metadata.pagesScraped} pages`)
  console.log(`Found ${result.totalFound} total events`)
  
} finally {
  await scraper.cleanup()
}
```

### Batch Processing Multiple Cities

```typescript
const cities = ['New York, NY', 'Los Angeles, CA', 'Chicago, IL']
const results = {}

const scraper = new EventbritePublicScraper({
  rateLimitDelay: 5000  // Longer delay for batch processing
})

await scraper.initialize()

for (const city of cities) {
  try {
    const result = await scraper.scrapeEvents({
      city,
      limit: 50
    })
    results[city] = result.events
    
    // Extra delay between cities
    await new Promise(resolve => setTimeout(resolve, 10000))
    
  } catch (error) {
    console.error(`Failed to scrape ${city}:`, error)
  }
}

await scraper.cleanup()
```

### Real-time Event Monitoring

```typescript
async function monitorEvents(cityName: string) {
  const scraper = new EventbritePublicScraper()
  await scraper.initialize()
  
  setInterval(async () => {
    try {
      const result = await scraper.scrapeEvents({
        city: cityName,
        limit: 20
      })
      
      // Process new events
      for (const event of result.events) {
        const normalized = scraper.normalizeToSceneScoutEvent(event)
        // Save to database or trigger notifications
      }
      
    } catch (error) {
      console.error('Monitoring error:', error)
    }
  }, 60000) // Check every minute
}
```

## Data Structure

### Scraped Event Data

```typescript
interface ScrapedEventData {
  title: string
  description: string
  date: string                    // YYYY-MM-DD format
  startTime?: string              // "7:00 PM" format
  endTime?: string
  location: {
    venue: string
    address: string
    city: string
    latitude?: number             // If available
    longitude?: number
  }
  price: {
    min?: number                  // Minimum price
    max?: number                  // Maximum price
    currency: string              // USD, EUR, etc.
    isFree: boolean
    displayText: string           // Original price text
  }
  imageUrls: string[]             // Event images
  eventUrl: string                // Eventbrite event page
  ticketUrl: string               // Ticket purchase URL
  organizer?: {
    name: string
    url?: string
  }
  category?: string               // Event category
  tags: string[]                  // Generated tags
  isOnline: boolean               // Virtual event flag
  externalId: string              // Eventbrite event ID
}
```

### SceneScout Event Format

The scraper automatically converts to SceneScout's Event interface:

```typescript
interface Event {
  external_id: string             // "eventbrite_123456"
  source: "eventbrite"
  provider: "eventbrite_scraper"
  title: string
  description?: string
  venue_name?: string
  city_name?: string
  category: string                // Mapped to SceneScout categories
  event_date?: string
  start_time?: string             // ISO format
  end_time?: string
  price_min?: number
  price_max?: number
  price_currency?: string
  is_free?: boolean
  image_url?: string
  external_url?: string
  ticket_url?: string
  tags?: string[]
  status: "active"
  // ... other SceneScout fields
}
```

## Error Handling

### Retry Logic

The scraper includes automatic retry logic:

```typescript
// Configure retry behavior
const scraper = new EventbritePublicScraper({
  maxRetries: 5,
  timeout: 30000
})

// Manual retry wrapper
async function robustScraping(filters) {
  let attempts = 0
  const maxAttempts = 3
  
  while (attempts < maxAttempts) {
    try {
      return await scrapeEventbriteEvents(filters)
    } catch (error) {
      attempts++
      if (attempts >= maxAttempts) throw error
      
      await new Promise(resolve => 
        setTimeout(resolve, 1000 * attempts)
      )
    }
  }
}
```

### Error Types

Common errors and their handling:

- **Network Errors**: Automatic retry with exponential backoff
- **Rate Limiting**: Automatic delay and retry
- **Page Load Failures**: Skip to next page with warning
- **Parsing Errors**: Log warning and continue with partial data
- **Browser Crashes**: Restart browser instance

## Rate Limiting

### Best Practices

```typescript
// Conservative settings for production
const config = {
  rateLimitDelay: 3000,        // 3 seconds between requests
  maxConcurrentPages: 1,       // Single page at a time
  timeout: 45000               // Long timeout for slow pages
}

// Aggressive settings for development/testing
const config = {
  rateLimitDelay: 1000,        // 1 second between requests
  maxConcurrentPages: 3,       // Multiple pages
  timeout: 15000               // Shorter timeout
}
```

### Monitoring Rate Limits

```typescript
const scraper = new EventbritePublicScraper()
await scraper.initialize()

// Check scraping statistics
const stats = scraper.getStats()
console.log(`Requests made: ${stats.requestCount}`)
console.log(`Last request: ${new Date(stats.lastRequestTime)}`)
```

## Performance Optimization

### Memory Management

```typescript
// Process large datasets in chunks
async function processLargeDataset(cities: string[]) {
  const chunkSize = 5
  
  for (let i = 0; i < cities.length; i += chunkSize) {
    const chunk = cities.slice(i, i + chunkSize)
    
    // Process chunk
    const scraper = new EventbritePublicScraper()
    await scraper.initialize()
    
    for (const city of chunk) {
      await scraper.scrapeEvents({ city, limit: 50 })
    }
    
    await scraper.cleanup()
    
    // Give system time to cleanup
    await new Promise(resolve => setTimeout(resolve, 5000))
  }
}
```

### Concurrent Processing

```typescript
// Process multiple cities concurrently (use carefully)
async function concurrentScraping(cities: string[]) {
  const promises = cities.map(async city => {
    const scraper = new EventbritePublicScraper({
      rateLimitDelay: 5000  // Longer delay for concurrent requests
    })
    
    try {
      await scraper.initialize()
      return await scraper.scrapeEvents({ city, limit: 25 })
    } finally {
      await scraper.cleanup()
    }
  })
  
  return await Promise.allSettled(promises)
}
```

## Testing

### Unit Tests

```bash
# Run all tests
npm test eventbrite.test.ts

# Run specific test
npm test -- --testNamePattern="should scrape events"

# Run with coverage
npm test -- --coverage
```

### Integration Tests

```typescript
// Test with real Eventbrite (use sparingly)
test('integration test', async () => {
  const result = await scrapeEventbriteEvents({
    city: 'Austin, TX',
    limit: 1
  })
  
  expect(result.events.length).toBeGreaterThan(0)
}, 60000) // Long timeout for real requests
```

## Troubleshooting

### Common Issues

1. **Browser Launch Failures**
   ```typescript
   // Try different launch arguments
   const scraper = new EventbritePublicScraper({
     // Add custom browser args if needed
   })
   ```

2. **Page Load Timeouts**
   ```typescript
   const scraper = new EventbritePublicScraper({
     timeout: 60000,  // Increase timeout
     maxRetries: 5    // More retries
   })
   ```

3. **Rate Limiting Issues**
   ```typescript
   const scraper = new EventbritePublicScraper({
     rateLimitDelay: 5000,      // Longer delays
     maxConcurrentPages: 1      // Single page only
   })
   ```

4. **Memory Issues**
   - Use cleanup() after each scraping session
   - Process data in smaller chunks
   - Monitor memory usage

### Debug Mode

```typescript
// Enable debug mode to see browser
const scraper = new EventbritePublicScraper({
  headless: false,  // Show browser
  timeout: 60000    // Longer timeout for manual inspection
})
```

## Ethical Considerations

### Responsible Scraping
- Always include rate limiting (minimum 2 seconds between requests)
- Use reasonable request timeouts
- Handle errors gracefully without overwhelming servers
- Monitor your scraping impact

### Legal Compliance
- Only scrape publicly available data
- Respect robots.txt when enabled
- Don't scrape personal or private information
- Follow Eventbrite's Terms of Service

### Technical Respect
- Use realistic user agents
- Don't overwhelm servers with concurrent requests
- Clean up browser resources properly
- Cache results to minimize repeated requests

## Production Deployment

### Environment Setup

```dockerfile
# Dockerfile example for production
FROM node:18-slim

# Install Playwright dependencies
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils

# Install Playwright browsers
RUN npx playwright install chromium
```

### Monitoring

```typescript
// Add monitoring to your scraping
async function monitoredScraping(filters: ScrapingFilters) {
  const startTime = Date.now()
  
  try {
    const result = await scrapeEventbriteEvents(filters)
    
    // Log success metrics
    console.log({
      success: true,
      duration: Date.now() - startTime,
      eventsFound: result.events.length,
      pagesScraped: result.metadata.pagesScraped
    })
    
    return result
    
  } catch (error) {
    // Log failure metrics
    console.error({
      success: false,
      duration: Date.now() - startTime,
      error: error.message
    })
    
    throw error
  }
}
```

## Contributing

When contributing to the scraper:

1. Maintain ethical scraping practices
2. Add tests for new features
3. Update documentation
4. Test with real Eventbrite pages (sparingly)
5. Consider performance impact

## License

This scraper is part of the SceneScout project and follows the same licensing terms. Use responsibly and in compliance with Eventbrite's Terms of Service.