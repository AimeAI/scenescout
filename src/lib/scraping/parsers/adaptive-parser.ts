import { VenueEvent, EventSelectors, VenueInfo, ScrapingError } from '../types/venue';
import { parse } from 'date-fns';

export class AdaptiveParser {
  private fallbackSelectors: Map<string, string[]> = new Map();
  private patterns: Map<string, RegExp[]> = new Map();

  constructor() {
    this.initializeFallbacks();
    this.initializePatterns();
  }

  private initializeFallbacks(): void {
    this.fallbackSelectors.set('title', [
      'h1', 'h2', 'h3', '.title', '.event-title', '.name', 
      '[data-title]', '.headline', '.event-name', '.show-title'
    ]);

    this.fallbackSelectors.set('date', [
      '.date', '.event-date', '.show-date', '[data-date]',
      '.datetime', '.when', '.time', '.schedule', '.calendar'
    ]);

    this.fallbackSelectors.set('price', [
      '.price', '.cost', '.ticket-price', '[data-price]',
      '.pricing', '.admission', '.fee', '.amount'
    ]);

    this.fallbackSelectors.set('description', [
      '.description', '.details', '.about', '.summary',
      '.event-description', '.info', '.content', 'p'
    ]);

    this.fallbackSelectors.set('image', [
      'img', '.image', '.photo', '.picture', '.poster',
      '[data-image]', '.thumbnail', '.hero-image'
    ]);

    this.fallbackSelectors.set('ticketUrl', [
      'a[href*="ticket"]', 'a[href*="buy"]', '.ticket-link',
      '.buy-button', '[data-ticket-url]', '.purchase'
    ]);
  }

  private initializePatterns(): void {
    // Date patterns
    this.patterns.set('date', [
      /\d{1,2}\/\d{1,2}\/\d{4}/,  // MM/DD/YYYY
      /\d{4}-\d{2}-\d{2}/,        // YYYY-MM-DD
      /\w+ \d{1,2}, \d{4}/,       // Month DD, YYYY
      /\d{1,2} \w+ \d{4}/,        // DD Month YYYY
      /\w+day, \w+ \d{1,2}/       // Weekday, Month DD
    ]);

    // Time patterns
    this.patterns.set('time', [
      /\d{1,2}:\d{2}\s?(AM|PM|am|pm)/,
      /\d{1,2}:\d{2}/,
      /\d{1,2}\s?(AM|PM|am|pm)/
    ]);

    // Price patterns
    this.patterns.set('price', [
      /\$\d+(?:\.\d{2})?/,
      /\d+(?:\.\d{2})?\s?(?:USD|usd|\$)/,
      /FREE|Free|free/,
      /\d+\s?-\s?\$?\d+/
    ]);

    // Ticket status patterns
    this.patterns.set('status', [
      /SOLD OUT|Sold Out|sold out/,
      /AVAILABLE|Available|available/,
      /LIMITED|Limited|limited/
    ]);
  }

  public async parseEvent(
    element: Element, 
    selectors: EventSelectors, 
    venueInfo: VenueInfo
  ): Promise<VenueEvent | null> {
    try {
      const event: Partial<VenueEvent> = {
        venue: venueInfo,
        categories: [],
        metadata: {},
        isRecurring: false
      };

      // Extract title
      event.title = this.extractText(element, selectors.title, 'title');
      if (!event.title) {
        throw new Error('No title found');
      }

      // Extract and parse date
      const dateText = this.extractText(element, selectors.date, 'date');
      if (dateText) {
        event.date = this.parseDate(dateText);
        event.metadata.originalDate = dateText;
      }

      // Extract time if available
      const timeText = this.extractText(element, selectors.time, 'time');
      if (timeText && event.date) {
        event.date = this.combineDateTime(event.date, timeText);
        event.metadata.originalTime = timeText;
      }

      // Extract description
      event.description = this.extractText(element, selectors.description, 'description');

      // Extract price information
      const priceText = this.extractText(element, selectors.price, 'price');
      if (priceText) {
        event.priceRange = this.parsePrice(priceText);
        event.metadata.originalPrice = priceText;
      }

      // Extract image
      const imageEl = this.extractElement(element, selectors.image, 'image');
      if (imageEl) {
        event.image = this.extractImageUrl(imageEl);
      }

      // Extract ticket URL
      const ticketEl = this.extractElement(element, selectors.ticketUrl, 'ticketUrl');
      if (ticketEl) {
        event.ticketInfo = {
          url: this.extractUrl(ticketEl),
          platform: this.extractTicketPlatform(ticketEl)
        };
      }

      // Extract performers
      const performersText = this.extractText(element, selectors.performers, 'performers');
      if (performersText) {
        event.performers = this.parsePerformers(performersText);
      }

      // Extract categories
      const categoryText = this.extractText(element, selectors.category, 'category');
      if (categoryText) {
        event.categories = this.parseCategories(categoryText);
      }

      // Check if recurring
      event.isRecurring = this.detectRecurring(event.title || '', event.description || '');

      // Generate ID
      event.id = this.generateEventId(event as VenueEvent);

      // Validate required fields
      if (!event.title || !event.date) {
        return null;
      }

      return event as VenueEvent;

    } catch (error) {
      console.error('Error parsing event:', error);
      return null;
    }
  }

