/**
 * Database Performance Optimizer
 * Optimizes Supabase queries, connection pooling, and database operations
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types';

export interface DatabaseOptimizationConfig {
  connectionPool: {
    minConnections: number;
    maxConnections: number;
    idleTimeout: number;
    connectionTimeout: number;
  };
  queryOptimization: {
    enablePreparedStatements: boolean;
    queryTimeout: number;
    batchingEnabled: boolean;
    maxBatchSize: number;
  };
  caching: {
    enabled: boolean;
    ttl: number;
    maxEntries: number;
    strategy: 'lru' | 'lfu' | 'ttl';
  };
  indexing: {
    autoAnalyze: boolean;
    suggestIndexes: boolean;
    monitorSlowQueries: boolean;
  };
}

export interface DatabaseMetrics {
  connections: {
    active: number;
    idle: number;
    total: number;
    poolUtilization: number;
  };
  queries: {
    totalQueries: number;
    averageLatency: number;
    slowQueries: number;
    cacheHitRatio: number;
  };
  performance: {
    throughput: number;
    errorRate: number;
    connectionErrors: number;
  };
}

export interface QueryPlan {
  query: string;
  executionTime: number;
  rowsReturned: number;
  indexesUsed: string[];
  recommendedIndexes: string[];
  optimizationSuggestions: string[];
}

export class DatabaseOptimizer {
  private client: SupabaseClient<Database>;
  private config: DatabaseOptimizationConfig;
  private metrics: DatabaseMetrics;
  private queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private queryStats = new Map<string, { count: number; totalTime: number; errors: number }>();
  private slowQueryThreshold = 1000; // 1 second
  private slowQueries: QueryPlan[] = [];
  private metricsInterval?: NodeJS.Timeout;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    config: Partial<DatabaseOptimizationConfig> = {}
  ) {
    this.config = {
      connectionPool: {
        minConnections: 2,
        maxConnections: 10,
        idleTimeout: 30000,
        connectionTimeout: 10000,
        ...config.connectionPool
      },
      queryOptimization: {
        enablePreparedStatements: true,
        queryTimeout: 30000,
        batchingEnabled: true,
        maxBatchSize: 100,
        ...config.queryOptimization
      },
      caching: {
        enabled: true,
        ttl: 300000, // 5 minutes
        maxEntries: 1000,
        strategy: 'lru',
        ...config.caching
      },
      indexing: {
        autoAnalyze: true,
        suggestIndexes: true,
        monitorSlowQueries: true,
        ...config.indexing
      }
    };

    // Create optimized Supabase client
    this.client = createClient(supabaseUrl, supabaseKey, {
      db: {
        schema: 'public'
      },
      auth: {
        persistSession: false // Reduce memory usage for server-side operations
      },
      global: {
        headers: {
          'x-client-info': 'scenescout-optimized'
        }
      }
    });

    this.metrics = this.initializeMetrics();
    this.setupOptimizations();
  }

  private initializeMetrics(): DatabaseMetrics {
    return {
      connections: {
        active: 0,
        idle: 0,
        total: 0,
        poolUtilization: 0
      },
      queries: {
        totalQueries: 0,
        averageLatency: 0,
        slowQueries: 0,
        cacheHitRatio: 0
      },
      performance: {
        throughput: 0,
        errorRate: 0,
        connectionErrors: 0
      }
    };
  }

  private setupOptimizations(): void {
    console.log('🖾 Setting up database optimizations');
    
    // Setup query caching
    if (this.config.caching.enabled) {
      this.setupQueryCaching();
    }
    
    // Setup query monitoring
    if (this.config.indexing.monitorSlowQueries) {
      this.setupSlowQueryMonitoring();
    }
    
    // Start metrics collection
    this.startMetricsCollection();
  }

  private setupQueryCaching(): void {
    console.log('💾 Setting up intelligent query caching');
    
    // Clean up expired cache entries periodically
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 60000); // Every minute
  }

  private cleanupExpiredCache(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, entry] of this.queryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.queryCache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned ${cleanedCount} expired cache entries`);
    }
  }

  private setupSlowQueryMonitoring(): void {
    console.log('🐌 Setting up slow query monitoring');
    
    // Monitor queries and log slow ones
    setInterval(() => {
      this.analyzeSlowQueries();
    }, 300000); // Every 5 minutes
  }

  private analyzeSlowQueries(): void {
    if (this.slowQueries.length === 0) return;
    
    console.log(`📊 Analyzing ${this.slowQueries.length} slow queries`);
    
    // Group by query pattern
    const queryGroups = new Map<string, QueryPlan[]>();
    
    for (const query of this.slowQueries) {
      const pattern = this.extractQueryPattern(query.query);
      if (!queryGroups.has(pattern)) {
        queryGroups.set(pattern, []);
      }
      queryGroups.get(pattern)!.push(query);
    }
    
    // Generate optimization recommendations
    for (const [pattern, queries] of queryGroups) {
      const recommendations = this.generateOptimizationRecommendations(pattern, queries);
      
      if (recommendations.length > 0) {
        console.log(`💡 Recommendations for query pattern "${pattern}":`);
        recommendations.forEach(rec => console.log(`  - ${rec}`));
      }
    }
    
    // Clear analyzed queries
    this.slowQueries = [];
  }

  private extractQueryPattern(query: string): string {
    // Extract the basic pattern from a query (remove specific values)
    return query
      .replace(/\$\d+/g, '$?') // Replace parameter placeholders
      .replace(/'[^']*'/g, "'?") // Replace string literals
      .replace(/\d+/g, '?') // Replace numbers
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private generateOptimizationRecommendations(pattern: string, queries: QueryPlan[]): string[] {
    const recommendations: string[] = [];
    const avgExecutionTime = queries.reduce((sum, q) => sum + q.executionTime, 0) / queries.length;
    
    if (avgExecutionTime > 2000) {
      recommendations.push('Query is consistently slow (>2s) - consider adding indexes or optimizing joins');
    }
    
    // Check for missing indexes
    const commonIndexes = queries.flatMap(q => q.recommendedIndexes);
    const indexCounts = new Map<string, number>();
    
    for (const index of commonIndexes) {
      indexCounts.set(index, (indexCounts.get(index) || 0) + 1);
    }
    
    for (const [index, count] of indexCounts) {
      if (count >= queries.length * 0.5) { // If recommended in 50%+ of cases
        recommendations.push(`Consider adding index: ${index}`);
      }
    }
    
    // Check for large result sets
    const avgRowsReturned = queries.reduce((sum, q) => sum + q.rowsReturned, 0) / queries.length;
    if (avgRowsReturned > 1000) {
      recommendations.push('Query returns large result sets - consider pagination or filtering');
    }
    
    return recommendations;
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, 10000); // Every 10 seconds
  }

  private updateMetrics(): void {
    // Update cache hit ratio
    const totalQueries = this.metrics.queries.totalQueries;
    if (totalQueries > 0) {
      const cacheQueries = Array.from(this.queryStats.values())
        .reduce((sum, stat) => sum + stat.count, 0);
      
      this.metrics.queries.cacheHitRatio = this.queryCache.size / Math.max(cacheQueries, 1);
    }
    
    // Update average latency
    const allStats = Array.from(this.queryStats.values());
    if (allStats.length > 0) {
      const totalTime = allStats.reduce((sum, stat) => sum + stat.totalTime, 0);
      const totalCount = allStats.reduce((sum, stat) => sum + stat.count, 0);
      this.metrics.queries.averageLatency = totalTime / Math.max(totalCount, 1);
    }
    
    // Update error rate
    const totalErrors = allStats.reduce((sum, stat) => sum + stat.errors, 0);
    this.metrics.performance.errorRate = totalErrors / Math.max(totalQueries, 1);
  }

  /**
   * Optimized query methods
   */
  
  /**
   * Execute query with caching and performance tracking
   */
  async executeOptimizedQuery<T>(
    queryKey: string,
    queryFn: () => Promise<{ data: T; error: any }>,
    options: {
      cacheTTL?: number;
      bypassCache?: boolean;
      timeout?: number;
    } = {}
  ): Promise<{ data: T; error: any; fromCache: boolean }> {
    const startTime = Date.now();
    const cacheKey = `query:${queryKey}`;
    
    // Check cache first
    if (!options.bypassCache && this.config.caching.enabled) {
      const cached = this.getCachedQuery(cacheKey);
      if (cached) {
        this.updateQueryStats(queryKey, Date.now() - startTime, false);
        return { ...cached, fromCache: true };
      }
    }
    
    // Execute query with timeout
    const timeout = options.timeout || this.config.queryOptimization.queryTimeout;
    
    try {
      const result = await Promise.race([
        queryFn(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), timeout)
        )
      ]);
      
      const executionTime = Date.now() - startTime;
      
      // Cache successful results
      if (!result.error && this.config.caching.enabled) {
        this.setCachedQuery(cacheKey, result, options.cacheTTL);
      }
      
      // Track slow queries
      if (executionTime > this.slowQueryThreshold && this.config.indexing.monitorSlowQueries) {
        this.trackSlowQuery(queryKey, executionTime);
      }
      
      this.updateQueryStats(queryKey, executionTime, !!result.error);
      this.metrics.queries.totalQueries++;
      
      return { ...result, fromCache: false };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.updateQueryStats(queryKey, executionTime, true);
      this.metrics.queries.totalQueries++;
      
      return { data: null as T, error, fromCache: false };
    }
  }

  private getCachedQuery(key: string): any {
    const cached = this.queryCache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.queryCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private setCachedQuery(key: string, data: any, customTTL?: number): void {
    const ttl = customTTL || this.config.caching.ttl;
    
    // Evict oldest entries if cache is full
    if (this.queryCache.size >= this.config.caching.maxEntries) {
      this.evictOldestCacheEntry();
    }
    
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private evictOldestCacheEntry(): void {
    let oldestKey = '';
    let oldestTimestamp = Date.now();
    
    for (const [key, entry] of this.queryCache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.queryCache.delete(oldestKey);
    }
  }

  private updateQueryStats(queryKey: string, executionTime: number, hasError: boolean): void {
    if (!this.queryStats.has(queryKey)) {
      this.queryStats.set(queryKey, { count: 0, totalTime: 0, errors: 0 });
    }
    
    const stats = this.queryStats.get(queryKey)!;
    stats.count++;
    stats.totalTime += executionTime;
    if (hasError) stats.errors++;
  }

  private trackSlowQuery(queryKey: string, executionTime: number): void {
    console.warn(`🐌 Slow query detected: ${queryKey} (${executionTime}ms)`);
    
    this.slowQueries.push({
      query: queryKey,
      executionTime,
      rowsReturned: 0, // Would be populated by actual query analysis
      indexesUsed: [],
      recommendedIndexes: [],
      optimizationSuggestions: []
    });
    
    this.metrics.queries.slowQueries++;
  }

  /**
   * Batch query execution
   */
  async executeBatchQueries<T>(
    queries: Array<{
      key: string;
      query: () => Promise<{ data: T; error: any }>;
      priority?: number;
    }>
  ): Promise<Array<{ data: T; error: any; fromCache: boolean }>> {
    if (!this.config.queryOptimization.batchingEnabled) {
      // Execute queries individually if batching is disabled
      return Promise.all(queries.map(q => this.executeOptimizedQuery(q.key, q.query)));
    }
    
    console.log(`📦 Executing batch of ${queries.length} queries`);
    
    // Sort by priority (higher first)
    const sortedQueries = queries.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    // Execute in batches to avoid overwhelming the database
    const batchSize = Math.min(this.config.queryOptimization.maxBatchSize, queries.length);
    const results: Array<{ data: T; error: any; fromCache: boolean }> = [];
    
    for (let i = 0; i < sortedQueries.length; i += batchSize) {
      const batch = sortedQueries.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(q => this.executeOptimizedQuery(q.key, q.query))
      );
      
      results.push(...batchResults);
      
      // Small delay between batches to prevent overwhelming
      if (i + batchSize < sortedQueries.length) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    return results;
  }

  /**
   * Optimized event queries
   */
  async getEventsOptimized(filters: any = {}): Promise<{ data: any[]; error: any; fromCache: boolean }> {
    const queryKey = `events:${JSON.stringify(filters)}`;
    
    return this.executeOptimizedQuery(
      queryKey,
      async () => {
        let query = this.client
          .from('events')
          .select(`
            *,
            venue:venues(name, latitude, longitude, address),
            city:cities(name, slug)
          `)
          .neq('status', 'inactive')
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .order('created_at', { ascending: false });

        // Apply filters
        if (filters.city) {
          query = query.eq('city_name', filters.city);
        }
        if (filters.category) {
          query = query.eq('category', filters.category);
        }
        if (filters.isFree) {
          query = query.eq('is_free', true);
        }
        if (filters.dateFrom) {
          query = query.gte('start_time', filters.dateFrom);
        }
        if (filters.dateTo) {
          query = query.lte('start_time', filters.dateTo);
        }

        const limit = filters.limit || 50;
        query = query.limit(limit);

        return query;
      },
      {
        cacheTTL: 300000 // 5 minutes for event data
      }
    );
  }

  async getFeaturedEventsOptimized(limit = 10): Promise<{ data: any[]; error: any; fromCache: boolean }> {
    const queryKey = `featured-events:${limit}`;
    
    return this.executeOptimizedQuery(
      queryKey,
      async () => {
        return this.client
          .from('events')
          .select(`
            *,
            venue:venues(name, latitude, longitude, address),
            city:cities(name, slug)
          `)
          .eq('is_featured', true)
          .neq('status', 'inactive')
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(limit);
      },
      {
        cacheTTL: 600000 // 10 minutes for featured events
      }
    );
  }

  async getEventByIdOptimized(id: string): Promise<{ data: any; error: any; fromCache: boolean }> {
    const queryKey = `event:${id}`;
    
    return this.executeOptimizedQuery(
      queryKey,
      async () => {
        return this.client
          .from('events')
          .select(`
            *,
            venue:venues(name, latitude, longitude, address, phone, website),
            city:cities(name, slug, timezone)
          `)
          .eq('id', id)
          .single();
      },
      {
        cacheTTL: 1800000 // 30 minutes for individual events
      }
    );
  }

  /**
   * Index optimization suggestions
   */
  async analyzeIndexOptimizations(): Promise<string[]> {
    if (!this.config.indexing.suggestIndexes) return [];
    
    const suggestions: string[] = [];
    
    // Analyze query patterns
    const queryPatterns = Array.from(this.queryStats.keys());
    
    for (const pattern of queryPatterns) {
      const stats = this.queryStats.get(pattern)!;
      const avgTime = stats.totalTime / stats.count;
      
      if (avgTime > 500 && stats.count > 10) { // Slow and frequent queries
        if (pattern.includes('start_time')) {
          suggestions.push('CREATE INDEX idx_events_start_time ON events(start_time) WHERE status != \'inactive\';');
        }
        
        if (pattern.includes('category')) {
          suggestions.push('CREATE INDEX idx_events_category ON events(category);');
        }
        
        if (pattern.includes('city_name')) {
          suggestions.push('CREATE INDEX idx_events_city ON events(city_name);');
        }
        
        if (pattern.includes('is_featured')) {
          suggestions.push('CREATE INDEX idx_events_featured ON events(is_featured) WHERE is_featured = true;');
        }
      }
    }
    
    return [...new Set(suggestions)]; // Remove duplicates
  }

  /**
   * Connection health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: DatabaseMetrics;
    recommendations: string[];
  }> {
    try {
      const startTime = Date.now();
      
      // Simple connectivity test
      const { error } = await this.client
        .from('events')
        .select('id')
        .limit(1);
      
      const responseTime = Date.now() - startTime;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (error) {
        status = 'unhealthy';
      } else if (responseTime > 2000) {
        status = 'degraded';
      } else if (this.metrics.performance.errorRate > 0.1) {
        status = 'degraded';
      }
      
      const recommendations = await this.generateHealthRecommendations();
      
      return {
        status,
        metrics: this.metrics,
        recommendations
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        metrics: this.metrics,
        recommendations: ['Database connection failed - check connectivity and credentials']
      };
    }
  }

  private async generateHealthRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    
    if (this.metrics.queries.averageLatency > 1000) {
      recommendations.push('Average query latency is high - consider query optimization');
    }
    
    if (this.metrics.queries.cacheHitRatio < 0.5) {
      recommendations.push('Cache hit ratio is low - review caching strategy');
    }
    
    if (this.metrics.performance.errorRate > 0.05) {
      recommendations.push('Error rate is elevated - investigate failing queries');
    }
    
    if (this.queryCache.size > this.config.caching.maxEntries * 0.9) {
      recommendations.push('Query cache is nearly full - consider increasing cache size');
    }
    
    return recommendations;
  }

  /**
   * Get metrics
   */
  getMetrics(): DatabaseMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.queryCache.clear();
    console.log('🧹 Database query cache cleared');
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const report = {
      timestamp: new Date(),
      config: this.config,
      metrics: this.metrics,
      cacheSize: this.queryCache.size,
      queryStats: Object.fromEntries(
        Array.from(this.queryStats.entries()).map(([key, stats]) => [
          key,
          {
            ...stats,
            avgTime: stats.totalTime / stats.count,
            errorRate: stats.errors / stats.count
          }
        ])
      ),
      slowQueries: this.slowQueries.slice(-10), // Last 10 slow queries
      indexSuggestions: this.analyzeIndexOptimizations()
    };
    
    return JSON.stringify(report, null, 2);
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    this.queryCache.clear();
    this.queryStats.clear();
    
    console.log('🧹 Database optimizer destroyed');
  }
}

export default DatabaseOptimizer;
