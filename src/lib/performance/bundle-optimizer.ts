/**
 * Bundle and Asset Performance Optimizer
 * Optimizes code splitting, lazy loading, and asset delivery
 */

import { lazy, ComponentType } from 'react';

export interface BundleOptimizationConfig {
  codeSplitting: {
    enabled: boolean;
    chunkStrategy: 'route' | 'feature' | 'vendor' | 'adaptive';
    maxChunkSize: number;
    minChunkSize: number;
  };
  lazyLoading: {
    enabled: boolean;
    componentThreshold: number;
    imageThreshold: number;
    priorityLoading: boolean;
  };
  compression: {
    enabled: boolean;
    algorithm: 'gzip' | 'brotli' | 'both';
    level: number;
  };
  caching: {
    strategy: 'aggressive' | 'conservative' | 'smart';
    staticAssetTTL: number;
    dynamicContentTTL: number;
  };
  prefetching: {
    enabled: boolean;
    strategy: 'hover' | 'viewport' | 'idle' | 'smart';
    maxPrefetchSize: number;
  };
}

export interface BundleMetrics {
  bundleSize: {
    total: number;
    js: number;
    css: number;
    assets: number;
  };
  loadingPerformance: {
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    cumulativeLayoutShift: number;
    firstInputDelay: number;
  };
  caching: {
    hitRatio: number;
    missRatio: number;
    bandwidth: number;
  };
  compression: {
    ratio: number;
    savings: number;
  };
}

export class BundleOptimizer {
  private config: BundleOptimizationConfig;
  private metrics: BundleMetrics;
  private lazyComponents = new Map<string, ComponentType<any>>();
  private preloadedRoutes = new Set<string>();
  private observer?: IntersectionObserver;
  private performanceObserver?: PerformanceObserver;

  constructor(config: Partial<BundleOptimizationConfig> = {}) {
    this.config = {
      codeSplitting: {
        enabled: true,
        chunkStrategy: 'adaptive',
        maxChunkSize: 250000, // 250KB
        minChunkSize: 20000,   // 20KB
        ...config.codeSplitting
      },
      lazyLoading: {
        enabled: true,
        componentThreshold: 50000, // 50KB
        imageThreshold: 100000,    // 100KB
        priorityLoading: true,
        ...config.lazyLoading
      },
      compression: {
        enabled: true,
        algorithm: 'both',
        level: 6,
        ...config.compression
      },
      caching: {
        strategy: 'smart',
        staticAssetTTL: 31536000, // 1 year
        dynamicContentTTL: 300,   // 5 minutes
        ...config.caching
      },
      prefetching: {
        enabled: true,
        strategy: 'smart',
        maxPrefetchSize: 1000000, // 1MB
        ...config.prefetching
      }
    };

    this.metrics = this.initializeMetrics();
    this.setupOptimizations();
  }

  private initializeMetrics(): BundleMetrics {
    return {
      bundleSize: {
        total: 0,
        js: 0,
        css: 0,
        assets: 0
      },
      loadingPerformance: {
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        cumulativeLayoutShift: 0,
        firstInputDelay: 0
      },
      caching: {
        hitRatio: 0,
        missRatio: 0,
        bandwidth: 0
      },
      compression: {
        ratio: 0,
        savings: 0
      }
    };
  }

  private setupOptimizations(): void {
    console.log('📦 Setting up bundle optimizations');
    
    if (typeof window !== 'undefined') {
      this.setupClientOptimizations();
    }
    
    if (this.config.lazyLoading.enabled) {
      this.setupLazyLoading();
    }
    
    if (this.config.prefetching.enabled) {
      this.setupIntelligentPrefetching();
    }
    
    this.setupPerformanceMonitoring();
  }