  private extractText(
    element: Element, 
    selectors: string | string[] | undefined, 
    fallbackType: string
  ): string | null {
    if (!selectors) {
      selectors = this.fallbackSelectors.get(fallbackType) || [];
    }

    const selectorsArray = Array.isArray(selectors) ? selectors : [selectors];
    
    for (const selector of selectorsArray) {
      try {
        const el = element.querySelector(selector);
        if (el?.textContent?.trim()) {
          return el.textContent.trim();
        }
      } catch (error) {
        continue;
      }
    }

    // Try fallback selectors
    const fallbacks = this.fallbackSelectors.get(fallbackType) || [];
    for (const selector of fallbacks) {
      try {
        const el = element.querySelector(selector);
        if (el?.textContent?.trim()) {
          return el.textContent.trim();
        }
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  private extractElement(
    element: Element, 
    selectors: string | string[] | undefined, 
    fallbackType: string
  ): Element | null {
    if (!selectors) {
      selectors = this.fallbackSelectors.get(fallbackType) || [];
    }

    const selectorsArray = Array.isArray(selectors) ? selectors : [selectors];
    
    for (const selector of selectorsArray) {
      try {
        const el = element.querySelector(selector);
        if (el) return el;
      } catch (error) {
        continue;
      }
    }

    // Try fallback selectors
    const fallbacks = this.fallbackSelectors.get(fallbackType) || [];
    for (const selector of fallbacks) {
      try {
        const el = element.querySelector(selector);
        if (el) return el;
      } catch (error) {
        continue;
      }
    }

    return null;
  }

  private parseDate(dateText: string): Date | null {
    const patterns = this.patterns.get('date') || [];
    
    for (const pattern of patterns) {
      const match = dateText.match(pattern);
      if (match) {
        try {
          const dateStr = match[0];
          // Try common date formats
          const formats = [
            'MM/dd/yyyy',
            'yyyy-MM-dd',
            'MMMM dd, yyyy',
            'dd MMMM yyyy',
            'EEEE, MMMM dd'
          ];

          for (const format of formats) {
            try {
              const parsed = parse(dateStr, format, new Date());
              if (!isNaN(parsed.getTime())) {
                return parsed;
              }
            } catch (error) {
              continue;
            }
          }

          // Fallback to Date constructor
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) {
            return parsed;
          }
        } catch (error) {
          continue;
        }
      }
    }

    return null;
  }

  private combineDateTime(date: Date, timeText: string): Date {
    const timePatterns = this.patterns.get('time') || [];
    
    for (const pattern of timePatterns) {
      const match = timeText.match(pattern);
      if (match) {
        try {
          const timeStr = match[0];
          const timeParts = timeStr.match(/(\d{1,2}):?(\d{2})?\s?(AM|PM|am|pm)?/);
          
          if (timeParts) {
            let hours = parseInt(timeParts[1]);
            const minutes = parseInt(timeParts[2] || '0');
            const ampm = timeParts[3]?.toUpperCase();

            if (ampm === 'PM' && hours !== 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;

            const combined = new Date(date);
            combined.setHours(hours, minutes, 0, 0);
            return combined;
          }
        } catch (error) {
          continue;
        }
      }
    }

    return date;
  }

  private parsePrice(priceText: string): { min: number; max: number; currency: string } | null {
    const pricePatterns = this.patterns.get('price') || [];
    
    if (/free/i.test(priceText)) {
      return { min: 0, max: 0, currency: 'USD' };
    }

    for (const pattern of pricePatterns) {
      const match = priceText.match(pattern);
      if (match) {
        const priceStr = match[0];
        const numbers = priceStr.match(/\d+(?:\.\d{2})?/g);
        
        if (numbers) {
          const prices = numbers.map(n => parseFloat(n));
          return {
            min: Math.min(...prices),
            max: Math.max(...prices),
            currency: 'USD'
          };
        }
      }
    }

    return null;
  }

  private extractImageUrl(element: Element): string | null {
    if (element.tagName === 'IMG') {
      return (element as HTMLImageElement).src || (element as HTMLImageElement).getAttribute('data-src');
    }

    const img = element.querySelector('img');
    if (img) {
      return img.src || img.getAttribute('data-src');
    }

    // Check for background images
    const style = getComputedStyle(element);
    const backgroundImage = style.backgroundImage;
    if (backgroundImage && backgroundImage !== 'none') {
      const match = backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
      if (match) return match[1];
    }

    return null;
  }

  private extractUrl(element: Element): string | null {
    if (element.tagName === 'A') {
      return (element as HTMLAnchorElement).href;
    }

    const link = element.querySelector('a');
    return link?.href || null;
  }

  private extractTicketPlatform(element: Element): string | null {
    const url = this.extractUrl(element);
    if (!url) return null;

    const hostname = new URL(url).hostname.toLowerCase();
    
    if (hostname.includes('ticketmaster')) return 'Ticketmaster';
    if (hostname.includes('stubhub')) return 'StubHub';
    if (hostname.includes('eventbrite')) return 'Eventbrite';
    if (hostname.includes('seatgeek')) return 'SeatGeek';
    if (hostname.includes('vivid')) return 'Vivid Seats';
    
    return hostname;
  }

  private parsePerformers(text: string): Array<{name: string; type: string}> {
    const performers: Array<{name: string; type: string}> = [];
    
    // Split by common separators
    const names = text.split(/[,&+]|(?:\s+with\s+)|(?:\s+and\s+)/)
      .map(name => name.trim())
      .filter(name => name.length > 0);

    for (const name of names) {
      performers.push({
        name: name,
        type: 'artist' // Default type, could be enhanced with ML classification
      });
    }

    return performers;
  }

  private parseCategories(text: string): string[] {
    return text.split(/[,|]/)
      .map(cat => cat.trim())
      .filter(cat => cat.length > 0);
  }

  private detectRecurring(title: string, description: string): boolean {
    const recurringKeywords = [
      'weekly', 'monthly', 'daily', 'every', 'recurring',
      'regular', 'ongoing', 'series', 'season'
    ];

    const text = `${title} ${description}`.toLowerCase();
    return recurringKeywords.some(keyword => text.includes(keyword));
  }

  private generateEventId(event: VenueEvent): string {
    const titleSlug = event.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const dateStr = event.date.toISOString().split('T')[0];
    const venueSlug = event.venue.name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return `${venueSlug}-${titleSlug}-${dateStr}`;
  }

  public validateEvent(event: VenueEvent): ScrapingError[] {
    const errors: ScrapingError[] = [];

    if (!event.title || event.title.length < 3) {
      errors.push({
        type: 'parsing',
        message: 'Invalid or missing title',
        recoverable: false
      });
    }

    if (!event.date || isNaN(event.date.getTime())) {
      errors.push({
        type: 'parsing',
        message: 'Invalid or missing date',
        recoverable: false
      });
    }

    if (event.date && event.date < new Date()) {
      errors.push({
        type: 'parsing',
        message: 'Event date is in the past',
        recoverable: true
      });
    }

    return errors;
  }

  public calculateDataQuality(event: VenueEvent): number {
    let score = 0;
    let maxScore = 0;

    // Required fields (higher weight)
    maxScore += 30;
    if (event.title) score += 30;

    maxScore += 30;
    if (event.date) score += 30;

    // Important fields
    maxScore += 15;
    if (event.description) score += 15;

    maxScore += 10;
    if (event.priceRange) score += 10;

    maxScore += 10;
    if (event.ticketInfo?.url) score += 10;

    maxScore += 5;
    if (event.image) score += 5;

    return Math.round((score / maxScore) * 100);
  }
}