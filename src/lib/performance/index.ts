/**
 * Performance Optimization Integration
 * Central export and initialization for all optimization systems
 */

export { SystemOptimizer } from './system-optimizer';
export { QueryOptimizer } from './query-optimizer';
export { DatabaseOptimizer } from './database-optimizer';
export { BundleOptimizer } from './bundle-optimizer';
export { OptimizationDashboard } from './optimization-dashboard';

export type {
  OptimizationConfig,
  PerformanceMetrics
} from './system-optimizer';

export type {
  QueryOptimizationConfig,
  QueryPerformanceMetrics
} from './query-optimizer';

export type {
  DatabaseOptimizationConfig,
  DatabaseMetrics
} from './database-optimizer';

export type {
  BundleOptimizationConfig,
  BundleMetrics
} from './bundle-optimizer';

export type {
  DashboardConfig,
  OptimizationStatus,
  PerformanceAlert
} from './optimization-dashboard';

// Re-export performance monitor from monitoring system
export { PerformanceMonitor } from '../../monitoring/PerformanceMonitor';

/**
 * Quick initialization function for complete optimization system
 */
import { OptimizationDashboard } from './optimization-dashboard';
import type { QueryClient } from '@tanstack/react-query';

export interface QuickInitOptions {
  queryClient?: QueryClient;
  supabaseUrl?: string;
  supabaseKey?: string;
  autoStart?: boolean;
  aggressiveness?: 'conservative' | 'moderate' | 'aggressive';
}

let globalDashboard: OptimizationDashboard | null = null;

/**
 * Initialize the complete performance optimization system
 */
export async function initializeOptimizations(
  options: QuickInitOptions = {}
): Promise<OptimizationDashboard> {
  if (globalDashboard) {
    console.log('⚠️  Optimization dashboard already initialized');
    return globalDashboard;
  }

  console.log('🚀 Initializing complete performance optimization system...');

  const {
    queryClient,
    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY,
    autoStart = true,
    aggressiveness = 'moderate'
  } = options;

  // Create dashboard with optimal configuration
  globalDashboard = new OptimizationDashboard({
    autoOptimization: {
      enabled: autoStart,
      aggressiveness,
      intervalMs: 30000 // 30 seconds
    },
    monitoring: {
      enabled: true,
      realTimeUpdates: true,
      alertThresholds: {
        responseTime: 2000,
        errorRate: 0.05,
        memoryUsage: 0.8,
        cacheHitRatio: 0.7
      }
    },
    reporting: {
      enabled: true,
      intervalMs: 300000, // 5 minutes
      retention: 7
    }
  });

  // Initialize with provided options
  await globalDashboard.initialize({
    queryClient,
    supabaseUrl,
    supabaseKey
  });

  console.log('✅ Performance optimization system fully initialized');
  
  // Log initial status
  const status = await globalDashboard.getOptimizationStatus();
  console.log(`📊 Initial performance score: ${status.overall.score}/100 (${status.overall.health})`);

  return globalDashboard;
}

/**
 * Get the global optimization dashboard instance
 */
export function getOptimizationDashboard(): OptimizationDashboard | null {
  return globalDashboard;
}

/**
 * Quick performance check
 */
export async function getPerformanceSnapshot(): Promise<{
  score: number;
  health: string;
  issues: string[];
  recommendations: string[];
}> {
  if (!globalDashboard) {
    throw new Error('Optimization dashboard not initialized. Call initializeOptimizations() first.');
  }

  const status = await globalDashboard.getOptimizationStatus();
  
  return {
    score: status.overall.score,
    health: status.overall.health,
    issues: status.overall.issues,
    recommendations: status.overall.recommendations
  };
}

/**
 * Quick optimization trigger
 */
export async function optimizeNow(
  component?: 'system' | 'database' | 'queries' | 'bundle'
): Promise<void> {
  if (!globalDashboard) {
    throw new Error('Optimization dashboard not initialized. Call initializeOptimizations() first.');
  }

  await globalDashboard.triggerOptimization(component);
}

/**
 * Get active performance alerts
 */
export function getPerformanceAlerts(): PerformanceAlert[] {
  if (!globalDashboard) {
    return [];
  }

  return globalDashboard.getActiveAlerts();
}

/**
 * Generate performance report
 */
export async function generatePerformanceReport(): Promise<string> {
  if (!globalDashboard) {
    throw new Error('Optimization dashboard not initialized. Call initializeOptimizations() first.');
  }

  return await globalDashboard.generatePerformanceReport();
}

/**
 * Cleanup optimization systems
 */
