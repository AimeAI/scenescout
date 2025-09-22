# Venue Scraping System Documentation

## Overview

The SceneScout venue scraping system is a comprehensive, adaptive solution for extracting event data from various venue websites. It features intelligent parsing, robust fallback mechanisms, and a configuration-driven architecture that makes adding new venues straightforward.

## Key Features

### 🎯 Adaptive Parsing Engine
- **Smart Selector Fallbacks**: Automatically tries alternative selectors when primary ones fail
- **Pattern Recognition**: Uses regex patterns to extract dates, prices, and other structured data
- **Multiple Format Support**: Handles various date/time formats, price representations, and content structures

### 🏗️ Configuration-Driven Architecture
- **JSON Configuration**: Easy to add new venues without code changes
- **Location-Specific Overrides**: Customize scraping behavior per venue location
- **Chain Support**: Manage venue chains with shared configurations

### 🛡️ Robust Error Handling
- **Fallback Strategies**: Multiple recovery mechanisms for different failure scenarios
- **Rate Limiting**: Respectful scraping with configurable limits
- **Data Validation**: Quality scoring and error detection

### 🌐 Multi-Venue Support
- **Concurrent Scraping**: Parallel processing with rate limiting
- **Venue Types**: Support for concert halls, theaters, sports venues, clubs, universities
- **Geographic Filtering**: Scrape by city, state, or venue type

## Architecture

```
src/lib/scraping/
├── types/
│   └── venue.ts           # TypeScript interfaces and types
├── parsers/
│   └── adaptive-parser.ts # Core parsing logic with fallbacks
├── config/
│   ├── venue-configs.ts   # Default venue configurations
│   ├── config-loader.ts   # Configuration management
│   └── index.ts          # Exports and convenience functions
├── sources/
│   └── venues.ts         # Main scraping engine
└── examples/
    └── usage-examples.ts  # Usage examples and demos
```

## Quick Start

### Basic Usage

```typescript
import { scrapeVenue, scrapeByCity, scrapeByType } from '@/lib/scraping';

// Scrape a specific venue
const fillmoreEvents = await scrapeVenue('fillmore');
console.log(`Found ${fillmoreEvents.events.length} events`);

// Scrape all venues in a city
const sfVenues = await scrapeByCity('San Francisco', 'CA');

// Scrape venues by type
const concertHalls = await scrapeByType('concert_hall');
```

### Advanced Usage

```typescript
import { VenueScraper } from '@/lib/scraping';

const scraper = new VenueScraper();

try {
  const results = await scraper.scrapeAllVenues({
    maxConcurrent: 3,
    includeDisabled: false
  });
  
  for (const [venueId, result] of results) {
    console.log(`${venueId}: ${result.events.length} events, ${result.metadata.dataQuality}% quality`);
  }
} finally {
  await scraper.cleanup();
}
```

## Configuration

### Venue Configuration Structure

```typescript
interface VenueConfiguration {
  id: string;                          // Unique identifier
  name: string;                        // Display name
  type: VenueType;                     // Venue category
  baseUrl: string;                     // Main website URL
  enabled: boolean;                    // Enable/disable scraping
  priority: number;                    // Scraping priority (1-10)
  locations: VenueLocation[];          // Venue locations
  scrapeConfig: ScrapeConfiguration;   // Scraping configuration
  fallbacks: FallbackConfiguration[]; // Error recovery strategies
}
```

### Adding a New Venue

```typescript
import { createVenueTemplate, addNewVenue } from '@/lib/scraping';

// Create basic template
const newVenue = createVenueTemplate(
  'blue-note',
  'Blue Note',
  'club',
  'https://www.bluenotejazz.com'
);

// Add location
newVenue.locations.push({
  id: 'blue-note-nyc',
  city: 'New York',
  state: 'NY',
  country: 'US',
  url: 'https://www.bluenotejazz.com/nyc'
});

// Customize selectors
newVenue.scrapeConfig.eventSelectors = {
  title: ['.show-title', '.event-name'],
  date: ['.show-date', '.event-date'],
  price: ['.ticket-price', '.admission'],
  // ... more selectors
};

// Save configuration
await addNewVenue(newVenue);
```