  private setupClientOptimizations(): void {
    // Setup intersection observer for lazy loading
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        this.handleIntersection.bind(this),
        {
          root: null,
          rootMargin: '50px',
          threshold: 0.1
        }
      );
    }
    
    // Setup service worker for caching
    if ('serviceWorker' in navigator) {
      this.setupServiceWorker();
    }
    
    // Setup resource hints
    this.setupResourceHints();
  }

  private async setupServiceWorker(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service worker registered for caching optimization');
      
      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'CACHE_STATS') {
          this.updateCacheMetrics(event.data.stats);
        }
      });
      
    } catch (error) {
      console.warn('⚠️  Service worker registration failed:', error);
    }
  }

  private setupResourceHints(): void {
    // Add preconnect links for critical domains
    const criticalDomains = [
      'https://fonts.googleapis.com',
      'https://images.unsplash.com',
      // Add your Supabase URL if known
    ];
    
    criticalDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }

  private setupLazyLoading(): void {
    console.log('⏳ Setting up intelligent lazy loading');
    
    // Setup image lazy loading
    this.setupImageLazyLoading();
    
    // Setup component lazy loading
    this.setupComponentLazyLoading();
  }

  private setupImageLazyLoading(): void {
    if (typeof window === 'undefined') return;
    
    // Use native lazy loading if available
    if ('loading' in HTMLImageElement.prototype) {
      console.log('✅ Using native image lazy loading');
      return;
    }
    
    // Fallback to intersection observer
    if (this.observer) {
      const images = document.querySelectorAll('img[data-src]');
      images.forEach(img => this.observer!.observe(img));
    }
  }

  private setupComponentLazyLoading(): void {
    // This would be used in component definitions
    console.log('🧹 Component lazy loading system ready');
  }

  private handleIntersection(entries: IntersectionObserverEntry[]): void {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          this.observer?.unobserve(img);
        }
      }
    });
  }

  private setupIntelligentPrefetching(): void {
    console.log('🔮 Setting up intelligent prefetching');
    
    switch (this.config.prefetching.strategy) {
      case 'hover':
        this.setupHoverPrefetching();
        break;
      case 'viewport':
        this.setupViewportPrefetching();
        break;
      case 'idle':
        this.setupIdlePrefetching();
        break;
      case 'smart':
        this.setupSmartPrefetching();
        break;
    }
  }

  private setupHoverPrefetching(): void {
    if (typeof document === 'undefined') return;
    
    document.addEventListener('mouseover', (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && link.href && !this.preloadedRoutes.has(link.href)) {
        this.prefetchRoute(link.href);
      }
    });
  }

  private setupViewportPrefetching(): void {
    if (!this.observer) return;
    
    const links = document.querySelectorAll('a[href]');
    links.forEach(link => {
      this.observer!.observe(link);
    });
  }

  private setupIdlePrefetching(): void {
    if (typeof window === 'undefined') return;
    
    if ('requestIdleCallback' in window) {
      const prefetchDuringIdle = () => {
        window.requestIdleCallback(() => {
          this.prefetchCriticalRoutes();
        });
      };
      
      // Start prefetching after page load
      if (document.readyState === 'complete') {
        prefetchDuringIdle();
      } else {
        window.addEventListener('load', prefetchDuringIdle);
      }
    }
  }

  private setupSmartPrefetching(): void {
    // Combine multiple strategies
    this.setupHoverPrefetching();
    this.setupIdlePrefetching();
    
    // Add machine learning-based predictions
    this.setupMLPrefetching();
  }

  private setupMLPrefetching(): void {
    // Simple prediction based on user behavior
    const userActions: string[] = [];
    
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a');
      
      if (link) {
        userActions.push(link.href);
        
        // Predict next likely navigation
        const prediction = this.predictNextNavigation(userActions);
        if (prediction) {
          this.prefetchRoute(prediction);
        }
      }
    });
  }

  private predictNextNavigation(actions: string[]): string | null {
    // Simple pattern recognition
    if (actions.length < 2) return null;
    
    const recent = actions.slice(-5); // Last 5 actions
    
    // If user visited events page, they might visit event details
    if (recent.some(action => action.includes('/events'))) {
      return '/events/featured';
    }
    
    // If user visited event details, they might visit map
    if (recent.some(action => action.includes('/event/'))) {
      return '/map';
    }
    
    return null;
  }

  private async prefetchRoute(href: string): Promise<void> {
    if (this.preloadedRoutes.has(href)) return;
    
    try {
      // Estimate route size
      const estimatedSize = this.estimateRouteSize(href);
      
      if (estimatedSize > this.config.prefetching.maxPrefetchSize) {
        console.log(`🚧 Skipping prefetch of large route: ${href} (${estimatedSize} bytes)`);
        return;
      }
      
      // Create prefetch link
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = href;
      document.head.appendChild(link);
      
      this.preloadedRoutes.add(href);
      console.log(`🔮 Prefetched route: ${href}`);
      
    } catch (error) {
      console.warn(`Failed to prefetch ${href}:`, error);
    }
  }

  private estimateRouteSize(href: string): number {
    // Simple estimation based on route type
    if (href.includes('/events')) return 50000; // 50KB
    if (href.includes('/map')) return 100000;   // 100KB
    if (href.includes('/admin')) return 75000;  // 75KB
    return 25000; // 25KB default
  }

  private async prefetchCriticalRoutes(): Promise<void> {
    const criticalRoutes = [
      '/events',
      '/map',
      '/featured'
    ];
    
    for (const route of criticalRoutes) {
      await this.prefetchRoute(route);
      // Small delay between prefetches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  private setupPerformanceMonitoring(): void {
    if (typeof window === 'undefined') return;
    
    // Monitor Web Vitals
    if ('PerformanceObserver' in window) {
      this.setupWebVitalsMonitoring();
    }
    
    // Monitor bundle size
    this.monitorBundleSize();
  }

  private setupWebVitalsMonitoring(): void {
    try {
      // First Contentful Paint
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.loadingPerformance.firstContentfulPaint = entry.startTime;
          }
        });
      });
      
      this.performanceObserver.observe({ entryTypes: ['paint'] });
      
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.loadingPerformance.largestContentfulPaint = lastEntry.startTime;
      });
      
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      
      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.metrics.loadingPerformance.cumulativeLayoutShift = clsValue;
      });
      
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      
    } catch (error) {
      console.warn('Performance monitoring setup failed:', error);
    }
  }

  private monitorBundleSize(): void {
    if (typeof window === 'undefined') return;
    
    // Monitor resource loading
    window.addEventListener('load', () => {
      const resources = performance.getEntriesByType('resource');
      
      let totalSize = 0;
      let jsSize = 0;
      let cssSize = 0;
      let assetSize = 0;
      
      resources.forEach((resource: any) => {
        const size = resource.transferSize || resource.encodedBodySize || 0;
        totalSize += size;
        
        if (resource.name.endsWith('.js')) {
          jsSize += size;
        } else if (resource.name.endsWith('.css')) {
          cssSize += size;
        } else {
          assetSize += size;
        }
      });
      
      this.metrics.bundleSize = {
        total: totalSize,
        js: jsSize,
        css: cssSize,
        assets: assetSize
      };
      
      console.log('📊 Bundle size metrics updated:', this.metrics.bundleSize);
    });
  }

  private updateCacheMetrics(stats: any): void {
    this.metrics.caching = {
      hitRatio: stats.hitRatio || 0,
      missRatio: stats.missRatio || 0,
      bandwidth: stats.bandwidth || 0
    };
  }

  /**
   * Create optimized lazy component
   */
  createLazyComponent<T extends ComponentType<any>>(
    componentName: string,
    importFn: () => Promise<{ default: T }>,
    options: {
      fallback?: ComponentType;
      preload?: boolean;
      priority?: 'high' | 'medium' | 'low';
    } = {}
  ): ComponentType<any> {
    if (this.lazyComponents.has(componentName)) {
      return this.lazyComponents.get(componentName)!;
    }
    
    const LazyComponent = lazy(() => {
      console.log(`📋 Loading lazy component: ${componentName}`);
      return importFn();
    });
    
    // Preload if specified
    if (options.preload) {
      if (options.priority === 'high') {
        importFn(); // Immediate preload
      } else {
        setTimeout(() => importFn(), options.priority === 'medium' ? 1000 : 5000);
      }
    }
    
    this.lazyComponents.set(componentName, LazyComponent);
    return LazyComponent;
  }

  /**
   * Optimize images for different screen sizes and formats
   */
  optimizeImage(src: string, options: {
    width?: number;
    height?: number;
    format?: 'webp' | 'avif' | 'auto';
    quality?: number;
    lazy?: boolean;
  } = {}): {
    src: string;
    srcSet?: string;
    loading?: 'lazy' | 'eager';
  } {
    const {
      width,
      height,
      format = 'auto',
      quality = 80,
      lazy = true
    } = options;
    
    // Build optimized URL (example for Supabase or similar service)
    let optimizedSrc = src;
    
    if (src.includes('unsplash.com')) {
      const params = new URLSearchParams();
      if (width) params.set('w', width.toString());
      if (height) params.set('h', height.toString());
      params.set('q', quality.toString());
      params.set('fit', 'crop');
      
      optimizedSrc = `${src}?${params.toString()}`;
    }
    
    // Generate srcSet for responsive images
    const srcSet = width ? this.generateSrcSet(optimizedSrc, width) : undefined;
    
    return {
      src: optimizedSrc,
      srcSet,
      loading: lazy ? 'lazy' : 'eager'
    };
  }

  private generateSrcSet(baseSrc: string, baseWidth: number): string {
    const scales = [1, 1.5, 2, 3];
    
    return scales
      .map(scale => {
        const width = Math.round(baseWidth * scale);
        const scaledSrc = baseSrc.replace(/w=\d+/, `w=${width}`);
        return `${scaledSrc} ${scale}x`;
      })
      .join(', ');
  }

  /**
   * Critical CSS extraction and inlining
   */
  inlineCriticalCSS(criticalCSS: string): void {
    if (typeof document === 'undefined') return;
    
    const style = document.createElement('style');
    style.textContent = criticalCSS;
    style.setAttribute('data-critical', 'true');
    
    // Insert before any existing stylesheets
    const firstLink = document.querySelector('link[rel="stylesheet"]');
    if (firstLink) {
      document.head.insertBefore(style, firstLink);
    } else {
      document.head.appendChild(style);
    }
    
    console.log('🎨 Critical CSS inlined');
  }

  /**
   * Load non-critical CSS asynchronously
   */
  loadNonCriticalCSS(href: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.media = 'print'; // Load as print stylesheet initially
      link.onload = () => {
        link.media = 'all'; // Switch to all media once loaded
        resolve();
      };
      link.onerror = reject;
      
      document.head.appendChild(link);
    });
  }

  /**
   * Get optimization metrics
   */
  getMetrics(): BundleMetrics {
    return { ...this.metrics };
  }

  /**
   * Get Web Vitals score
   */
  getWebVitalsScore(): {
    score: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    details: any;
  } {
    const { loadingPerformance } = this.metrics;
    
    // Scoring based on Web Vitals thresholds
    const fcpScore = loadingPerformance.firstContentfulPaint < 1800 ? 100 : 
                     loadingPerformance.firstContentfulPaint < 3000 ? 75 : 
                     loadingPerformance.firstContentfulPaint < 4200 ? 50 : 25;
    
    const lcpScore = loadingPerformance.largestContentfulPaint < 2500 ? 100 : 
                     loadingPerformance.largestContentfulPaint < 4000 ? 75 : 
                     loadingPerformance.largestContentfulPaint < 5500 ? 50 : 25;
    
    const clsScore = loadingPerformance.cumulativeLayoutShift < 0.1 ? 100 : 
                     loadingPerformance.cumulativeLayoutShift < 0.25 ? 75 : 
                     loadingPerformance.cumulativeLayoutShift < 0.4 ? 50 : 25;
    
    const averageScore = (fcpScore + lcpScore + clsScore) / 3;
    
    const grade = averageScore >= 90 ? 'A' : 
                  averageScore >= 75 ? 'B' : 
                  averageScore >= 60 ? 'C' : 
                  averageScore >= 45 ? 'D' : 'F';
    
    return {
      score: Math.round(averageScore),
      grade,
      details: {
        fcp: { score: fcpScore, value: loadingPerformance.firstContentfulPaint },
        lcp: { score: lcpScore, value: loadingPerformance.largestContentfulPaint },
        cls: { score: clsScore, value: loadingPerformance.cumulativeLayoutShift }
      }
    };
  }

  /**
   * Generate optimization report
   */
  generateReport(): string {
    const webVitals = this.getWebVitalsScore();
    
    const report = {
      timestamp: new Date(),
      config: this.config,
      metrics: this.metrics,
      webVitals,
      preloadedRoutes: Array.from(this.preloadedRoutes),
      lazyComponents: Array.from(this.lazyComponents.keys()),
      recommendations: this.generateRecommendations()
    };
    
    return JSON.stringify(report, null, 2);
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const { bundleSize, loadingPerformance } = this.metrics;
    
    if (bundleSize.js > 500000) { // 500KB
      recommendations.push('JavaScript bundle is large - consider code splitting');
    }
    
    if (loadingPerformance.firstContentfulPaint > 3000) {
      recommendations.push('First Contentful Paint is slow - optimize critical rendering path');
    }
    
    if (loadingPerformance.largestContentfulPaint > 4000) {
      recommendations.push('Largest Contentful Paint is slow - optimize large resources');
    }
    
    if (loadingPerformance.cumulativeLayoutShift > 0.25) {
      recommendations.push('Cumulative Layout Shift is high - ensure proper image and font sizing');
    }
    
    if (this.metrics.caching.hitRatio < 0.8) {
      recommendations.push('Cache hit ratio is low - review caching strategy');
    }
    
    return recommendations;
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    this.lazyComponents.clear();
    this.preloadedRoutes.clear();
    
    console.log('🧹 Bundle optimizer destroyed');
  }
}

export default BundleOptimizer;
