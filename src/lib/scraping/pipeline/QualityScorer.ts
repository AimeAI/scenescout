import { logger } from '@/lib/utils/logger';
import { ScrapedEvent } from '@/types/events';
import { isValid, isPast, isFuture, differenceInDays } from 'date-fns';

export interface QualityMetrics {
  completeness: number;
  accuracy: number;
  relevance: number;
  freshness: number;
  engagement: number;
  trustworthiness: number;
}

export interface QualityScore {
  overall: number;
  metrics: QualityMetrics;
  breakdown: {
    [key: string]: {
      score: number;
      weight: number;
      factors: string[];
    };
  };
  recommendations: string[];
  warnings: string[];
  tier: 'premium' | 'standard' | 'basic' | 'poor';
}

export interface ScoringOptions {
  weights?: Partial<QualityMetrics>;
  strictMode?: boolean;
  includeBreakdown?: boolean;
  includeRecommendations?: boolean;
}

export interface EventContext {
  sourceReputation?: number;
  categoryCompetition?: number;
  locationPopularity?: number;
  seasonalRelevance?: number;
  userInterest?: number;
}

export class QualityScorer {
  private readonly defaultWeights: QualityMetrics = {
    completeness: 0.25,
    accuracy: 0.20,
    relevance: 0.20,
    freshness: 0.15,
    engagement: 0.10,
    trustworthiness: 0.10
  };

  private readonly defaultOptions: ScoringOptions = {
    strictMode: false,
    includeBreakdown: true,
    includeRecommendations: true
  };

  // Field importance weights for completeness calculation
  private readonly fieldWeights = {
    title: 0.20,
    description: 0.15,
    startDate: 0.15,
    endDate: 0.10,
    venue: 0.10,
    address: 0.10,
    price: 0.05,
    images: 0.08,
    tags: 0.05,
    website: 0.02
  };

  // Quality indicators for different aspects
  private readonly qualityIndicators = {
    title: {
      minLength: 10,
      maxLength: 150,
      hasNumbers: false,
      hasSpecialChars: false,
      isAllCaps: false
    },
    description: {
      minLength: 50,
      maxLength: 2000,
      hasContactInfo: true,
      hasKeywords: true,
      hasSentences: true
    },
    images: {
      minCount: 1,
      optimalCount: 3,
      maxCount: 10
    },
    tags: {
      minCount: 2,
      optimalCount: 5,
      maxCount: 15
    }
  };

  constructor(
    private options: ScoringOptions = {},
    private weights: Partial<QualityMetrics> = {}
  ) {
    this.options = { ...this.defaultOptions, ...options };
    this.weights = { ...this.defaultWeights, ...weights };
  }

  async scoreEvent(
    event: Partial<ScrapedEvent>,
    context: EventContext = {}
  ): Promise<QualityScore> {
    try {
      const metrics = await this.calculateMetrics(event, context);
      const overall = this.calculateOverallScore(metrics);
      const breakdown = this.options.includeBreakdown ? this.generateBreakdown(event, metrics) : {};
      const recommendations = this.options.includeRecommendations ? this.generateRecommendations(event, metrics) : [];
      const warnings = this.generateWarnings(event, metrics);
      const tier = this.determineTier(overall);

      logger.info('Event quality scoring completed', {
        eventTitle: event.title,
        overallScore: Math.round(overall * 100),
        tier,
        recommendationsCount: recommendations.length,
        warningsCount: warnings.length
      });

      return {
        overall,
        metrics,
        breakdown,
        recommendations,
        warnings,
        tier
      };

    } catch (error) {
      logger.error('Error during quality scoring:', error);
      
      // Return default poor quality score
      return {
        overall: 0.1,
        metrics: {
          completeness: 0.1,
          accuracy: 0.1,
          relevance: 0.1,
          freshness: 0.1,
          engagement: 0.1,
          trustworthiness: 0.1
        },
        breakdown: {},
        recommendations: ['Event data quality assessment failed'],
        warnings: ['Unable to properly assess event quality'],
        tier: 'poor'
      };
    }
  }

  private async calculateMetrics(
    event: Partial<ScrapedEvent>,
    context: EventContext
  ): Promise<QualityMetrics> {
    const completeness = this.calculateCompleteness(event);
    const accuracy = this.calculateAccuracy(event);
    const relevance = this.calculateRelevance(event, context);
    const freshness = this.calculateFreshness(event);
    const engagement = this.calculateEngagement(event);
    const trustworthiness = this.calculateTrustworthiness(event, context);

    return {
      completeness,
      accuracy,
      relevance,
      freshness,
      engagement,
      trustworthiness
    };
  }

