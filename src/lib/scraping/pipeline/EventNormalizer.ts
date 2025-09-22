import { logger } from '@/lib/utils/logger';
import { ScrapedEvent } from '@/types/events';
import { parseISO, format, isValid, startOfDay, endOfDay } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

export interface NormalizationOptions {
  defaultTimezone?: string;
  defaultCurrency?: string;
  strictDateValidation?: boolean;
  normalizeCase?: boolean;
}

export interface NormalizedEvent extends Partial<ScrapedEvent> {
  normalizedStartDate?: Date;
  normalizedEndDate?: Date;
  normalizedPrice?: number;
  normalizedCurrency?: string;
  normalizedLocation?: {
    address: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  normalizedCategories?: string[];
  normalizedTags?: string[];
}

export interface NormalizationResult {
  event: NormalizedEvent;
  warnings: string[];
  errors: string[];
  confidence: number;
}

export class EventNormalizer {
  private readonly defaultOptions: NormalizationOptions = {
    defaultTimezone: 'America/New_York',
    defaultCurrency: 'USD',
    strictDateValidation: true,
    normalizeCase: true
  };

  private readonly currencySymbols = {
    '$': 'USD',
    '€': 'EUR',
    '£': 'GBP',
    '¥': 'JPY',
    '₹': 'INR',
    'C$': 'CAD',
    'A$': 'AUD'
  };

  private readonly categoryMappings = {
    'music': ['concert', 'live music', 'band', 'singer', 'dj', 'festival'],
    'arts': ['art', 'gallery', 'exhibition', 'museum', 'theater', 'theatre'],
    'food': ['food', 'restaurant', 'dining', 'culinary', 'cooking', 'tasting'],
    'sports': ['sport', 'game', 'match', 'tournament', 'athletic', 'fitness'],
    'business': ['conference', 'networking', 'seminar', 'workshop', 'meeting'],
    'entertainment': ['comedy', 'show', 'performance', 'entertainment', 'fun'],
    'education': ['class', 'course', 'lesson', 'training', 'education', 'learning'],
    'community': ['community', 'volunteer', 'charity', 'fundraiser', 'social']
  };

