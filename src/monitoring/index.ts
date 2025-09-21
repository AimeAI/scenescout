/**
 * Performance Monitoring System - Main Entry Point
 * Comprehensive monitoring, alerting, and optimization for swarm systems
 */

export { PerformanceMonitor } from './PerformanceMonitor';
export { MetricsCollector } from './collectors/MetricsCollector';
export { DashboardManager } from './dashboards/DashboardManager';
export { AlertManager } from './alerts/AlertManager';
export { OptimizationEngine } from './optimizers/OptimizationEngine';
export { ReportGenerator } from './reports/ReportGenerator';

export type {
  AgentMetrics,
  SwarmMetrics,
  PerformanceAlert
} from './PerformanceMonitor';

export type {
  DashboardData,
  DashboardSummary
} from './dashboards/DashboardManager';

export type {
  AlertRule,
  NotificationChannel
} from './alerts/AlertManager';

export type {
  OptimizationRecommendation,
  OptimizationRule
} from './optimizers/OptimizationEngine';

export type {
  PerformanceReport,
  ReportSummary,
  ReportSection,
  ReportAttachment
} from './reports/ReportGenerator';

/**
 * Initialize and start comprehensive performance monitoring
 */
export async function startPerformanceMonitoring(config?: {
  intervalMs?: number;
  enableDashboard?: boolean;
  enableAlerts?: boolean;
  enableOptimization?: boolean;
  enableReports?: boolean;
}): Promise<PerformanceMonitor> {
  const { PerformanceMonitor } = await import('./PerformanceMonitor');
  
  const monitor = new PerformanceMonitor();
  
  // Start monitoring with configuration
  await monitor.startMonitoring(config?.intervalMs || 5000);
  
  console.log('✅ Performance monitoring system started successfully');
  console.log('📊 Dashboard available at: http://localhost:8080/dashboard');
  console.log('🔍 Metrics collection: Every 5 seconds');
  console.log('🚨 Alert notifications: Multi-channel enabled');
  console.log('🔧 Auto-optimization: Recommendations enabled');
  console.log('📋 Reports: Hourly, daily, weekly, monthly');
  
  return monitor;
}

/**
 * Quick start with default configuration
 */
export async function quickStartMonitoring(): Promise<PerformanceMonitor> {
  return startPerformanceMonitoring({
    intervalMs: 5000,
    enableDashboard: true,
    enableAlerts: true,
    enableOptimization: true,
    enableReports: true
  });
}