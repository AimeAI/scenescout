/**
 * Alert Manager - Handles performance alerts and notifications
 */

import { EventEmitter } from 'events';
import { PerformanceAlert } from '../PerformanceMonitor';

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  threshold: number;
  enabled: boolean;
  cooldownMs: number;
  description: string;
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook' | 'console';
  config: any;
  enabled: boolean;
}

export class AlertManager extends EventEmitter {
  private activeAlerts: Map<string, PerformanceAlert> = new Map();
  private alertHistory: PerformanceAlert[] = [];
  private alertRules: Map<string, AlertRule> = new Map();
  private notificationChannels: NotificationChannel[] = [];
  private cooldownTracker: Map<string, number> = new Map();

  async initialize(): Promise<void> {
    console.log('🚨 Initializing Alert Manager...');
    
    // Setup default alert rules
    this.setupDefaultAlertRules();
    
    // Setup notification channels
    this.setupNotificationChannels();
    
    console.log('✅ Alert Manager initialized');
  }

  /**
   * Process a performance alert
   */
  async processAlert(alert: PerformanceAlert): Promise<void> {
    try {
      // Check if alert already exists and is active
      const existingAlert = this.activeAlerts.get(alert.id);
      
      if (existingAlert && !existingAlert.resolved) {
        // Update existing alert
        this.updateExistingAlert(existingAlert, alert);
        return;
      }

      // Check cooldown period
      if (this.isInCooldown(alert.id)) {
        return;
      }

      // Add to active alerts
      this.activeAlerts.set(alert.id, alert);
      
      // Add to history
      this.alertHistory.push(alert);
      
      // Keep history manageable (last 1000 alerts)
      if (this.alertHistory.length > 1000) {
        this.alertHistory.splice(0, this.alertHistory.length - 1000);
      }

      // Send notifications
      await this.sendNotifications(alert);
      
      // Set cooldown
      this.setCooldown(alert.id);
      
      // Emit alert event
      this.emit('alert:triggered', alert);
      
      console.log(`🚨 Alert triggered: ${alert.severity.toUpperCase()} - ${alert.message}`);
      
    } catch (error) {
      console.error('Failed to process alert:', error);
      this.emit('alert:error', { alert, error });
    }
  }

  /**
   * Resolve an active alert
   */
  async resolveAlert(alertId: string, resolvedBy?: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    
    if (!alert) {
      console.warn(`Cannot resolve alert ${alertId}: alert not found`);
      return;
    }

    // Mark as resolved
    alert.resolved = true;
    alert.resolvedAt = new Date();
    alert.resolvedBy = resolvedBy;

    // Remove from active alerts
    this.activeAlerts.delete(alertId);
    
    // Send resolution notification
    await this.sendResolutionNotification(alert);
    
    // Emit resolution event
    this.emit('alert:resolved', alert);
    
    console.log(`✅ Alert resolved: ${alertId}`);
  }

