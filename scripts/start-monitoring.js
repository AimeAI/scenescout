#!/usr/bin/env node

/**
 * Start Performance Monitoring Script
 * Standalone script to initialize and run the performance monitoring system
 */

const { monitoringService } = require('../src/monitoring/MonitoringService.ts');
const { initializeMonitoringHooks } = require('../src/monitoring/hooks/SwarmHooks.ts');

async function startMonitoring() {
  try {
    console.log('🚀 Starting Performance Monitoring System...\n');

    // Configuration
    const config = {
      intervalMs: 5000, // 5-second monitoring cycle
      enableDashboard: true,
      enableAlerts: true,
      enableOptimization: true,
      enableReports: true
    };

    // Initialize monitoring service
    console.log('📊 Initializing monitoring service...');
    await monitoringService.initialize(config);

    // Initialize hooks for swarm integration
    console.log('🔗 Initializing monitoring hooks...');
    await initializeMonitoringHooks();

    // Display monitoring info
    console.log('\n✅ Performance Monitoring System Started Successfully!\n');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 Dashboard URL:     http://localhost:8080/dashboard');
    console.log('🔍 Monitoring Interval: 5 seconds');
    console.log('🚨 Alerts:           Enabled (Console, Webhook, Slack)');
    console.log('🔧 Auto-Optimization: Enabled (Recommendations)');
    console.log('📋 Reports:          Hourly, Daily, Weekly, Monthly');
    console.log('🤖 Agent Monitoring: 8 agents supported');
    console.log('🧠 Intelligence:     Bottleneck detection, trend analysis');
    console.log('═══════════════════════════════════════════════════════');

    // Setup graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down Performance Monitoring System...');
      try {
        await monitoringService.stop();
        console.log('✅ Performance monitoring stopped gracefully');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    });

    // Health check interval
    setInterval(async () => {
      try {
        const health = await monitoringService.healthCheck();
        if (health.status !== 'healthy') {
          console.warn('⚠️ Monitoring health check failed:', health.details);
        }
      } catch (error) {
        console.error('❌ Health check error:', error);
      }
    }, 30000); // Every 30 seconds

    // Generate reports periodically
    setInterval(async () => {
      try {
        const report = await monitoringService.generateReport('hourly');
        console.log('📊 Hourly performance report generated');
      } catch (error) {
        console.error('❌ Failed to generate hourly report:', error);
      }
    }, 3600000); // Every hour

    // Keep process alive
    console.log('\n🔄 Monitoring system is running... Press Ctrl+C to stop\n');

  } catch (error) {
    console.error('❌ Failed to start performance monitoring:', error);
    process.exit(1);
  }
}

// Start monitoring if script is run directly
if (require.main === module) {
  startMonitoring();
}

module.exports = { startMonitoring };