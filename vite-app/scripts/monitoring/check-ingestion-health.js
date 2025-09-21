#!/usr/bin/env node
/**
 * Event Ingestion Health Monitor
 * Checks the health and performance of all event ingestion sources
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class IngestionHealthMonitor {
  constructor() {
    this.alerts = [];
    this.metrics = {};
  }

  async checkIngestionHealth() {
    console.log('=== Event Ingestion Health Check ===');
    console.log(`Time: ${new Date().toISOString()}`);

    try {
      await this.checkEventIngestionRates();
      await this.checkIngestionErrors();
      await this.checkAPIResponseTimes();
      await this.checkDataFreshness();
      await this.generateReport();
    } catch (error) {
      console.error('Health check failed:', error);
      process.exit(1);
    }
  }

  async checkEventIngestionRates() {
    console.log('\n--- Checking Event Ingestion Rates ---');

    const { data: ingestionStats, error } = await supabase.rpc('get_ingestion_stats', {
      hours_back: 24
    });

    if (error) {
      console.error('Failed to get ingestion stats:', error);
      return;
    }

    for (const stat of ingestionStats || []) {
      const eventsPerHour = stat.total_events / 24;
      console.log(`${stat.source}: ${stat.total_events} events (${eventsPerHour.toFixed(1)}/hour)`);

      // Alert thresholds
      if (eventsPerHour < 10) {
        this.alerts.push({
          type: 'LOW_INGESTION_RATE',
          source: stat.source,
          rate: eventsPerHour,
          message: `Low ingestion rate: ${eventsPerHour.toFixed(1)} events/hour`
        });
      }

      if (stat.hours_since_last_event > 2) {
        this.alerts.push({
          type: 'STALE_DATA',
          source: stat.source,
          hours: stat.hours_since_last_event,
          message: `No events for ${stat.hours_since_last_event} hours`
        });
      }

      this.metrics[stat.source] = {
        eventsPerHour,
        totalEvents: stat.total_events,
        hoursSinceLastEvent: stat.hours_since_last_event,
        successRate: stat.success_rate
      };
    }
  }

  async checkIngestionErrors() {
    console.log('\n--- Checking Ingestion Errors ---');

    const { data: errorStats, error } = await supabase
      .from('ingestion_logs')
      .select('source, error_message, created_at')
      .eq('status', 'error')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Failed to get error stats:', error);
      return;
    }

    const errorsBySource = {};
    for (const errorLog of errorStats || []) {
      if (!errorsBySource[errorLog.source]) {
        errorsBySource[errorLog.source] = [];
      }
      errorsBySource[errorLog.source].push(errorLog);
    }

    for (const [source, errors] of Object.entries(errorsBySource)) {
      console.log(`${source}: ${errors.length} errors in last 24h`);
      
      if (errors.length > 10) {
        this.alerts.push({
          type: 'HIGH_ERROR_RATE',
          source,
          errorCount: errors.length,
          message: `High error rate: ${errors.length} errors in 24h`
        });
      }

      // Show recent error patterns
      const recentErrors = errors.slice(0, 5);
      for (const error of recentErrors) {
        console.log(`  - ${error.error_message} (${error.created_at})`);
      }
    }
  }

  async checkAPIResponseTimes() {
    console.log('\n--- Checking API Response Times ---');

    const apis = [
      {
        name: 'Ticketmaster',
        url: 'https://app.ticketmaster.com/discovery/v2/events.json',
        params: { size: 1, apikey: process.env.TICKETMASTER_API_KEY }
      },
      {
        name: 'Eventbrite',
        url: 'https://www.eventbriteapi.com/v3/events/search/',
        headers: { Authorization: `Bearer ${process.env.EVENTBRITE_TOKEN}` }
      }
    ];

    for (const api of apis) {
      if (!this.hasRequiredCredentials(api)) {
        console.log(`${api.name}: Skipped (no credentials)`);
        continue;
      }

      try {
        const startTime = Date.now();
        const response = await this.makeAPIRequest(api);
        const responseTime = Date.now() - startTime;

        console.log(`${api.name}: ${response.status} - ${responseTime}ms`);

        if (responseTime > 5000) {
          this.alerts.push({
            type: 'SLOW_API_RESPONSE',
            api: api.name,
            responseTime,
            message: `Slow API response: ${responseTime}ms`
          });
        }

        if (response.status >= 400) {
          this.alerts.push({
            type: 'API_ERROR',
            api: api.name,
            status: response.status,
            message: `API error: HTTP ${response.status}`
          });
        }

        this.metrics[`${api.name}_api`] = {
          responseTime,
          status: response.status,
          available: response.status < 400
        };

      } catch (error) {
        console.log(`${api.name}: Failed - ${error.message}`);
        this.alerts.push({
          type: 'API_UNAVAILABLE',
          api: api.name,
          error: error.message,
          message: `API unavailable: ${error.message}`
        });
      }
    }
  }

  async checkDataFreshness() {
    console.log('\n--- Checking Data Freshness ---');

    const { data: freshnessStats, error } = await supabase.rpc('get_data_freshness');

    if (error) {
      console.error('Failed to get data freshness:', error);
      return;
    }

    for (const stat of freshnessStats || []) {
      const hoursSinceUpdate = parseFloat(stat.hours_since_last_update);
      console.log(`${stat.source}: Last update ${hoursSinceUpdate.toFixed(1)} hours ago`);

      if (hoursSinceUpdate > 6) {
        this.alerts.push({
          type: 'STALE_DATA',
          source: stat.source,
          hours: hoursSinceUpdate,
          message: `Stale data: ${hoursSinceUpdate.toFixed(1)} hours old`
        });
      }
    }
  }

  hasRequiredCredentials(api) {
    if (api.name === 'Ticketmaster') {
      return !!process.env.TICKETMASTER_API_KEY;
    }
    if (api.name === 'Eventbrite') {
      return !!process.env.EVENTBRITE_TOKEN;
    }
    return true;
  }

  async makeAPIRequest(api) {
    const url = new URL(api.url);
    
    if (api.params) {
      Object.entries(api.params).forEach(([key, value]) => {
        if (value) url.searchParams.append(key, value);
      });
    }

    const options = {
      method: 'GET',
      headers: api.headers || {}
    };

    const response = await fetch(url.toString(), options);
    return response;
  }

  async generateReport() {
    console.log('\n=== Ingestion Health Summary ===');

    // Overall health status
    const totalAlerts = this.alerts.length;
    const criticalAlerts = this.alerts.filter(a => 
      ['API_UNAVAILABLE', 'HIGH_ERROR_RATE', 'STALE_DATA'].includes(a.type)
    ).length;

    console.log(`Total Alerts: ${totalAlerts}`);
    console.log(`Critical Alerts: ${criticalAlerts}`);

    if (criticalAlerts === 0) {
      console.log('✅ Overall Status: HEALTHY');
    } else if (criticalAlerts < 3) {
      console.log('⚠️  Overall Status: WARNING');
    } else {
      console.log('❌ Overall Status: CRITICAL');
    }

    // Show alerts
    if (this.alerts.length > 0) {
      console.log('\n--- Active Alerts ---');
      this.alerts.forEach(alert => {
        const icon = this.getAlertIcon(alert.type);
        console.log(`${icon} ${alert.message}`);
      });
    }

    // Metrics summary
    console.log('\n--- Metrics Summary ---');
    Object.entries(this.metrics).forEach(([key, metrics]) => {
      if (metrics.eventsPerHour !== undefined) {
        console.log(`${key}: ${metrics.eventsPerHour.toFixed(1)} events/hour, ${metrics.successRate}% success rate`);
      } else if (metrics.responseTime !== undefined) {
        console.log(`${key}: ${metrics.responseTime}ms response time, ${metrics.available ? 'Available' : 'Unavailable'}`);
      }
    });

    // Exit with appropriate code
    if (criticalAlerts > 0) {
      process.exit(1);
    } else if (totalAlerts > 0) {
      process.exit(2);
    } else {
      process.exit(0);
    }
  }

  getAlertIcon(alertType) {
    const icons = {
      LOW_INGESTION_RATE: '⚠️',
      STALE_DATA: '🕒',
      HIGH_ERROR_RATE: '❌',
      SLOW_API_RESPONSE: '🐌',
      API_ERROR: '🔴',
      API_UNAVAILABLE: '💥'
    };
    return icons[alertType] || '⚠️';
  }
}

// Main execution
if (require.main === module) {
  const monitor = new IngestionHealthMonitor();
  monitor.checkIngestionHealth().catch(error => {
    console.error('Health check failed:', error);
    process.exit(1);
  });
}

module.exports = IngestionHealthMonitor;