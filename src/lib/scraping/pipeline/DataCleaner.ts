import { logger } from '@/lib/utils/logger';
import { ScrapedEvent } from '@/types/events';

export interface CleaningOptions {
  removeHtml?: boolean;
  validateEmail?: boolean;
  normalizeWhitespace?: boolean;
  maxTitleLength?: number;
  maxDescriptionLength?: number;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface CleaningResult {
  data: Partial<ScrapedEvent>;
  errors: ValidationError[];
  warnings: string[];
  isValid: boolean;
}

export class DataCleaner {
  private readonly defaultOptions: CleaningOptions = {
    removeHtml: true,
    validateEmail: true,
    normalizeWhitespace: true,
    maxTitleLength: 200,
    maxDescriptionLength: 5000
  };

  constructor(private options: CleaningOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  async clean(rawData: any): Promise<CleaningResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    const cleanedData: Partial<ScrapedEvent> = {};

    try {
      // Clean title
      if (rawData.title) {
        cleanedData.title = this.cleanText(rawData.title);
        if (cleanedData.title.length > (this.options.maxTitleLength || 200)) {
          warnings.push(`Title truncated from ${rawData.title.length} to ${this.options.maxTitleLength} characters`);
          cleanedData.title = cleanedData.title.substring(0, this.options.maxTitleLength || 200);
        }
      } else {
        errors.push({ field: 'title', message: 'Title is required' });
      }

      // Clean description
      if (rawData.description) {
        cleanedData.description = this.cleanText(rawData.description);
        if (cleanedData.description.length > (this.options.maxDescriptionLength || 5000)) {
          warnings.push(`Description truncated from ${rawData.description.length} to ${this.options.maxDescriptionLength} characters`);
          cleanedData.description = cleanedData.description.substring(0, this.options.maxDescriptionLength || 5000);
        }
      }

      // Clean and validate dates
      const dateResult = this.validateDates(rawData);
      if (dateResult.startDate) cleanedData.startDate = dateResult.startDate;
      if (dateResult.endDate) cleanedData.endDate = dateResult.endDate;
      errors.push(...dateResult.errors);
      warnings.push(...dateResult.warnings);

      // Clean venue information
      const venueResult = this.cleanVenue(rawData);
      if (venueResult.venue) cleanedData.venue = venueResult.venue;
      if (venueResult.address) cleanedData.address = venueResult.address;
      errors.push(...venueResult.errors);
      warnings.push(...venueResult.warnings);

      // Clean price information
      const priceResult = this.cleanPrice(rawData);
      if (priceResult.price !== undefined) cleanedData.price = priceResult.price;
      if (priceResult.priceText) cleanedData.priceText = priceResult.priceText;
      errors.push(...priceResult.errors);
      warnings.push(...priceResult.warnings);

      // Clean contact information
      const contactResult = this.cleanContact(rawData);
      if (contactResult.email) cleanedData.email = contactResult.email;
      if (contactResult.phone) cleanedData.phone = contactResult.phone;
      if (contactResult.website) cleanedData.website = contactResult.website;
      errors.push(...contactResult.errors);

      // Clean images
      if (rawData.images && Array.isArray(rawData.images)) {
        cleanedData.images = this.cleanImages(rawData.images);
      }

      // Clean tags
      if (rawData.tags && Array.isArray(rawData.tags)) {
        cleanedData.tags = this.cleanTags(rawData.tags);
      }

      // Additional metadata
      cleanedData.sourceUrl = this.cleanUrl(rawData.sourceUrl);
      cleanedData.externalId = this.sanitizeString(rawData.externalId);
      
      logger.info('Data cleaning completed', {
        originalFields: Object.keys(rawData).length,
        cleanedFields: Object.keys(cleanedData).length,
        errorsCount: errors.length,
        warningsCount: warnings.length
      });

      return {
        data: cleanedData,
        errors,
        warnings,
        isValid: errors.length === 0
      };

    } catch (error) {
      logger.error('Error during data cleaning:', error);
      errors.push({ field: 'general', message: 'Failed to clean data', value: error });
      
      return {
        data: cleanedData,
        errors,
        warnings,
        isValid: false
      };
    }
  }

  private cleanText(text: string): string {
    if (!text) return '';
    
    let cleaned = text;
    
    // Remove HTML tags if enabled
    if (this.options.removeHtml) {
      cleaned = cleaned.replace(/<[^>]*>/g, '');
      // Decode HTML entities
      cleaned = cleaned
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    }
    
    // Normalize whitespace if enabled
    if (this.options.normalizeWhitespace) {
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
    }
    
    return cleaned;
  }

