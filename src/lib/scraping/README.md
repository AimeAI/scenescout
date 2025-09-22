# SceneScout Scraping Infrastructure

A comprehensive, production-ready scraping system for gathering event data from multiple sources. Built with TypeScript, Playwright, and robust error handling.

## 🚀 Features

- **Multi-Source Support**: Eventbrite, Facebook Events, Meetup, venue websites, and more
- **Intelligent Rate Limiting**: Respectful scraping with exponential backoff
- **Anti-Detection**: User agent rotation, stealth mode, proxy support
- **Error Recovery**: Circuit breakers, retry mechanisms, graceful degradation
- **Data Normalization**: Convert raw data into standardized database format
- **Comprehensive Logging**: Structured logging with multiple output formats
- **TypeScript First**: Full type safety with detailed interfaces
- **Modular Architecture**: Easy to extend with new scrapers

## 📁 Architecture

```
src/lib/scraping/
├── types.ts                    # Core TypeScript interfaces
├── interfaces/
│   └── base-scraper.ts         # Abstract scraper base class
├── config/
│   ├── playwright-config.ts    # Browser configuration & stealth
│   └── targets.ts              # Scraping target definitions
├── utils/
│   ├── normalization.ts        # Data normalization utilities
│   ├── error-handler.ts        # Error handling & retry logic
│   └── logger.ts               # Comprehensive logging system
├── scrapers/
│   └── eventbrite-scraper.ts   # Eventbrite implementation
├── factories/
│   └── scraper-factory.ts      # Scraper creation & management
└── index.ts                    # Main exports & orchestrator
```

## 🛠 Installation

The scraping infrastructure is already integrated into SceneScout. Dependencies include:

```bash
npm install playwright playwright-extra playwright-extra-plugin-stealth
npm install user-agents date-fns-tz
```

## 🎯 Quick Start

### Basic Usage

```typescript
import { createScraper, ScrapingUtils } from '@/lib/scraping'

// Quick city scrape
const { events, venues } = await ScrapingUtils.scrapeCity('san-francisco', ['eventbrite'])

// Full scraper instance
const scraper = createScraper()
const result = await scraper.scrapeLocation('new-york', {
  sources: ['eventbrite', 'meetup'],
  categories: ['music', 'arts'],
  maxPages: 3
})

await scraper.destroy() // Clean up resources
```

### Advanced Configuration

```typescript
import { SceneScoutScraper, DEFAULT_SCRAPER_CONFIG } from '@/lib/scraping'

const scraper = new SceneScoutScraper()

// Custom scraping job
const result = await scraper.scrapeLocation('chicago', {
  sources: ['eventbrite'],
  customTargets: [{
    id: 'custom-venue',
    name: 'Custom Venue',
    baseUrl: 'https://venue.com/events',
    source: 'venue_direct',
    selectors: {
      events: {
        container: '.events-list',
        eventCard: '.event-item',
        title: '.event-title',
        date: '.event-date',
        venue: '.venue-name',
        link: 'a'
      }
    }
  }]
})
```

## 🎛 Configuration

### Scraper Configuration

```typescript
const config: ScraperConfig = {
  name: 'eventbrite',
  enabled: true,
  rateLimit: {
    requestsPerMinute: 30,
    burstLimit: 5,
    delayBetweenRequests: 2000
  },
  timeout: {
    navigationTimeout: 30000,
    actionTimeout: 10000,
    waitTimeout: 5000
  },
  retry: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2
  },
  browser: {
    headless: true,
    viewport: { width: 1920, height: 1080 },
    userAgent: null, // Auto-rotated
    locale: 'en-US',
    timezone: 'America/New_York'
  },
  respectRobotsTxt: true,
  useStealthMode: true
}
```

### Target Configuration

```typescript
const target: ScrapeTarget = {
  id: 'eventbrite_search',
  name: 'Eventbrite Search Results',
  baseUrl: 'https://www.eventbrite.com/d/{{location}}/events/',
  source: 'eventbrite',
  selectors: {
    events: {
      container: '[data-testid="search-results"]',
      eventCard: '[data-testid="search-result-card"]',
      title: '[data-testid="event-name"]',
      description: '[data-testid="event-description"]',
      date: '[data-testid="event-start-date"]',
      venue: '[data-testid="venue-name"]',
      price: '[data-testid="ticket-price"]',
      image: '[data-testid="event-image"] img',
      link: 'a[href*="/e/"]'
    }
  },
  pagination: {
    type: 'button',
    selector: '[data-testid="pagination-next"]',
    maxPages: 10
  }
}
```

## 🔧 Supported Sources

### Currently Implemented

- **Eventbrite**: Full support with detailed event extraction
- **Facebook Events**: Public events scraping
- **Meetup**: Event search and details
- **Venue Websites**: Generic venue scraping
- **Specialized Sources**: Ticketmaster, Resident Advisor, Songkick

### Adding New Sources