  /**
   * Get all active alerts
   */
  async getActiveAlerts(): Promise<PerformanceAlert[]> {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 100): PerformanceAlert[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: string): PerformanceAlert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => alert.severity === severity);
  }

  /**
   * Get alerts by agent
   */
  getAlertsByAgent(agentId: string): PerformanceAlert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => alert.agentId === agentId);
  }

  /**
   * Setup default alert rules
   */
  private setupDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'cpu-high',
        name: 'High CPU Usage',
        condition: 'cpu >= threshold',
        severity: 'high',
        threshold: 80,
        enabled: true,
        cooldownMs: 300000, // 5 minutes
        description: 'Triggers when CPU usage exceeds threshold'
      },
      {
        id: 'cpu-critical',
        name: 'Critical CPU Usage',
        condition: 'cpu >= threshold',
        severity: 'critical',
        threshold: 95,
        enabled: true,
        cooldownMs: 60000, // 1 minute
        description: 'Triggers when CPU usage is critically high'
      },
      {
        id: 'memory-high',
        name: 'High Memory Usage',
        condition: 'memory >= threshold',
        severity: 'high',
        threshold: 85,
        enabled: true,
        cooldownMs: 300000, // 5 minutes
        description: 'Triggers when memory usage exceeds threshold'
      },
      {
        id: 'memory-critical',
        name: 'Critical Memory Usage',
        condition: 'memory >= threshold',
        severity: 'critical',
        threshold: 95,
        enabled: true,
        cooldownMs: 60000, // 1 minute
        description: 'Triggers when memory usage is critically high'
      },
      {
        id: 'response-slow',
        name: 'Slow Response Time',
        condition: 'responseTime >= threshold',
        severity: 'medium',
        threshold: 2000,
        enabled: true,
        cooldownMs: 600000, // 10 minutes
        description: 'Triggers when response time is slow'
      },
      {
        id: 'response-critical',
        name: 'Critical Response Time',
        condition: 'responseTime >= threshold',
        severity: 'critical',
        threshold: 10000,
        enabled: true,
        cooldownMs: 120000, // 2 minutes
        description: 'Triggers when response time is critically slow'
      },
      {
        id: 'error-rate-high',
        name: 'High Error Rate',
        condition: 'errorRate >= threshold',
        severity: 'high',
        threshold: 0.05,
        enabled: true,
        cooldownMs: 300000, // 5 minutes
        description: 'Triggers when error rate exceeds 5%'
      },
      {
        id: 'agent-offline',
        name: 'Agent Offline',
        condition: 'status == offline',
        severity: 'high',
        threshold: 0,
        enabled: true,
        cooldownMs: 600000, // 10 minutes
        description: 'Triggers when agent goes offline'
      }
    ];

    for (const rule of defaultRules) {
      this.alertRules.set(rule.id, rule);
    }

    console.log(`📋 Loaded ${defaultRules.length} default alert rules`);
  }

  /**
   * Setup notification channels
   */
  private setupNotificationChannels(): void {
    this.notificationChannels = [
      {
        type: 'console',
        config: {},
        enabled: true
      },
      {
        type: 'webhook',
        config: {
          url: process.env.ALERT_WEBHOOK_URL,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        },
        enabled: !!process.env.ALERT_WEBHOOK_URL
      },
      {
        type: 'slack',
        config: {
          webhookUrl: process.env.SLACK_WEBHOOK_URL,
          channel: process.env.SLACK_ALERT_CHANNEL || '#alerts'
        },
        enabled: !!process.env.SLACK_WEBHOOK_URL
      },
      {
        type: 'email',
        config: {
          smtp: {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS
            }
          },
          from: process.env.ALERT_FROM_EMAIL,
          to: process.env.ALERT_TO_EMAIL?.split(',') || []
        },
        enabled: !!(process.env.SMTP_HOST && process.env.ALERT_FROM_EMAIL && process.env.ALERT_TO_EMAIL)
      }
    ];

    const enabledChannels = this.notificationChannels.filter(c => c.enabled);
    console.log(`📢 Configured ${enabledChannels.length} notification channels: ${enabledChannels.map(c => c.type).join(', ')}`);
  }

  /**
   * Send notifications for an alert
   */
  private async sendNotifications(alert: PerformanceAlert): Promise<void> {
    const enabledChannels = this.notificationChannels.filter(c => c.enabled);
    
    const notificationPromises = enabledChannels.map(channel => 
      this.sendNotification(channel, alert)
    );

    await Promise.allSettled(notificationPromises);
  }

  /**
   * Send notification to a specific channel
   */
  private async sendNotification(channel: NotificationChannel, alert: PerformanceAlert): Promise<void> {
    try {
      switch (channel.type) {
        case 'console':
          await this.sendConsoleNotification(alert);
          break;
        case 'webhook':
          await this.sendWebhookNotification(channel.config, alert);
          break;
        case 'slack':
          await this.sendSlackNotification(channel.config, alert);
          break;
        case 'email':
          await this.sendEmailNotification(channel.config, alert);
          break;
        default:
          console.warn(`Unknown notification channel type: ${channel.type}`);
      }
    } catch (error) {
      console.error(`Failed to send ${channel.type} notification:`, error);
    }
  }

  /**
   * Send console notification
   */
  private async sendConsoleNotification(alert: PerformanceAlert): Promise<void> {
    const emoji = {
      'low': '🟡',
      'medium': '🟠', 
      'high': '🔴',
      'critical': '🚨'
    }[alert.severity] || '⚠️';

    console.log(`${emoji} ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
    if (alert.agentId) {
      console.log(`   Agent: ${alert.agentId}`);
    }
    console.log(`   Time: ${alert.timestamp.toISOString()}`);
    console.log(`   Metrics: ${JSON.stringify(alert.metrics)}`);
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(config: any, alert: PerformanceAlert): Promise<void> {
    if (!config.url) return;

    const payload = {
      alert: {
        id: alert.id,
        severity: alert.severity,
        type: alert.type,
        message: alert.message,
        agentId: alert.agentId,
        metrics: alert.metrics,
        timestamp: alert.timestamp.toISOString()
      },
      source: 'performance-monitor'
    };

    const response = await fetch(config.url, {
      method: config.method || 'POST',
      headers: config.headers || { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(config: any, alert: PerformanceAlert): Promise<void> {
    if (!config.webhookUrl) return;

    const color = {
      'low': '#ffeb3b',
      'medium': '#ff9800',
      'high': '#f44336',
      'critical': '#d32f2f'
    }[alert.severity] || '#607d8b';

    const payload = {
      channel: config.channel,
      attachments: [{
        color: color,
        title: `${alert.severity.toUpperCase()} Alert: ${alert.type}`,
        text: alert.message,
        fields: [
          {
            title: 'Agent',
            value: alert.agentId || 'System',
            short: true
          },
          {
            title: 'Time',
            value: alert.timestamp.toISOString(),
            short: true
          },
          {
            title: 'Metrics',
            value: JSON.stringify(alert.metrics),
            short: false
          }
        ],
        footer: 'Performance Monitor',
        ts: Math.floor(alert.timestamp.getTime() / 1000)
      }]
    };

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack notification failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(config: any, alert: PerformanceAlert): Promise<void> {
    // Email implementation would use nodemailer or similar
    // For now, we'll log the email that would be sent
    console.log('📧 Email notification (simulated):');
    console.log(`To: ${config.to.join(', ')}`);
    console.log(`Subject: [${alert.severity.toUpperCase()}] Performance Alert: ${alert.type}`);
    console.log(`Body: ${alert.message}`);
  }

  /**
   * Send resolution notification
   */
  private async sendResolutionNotification(alert: PerformanceAlert): Promise<void> {
    console.log(`✅ Alert resolved: ${alert.id} - ${alert.message}`);
    
    // Send notifications to configured channels about resolution
    const enabledChannels = this.notificationChannels.filter(c => c.enabled);
    
    for (const channel of enabledChannels) {
      if (channel.type === 'console') {
        console.log(`✅ RESOLVED [${alert.severity.toUpperCase()}]: ${alert.message}`);
      }
      // Additional resolution notifications could be sent to other channels
    }
  }

  /**
   * Update existing alert
   */
  private updateExistingAlert(existingAlert: PerformanceAlert, newAlert: PerformanceAlert): void {
    // Update metrics and timestamp
    existingAlert.metrics = { ...existingAlert.metrics, ...newAlert.metrics };
    existingAlert.timestamp = newAlert.timestamp;
    
    // Update the active alert
    this.activeAlerts.set(existingAlert.id, existingAlert);
  }

  /**
   * Check if alert is in cooldown period
   */
  private isInCooldown(alertId: string): boolean {
    const lastTriggered = this.cooldownTracker.get(alertId);
    if (!lastTriggered) return false;
    
    const rule = this.getAlertRuleForId(alertId);
    if (!rule) return false;
    
    return (Date.now() - lastTriggered) < rule.cooldownMs;
  }

  /**
   * Set cooldown for alert
   */
  private setCooldown(alertId: string): void {
    this.cooldownTracker.set(alertId, Date.now());
  }

  /**
   * Get alert rule for alert ID
   */
  private getAlertRuleForId(alertId: string): AlertRule | undefined {
    // Extract rule type from alert ID
    const ruleType = alertId.split('-')[0];
    return this.alertRules.get(ruleType);
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    console.log(`📋 Added alert rule: ${rule.name}`);
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): void {
    this.alertRules.delete(ruleId);
    console.log(`📋 Removed alert rule: ${ruleId}`);
  }

  /**
   * Get all alert rules
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * Cleanup alert manager
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up alert manager...');
    
    // Clear active alerts
    this.activeAlerts.clear();
    
    // Clear cooldown tracker
    this.cooldownTracker.clear();
    
    console.log('✅ Alert manager cleanup complete');
  }
}