  private validateDates(rawData: any): {
    startDate?: Date;
    endDate?: Date;
    errors: ValidationError[];
    warnings: string[];
  } {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    // Parse start date
    if (rawData.startDate) {
      const parsed = this.parseDate(rawData.startDate);
      if (parsed) {
        startDate = parsed;
        // Check if date is too far in the past
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        if (startDate < sixMonthsAgo) {
          warnings.push('Event start date is more than 6 months in the past');
        }
      } else {
        errors.push({ field: 'startDate', message: 'Invalid start date format', value: rawData.startDate });
      }
    }

    // Parse end date
    if (rawData.endDate) {
      const parsed = this.parseDate(rawData.endDate);
      if (parsed) {
        endDate = parsed;
        // Validate end date is after start date
        if (startDate && endDate < startDate) {
          errors.push({ field: 'endDate', message: 'End date cannot be before start date' });
        }
      } else {
        errors.push({ field: 'endDate', message: 'Invalid end date format', value: rawData.endDate });
      }
    }

    return { startDate, endDate, errors, warnings };
  }

  private parseDate(dateInput: any): Date | null {
    if (!dateInput) return null;
    
    if (dateInput instanceof Date) {
      return isNaN(dateInput.getTime()) ? null : dateInput;
    }
    
    if (typeof dateInput === 'string') {
      const parsed = new Date(dateInput);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    
    if (typeof dateInput === 'number') {
      const parsed = new Date(dateInput);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    
    return null;
  }

  private cleanVenue(rawData: any): {
    venue?: string;
    address?: string;
    errors: ValidationError[];
    warnings: string[];
  } {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    
    const venue = rawData.venue ? this.cleanText(rawData.venue) : undefined;
    const address = rawData.address ? this.cleanText(rawData.address) : undefined;
    
    if (!venue && !address) {
      warnings.push('No venue or address information provided');
    }
    
    return { venue, address, errors, warnings };
  }

  private cleanPrice(rawData: any): {
    price?: number;
    priceText?: string;
    errors: ValidationError[];
    warnings: string[];
  } {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    let price: number | undefined;
    let priceText: string | undefined;

    if (rawData.price !== undefined) {
      if (typeof rawData.price === 'number') {
        if (rawData.price >= 0) {
          price = rawData.price;
        } else {
          errors.push({ field: 'price', message: 'Price cannot be negative', value: rawData.price });
        }
      } else if (typeof rawData.price === 'string') {
        priceText = this.cleanText(rawData.price);
        const extracted = this.extractPriceFromText(priceText);
        if (extracted !== null) {
          price = extracted;
        }
      }
    }

    if (rawData.priceText) {
      priceText = this.cleanText(rawData.priceText);
    }

    return { price, priceText, errors, warnings };
  }

  private extractPriceFromText(text: string): number | null {
    if (!text) return null;
    
    // Remove currency symbols and extract numeric value
    const cleaned = text.replace(/[$£€¥₹]/g, '').replace(/,/g, '');
    const match = cleaned.match(/\d+(?:\.\d{2})?/);
    
    if (match) {
      const price = parseFloat(match[0]);
      return isNaN(price) ? null : price;
    }
    
    return null;
  }

  private cleanContact(rawData: any): {
    email?: string;
    phone?: string;
    website?: string;
    errors: ValidationError[];
  } {
    const errors: ValidationError[] = [];
    let email: string | undefined;
    let phone: string | undefined;
    let website: string | undefined;

    // Clean email
    if (rawData.email) {
      email = this.cleanText(rawData.email).toLowerCase();
      if (this.options.validateEmail && !this.isValidEmail(email)) {
        errors.push({ field: 'email', message: 'Invalid email format', value: email });
        email = undefined;
      }
    }

    // Clean phone
    if (rawData.phone) {
      phone = this.cleanPhoneNumber(rawData.phone);
    }

    // Clean website
    if (rawData.website) {
      website = this.cleanUrl(rawData.website);
      if (website && !this.isValidUrl(website)) {
        errors.push({ field: 'website', message: 'Invalid website URL', value: website });
        website = undefined;
      }
    }

    return { email, phone, website, errors };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private cleanPhoneNumber(phone: string): string {
    // Remove all non-digit characters except + and spaces
    return phone.replace(/[^\d+\s-()]/g, '').trim();
  }

  private cleanUrl(url: string): string {
    if (!url) return '';
    
    let cleaned = url.trim();
    
    // Add protocol if missing
    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      cleaned = 'https://' + cleaned;
    }
    
    return cleaned;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private cleanImages(images: any[]): string[] {
    return images
      .filter(img => typeof img === 'string' && img.trim())
      .map(img => this.cleanUrl(img))
      .filter(url => this.isValidUrl(url));
  }

  private cleanTags(tags: any[]): string[] {
    return tags
      .filter(tag => typeof tag === 'string' && tag.trim())
      .map(tag => this.cleanText(tag).toLowerCase())
      .filter(tag => tag.length > 0 && tag.length <= 50)
      .slice(0, 20); // Limit to 20 tags
  }

  private sanitizeString(str: any): string | undefined {
    if (typeof str !== 'string') return undefined;
    return this.cleanText(str) || undefined;
  }
}