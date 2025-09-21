/**
 * Monitoring Service - Singleton service for system-wide monitoring
 */

import { PerformanceMonitor } from './PerformanceMonitor';
import type { AgentMetrics, SwarmMetrics, PerformanceAlert } from './PerformanceMonitor';

export class MonitoringService {
  private static instance: MonitoringService | null = null;
  private monitor: PerformanceMonitor | null = null;
  private isInitialized = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * Initialize monitoring service
   */
  async initialize(config?: {
    intervalMs?: number;
    enableDashboard?: boolean;
    enableAlerts?: boolean;
    enableOptimization?: boolean;
    enableReports?: boolean;
  }): Promise<void> {
    if (this.isInitialized) {
      console.log('⚠️ Monitoring service already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing Performance Monitoring Service...');
      
      this.monitor = new PerformanceMonitor();
      
      // Setup event listeners
      this.setupEventHandlers();
      
      // Start monitoring
      await this.monitor.startMonitoring(config?.intervalMs || 5000);
      
      this.isInitialized = true;
      
      console.log('✅ Performance Monitoring Service initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize monitoring service:', error);
      throw error;
    }
  }

  /**
   * Get current performance monitor instance
   */
  getMonitor(): PerformanceMonitor | null {
    if (!this.isInitialized) {
      console.warn('⚠️ Monitoring service not initialized. Call initialize() first.');
      return null;
    }
    return this.monitor;
  }

  /**
   * Get current dashboard data
   */
  async getDashboardData(): Promise<any> {
    if (!this.monitor) {
      throw new Error('Monitoring service not initialized');
    }
    return await this.monitor.getDashboardData();
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<PerformanceAlert[]> {
    if (!this.monitor) {
      throw new Error('Monitoring service not initialized');
    }
    return await this.monitor.getActiveAlerts();
  }

  /**
   * Get optimization recommendations
   */
  async getOptimizationRecommendations(): Promise<any[]> {
    if (!this.monitor) {
      throw new Error('Monitoring service not initialized');
    }
    return await this.monitor.getOptimizationRecommendations();
  }

  /**
   * Generate performance report
   */
  async generateReport(type: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'final' = 'hourly'): Promise<string> {
    if (!this.monitor) {
      throw new Error('Monitoring service not initialized');
    }
    return await this.monitor.generatePerformanceReport(type);
  }

  /**
   * Check if monitoring is active
   */
  isMonitoring(): boolean {
    return this.isInitialized && this.monitor !== null;
  }

  /**
   * Stop monitoring service
   */
  async stop(): Promise<void> {
    if (!this.monitor) {
      console.log('⚠️ Monitoring service not running');
      return;
    }

    try {
      await this.monitor.stopMonitoring();
      this.monitor = null;
      this.isInitialized = false;
      
      console.log('✅ Performance Monitoring Service stopped');
      
    } catch (error) {
      console.error('❌ Error stopping monitoring service:', error);
      throw error;
    }
  }

  /**
   * Restart monitoring service
   */
  async restart(config?: any): Promise<void> {
    console.log('🔄 Restarting Performance Monitoring Service...');
    
    await this.stop();
    await this.initialize(config);
    
    console.log('✅ Performance Monitoring Service restarted');
  }

  /**
   * Setup event handlers for monitoring events
   */
  private setupEventHandlers(): void {
    if (!this.monitor) return;

    // Monitor lifecycle events
    this.monitor.on('monitoring:started', (data) => {
      console.log(`🚀 Monitoring started with ${data.interval}ms interval`);
    });

    this.monitor.on('monitoring:stopped', () => {
      console.log('🛑 Monitoring stopped');
    });

    this.monitor.on('monitoring:error', (error) => {
      console.error('❌ Monitoring error:', error);
    });

    // Performance events
    this.monitor.on('monitoring:cycle', (data) => {
      if (data.cycleTime > 1000) {
        console.warn(`⚠️ Slow monitoring cycle: ${data.cycleTime}ms`);
      }
    });

    // Alert events
    this.monitor.on('alert:triggered', (alert) => {
      const emoji = {
        'low': '🟡',
        'medium': '🟠',
        'high': '🔴',
        'critical': '🚨'
      }[alert.severity] || '⚠️';
      
      console.log(`${emoji} Alert: ${alert.message}`);
    });

    // Optimization events
    this.monitor.on('optimization:recommended', (recommendation) => {
      console.log(`🔧 Optimization recommended: ${recommendation.description}`);
    });

    this.monitor.on('optimization:applied', (optimization) => {
      console.log(`✅ Optimization applied: ${optimization.type}`);
    });

    // Report events
    this.monitor.on('report:generated', (data) => {
      console.log(`📊 Report generated: ${data.type} (${data.size} bytes)`);
    });
  }

  /**
   * Get monitoring statistics
   */
  getStats(): any {
    return {
      initialized: this.isInitialized,
      monitorActive: this.monitor !== null,
      uptime: this.isInitialized ? Date.now() : 0
    };
  }

  /**
   * Health check for monitoring service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    details: any;
  }> {
    try {
      if (!this.isInitialized || !this.monitor) {
        return {
          status: 'error',
          details: {
            message: 'Monitoring service not initialized',
            initialized: this.isInitialized,
            monitor: this.monitor !== null
          }
        };
      }

      // Try to get current data to verify monitoring is working
      const dashboardData = await this.monitor.getDashboardData();
      
      return {
        status: 'healthy',
        details: {
          message: 'Monitoring service is healthy',
          initialized: this.isInitialized,
          monitor: this.monitor !== null,
          dataAvailable: dashboardData !== null
        }
      };

    } catch (error) {
      return {
        status: 'error',
        details: {
          message: 'Health check failed',
          error: error.message,
          initialized: this.isInitialized,
          monitor: this.monitor !== null
        }
      };
    }
  }
}

// Export singleton instance
export const monitoringService = MonitoringService.getInstance();