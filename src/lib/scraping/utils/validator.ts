import { VenueEvent, VenueConfiguration, ScrapingError } from '../types/venue';

export class VenueValidator {
  /**
   * Validate a venue configuration
   */
  public static validateVenueConfig(config: VenueConfiguration): string[] {
    const errors: string[] = [];

    // Required fields validation
    if (!config.id?.trim()) {
      errors.push('Venue ID is required');
    }

    if (!config.name?.trim()) {
      errors.push('Venue name is required');
    }

    if (!config.baseUrl || !this.isValidUrl(config.baseUrl)) {
      errors.push('Valid base URL is required');
    }

    if (!config.locations || config.locations.length === 0) {
      errors.push('At least one location is required');
    }

    // Validate each location
    config.locations?.forEach((location, index) => {
      if (!location.id?.trim()) {
        errors.push(`Location ${index + 1}: ID is required`);
      }

      if (!location.url || !this.isValidUrl(location.url)) {
        errors.push(`Location ${index + 1}: Valid URL is required`);
      }

      if (!location.city?.trim()) {
        errors.push(`Location ${index + 1}: City is required`);
      }

      if (!location.country?.trim()) {
        errors.push(`Location ${index + 1}: Country is required`);
      }
    });

    // Validate scrape configuration
    if (!config.scrapeConfig) {
      errors.push('Scrape configuration is required');
    } else {
      errors.push(...this.validateScrapeConfig(config.scrapeConfig));
    }

    return errors;
  }

  /**
   * Validate scrape configuration
   */
  private static validateScrapeConfig(scrapeConfig: any): string[] {
    const errors: string[] = [];

    // Validate listing selectors
    if (!scrapeConfig.listingSelectors) {
      errors.push('Listing selectors are required');
    } else {
      if (!scrapeConfig.listingSelectors.container) {
        errors.push('Container selector is required');
      }
      if (!scrapeConfig.listingSelectors.eventItem) {
        errors.push('Event item selector is required');
      }
    }

    // Validate event selectors
    if (!scrapeConfig.eventSelectors) {
      errors.push('Event selectors are required');
    } else {
      if (!scrapeConfig.eventSelectors.title) {
        errors.push('Title selector is required');
      }
      if (!scrapeConfig.eventSelectors.date) {
        errors.push('Date selector is required');
      }
    }

    // Validate rate limit configuration
    if (!scrapeConfig.rateLimit) {
      errors.push('Rate limit configuration is required');
    } else {
      if (scrapeConfig.rateLimit.requestsPerMinute <= 0) {
        errors.push('Requests per minute must be positive');
      }
      if (scrapeConfig.rateLimit.delayBetweenRequests < 0) {
        errors.push('Delay between requests must be non-negative');
      }
    }

    return errors;
  }

  /**
   * Validate a scraped event
   */
  public static validateEvent(event: VenueEvent): ScrapingError[] {
    const errors: ScrapingError[] = [];

    // Required fields
    if (!event.title || event.title.trim().length < 2) {
      errors.push({
        type: 'parsing',
        message: 'Event title is required and must be at least 2 characters',
        recoverable: false
      });
    }

    if (!event.date || isNaN(event.date.getTime())) {
      errors.push({
        type: 'parsing',
        message: 'Valid event date is required',
        recoverable: false
      });
    }

    // Date validation
    if (event.date) {
      const now = new Date();
      const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
      
      if (event.date < new Date(now.getTime() - 24 * 60 * 60 * 1000)) {
        errors.push({
          type: 'parsing',
          message: 'Event date is more than 1 day in the past',
          recoverable: true
        });
      }

      if (event.date > oneYearFromNow) {
        errors.push({
          type: 'parsing',
          message: 'Event date is more than 1 year in the future',
          recoverable: true
        });
      }
    }

    // End date validation
    if (event.endDate && event.date && event.endDate < event.date) {
      errors.push({
        type: 'parsing',
        message: 'End date cannot be before start date',
        recoverable: true
      });
    }

    // Venue validation
    if (!event.venue) {
      errors.push({
        type: 'parsing',
        message: 'Venue information is required',
        recoverable: false
      });
    } else {
      if (!event.venue.name?.trim()) {
        errors.push({
          type: 'parsing',
          message: 'Venue name is required',
          recoverable: false
        });
      }
      if (!event.venue.city?.trim()) {
        errors.push({
          type: 'parsing',
          message: 'Venue city is required',
          recoverable: false
        });
      }
    }

    // Price validation
    if (event.priceRange) {
      if (event.priceRange.min < 0) {
        errors.push({
          type: 'parsing',
          message: 'Minimum price cannot be negative',
          recoverable: true
        });
      }
      if (event.priceRange.max < event.priceRange.min) {
        errors.push({
          type: 'parsing',
          message: 'Maximum price cannot be less than minimum price',
          recoverable: true
        });
      }
      if (event.priceRange.max > 10000) {
        errors.push({
          type: 'parsing',
          message: 'Maximum price seems unreasonably high',
          recoverable: true
        });
      }
    }

    // URL validation
    if (event.url && !this.isValidUrl(event.url)) {
      errors.push({
        type: 'parsing',
        message: 'Invalid event URL format',
        recoverable: true
      });
    }

    if (event.ticketInfo?.url && !this.isValidUrl(event.ticketInfo.url)) {
      errors.push({
        type: 'parsing',
        message: 'Invalid ticket URL format',
        recoverable: true
      });
    }

    if (event.image && !this.isValidUrl(event.image)) {
      errors.push({
        type: 'parsing',
        message: 'Invalid image URL format',
        recoverable: true
      });
    }

    // Performer validation
    if (event.performers) {
      event.performers.forEach((performer, index) => {
        if (!performer.name?.trim()) {
          errors.push({
            type: 'parsing',
            message: `Performer ${index + 1}: Name is required`,
            recoverable: true
          });
        }
        if (performer.website && !this.isValidUrl(performer.website)) {
          errors.push({
            type: 'parsing',
            message: `Performer ${index + 1}: Invalid website URL`,
            recoverable: true
          });
        }
      });
    }

    // Recurring pattern validation
    if (event.isRecurring && event.recurringPattern) {
      if (event.recurringPattern.interval <= 0) {
        errors.push({
          type: 'parsing',
          message: 'Recurring interval must be positive',
          recoverable: true
        });
      }
      
      if (event.recurringPattern.daysOfWeek) {
        const invalidDays = event.recurringPattern.daysOfWeek.filter(day => day < 0 || day > 6);
        if (invalidDays.length > 0) {
          errors.push({
            type: 'parsing',
            message: 'Invalid days of week (must be 0-6)',
            recoverable: true
          });
        }
      }
    }

    return errors;
  }

