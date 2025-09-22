import { logger } from '@/lib/utils/logger';
import OpenAI from 'openai';

export interface ClassificationResult {
  categories: string[];
  tags: string[];
  confidence: number;
  reasoning?: string;
  aiGenerated: boolean;
}

export interface ClassificationOptions {
  maxCategories?: number;
  maxTags?: number;
  includeReasoning?: boolean;
  fallbackToRuleBased?: boolean;
  confidenceThreshold?: number;
}

export interface EventData {
  title: string;
  description?: string;
  venue?: string;
  tags?: string[];
  price?: number;
  priceText?: string;
}

interface CacheEntry {
  result: ClassificationResult;
  timestamp: number;
  ttl: number;
}

export class CategoryClassifier {
  private openai?: OpenAI;
  private cache = new Map<string, CacheEntry>();
  
  private readonly defaultOptions: ClassificationOptions = {
    maxCategories: 3,
    maxTags: 8,
    includeReasoning: false,
    fallbackToRuleBased: true,
    confidenceThreshold: 0.7
  };

  private readonly predefinedCategories = [
    'music',
    'arts',
    'food',
    'sports',
    'business',
    'entertainment',
    'education',
    'community',
    'technology',
    'health',
    'fashion',
    'travel',
    'automotive',
    'family',
    'nightlife',
    'outdoor',
    'shopping',
    'volunteer'
  ];

  private readonly ruleBasedMappings = {
    music: {
      keywords: ['concert', 'music', 'band', 'singer', 'dj', 'festival', 'live music', 'acoustic', 'rock', 'jazz', 'classical', 'electronic', 'hip hop', 'country', 'pop', 'indie', 'folk', 'blues', 'reggae', 'opera'],
      venues: ['arena', 'amphitheater', 'concert hall', 'club', 'bar'],
      priceIndicators: ['ticket', 'admission']
    },
    arts: {
      keywords: ['art', 'gallery', 'exhibition', 'museum', 'theater', 'theatre', 'play', 'dance', 'ballet', 'opera', 'sculpture', 'painting', 'photography', 'craft', 'pottery', 'drawing'],
      venues: ['gallery', 'museum', 'theater', 'theatre', 'studio', 'center'],
      priceIndicators: ['admission', 'entry']
    },
    food: {
      keywords: ['food', 'restaurant', 'dining', 'culinary', 'cooking', 'tasting', 'wine', 'beer', 'cocktail', 'chef', 'cuisine', 'brunch', 'dinner', 'lunch', 'breakfast', 'bbq', 'barbecue'],
      venues: ['restaurant', 'bar', 'brewery', 'winery', 'cafe', 'kitchen'],
      priceIndicators: ['per person', 'prix fixe', 'tasting menu']
    },
    sports: {
      keywords: ['sport', 'game', 'match', 'tournament', 'athletic', 'fitness', 'basketball', 'football', 'soccer', 'baseball', 'tennis', 'golf', 'hockey', 'volleyball', 'swimming', 'running', 'cycling', 'marathon'],
      venues: ['stadium', 'arena', 'field', 'court', 'gym', 'pool'],
      priceIndicators: ['ticket', 'admission', 'entry fee']
    },
    business: {
      keywords: ['conference', 'networking', 'seminar', 'workshop', 'meeting', 'summit', 'convention', 'expo', 'trade show', 'startup', 'entrepreneur', 'business', 'corporate', 'professional'],
      venues: ['convention center', 'hotel', 'conference center', 'office'],
      priceIndicators: ['registration', 'ticket', 'admission']
    },
    entertainment: {
      keywords: ['comedy', 'show', 'performance', 'entertainment', 'fun', 'magic', 'circus', 'carnival', 'fair', 'amusement', 'standup', 'improv', 'variety show'],
      venues: ['theater', 'club', 'venue', 'hall'],
      priceIndicators: ['ticket', 'admission']
    },
    education: {
      keywords: ['class', 'course', 'lesson', 'training', 'education', 'learning', 'workshop', 'tutorial', 'lecture', 'certification', 'skill', 'academy', 'school'],
      venues: ['school', 'university', 'college', 'center', 'studio'],
      priceIndicators: ['tuition', 'fee', 'registration']
    },
    community: {
      keywords: ['community', 'volunteer', 'charity', 'fundraiser', 'social', 'meetup', 'group', 'club', 'organization', 'nonprofit', 'civic', 'local'],
      venues: ['community center', 'library', 'park', 'church'],
      priceIndicators: ['donation', 'contribution']
    },
    technology: {
      keywords: ['tech', 'technology', 'software', 'coding', 'programming', 'ai', 'blockchain', 'startup', 'innovation', 'digital', 'app', 'web', 'mobile', 'data'],
      venues: ['office', 'coworking', 'incubator', 'lab'],
      priceIndicators: ['registration', 'ticket']
    },
    health: {
      keywords: ['health', 'wellness', 'fitness', 'yoga', 'meditation', 'nutrition', 'medical', 'mental health', 'therapy', 'healing', 'spa', 'massage'],
      venues: ['studio', 'spa', 'center', 'clinic', 'gym'],
      priceIndicators: ['session', 'class fee']
    },
    family: {
      keywords: ['family', 'kids', 'children', 'parents', 'baby', 'toddler', 'playground', 'story time', 'craft', 'educational'],
      venues: ['park', 'library', 'center', 'museum'],
      priceIndicators: ['per child', 'family pass']
    },
    outdoor: {
      keywords: ['outdoor', 'hiking', 'camping', 'nature', 'park', 'trail', 'adventure', 'fishing', 'hunting', 'climbing', 'kayaking', 'biking'],
      venues: ['park', 'trail', 'lake', 'mountain', 'forest'],
      priceIndicators: ['permit', 'entry fee']
    }
  };