  private calculateCompleteness(event: Partial<ScrapedEvent>): number {
    let totalWeight = 0;
    let achievedWeight = 0;

    for (const [field, weight] of Object.entries(this.fieldWeights)) {
      totalWeight += weight;
      
      const value = (event as any)[field];
      if (this.hasValidValue(value)) {
        // Calculate field-specific quality score
        const fieldQuality = this.calculateFieldQuality(field, value);
        achievedWeight += weight * fieldQuality;
      }
    }

    return totalWeight > 0 ? achievedWeight / totalWeight : 0;
  }

  private calculateFieldQuality(field: string, value: any): number {
    switch (field) {
      case 'title':
        return this.assessTitleQuality(value);
      case 'description':
        return this.assessDescriptionQuality(value);
      case 'images':
        return this.assessImagesQuality(value);
      case 'tags':
        return this.assessTagsQuality(value);
      case 'startDate':
      case 'endDate':
        return this.assessDateQuality(value);
      case 'price':
        return this.assessPriceQuality(value);
      default:
        return this.hasValidValue(value) ? 1.0 : 0.0;
    }
  }

  private assessTitleQuality(title: string): number {
    if (!title || typeof title !== 'string') return 0;
    
    let score = 1.0;
    const indicators = this.qualityIndicators.title;
    
    // Length check
    if (title.length < indicators.minLength) {
      score *= 0.5;
    } else if (title.length > indicators.maxLength) {
      score *= 0.8;
    }
    
    // All caps check
    if (title === title.toUpperCase() && title.length > 10) {
      score *= 0.7;
    }
    
    // Special characters overuse
    const specialCharCount = (title.match(/[!@#$%^&*(),.?":{}|<>]/g) || []).length;
    if (specialCharCount > title.length * 0.1) {
      score *= 0.8;
    }
    
    // Check for meaningful content
    if (title.trim().split(' ').length < 2) {
      score *= 0.6;
    }
    
    return Math.max(0, score);
  }

  private assessDescriptionQuality(description: string): number {
    if (!description || typeof description !== 'string') return 0;
    
    let score = 1.0;
    const indicators = this.qualityIndicators.description;
    
    // Length check
    if (description.length < indicators.minLength) {
      score *= 0.6;
    } else if (description.length > indicators.maxLength) {
      score *= 0.9;
    }
    
    // Sentence structure
    const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 2) {
      score *= 0.7;
    }
    
    // Word variety
    const words = description.toLowerCase().match(/\b\w+\b/g) || [];
    const uniqueWords = new Set(words);
    const wordVariety = uniqueWords.size / words.length;
    if (wordVariety < 0.5) {
      score *= 0.8;
    }
    
    // Contact information bonus
    if (/\b(?:email|phone|call|contact|website|www)\b/i.test(description)) {
      score *= 1.1;
    }
    
    return Math.min(1.0, Math.max(0, score));
  }

  private assessImagesQuality(images: any): number {
    if (!Array.isArray(images)) return 0;
    
    const count = images.length;
    const indicators = this.qualityIndicators.images;
    
    if (count === 0) return 0;
    if (count < indicators.minCount) return 0.5;
    if (count >= indicators.optimalCount && count <= indicators.maxCount) return 1.0;
    if (count > indicators.maxCount) return 0.8;
    
    return Math.min(1.0, count / indicators.optimalCount);
  }

  private assessTagsQuality(tags: any): number {
    if (!Array.isArray(tags)) return 0;
    
    const count = tags.filter(tag => typeof tag === 'string' && tag.trim().length > 0).length;
    const indicators = this.qualityIndicators.tags;
    
    if (count === 0) return 0;
    if (count < indicators.minCount) return 0.5;
    if (count >= indicators.optimalCount && count <= indicators.maxCount) return 1.0;
    if (count > indicators.maxCount) return 0.8;
    
    return Math.min(1.0, count / indicators.optimalCount);
  }

  private assessDateQuality(date: any): number {
    if (!date) return 0;
    
    const parsedDate = new Date(date);
    if (!isValid(parsedDate)) return 0;
    
    // Future dates are better than past dates for events
    if (isFuture(parsedDate)) return 1.0;
    if (isPast(parsedDate)) {
      const daysAgo = Math.abs(differenceInDays(parsedDate, new Date()));
      if (daysAgo <= 30) return 0.8; // Recent past events still have some value
      if (daysAgo <= 90) return 0.4;
      return 0.1;
    }
    
    return 1.0;
  }

  private assessPriceQuality(price: any): number {
    if (price === 0) return 1.0; // Free events are valid
    if (typeof price === 'number' && price > 0) return 1.0;
    if (typeof price === 'string' && price.trim().length > 0) return 0.8; // Text price is less precise
    return 0;
  }

  private calculateAccuracy(event: Partial<ScrapedEvent>): number {
    let score = 1.0;
    const issues: string[] = [];

    // Date consistency
    if (event.startDate && event.endDate) {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      if (isValid(start) && isValid(end) && end < start) {
        score *= 0.5;
        issues.push('End date before start date');
      }
    }

    // Price consistency
    if (event.price && event.priceText) {
      const numericPrice = typeof event.price === 'number' ? event.price : 0;
      const textPrice = event.priceText.toLowerCase();
      
      if (numericPrice === 0 && !textPrice.includes('free') && !textPrice.includes('0')) {
        score *= 0.8;
        issues.push('Price inconsistency between numeric and text values');
      }
    }

    // URL validity
    if (event.website && !this.isValidUrl(event.website)) {
      score *= 0.9;
      issues.push('Invalid website URL');
    }

    // Email validity
    if (event.email && !this.isValidEmail(event.email)) {
      score *= 0.9;
      issues.push('Invalid email format');
    }

    // Location consistency
    if (event.venue && event.address) {
      const venueLower = event.venue.toLowerCase();
      const addressLower = event.address.toLowerCase();
      
      // Check if venue name appears in address (good sign)
      if (!addressLower.includes(venueLower.split(' ')[0])) {
        score *= 0.95; // Minor penalty
      }
    }

    return Math.max(0, score);
  }

  private calculateRelevance(event: Partial<ScrapedEvent>, context: EventContext): number {
    let score = 0.7; // Base relevance

    // Category competition factor
    if (context.categoryCompetition !== undefined) {
      score += (1 - context.categoryCompetition) * 0.1;
    }

    // Location popularity factor
    if (context.locationPopularity !== undefined) {
      score += context.locationPopularity * 0.1;
    }

    // Seasonal relevance
    if (context.seasonalRelevance !== undefined) {
      score += context.seasonalRelevance * 0.1;
    }

    // User interest alignment
    if (context.userInterest !== undefined) {
      score += context.userInterest * 0.1;
    }

    // Content quality indicators
    if (event.description) {
      const keywordDensity = this.calculateKeywordDensity(event.description);
      score += keywordDensity * 0.05;
    }

    // Tag relevance
    if (event.tags && event.tags.length > 0) {
      score += Math.min(0.05, event.tags.length * 0.01);
    }

    return Math.min(1.0, Math.max(0, score));
  }

  private calculateFreshness(event: Partial<ScrapedEvent>): number {
    let score = 0.5; // Base freshness

    // Event date freshness
    if (event.startDate) {
      const eventDate = new Date(event.startDate);
      if (isValid(eventDate)) {
        const now = new Date();
        const daysUntilEvent = differenceInDays(eventDate, now);
        
        if (daysUntilEvent > 0) {
          // Future events are fresher
          if (daysUntilEvent <= 7) score = 1.0; // Very fresh
          else if (daysUntilEvent <= 30) score = 0.9;
          else if (daysUntilEvent <= 90) score = 0.7;
          else score = 0.5;
        } else {
          // Past events lose freshness quickly
          const daysAgo = Math.abs(daysUntilEvent);
          if (daysAgo <= 1) score = 0.8;
          else if (daysAgo <= 7) score = 0.5;
          else if (daysAgo <= 30) score = 0.2;
          else score = 0.1;
        }
      }
    }

    return score;
  }

  private calculateEngagement(event: Partial<ScrapedEvent>): number {
    let score = 0.5; // Base engagement

    // Visual content
    if (event.images && event.images.length > 0) {
      score += Math.min(0.2, event.images.length * 0.05);
    }

    // Rich description
    if (event.description && event.description.length > 200) {
      score += 0.1;
    }

    // Contact methods
    let contactMethods = 0;
    if (event.email) contactMethods++;
    if (event.phone) contactMethods++;
    if (event.website) contactMethods++;
    score += contactMethods * 0.05;

    // Social media indicators
    if (event.website) {
      const socialDomains = ['facebook.com', 'instagram.com', 'twitter.com', 'eventbrite.com'];
      if (socialDomains.some(domain => event.website!.includes(domain))) {
        score += 0.1;
      }
    }

    // Price transparency
    if (event.price !== undefined || event.priceText) {
      score += 0.05;
    }

    return Math.min(1.0, Math.max(0, score));
  }

  private calculateTrustworthiness(event: Partial<ScrapedEvent>, context: EventContext): number {
    let score = 0.6; // Base trustworthiness

    // Source reputation
    if (context.sourceReputation !== undefined) {
      score += context.sourceReputation * 0.3;
    }

    // Complete contact information
    if (event.venue && event.address) {
      score += 0.1;
    }

    // Professional website
    if (event.website && !this.isSocialMediaUrl(event.website)) {
      score += 0.1;
    }

    // Detailed information
    if (event.description && event.description.length > 300) {
      score += 0.05;
    }

    // Multiple images
    if (event.images && event.images.length >= 3) {
      score += 0.05;
    }

    // Consistent pricing
    if (event.price && event.priceText) {
      score += 0.05;
    }

    return Math.min(1.0, Math.max(0, score));
  }

  private calculateOverallScore(metrics: QualityMetrics): number {
    const weights = this.weights as QualityMetrics;
    
    return (
      metrics.completeness * weights.completeness +
      metrics.accuracy * weights.accuracy +
      metrics.relevance * weights.relevance +
      metrics.freshness * weights.freshness +
      metrics.engagement * weights.engagement +
      metrics.trustworthiness * weights.trustworthiness
    );
  }

  private generateBreakdown(event: Partial<ScrapedEvent>, metrics: QualityMetrics): QualityScore['breakdown'] {
    return {
      completeness: {
        score: metrics.completeness,
        weight: (this.weights as QualityMetrics).completeness,
        factors: this.getCompletenesFactors(event)
      },
      accuracy: {
        score: metrics.accuracy,
        weight: (this.weights as QualityMetrics).accuracy,
        factors: this.getAccuracyFactors(event)
      },
      relevance: {
        score: metrics.relevance,
        weight: (this.weights as QualityMetrics).relevance,
        factors: ['Category relevance', 'Location popularity', 'Content quality']
      },
      freshness: {
        score: metrics.freshness,
        weight: (this.weights as QualityMetrics).freshness,
        factors: this.getFreshnessFactors(event)
      },
      engagement: {
        score: metrics.engagement,
        weight: (this.weights as QualityMetrics).engagement,
        factors: this.getEngagementFactors(event)
      },
      trustworthiness: {
        score: metrics.trustworthiness,
        weight: (this.weights as QualityMetrics).trustworthiness,
        factors: this.getTrustworthinessFactors(event)
      }
    };
  }

  private generateRecommendations(event: Partial<ScrapedEvent>, metrics: QualityMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.completeness < 0.7) {
      if (!event.description || event.description.length < 100) {
        recommendations.push('Add a more detailed description (at least 100 characters)');
      }
      if (!event.images || event.images.length === 0) {
        recommendations.push('Add high-quality images to make the event more appealing');
      }
      if (!event.venue || !event.address) {
        recommendations.push('Provide complete venue and address information');
      }
    }

    if (metrics.accuracy < 0.8) {
      recommendations.push('Review all dates, prices, and contact information for accuracy');
    }

    if (metrics.engagement < 0.6) {
      recommendations.push('Add more engaging content like multiple images or social media links');
      recommendations.push('Include clear contact information (phone, email, website)');
    }

    if (metrics.trustworthiness < 0.7) {
      recommendations.push('Provide official website and complete contact details');
      recommendations.push('Add more detailed venue and organizer information');
    }

    return recommendations;
  }

  private generateWarnings(event: Partial<ScrapedEvent>, metrics: QualityMetrics): string[] {
    const warnings: string[] = [];

    if (metrics.overall < 0.3) {
      warnings.push('Event quality is very low and may not be suitable for display');
    }

    if (metrics.freshness < 0.2) {
      warnings.push('Event appears to be outdated or from the past');
    }

    if (metrics.accuracy < 0.5) {
      warnings.push('Event contains inconsistent or potentially incorrect information');
    }

    if (!event.title || event.title.length < 10) {
      warnings.push('Event title is missing or too short');
    }

    if (!event.startDate) {
      warnings.push('Event start date is missing');
    }

    return warnings;
  }

  private determineTier(score: number): QualityScore['tier'] {
    if (score >= 0.8) return 'premium';
    if (score >= 0.6) return 'standard';
    if (score >= 0.4) return 'basic';
    return 'poor';
  }

  // Helper methods
  private hasValidValue(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isSocialMediaUrl(url: string): boolean {
    const socialDomains = [
      'facebook.com', 'instagram.com', 'twitter.com', 'linkedin.com',
      'tiktok.com', 'snapchat.com', 'youtube.com'
    ];
    return socialDomains.some(domain => url.includes(domain));
  }

  private calculateKeywordDensity(text: string): number {
    const eventKeywords = [
      'event', 'music', 'art', 'food', 'entertainment', 'show', 'concert',
      'festival', 'workshop', 'seminar', 'conference', 'meeting', 'party'
    ];
    
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const keywordCount = words.filter(word => eventKeywords.includes(word)).length;
    
    return words.length > 0 ? keywordCount / words.length : 0;
  }

  private getCompletenesFactors(event: Partial<ScrapedEvent>): string[] {
    const factors: string[] = [];
    
    if (event.title) factors.push('Has title');
    if (event.description) factors.push('Has description');
    if (event.startDate) factors.push('Has start date');
    if (event.venue || event.address) factors.push('Has location info');
    if (event.images && event.images.length > 0) factors.push('Has images');
    if (event.price !== undefined || event.priceText) factors.push('Has pricing info');
    
    return factors;
  }

  private getAccuracyFactors(event: Partial<ScrapedEvent>): string[] {
    const factors: string[] = ['Date consistency', 'Price consistency', 'Contact validation'];
    
    if (event.website && this.isValidUrl(event.website)) {
      factors.push('Valid website URL');
    }
    
    if (event.email && this.isValidEmail(event.email)) {
      factors.push('Valid email format');
    }
    
    return factors;
  }

  private getFreshnessFactors(event: Partial<ScrapedEvent>): string[] {
    const factors: string[] = [];
    
    if (event.startDate) {
      const eventDate = new Date(event.startDate);
      if (isValid(eventDate)) {
        const daysUntilEvent = differenceInDays(eventDate, new Date());
        
        if (daysUntilEvent > 0) {
          factors.push('Future event');
        } else {
          factors.push('Past event');
        }
        
        if (Math.abs(daysUntilEvent) <= 7) {
          factors.push('Within one week');
        }
      }
    }
    
    return factors;
  }

  private getEngagementFactors(event: Partial<ScrapedEvent>): string[] {
    const factors: string[] = [];
    
    if (event.images && event.images.length > 0) {
      factors.push(`${event.images.length} image(s)`);
    }
    
    if (event.description && event.description.length > 200) {
      factors.push('Rich description');
    }
    
    if (event.website) factors.push('Has website');
    if (event.email) factors.push('Has email');
    if (event.phone) factors.push('Has phone');
    
    return factors;
  }

  private getTrustworthinessFactors(event: Partial<ScrapedEvent>): string[] {
    const factors: string[] = [];
    
    if (event.venue && event.address) {
      factors.push('Complete venue info');
    }
    
    if (event.website && !this.isSocialMediaUrl(event.website)) {
      factors.push('Professional website');
    }
    
    if (event.description && event.description.length > 300) {
      factors.push('Detailed description');
    }
    
    return factors;
  }

  // Public method for batch scoring
  async batchScore(events: Partial<ScrapedEvent>[], context: EventContext = {}): Promise<QualityScore[]> {
    const scores: QualityScore[] = [];
    
    for (const event of events) {
      try {
        const score = await this.scoreEvent(event, context);
        scores.push(score);
      } catch (error) {
        logger.error('Failed to score event:', error);
        scores.push({
          overall: 0.1,
          metrics: {
            completeness: 0.1,
            accuracy: 0.1,
            relevance: 0.1,
            freshness: 0.1,
            engagement: 0.1,
            trustworthiness: 0.1
          },
          breakdown: {},
          recommendations: [],
          warnings: ['Scoring failed'],
          tier: 'poor'
        });
      }
    }
    
    return scores;
  }
}