  /**
   * Calculate data quality score for an event
   */
  public static calculateDataQuality(event: VenueEvent): number {
    let score = 0;
    let maxScore = 0;

    // Required fields (higher weight)
    maxScore += 25;
    if (event.title && event.title.trim().length > 0) {
      score += 25;
    }

    maxScore += 25;
    if (event.date && !isNaN(event.date.getTime())) {
      score += 25;
    }

    // Important fields
    maxScore += 15;
    if (event.description && event.description.trim().length > 10) {
      score += 15;
    }

    maxScore += 10;
    if (event.priceRange) {
      score += 10;
    }

    maxScore += 10;
    if (event.ticketInfo?.url) {
      score += 10;
    }

    maxScore += 5;
    if (event.image) {
      score += 5;
    }

    maxScore += 5;
    if (event.performers && event.performers.length > 0) {
      score += 5;
    }

    maxScore += 3;
    if (event.categories && event.categories.length > 0) {
      score += 3;
    }

    maxScore += 2;
    if (event.venue.address) {
      score += 2;
    }

    return Math.round((score / maxScore) * 100);
  }

  /**
   * Validate event data consistency
   */
  public static validateEventConsistency(events: VenueEvent[]): string[] {
    const warnings: string[] = [];

    if (events.length === 0) {
      return ['No events to validate'];
    }

    // Check for duplicate events
    const eventKeys = new Set<string>();
    const duplicates: string[] = [];

    events.forEach(event => {
      const key = `${event.venue.id}-${event.title}-${event.date.toISOString()}`;
      if (eventKeys.has(key)) {
        duplicates.push(event.title);
      } else {
        eventKeys.add(key);
      }
    });

    if (duplicates.length > 0) {
      warnings.push(`Duplicate events found: ${duplicates.join(', ')}`);
    }

    // Check for suspiciously similar titles
    const titles = events.map(e => e.title.toLowerCase());
    const similarTitles: string[] = [];

    for (let i = 0; i < titles.length; i++) {
      for (let j = i + 1; j < titles.length; j++) {
        if (this.calculateSimilarity(titles[i], titles[j]) > 0.8) {
          similarTitles.push(`"${events[i].title}" and "${events[j].title}"`);
        }
      }
    }

    if (similarTitles.length > 0) {
      warnings.push(`Similar event titles found: ${similarTitles.join(', ')}`);
    }

    // Check date distribution
    const dates = events.map(e => e.date);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    const daysDiff = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);

    if (daysDiff > 365) {
      warnings.push('Events span more than 1 year - consider date validation');
    }

    // Check price ranges
    const priceEvents = events.filter(e => e.priceRange);
    if (priceEvents.length > 0) {
      const prices = priceEvents.flatMap(e => [e.priceRange!.min, e.priceRange!.max]);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      if (maxPrice > minPrice * 100) {
        warnings.push('Large price variation detected - verify pricing accuracy');
      }
    }

    return warnings;
  }

  /**
   * Calculate similarity between two strings
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Validate URL format
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate validation report for scraping results
   */
  public static generateValidationReport(events: VenueEvent[]): {
    totalEvents: number;
    validEvents: number;
    averageQuality: number;
    errors: ScrapingError[];
    warnings: string[];
    qualityDistribution: Record<string, number>;
  } {
    const allErrors: ScrapingError[] = [];
    const qualityScores: number[] = [];
    let validEvents = 0;

    // Validate each event
    events.forEach(event => {
      const eventErrors = this.validateEvent(event);
      allErrors.push(...eventErrors);
      
      const quality = this.calculateDataQuality(event);
      qualityScores.push(quality);

      if (eventErrors.filter(e => !e.recoverable).length === 0) {
        validEvents++;
      }
    });

    // Calculate quality distribution
    const qualityDistribution: Record<string, number> = {
      'Excellent (90-100%)': 0,
      'Good (70-89%)': 0,
      'Fair (50-69%)': 0,
      'Poor (0-49%)': 0
    };

    qualityScores.forEach(score => {
      if (score >= 90) qualityDistribution['Excellent (90-100%)']++;
      else if (score >= 70) qualityDistribution['Good (70-89%)']++;
      else if (score >= 50) qualityDistribution['Fair (50-69%)']++;
      else qualityDistribution['Poor (0-49%)']++;
    });

    const averageQuality = qualityScores.length > 0 
      ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length 
      : 0;

    const warnings = this.validateEventConsistency(events);

    return {
      totalEvents: events.length,
      validEvents,
      averageQuality: Math.round(averageQuality),
      errors: allErrors,
      warnings,
      qualityDistribution
    };
  }
}