  constructor(private options: ClassificationOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
    
    // Initialize OpenAI if API key is available
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    } else {
      logger.warn('OpenAI API key not found, falling back to rule-based classification only');
    }
  }

  async classify(eventData: EventData): Promise<ClassificationResult> {
    const cacheKey = this.getCacheKey(eventData);
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      logger.debug('Classification result retrieved from cache');
      return cached;
    }

    try {
      let result: ClassificationResult;

      // Try AI classification first if available
      if (this.openai) {
        result = await this.classifyWithAI(eventData);
        
        // Fall back to rule-based if AI confidence is too low
        if (result.confidence < (this.options.confidenceThreshold || 0.7) && this.options.fallbackToRuleBased) {
          const ruleBasedResult = this.classifyWithRules(eventData);
          if (ruleBasedResult.confidence > result.confidence) {
            result = {
              ...ruleBasedResult,
              reasoning: `AI confidence too low (${result.confidence.toFixed(2)}), used rule-based classification`
            };
          }
        }
      } else {
        // Use rule-based classification only
        result = this.classifyWithRules(eventData);
      }

      // Cache the result
      this.saveToCache(cacheKey, result);

      logger.info('Event classification completed', {
        title: eventData.title,
        categories: result.categories,
        tags: result.tags,
        confidence: result.confidence,
        aiGenerated: result.aiGenerated
      });

      return result;

    } catch (error) {
      logger.error('Classification failed:', error);
      
      // Return fallback rule-based classification
      const fallback = this.classifyWithRules(eventData);
      return {
        ...fallback,
        confidence: Math.max(0, fallback.confidence - 0.3), // Reduce confidence for error case
        reasoning: `AI classification failed, used rule-based fallback: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async classifyWithAI(eventData: EventData): Promise<ClassificationResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not initialized');
    }

    const prompt = this.buildAIPrompt(eventData);
    
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are an expert event categorization assistant. Your task is to classify events into relevant categories and extract meaningful tags.

Available categories: ${this.predefinedCategories.join(', ')}

Respond with valid JSON only, no additional text. Include confidence score (0-1) and reasoning if requested.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    try {
      const aiResult = JSON.parse(responseText);
      
      return {
        categories: (aiResult.categories || []).slice(0, this.options.maxCategories),
        tags: (aiResult.tags || []).slice(0, this.options.maxTags),
        confidence: aiResult.confidence || 0.5,
        reasoning: this.options.includeReasoning ? aiResult.reasoning : undefined,
        aiGenerated: true
      };
    } catch (parseError) {
      logger.error('Failed to parse AI response:', parseError, { response: responseText });
      throw new Error('Invalid AI response format');
    }
  }

  private classifyWithRules(eventData: EventData): ClassificationResult {
    const allText = [
      eventData.title,
      eventData.description,
      eventData.venue,
      eventData.priceText,
      ...(eventData.tags || [])
    ].filter(Boolean).join(' ').toLowerCase();

    const categoryScores = new Map<string, number>();
    const extractedTags = new Set<string>();

    // Score each category based on keyword matches
    for (const [category, rules] of Object.entries(this.ruleBasedMappings)) {
      let score = 0;
      
      // Check keywords
      for (const keyword of rules.keywords) {
        if (allText.includes(keyword)) {
          score += 1;
          extractedTags.add(keyword);
        }
      }
      
      // Check venues (higher weight)
      for (const venue of rules.venues) {
        if (allText.includes(venue)) {
          score += 2;
          extractedTags.add(venue);
        }
      }
      
      // Check price indicators
      for (const priceIndicator of rules.priceIndicators) {
        if (allText.includes(priceIndicator)) {
          score += 0.5;
        }
      }
      
      if (score > 0) {
        categoryScores.set(category, score);
      }
    }

    // Extract additional tags from title and description
    this.extractAdditionalTags(eventData, extractedTags);

    // Sort categories by score and take top N
    const sortedCategories = Array.from(categoryScores.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, this.options.maxCategories)
      .map(([category]) => category);

    // Calculate confidence based on match strength
    const maxScore = Math.max(...Array.from(categoryScores.values()), 0);
    const confidence = Math.min(1.0, maxScore / 5); // Normalize to 0-1 range

    const finalTags = Array.from(extractedTags)
      .filter(tag => tag.length > 2 && tag.length <= 30)
      .slice(0, this.options.maxTags);

    return {
      categories: sortedCategories,
      tags: finalTags,
      confidence,
      reasoning: this.options.includeReasoning ? 
        `Rule-based classification. Top matches: ${Array.from(categoryScores.entries()).slice(0, 3).map(([cat, score]) => `${cat}(${score})`).join(', ')}` : 
        undefined,
      aiGenerated: false
    };
  }

  private buildAIPrompt(eventData: EventData): string {
    const sections = [];
    
    sections.push(`Title: ${eventData.title}`);
    
    if (eventData.description) {
      sections.push(`Description: ${eventData.description.substring(0, 500)}`);
    }
    
    if (eventData.venue) {
      sections.push(`Venue: ${eventData.venue}`);
    }
    
    if (eventData.price !== undefined) {
      sections.push(`Price: $${eventData.price}`);
    } else if (eventData.priceText) {
      sections.push(`Price: ${eventData.priceText}`);
    }
    
    if (eventData.tags && eventData.tags.length > 0) {
      sections.push(`Existing tags: ${eventData.tags.join(', ')}`);
    }

    const eventInfo = sections.join('\n');
    
    return `Classify this event into up to ${this.options.maxCategories} categories and extract up to ${this.options.maxTags} relevant tags.

Event information:
${eventInfo}

Respond with JSON in this exact format:
{
  "categories": ["category1", "category2"],
  "tags": ["tag1", "tag2", "tag3"],
  "confidence": 0.85${this.options.includeReasoning ? ',\n  "reasoning": "Brief explanation of classification"' : ''}
}`;
  }

  private extractAdditionalTags(eventData: EventData, tags: Set<string>): void {
    const text = `${eventData.title} ${eventData.description || ''}`;
    
    // Extract potential tags using simple heuristics
    const words = text.toLowerCase().match(/\b\w{3,}\b/g) || [];
    const commonWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use']);
    
    for (const word of words) {
      if (!commonWords.has(word) && word.length >= 3 && word.length <= 20) {
        tags.add(word);
      }
    }
    
    // Extract proper nouns (capitalized words)
    const properNouns = text.match(/\b[A-Z][a-z]+\b/g) || [];
    for (const noun of properNouns) {
      if (noun.length >= 3 && noun.length <= 20) {
        tags.add(noun.toLowerCase());
      }
    }
  }

  private getCacheKey(eventData: EventData): string {
    const keyData = {
      title: eventData.title,
      description: eventData.description?.substring(0, 100),
      venue: eventData.venue
    };
    return `classify:${JSON.stringify(keyData)}`;
  }

  private getFromCache(key: string): ClassificationResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    const ttl = 60 * 60 * 1000; // 1 hour
    if (now - entry.timestamp > ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.result;
  }

  private saveToCache(key: string, result: ClassificationResult): void {
    const entry: CacheEntry = {
      result,
      timestamp: Date.now(),
      ttl: 60 * 60 * 1000 // 1 hour
    };
    
    this.cache.set(key, entry);
    
    // Clean up old entries if cache gets too large
    if (this.cache.size > 500) {
      this.cleanupCache();
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        toDelete.push(key);
      }
    }
    
    toDelete.forEach(key => this.cache.delete(key));
  }

  // Public method to get available categories
  getAvailableCategories(): string[] {
    return [...this.predefinedCategories];
  }

  // Public method to clear cache
  clearCache(): void {
    this.cache.clear();
    logger.info('Classification cache cleared');
  }

  // Public method to get cache stats
  getCacheStats(): { size: number } {
    return {
      size: this.cache.size
    };
  }

  // Batch classification for multiple events
  async batchClassify(events: EventData[]): Promise<ClassificationResult[]> {
    const results: ClassificationResult[] = [];
    const batchSize = 5; // Process in smaller batches to avoid rate limits
    
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      const batchPromises = batch.map(event => this.classify(event));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Add delay between batches to respect rate limits
        if (i + batchSize < events.length) {
          await this.delay(1000); // 1 second delay
        }
      } catch (error) {
        logger.error('Batch classification failed for batch starting at index', i, error);
        // Add fallback results for failed batch
        const fallbackResults = batch.map(event => this.classifyWithRules(event));
        results.push(...fallbackResults);
      }
    }
    
    return results;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}