1. Create scraper class extending `BaseScraper`
2. Define target configuration in `targets.ts`
3. Register in `ScraperFactory`
4. Add normalization rules

```typescript
export class MyCustomScraper extends BaseScraper {
  protected async createBrowser(): Promise<Browser> {
    return await BrowserFactory.createBrowser('stealth')
  }
  
  async scrape(target: ScrapeTarget): Promise<RawScrapedData> {
    // Implementation
  }
}
```

## 📊 Data Flow

1. **Input**: Location, sources, categories
2. **Target Resolution**: Find appropriate scraping targets
3. **Browser Session**: Create stealth browser instance
4. **Data Extraction**: Parse HTML using CSS selectors
5. **Error Handling**: Retry failed requests, handle blocks
6. **Normalization**: Convert to standardized format
7. **Output**: Normalized events and venues

## 🔍 Data Normalization

Raw scraped data is automatically normalized to match the database schema:

```typescript
// Raw event data
{
  title: "Concert Tonight",
  dateTime: { start: "2024-01-15T20:00:00" },
  venue: { name: "The Venue", city: "San Francisco" },
  pricing: { isFree: false, minPrice: 25 }
}

// Normalized output
{
  id: "eventbrite_12345_1640995200000",
  title: "Concert Tonight",
  start_time: "2024-01-15T20:00:00.000Z",
  venue_id: "eventbrite_venue_the_venue_1640995200000",
  category: "Music",
  price_min: 25,
  price_currency: "USD",
  source: "eventbrite"
}
```

## 🛡 Error Handling

The system includes comprehensive error handling:

- **Network Errors**: Automatic retries with exponential backoff
- **Rate Limiting**: Respect rate limits and back off appropriately
- **Blocking Detection**: Rotate user agents and sessions
- **CAPTCHA Detection**: Log and alert for manual intervention
- **Circuit Breakers**: Temporarily disable failing targets

## 📈 Monitoring & Logging

### Health Checks

```typescript
const health = await scraper.getHealthStatus()
// {
//   status: 'healthy',
//   services: { browser: true, network: true },
//   metrics: { activeSessions: 2, errorRate: 0.05 }
// }
```

### Metrics

```typescript
const metrics = await scraper.getMetrics()
// {
//   overall: { eventsScraped: 1250, successRate: 0.95 },
//   bySource: { eventbrite: [...], meetup: [...] }
// }
```

### Logging

```typescript
import { ScrapingLogger, LogLevel } from '@/lib/scraping'

const logger = new ScrapingLogger({
  level: LogLevel.INFO,
  structuredLogging: true
})

logger.info('scraper', 'Starting scrape', { location: 'sf' })
```

## 🔐 Security & Ethics

- **Respectful Scraping**: Built-in rate limiting and delays
- **robots.txt Compliance**: Optional robots.txt checking
- **User Agent Rotation**: Avoid detection while being transparent
- **Data Privacy**: No personal data collection
- **Terms of Service**: Always review target site terms

## ⚠️ Important Notes

### Production Considerations

1. **Rate Limiting**: Adjust for production load
2. **Proxy Rotation**: Implement for large-scale scraping
3. **Data Storage**: Implement proper data persistence
4. **Monitoring**: Set up alerts for failures
5. **Legal Compliance**: Review terms of service for each source

### Best Practices

1. **Always** clean up browser resources
2. **Monitor** for blocking and adjust strategies
3. **Validate** data quality before storage
4. **Log** extensively for debugging
5. **Test** selectors regularly as sites change

## 🧪 Testing

```typescript
// Basic health check
const isHealthy = await ScrapingUtils.healthCheck()

// Test specific source
const scraper = createScraper()
const result = await scraper.scrapeSource('eventbrite', 'san-francisco')

// Validate target configuration
const validation = scraper.validateTarget(myTarget)
if (!validation.isValid) {
  console.error('Target errors:', validation.errors)
}
```

## 📚 API Reference

### Main Classes

- `SceneScoutScraper`: Main orchestrator class
- `BaseScraper`: Abstract base for all scrapers
- `ScraperFactory`: Creates and manages scraper instances
- `DataNormalizer`: Converts raw data to database format
- `ScrapingLogger`: Comprehensive logging system

### Utility Functions

- `createScraper()`: Create new scraper instance
- `ScrapingUtils.scrapeCity()`: Quick city scrape
- `ScrapingUtils.healthCheck()`: System health check

### Configuration

- `DEFAULT_SCRAPER_CONFIG`: Default scraper settings
- `EVENTBRITE_TARGETS`: Eventbrite target configurations
- `getTargetConfig()`: Get target by source/location

## 🤝 Contributing

When adding new scrapers or features:

1. Follow existing patterns and interfaces
2. Add comprehensive error handling
3. Include proper TypeScript types
4. Add logging for debugging
5. Test thoroughly with rate limiting
6. Document selector strategies

## 📄 License

Part of the SceneScout project. See main project license.