  constructor(private options: NormalizationOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  async normalize(event: Partial<ScrapedEvent>): Promise<NormalizationResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    let confidence = 1.0;

    try {
      const normalized: NormalizedEvent = { ...event };

      // Normalize dates
      const dateResult = await this.normalizeDates(event);
      normalized.normalizedStartDate = dateResult.startDate;
      normalized.normalizedEndDate = dateResult.endDate;
      warnings.push(...dateResult.warnings);
      errors.push(...dateResult.errors);
      if (dateResult.errors.length > 0) confidence -= 0.2;

      // Normalize price and currency
      const priceResult = await this.normalizePrice(event);
      normalized.normalizedPrice = priceResult.price;
      normalized.normalizedCurrency = priceResult.currency;
      warnings.push(...priceResult.warnings);
      if (priceResult.warnings.length > 0) confidence -= 0.1;

      // Normalize location
      const locationResult = await this.normalizeLocation(event);
      normalized.normalizedLocation = locationResult.location;
      warnings.push(...locationResult.warnings);
      errors.push(...locationResult.errors);
      if (locationResult.errors.length > 0) confidence -= 0.15;

      // Normalize categories and tags
      const categoryResult = await this.normalizeCategories(event);
      normalized.normalizedCategories = categoryResult.categories;
      normalized.normalizedTags = categoryResult.tags;
      warnings.push(...categoryResult.warnings);
      if (categoryResult.warnings.length > 0) confidence -= 0.05;

      // Normalize text fields
      if (event.title && this.options.normalizeCase) {
        normalized.title = this.normalizeTitle(event.title);
      }

      if (event.description) {
        normalized.description = this.normalizeDescription(event.description);
      }

      // Ensure confidence doesn't go below 0
      confidence = Math.max(0, confidence);

      logger.info('Event normalization completed', {
        eventId: event.externalId,
        confidence,
        warningsCount: warnings.length,
        errorsCount: errors.length
      });

      return {
        event: normalized,
        warnings,
        errors,
        confidence
      };

    } catch (error) {
      logger.error('Error during event normalization:', error);
      errors.push(`Normalization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        event: { ...event },
        warnings,
        errors,
        confidence: 0
      };
    }
  }

  private async normalizeDates(event: Partial<ScrapedEvent>): Promise<{
    startDate?: Date;
    endDate?: Date;
    warnings: string[];
    errors: string[];
  }> {
    const warnings: string[] = [];
    const errors: string[] = [];
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    // Normalize start date
    if (event.startDate) {
      const parsed = this.parseAndNormalizeDate(event.startDate);
      if (parsed.success) {
        startDate = parsed.date;
        if (parsed.warning) warnings.push(parsed.warning);
      } else {
        errors.push(`Invalid start date: ${parsed.error}`);
      }
    }

    // Normalize end date
    if (event.endDate) {
      const parsed = this.parseAndNormalizeDate(event.endDate);
      if (parsed.success) {
        endDate = parsed.date;
        if (parsed.warning) warnings.push(parsed.warning);
        
        // Validate end date is after start date
        if (startDate && endDate < startDate) {
          errors.push('End date is before start date');
        }
      } else {
        errors.push(`Invalid end date: ${parsed.error}`);
      }
    }

    // If no end date provided, assume single-day event
    if (startDate && !endDate) {
      endDate = endOfDay(startDate);
      warnings.push('No end date provided, assumed single-day event');
    }

    return { startDate, endDate, warnings, errors };
  }

  private parseAndNormalizeDate(dateInput: any): {
    success: boolean;
    date?: Date;
    warning?: string;
    error?: string;
  } {
    try {
      let date: Date;
      let warning: string | undefined;

      if (dateInput instanceof Date) {
        date = dateInput;
      } else if (typeof dateInput === 'string') {
        // Try parsing as ISO string first
        if (dateInput.includes('T') || dateInput.includes('Z')) {
          date = parseISO(dateInput);
        } else {
          // Parse as general date string
          date = new Date(dateInput);
        }
        
        if (!isValid(date)) {
          return { success: false, error: `Cannot parse date string: ${dateInput}` };
        }
      } else if (typeof dateInput === 'number') {
        date = new Date(dateInput);
        if (!isValid(date)) {
          return { success: false, error: `Invalid timestamp: ${dateInput}` };
        }
      } else {
        return { success: false, error: `Unsupported date format: ${typeof dateInput}` };
      }

      // Convert to UTC if timezone is detected
      if (typeof dateInput === 'string' && this.hasTimezoneInfo(dateInput)) {
        // Date string already has timezone info, use as-is
      } else {
        // Assume local timezone and convert to UTC
        const timezone = this.options.defaultTimezone || 'America/New_York';
        date = zonedTimeToUtc(date, timezone);
        warning = `Date assumed to be in ${timezone} timezone`;
      }

      return { success: true, date, warning };

    } catch (error) {
      return { 
        success: false, 
        error: `Date parsing error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  private hasTimezoneInfo(dateString: string): boolean {
    return /[+-]\d{2}:?\d{2}$|Z$|[A-Z]{3,4}$/.test(dateString);
  }

  private async normalizePrice(event: Partial<ScrapedEvent>): Promise<{
    price?: number;
    currency?: string;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    let price: number | undefined;
    let currency: string | undefined = this.options.defaultCurrency;

    // Extract price from numeric field
    if (typeof event.price === 'number') {
      price = event.price;
    }
    
    // Extract price from text fields
    const priceText = event.priceText || event.price;
    if (typeof priceText === 'string') {
      const extracted = this.extractPriceAndCurrency(priceText);
      if (extracted.price !== undefined) {
        price = extracted.price;
      }
      if (extracted.currency) {
        currency = extracted.currency;
      }
      if (extracted.warning) {
        warnings.push(extracted.warning);
      }
    }

    // Handle free events
    if (priceText && typeof priceText === 'string') {
      const lowerText = priceText.toLowerCase();
      if (lowerText.includes('free') || lowerText.includes('no charge') || lowerText === '0') {
        price = 0;
        currency = this.options.defaultCurrency;
      }
    }

    return { price, currency, warnings };
  }

  private extractPriceAndCurrency(text: string): {
    price?: number;
    currency?: string;
    warning?: string;
  } {
    if (!text) return {};

    // Remove common prefixes and clean up
    const cleaned = text.replace(/^(price:?|cost:?|from|starting at)/i, '').trim();
    
    // Check for currency symbols
    let currency: string | undefined;
    for (const [symbol, code] of Object.entries(this.currencySymbols)) {
      if (cleaned.includes(symbol)) {
        currency = code;
        break;
      }
    }

    // Extract numeric value
    const priceMatch = cleaned.match(/([\d,]+(?:\.\d{2})?)/);
    if (priceMatch) {
      const priceStr = priceMatch[1].replace(/,/g, '');
      const price = parseFloat(priceStr);
      
      if (!isNaN(price)) {
        return { 
          price, 
          currency: currency || this.options.defaultCurrency,
          warning: !currency ? `Currency symbol not found, assumed ${this.options.defaultCurrency}` : undefined
        };
      }
    }

    return { warning: `Could not extract price from: ${text}` };
  }

  private async normalizeLocation(event: Partial<ScrapedEvent>): Promise<{
    location?: {
      address: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
    };
    warnings: string[];
    errors: string[];
  }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (!event.address && !event.venue) {
      warnings.push('No location information provided');
      return { warnings, errors };
    }

    const fullAddress = [event.venue, event.address].filter(Boolean).join(', ');
    
    try {
      const parsed = this.parseAddress(fullAddress);
      
      return {
        location: {
          address: fullAddress,
          ...parsed
        },
        warnings,
        errors
      };
    } catch (error) {
      errors.push(`Failed to parse location: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { warnings, errors };
    }
  }

  private parseAddress(address: string): {
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  } {
    // Basic address parsing - this could be enhanced with a proper address parsing library
    const parts = address.split(',').map(p => p.trim());
    const result: any = {};

    // Look for postal code (basic US/CA format)
    const postalCodeMatch = address.match(/\b([A-Z]{2}\s?\d{5}(?:-\d{4})?|[A-Z]\d[A-Z]\s?\d[A-Z]\d)\b/);
    if (postalCodeMatch) {
      result.postalCode = postalCodeMatch[1];
    }

    // Look for state (2-letter abbreviation)
    const stateMatch = address.match(/\b([A-Z]{2})\b/);
    if (stateMatch) {
      result.state = stateMatch[1];
    }

    // Assume last part (if more than one) could be city or city+state
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1];
      const secondLastPart = parts[parts.length - 2];
      
      if (!result.state && lastPart.length <= 30) {
        result.city = secondLastPart;
      } else if (result.state) {
        result.city = secondLastPart;
      }
    }

    return result;
  }

  private async normalizeCategories(event: Partial<ScrapedEvent>): Promise<{
    categories: string[];
    tags: string[];
    warnings: string[];
  }> {
    const warnings: string[] = [];
    const categories: string[] = [];
    const tags: string[] = [];

    // Extract categories from existing tags or description
    const allText = [
      event.title,
      event.description,
      ...(event.tags || [])
    ].filter(Boolean).join(' ').toLowerCase();

    // Map to standard categories
    for (const [category, keywords] of Object.entries(this.categoryMappings)) {
      if (keywords.some(keyword => allText.includes(keyword))) {
        categories.push(category);
      }
    }

    // Clean and normalize existing tags
    if (event.tags) {
      for (const tag of event.tags) {
        if (typeof tag === 'string') {
          const normalized = tag.toLowerCase().trim();
          if (normalized.length > 0 && normalized.length <= 50) {
            tags.push(normalized);
          }
        }
      }
    }

    // Remove duplicates
    const uniqueCategories = [...new Set(categories)];
    const uniqueTags = [...new Set(tags)];

    if (uniqueCategories.length === 0) {
      warnings.push('No categories could be determined from event content');
    }

    return {
      categories: uniqueCategories,
      tags: uniqueTags,
      warnings
    };
  }

  private normalizeTitle(title: string): string {
    // Convert to title case
    return title.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  private normalizeDescription(description: string): string {
    // Basic cleanup: normalize whitespace and remove excessive line breaks
    return description
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}