## Supported Venue Types

### Concert Halls
- **Examples**: The Fillmore, Madison Square Garden
- **Features**: Multi-location support, ticket platform integration
- **Parsing**: Artist/performer extraction, show times

### Theaters & Performing Arts Centers
- **Examples**: Kennedy Center, regional theaters
- **Features**: Season/series detection, performance categories
- **Parsing**: Cast information, performance dates

### Sports Venues & Arenas
- **Examples**: Stadiums, sports complexes
- **Features**: Game schedules, team information
- **Parsing**: Team names, game types, ticket tiers

### Clubs & Bars
- **Examples**: House of Blues, Brooklyn Bowl
- **Features**: Door times, age restrictions
- **Parsing**: DJ sets, cover charges, special events

### Universities & Cultural Centers
- **Examples**: Campus venues, community centers
- **Features**: Academic calendar integration, free events
- **Parsing**: Lecture series, cultural programming

## Adaptive Parsing Features

### Intelligent Selector Fallbacks

The parser automatically tries multiple selectors when the primary ones fail:

```typescript
// Primary selector fails, tries fallbacks
eventSelectors: {
  title: ['.event-title', 'h2', 'h3', '.title', '.name']
}

// Built-in fallbacks are also attempted
fallbackSelectors.set('title', [
  'h1', 'h2', 'h3', '.title', '.event-title', '.name', 
  '[data-title]', '.headline', '.event-name', '.show-title'
]);
```

### Pattern Recognition

Extracts structured data using regex patterns:

```typescript
// Date patterns
/\d{1,2}\/\d{1,2}\/\d{4}/,  // MM/DD/YYYY
/\d{4}-\d{2}-\d{2}/,        // YYYY-MM-DD
/\w+ \d{1,2}, \d{4}/,       // Month DD, YYYY

// Price patterns
/\$\d+(?:\.\d{2})?/,        // $25.00
/FREE|Free|free/,           // Free events
/\d+\s?-\s?\$?\d+/         // Price ranges
```

### Data Quality Scoring

Each event receives a quality score based on completeness:

```typescript
// Scoring criteria
- Title (required): 30 points
- Date (required): 30 points  
- Description: 15 points
- Price information: 10 points
- Ticket URL: 10 points
- Image: 5 points
```

## Fallback Mechanisms

### Selector Fallbacks
When primary selectors fail, alternative selectors are tried automatically.

### Rate Limit Handling
```typescript
{
  id: 'rate-limit-handler',
  triggers: [{ type: 'rate_limited', condition: '429' }],
  action: {
    type: 'wait_and_retry',
    config: { delay: 60000, maxRetries: 3 }
  }
}
```

### Alternative URLs
```typescript
{
  id: 'blocked-fallback',
  triggers: [{ type: 'blocked', condition: '403' }],
  action: {
    type: 'different_url',
    config: { url: 'https://venue.com/calendar' }
  }
}
```

## Rate Limiting

### Respectful Scraping
- Configurable requests per minute
- Minimum delay between requests
- robots.txt compliance
- User-Agent rotation

```typescript
rateLimit: {
  requestsPerMinute: 30,
  delayBetweenRequests: 2000,
  respectRobotsTxt: true
}
```

## Configuration Management

### File-Based Configuration
Configurations can be stored as JSON files and loaded dynamically:

```typescript
import { configManager } from '@/lib/scraping';

// Export configurations
await configManager.exportConfigs('./backup.json');

// Import configurations  
await configManager.importConfigs('./new-venues.json');

// Get statistics
const stats = await configManager.getStats();
```

### Dynamic Updates
Add venues and locations without code changes:

```typescript
// Add new location to existing venue
await configManager.addVenueLocation('fillmore', {
  id: 'fillmore-philadelphia',
  city: 'Philadelphia',
  state: 'PA',
  country: 'US',
  url: 'https://www.fillmore.com/philadelphia'
});
```

