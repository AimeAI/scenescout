import { logger } from '@/lib/utils/logger';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeocodingResult {
  coordinates?: Coordinates;
  formattedAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  confidence: number;
  source: 'cache' | 'api' | 'fallback';
}

export interface GeocodingOptions {
  cacheEnabled?: boolean;
  cacheTTL?: number; // Time to live in minutes
  fallbackToApproximateLocation?: boolean;
  maxRetries?: number;
  timeout?: number; // Timeout in milliseconds
}

interface CacheEntry {
  result: GeocodingResult;
  timestamp: number;
  ttl: number;
}

export class GeocodingService {
  private cache = new Map<string, CacheEntry>();
  private readonly defaultOptions: GeocodingOptions = {
    cacheEnabled: true,
    cacheTTL: 60 * 24, // 24 hours
    fallbackToApproximateLocation: true,
    maxRetries: 3,
    timeout: 5000
  };

  // City/state coordinates for fallback
  private readonly cityCoordinates = new Map([
    ['new york, ny', { latitude: 40.7128, longitude: -74.0060 }],
    ['los angeles, ca', { latitude: 34.0522, longitude: -118.2437 }],
    ['chicago, il', { latitude: 41.8781, longitude: -87.6298 }],
    ['houston, tx', { latitude: 29.7604, longitude: -95.3698 }],
    ['phoenix, az', { latitude: 33.4484, longitude: -112.0740 }],
    ['philadelphia, pa', { latitude: 39.9526, longitude: -75.1652 }],
    ['san antonio, tx', { latitude: 29.4241, longitude: -98.4936 }],
    ['san diego, ca', { latitude: 32.7157, longitude: -117.1611 }],
    ['dallas, tx', { latitude: 32.7767, longitude: -96.7970 }],
    ['san jose, ca', { latitude: 37.3382, longitude: -121.8863 }],
    ['austin, tx', { latitude: 30.2672, longitude: -97.7431 }],
    ['jacksonville, fl', { latitude: 30.3322, longitude: -81.6557 }],
    ['fort worth, tx', { latitude: 32.7555, longitude: -97.3308 }],
    ['columbus, oh', { latitude: 39.9612, longitude: -82.9988 }],
    ['charlotte, nc', { latitude: 35.2271, longitude: -80.8431 }],
    ['san francisco, ca', { latitude: 37.7749, longitude: -122.4194 }],
    ['indianapolis, in', { latitude: 39.7684, longitude: -86.1581 }],
    ['seattle, wa', { latitude: 47.6062, longitude: -122.3321 }],
    ['denver, co', { latitude: 39.7392, longitude: -104.9903 }],
    ['washington, dc', { latitude: 38.9072, longitude: -77.0369 }],
    ['boston, ma', { latitude: 42.3601, longitude: -71.0589 }],
    ['nashville, tn', { latitude: 36.1627, longitude: -86.7816 }],
    ['baltimore, md', { latitude: 39.2904, longitude: -76.6122 }],
    ['louisville, ky', { latitude: 38.2527, longitude: -85.7585 }],
    ['portland, or', { latitude: 45.5152, longitude: -122.6784 }],
    ['las vegas, nv', { latitude: 36.1699, longitude: -115.1398 }],
    ['milwaukee, wi', { latitude: 43.0389, longitude: -87.9065 }],
    ['albuquerque, nm', { latitude: 35.0853, longitude: -106.6056 }],
    ['tucson, az', { latitude: 32.2226, longitude: -110.9747 }],
    ['fresno, ca', { latitude: 36.7378, longitude: -119.7871 }],
    ['mesa, az', { latitude: 33.4152, longitude: -111.8315 }],
    ['sacramento, ca', { latitude: 38.5816, longitude: -121.4944 }],
    ['atlanta, ga', { latitude: 33.7490, longitude: -84.3880 }],
    ['kansas city, mo', { latitude: 39.0997, longitude: -94.5786 }],
    ['colorado springs, co', { latitude: 38.8339, longitude: -104.8214 }],
    ['omaha, ne', { latitude: 41.2565, longitude: -95.9345 }],
    ['raleigh, nc', { latitude: 35.7796, longitude: -78.6382 }],
    ['miami, fl', { latitude: 25.7617, longitude: -80.1918 }],
    ['cleveland, oh', { latitude: 41.4993, longitude: -81.6944 }],
    ['tulsa, ok', { latitude: 36.1540, longitude: -95.9928 }],
    ['minneapolis, mn', { latitude: 44.9778, longitude: -93.2650 }],
    ['wichita, ks', { latitude: 37.6872, longitude: -97.3301 }],
    ['arlington, tx', { latitude: 32.7357, longitude: -97.1081 }]
  ]);

  constructor(private options: GeocodingOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  async geocode(address: string): Promise<GeocodingResult> {
    if (!address || typeof address !== 'string') {
      return { confidence: 0, source: 'fallback' };
    }

    const normalizedAddress = this.normalizeAddress(address);
    const cacheKey = this.getCacheKey(normalizedAddress);

    // Check cache first
    if (this.options.cacheEnabled) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.debug('Geocoding result retrieved from cache', { address: normalizedAddress });
        return cached;
      }
    }