export async function shutdownOptimizations(): Promise<void> {
  if (globalDashboard) {
    await globalDashboard.destroy();
    globalDashboard = null;
    console.log('✅ Performance optimization systems shut down');
  }
}

/**
 * React hook for performance monitoring (if using in React components)
 */
import { useState, useEffect } from 'react';

export function usePerformanceMonitoring() {
  const [status, setStatus] = useState<OptimizationStatus | null>(null);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!globalDashboard) {
      setLoading(false);
      return;
    }

    const updateStatus = async () => {
      try {
        const newStatus = await globalDashboard!.getOptimizationStatus();
        setStatus(newStatus);
        setAlerts(globalDashboard!.getActiveAlerts());
      } catch (error) {
        console.error('Failed to update performance status:', error);
      } finally {
        setLoading(false);
      }
    };

    // Initial load
    updateStatus();

    // Listen for updates
    const handleUpdate = () => updateStatus();
    const handleAlert = (alert: PerformanceAlert) => {
      setAlerts(prev => [...prev, alert]);
    };

    globalDashboard.on('dashboard:monitoring-update', handleUpdate);
    globalDashboard.on('dashboard:alert', handleAlert);

    // Periodic updates
    const interval = setInterval(updateStatus, 30000); // Every 30 seconds

    return () => {
      globalDashboard?.off('dashboard:monitoring-update', handleUpdate);
      globalDashboard?.off('dashboard:alert', handleAlert);
      clearInterval(interval);
    };
  }, []);

  return {
    status,
    alerts,
    loading,
    dashboard: globalDashboard,
    optimizeNow,
    getPerformanceSnapshot,
    generatePerformanceReport
  };
}

/**
 * Performance optimization middleware for Next.js
 */
export function withPerformanceOptimization(handler: any) {
  return async (req: any, res: any) => {
    const startTime = Date.now();

    try {
      const result = await handler(req, res);
      
      // Track request performance
      const duration = Date.now() - startTime;
      
      if (globalDashboard && duration > 2000) {
        console.warn(`🐌 Slow API request: ${req.url} (${duration}ms)`);
      }
      
      return result;
    } catch (error) {
      // Track errors
      if (globalDashboard) {
        console.error(`❌ API error: ${req.url}`, error);
      }
      throw error;
    }
  };
}

/**
 * Development utilities
 */
export const dev = {
  /**
   * Log current performance status to console
   */
  async logStatus(): Promise<void> {
    if (!globalDashboard) {
      console.log('⚠️  Optimization dashboard not initialized');
      return;
    }

    const status = await globalDashboard.getOptimizationStatus();
    const alerts = globalDashboard.getActiveAlerts();

    console.group('📊 Performance Status');
    console.log(`Overall Health: ${status.overall.health}`);
    console.log(`Overall Score: ${status.overall.score}/100`);
    console.log(`Active Alerts: ${alerts.length}`);
    
    if (status.overall.issues.length > 0) {
      console.group('⚠️  Issues');
      status.overall.issues.forEach(issue => console.log(`- ${issue}`));
      console.groupEnd();
    }
    
    if (status.overall.recommendations.length > 0) {
      console.group('💡 Recommendations');
      status.overall.recommendations.forEach(rec => console.log(`- ${rec}`));
      console.groupEnd();
    }
    
    console.groupEnd();
  },

  /**
   * Force optimization of all systems
   */
  async forceOptimize(): Promise<void> {
    if (!globalDashboard) {
      console.log('⚠️  Optimization dashboard not initialized');
      return;
    }

    console.log('🔧 Forcing optimization of all systems...');
    await globalDashboard.triggerOptimization();
    console.log('✅ Forced optimization completed');
  },

  /**
   * Clear all caches
   */
  async clearCaches(): Promise<void> {
    if (!globalDashboard) {
      console.log('⚠️  Optimization dashboard not initialized');
      return;
    }

    console.log('🧹 Clearing all caches...');
    await globalDashboard.triggerOptimization('queries');
    await globalDashboard.triggerOptimization('database');
    console.log('✅ All caches cleared');
  },

  /**
   * Generate and log performance report
   */
  async generateReport(): Promise<void> {
    if (!globalDashboard) {
      console.log('⚠️  Optimization dashboard not initialized');
      return;
    }

    const report = await globalDashboard.generatePerformanceReport();
    console.log('📊 Performance Report:');
    console.log(report);
  }
};

// Export everything as default for convenience
export default {
  initializeOptimizations,
  getOptimizationDashboard,
  getPerformanceSnapshot,
  optimizeNow,
  getPerformanceAlerts,
  generatePerformanceReport,
  shutdownOptimizations,
  usePerformanceMonitoring,
  withPerformanceOptimization,
  dev
};