## Error Handling

### Error Types
- **Network**: Connection issues, timeouts
- **Parsing**: Missing data, invalid formats  
- **Rate Limit**: Too many requests
- **Authentication**: Login required
- **Unknown**: Unexpected errors

### Recovery Strategies
- Automatic retries with exponential backoff
- Alternative selector attempts
- Fallback URL usage
- Graceful degradation

## Performance Optimization

### Concurrent Processing
- Parallel venue scraping with concurrency limits
- Chunked processing to manage memory
- Resource cleanup and connection pooling

### Caching
- Rate limiter state persistence
- Configuration caching
- Parsed data validation caching

### Resource Management
- Puppeteer instance reuse
- Browser cleanup
- Memory leak prevention

## Best Practices

### Adding New Venues

1. **Start with Template**: Use `createVenueTemplate()` for basic structure
2. **Test Selectors**: Verify selectors work on actual venue pages
3. **Add Fallbacks**: Configure fallback strategies for robustness
4. **Validate Configuration**: Use built-in validation before saving
5. **Monitor Performance**: Check data quality scores and processing times

### Selector Strategies

1. **Use Specific Selectors**: Target unique CSS classes when possible
2. **Provide Alternatives**: Always include multiple selector options
3. **Avoid Positional Selectors**: Don't rely on element positions
4. **Test Across Pages**: Verify selectors work on different event pages

### Rate Limiting

1. **Respect robots.txt**: Always enable robots.txt compliance
2. **Conservative Limits**: Start with lower request rates
3. **Monitor Response**: Watch for rate limiting responses
4. **Use Delays**: Include minimum delays between requests

## Troubleshooting

### Common Issues

**No Events Found**
- Check if container/item selectors are correct
- Verify the page loads correctly
- Check if JavaScript rendering is needed

**Parsing Errors**
- Validate date/time formats on the venue site
- Check for dynamic content loading
- Review selector specificity

**Rate Limiting**
- Reduce requests per minute
- Increase delay between requests
- Check if authentication is required

### Debugging

```typescript
// Enable detailed logging
const result = await scrapeVenue('venue-id');

console.log('Metadata:', result.metadata);
console.log('Errors:', result.errors);
console.log('Fallbacks used:', result.metadata.fallbacksUsed);
console.log('Data quality:', result.metadata.dataQuality);
```

## API Reference

### Main Functions

#### `scrapeVenue(venueId: string): Promise<ScrapingResult>`
Scrape events from a specific venue.

#### `scrapeAllVenues(options?): Promise<Map<string, ScrapingResult>>`
Scrape events from all enabled venues.

#### `scrapeByCity(city: string, state?: string): Promise<Map<string, ScrapingResult>>`
Scrape venues in a specific city.

#### `scrapeByType(type: string): Promise<Map<string, ScrapingResult>>`
Scrape venues of a specific type.

### Configuration Functions

#### `addNewVenue(config: VenueConfiguration): Promise<void>`
Add a new venue configuration.

#### `updateVenue(venueId: string, updates: Partial<VenueConfiguration>): Promise<void>`
Update an existing venue configuration.

#### `removeVenue(venueId: string): Promise<void>`
Remove a venue configuration.

### Utility Functions

#### `createVenueTemplate(id, name, type, baseUrl): VenueConfiguration`
Create a basic venue configuration template.

#### `createLocationTemplate(id, city, state, country, url): VenueLocation`
Create a location configuration template.

## Examples

See `src/lib/scraping/examples/usage-examples.ts` for comprehensive examples including:
- Basic scraping operations
- Advanced configuration
- Custom venue creation
- Data analysis
- Error handling

## Contributing

When adding support for new venues:

1. Create a configuration following existing patterns
2. Test thoroughly with various event types
3. Add appropriate fallback mechanisms
4. Document any special requirements
5. Include example usage

The system is designed to be easily extensible - most new venues can be added through configuration alone without code changes.