    try {
      // Try multiple geocoding strategies
      let result = await this.tryNominatimGeocoding(normalizedAddress);
      
      if (!result.coordinates && this.options.fallbackToApproximateLocation) {
        result = await this.tryFallbackGeocoding(normalizedAddress);
      }

      // Cache the result
      if (this.options.cacheEnabled && result.confidence > 0) {
        this.saveToCache(cacheKey, result);
      }

      logger.info('Geocoding completed', {
        address: normalizedAddress,
        confidence: result.confidence,
        source: result.source,
        hasCoordinates: !!result.coordinates
      });

      return result;

    } catch (error) {
      logger.error('Geocoding failed:', error);
      
      // Return fallback result
      const fallback = await this.tryFallbackGeocoding(normalizedAddress);
      return {
        ...fallback,
        confidence: Math.max(0, fallback.confidence - 0.5) // Reduce confidence for error case
      };
    }
  }

  async batchGeocode(addresses: string[]): Promise<GeocodingResult[]> {
    const results: GeocodingResult[] = [];
    const batchSize = 10; // Process in smaller batches to avoid rate limits
    
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const batchPromises = batch.map(address => this.geocode(address));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Add delay between batches to respect rate limits
        if (i + batchSize < addresses.length) {
          await this.delay(1000); // 1 second delay
        }
      } catch (error) {
        logger.error('Batch geocoding failed for batch starting at index', i, error);
        // Add fallback results for failed batch
        const fallbackResults = await Promise.all(
          batch.map(address => this.tryFallbackGeocoding(address))
        );
        results.push(...fallbackResults);
      }
    }
    
    return results;
  }

  private async tryNominatimGeocoding(address: string): Promise<GeocodingResult> {
    try {
      const encodedAddress = encodeURIComponent(address);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'SceneScout/1.0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const confidence = this.calculateNominatimConfidence(result);
        
        return {
          coordinates: {
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon)
          },
          formattedAddress: result.display_name,
          city: result.address?.city || result.address?.town || result.address?.village,
          state: result.address?.state,
          country: result.address?.country,
          postalCode: result.address?.postcode,
          confidence,
          source: 'api'
        };
      }
      
      return { confidence: 0, source: 'api' };
      
    } catch (error) {
      logger.warn('Nominatim geocoding failed:', error);
      return { confidence: 0, source: 'api' };
    }
  }


  private async tryFallbackGeocoding(address: string): Promise<GeocodingResult> {
    const normalizedAddress = address.toLowerCase();
    
    // Try exact city match first
    for (const [cityKey, coords] of this.cityCoordinates.entries()) {
      if (normalizedAddress.includes(cityKey)) {
        const [city, state] = cityKey.split(', ');
        return {
          coordinates: coords,
          formattedAddress: address,
          city: this.capitalizeWords(city),
          state: state.toUpperCase(),
          country: 'United States',
          confidence: 0.6,
          source: 'fallback'
        };
      }
    }
    
    // Try partial city match
    for (const [cityKey, coords] of this.cityCoordinates.entries()) {
      const [city] = cityKey.split(', ');
      if (normalizedAddress.includes(city)) {
        const [, state] = cityKey.split(', ');
        return {
          coordinates: coords,
          formattedAddress: address,
          city: this.capitalizeWords(city),
          state: state?.toUpperCase(),
          country: 'United States',
          confidence: 0.4,
          source: 'fallback'
        };
      }
    }
    
    // No match found
    return {
      formattedAddress: address,
      confidence: 0,
      source: 'fallback'
    };
  }

  private normalizeAddress(address: string): string {
    return address
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s,.-]/g, '') // Remove special characters except basic punctuation
      .toLowerCase();
  }

  private getCacheKey(address: string): string {
    return `geocode:${address}`;
  }

  private getFromCache(key: string): GeocodingResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl * 60 * 1000) {
      this.cache.delete(key);
      return null;
    }
    
    return { ...entry.result, source: 'cache' };
  }

  private saveToCache(key: string, result: GeocodingResult): void {
    const entry: CacheEntry = {
      result,
      timestamp: Date.now(),
      ttl: this.options.cacheTTL || 60 * 24
    };
    
    this.cache.set(key, entry);
    
    // Clean up old entries if cache gets too large
    if (this.cache.size > 1000) {
      this.cleanupCache();
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    const toDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl * 60 * 1000) {
        toDelete.push(key);
      }
    }
    
    toDelete.forEach(key => this.cache.delete(key));
  }

  private calculateNominatimConfidence(result: any): number {
    let confidence = 0.7; // Base confidence for Nominatim
    
    // Increase confidence based on importance score
    if (result.importance) {
      confidence += Math.min(0.3, result.importance * 0.3);
    }
    
    // Increase confidence if we have detailed address components
    if (result.address) {
      const components = Object.keys(result.address).length;
      confidence += Math.min(0.2, components * 0.02);
    }
    
    return Math.min(1.0, confidence);
  }



  private capitalizeWords(str: string): string {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public method to clear cache
  clearCache(): void {
    this.cache.clear();
    logger.info('Geocoding cache cleared');
  }

  // Public method to get cache stats
  getCacheStats(): { size: number; hitRate?: number } {
    return {
      size: this.cache.size
    };
  }
}