/**
 * Real-time Performance Dashboard Manager
 * Manages live dashboards with WebSocket updates
 */

import { EventEmitter } from 'events';
import { AgentMetrics, SwarmMetrics, PerformanceAlert } from '../PerformanceMonitor';

export interface DashboardData {
  agents: AgentMetrics[];
  swarm: SwarmMetrics;
  system: any;
  alerts: PerformanceAlert[];
  trends: any;
  summary: DashboardSummary;
  timestamp: Date;
}

export interface DashboardSummary {
  status: 'healthy' | 'warning' | 'critical';
  activeAgents: number;
  totalTasks: number;
  averageResponseTime: number;
  systemLoad: number;
  criticalAlerts: number;
  warningAlerts: number;
  uptimePercentage: number;
}

export class DashboardManager extends EventEmitter {
  private dashboardConnections: Set<WebSocket> = new Set();
  private currentData: DashboardData | null = null;
  private server: any;
  private historicalData: DashboardData[] = [];

  async initialize(): Promise<void> {
    console.log('📊 Initializing Dashboard Manager...');
    
    // Start WebSocket server for real-time dashboard
    await this.startDashboardServer();
    
    console.log('✅ Dashboard Manager initialized');
  }

  /**
   * Update dashboard with latest metrics
   */
  async updateMetrics(data: {
    agents: AgentMetrics[];
    swarm: SwarmMetrics;
    system: any;
    alerts: PerformanceAlert[];
  }): Promise<void> {
    try {
      // Calculate trends from historical data
      const trends = this.calculateTrends(data);
      
      // Generate summary
      const summary = this.generateSummary(data);
      
      // Create dashboard data package
      const dashboardData: DashboardData = {
        agents: data.agents,
        swarm: data.swarm,
        system: data.system,
        alerts: data.alerts,
        trends,
        summary,
        timestamp: new Date()
      };

      // Store current data
      this.currentData = dashboardData;
      
      // Add to historical data
      this.historicalData.push(dashboardData);
      
      // Keep only last 24 hours of data (assuming 5-second intervals)
      const maxEntries = (24 * 60 * 60) / 5; // 17,280 entries
      if (this.historicalData.length > maxEntries) {
        this.historicalData.splice(0, this.historicalData.length - maxEntries);
      }

      // Broadcast to all connected dashboards
      await this.broadcastUpdate(dashboardData);
      
      this.emit('dashboard:updated', dashboardData);
      
    } catch (error) {
      console.error('Failed to update dashboard:', error);
      this.emit('dashboard:error', error);
    }
  }

  /**
   * Start WebSocket server for real-time dashboard connections
   */
  private async startDashboardServer(): Promise<void> {
    // In a real implementation, this would start a WebSocket server
    // For now, we'll simulate the server functionality
    
    const WebSocket = require('ws');
    
    try {
      this.server = new WebSocket.Server({ 
        port: 8080,
        path: '/dashboard'
      });

      this.server.on('connection', (ws: WebSocket) => {
        console.log('📱 New dashboard connection established');
        
        // Add to active connections
        this.dashboardConnections.add(ws);
        
        // Send current data immediately
        if (this.currentData) {
          this.sendToClient(ws, {
            type: 'initial_data',
            data: this.currentData
          });
        }
        
        // Handle client messages
        ws.on('message', (message: string) => {
          try {
            const data = JSON.parse(message);
            this.handleClientMessage(ws, data);
          } catch (error) {
            console.error('Invalid message from dashboard client:', error);
          }
        });
        
        // Remove from connections on close
        ws.on('close', () => {
          console.log('📱 Dashboard connection closed');
          this.dashboardConnections.delete(ws);
        });
        
        // Handle errors
        ws.on('error', (error: Error) => {
          console.error('Dashboard WebSocket error:', error);
          this.dashboardConnections.delete(ws);
        });
      });

      console.log('🌐 Dashboard WebSocket server started on port 8080');
      
    } catch (error) {
      console.error('Failed to start dashboard server:', error);
      throw error;
    }
  }

  /**
   * Handle messages from dashboard clients
   */
  private handleClientMessage(ws: WebSocket, message: any): void {
    switch (message.type) {
      case 'request_historical':
        this.sendHistoricalData(ws, message.timeRange);
        break;
        
      case 'request_agent_details':
        this.sendAgentDetails(ws, message.agentId);
        break;
        
      case 'request_alert_details':
        this.sendAlertDetails(ws, message.alertId);
        break;
        
      case 'dashboard_config':
        this.updateDashboardConfig(ws, message.config);
        break;
        
      default:
        console.warn('Unknown dashboard message type:', message.type);
    }
  }

  /**
   * Broadcast update to all connected dashboards
   */
  private async broadcastUpdate(data: DashboardData): Promise<void> {
    const message = {
      type: 'metrics_update',
      data: data,
      timestamp: Date.now()
    };

    const broadcastPromises: Promise<void>[] = [];
    
    for (const ws of this.dashboardConnections) {
      if (ws.readyState === WebSocket.OPEN) {
        broadcastPromises.push(this.sendToClient(ws, message));
      } else {
        // Remove closed connections
        this.dashboardConnections.delete(ws);
      }
    }

    await Promise.allSettled(broadcastPromises);
  }

  /**
   * Send message to specific client
   */
  private async sendToClient(ws: WebSocket, message: any): Promise<void> {
    return new Promise<void>((resolve) => {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message), (error?: Error) => {
            if (error) {
              console.error('Error sending to dashboard client:', error);
            }
            resolve();
          });
        } else {
          resolve();
        }
      } catch (error) {
        console.error('Failed to send message to dashboard client:', error);
        resolve();
      }
    });
  }

  /**
   * Calculate performance trends
   */
  private calculateTrends(currentData: {
    agents: AgentMetrics[];
    swarm: SwarmMetrics;
    system: any;
    alerts: PerformanceAlert[];
  }): any {
    const trends: any = {
      responseTime: { trend: 'stable', change: 0 },
      throughput: { trend: 'stable', change: 0 },
      errorRate: { trend: 'stable', change: 0 },
      systemLoad: { trend: 'stable', change: 0 },
      agentCount: { trend: 'stable', change: 0 }
    };

    if (this.historicalData.length > 10) {
      const recent = this.historicalData.slice(-10);
      const older = this.historicalData.slice(-20, -10);

      // Calculate response time trend
      const recentAvgResponse = recent.reduce((sum, d) => sum + d.swarm.averageResponseTime, 0) / recent.length;
      const olderAvgResponse = older.reduce((sum, d) => sum + d.swarm.averageResponseTime, 0) / older.length;
      
      if (olderAvgResponse > 0) {
        const responseChange = ((recentAvgResponse - olderAvgResponse) / olderAvgResponse) * 100;
        trends.responseTime = {
          trend: responseChange > 5 ? 'increasing' : responseChange < -5 ? 'decreasing' : 'stable',
          change: responseChange
        };
      }

      // Calculate throughput trend
      const recentAvgThroughput = recent.reduce((sum, d) => sum + d.swarm.throughput, 0) / recent.length;
      const olderAvgThroughput = older.reduce((sum, d) => sum + d.swarm.throughput, 0) / older.length;
      
      if (olderAvgThroughput > 0) {
        const throughputChange = ((recentAvgThroughput - olderAvgThroughput) / olderAvgThroughput) * 100;
        trends.throughput = {
          trend: throughputChange > 5 ? 'increasing' : throughputChange < -5 ? 'decreasing' : 'stable',
          change: throughputChange
        };
      }

      // Calculate system load trend
      const recentAvgLoad = recent.reduce((sum, d) => sum + d.swarm.systemLoad, 0) / recent.length;
      const olderAvgLoad = older.reduce((sum, d) => sum + d.swarm.systemLoad, 0) / older.length;
      
      if (olderAvgLoad > 0) {
        const loadChange = ((recentAvgLoad - olderAvgLoad) / olderAvgLoad) * 100;
        trends.systemLoad = {
          trend: loadChange > 10 ? 'increasing' : loadChange < -10 ? 'decreasing' : 'stable',
          change: loadChange
        };
      }
    }

    return trends;
  }

  /**
   * Generate dashboard summary
   */
  private generateSummary(data: {
    agents: AgentMetrics[];
    swarm: SwarmMetrics;
    system: any;
    alerts: PerformanceAlert[];
  }): DashboardSummary {
    const criticalAlerts = data.alerts.filter(a => a.severity === 'critical').length;
    const warningAlerts = data.alerts.filter(a => a.severity === 'medium' || a.severity === 'high').length;
    
    // Determine overall status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalAlerts > 0) {
      status = 'critical';
    } else if (warningAlerts > 0 || data.swarm.systemLoad > 2.0) {
      status = 'warning';
    }

    // Calculate uptime percentage (simplified)
    const uptimePercentage = data.agents.length > 0 ? 
      (data.swarm.activeAgents / data.agents.length) * 100 : 100;

    return {
      status,
      activeAgents: data.swarm.activeAgents,
      totalTasks: data.swarm.totalTasks,
      averageResponseTime: data.swarm.averageResponseTime,
      systemLoad: data.swarm.systemLoad,
      criticalAlerts,
      warningAlerts,
      uptimePercentage
    };
  }

  /**
   * Send historical data to client
   */
  private sendHistoricalData(ws: WebSocket, timeRange: string): void {
    let data: DashboardData[];
    
    switch (timeRange) {
      case '1h':
        data = this.historicalData.slice(-720); // Last hour (5s intervals)
        break;
      case '6h':
        data = this.historicalData.slice(-4320); // Last 6 hours
        break;
      case '24h':
        data = this.historicalData; // All available data
        break;
      default:
        data = this.historicalData.slice(-720);
    }

    this.sendToClient(ws, {
      type: 'historical_data',
      data: data,
      timeRange: timeRange
    });
  }

  /**
   * Send detailed agent information
   */
  private sendAgentDetails(ws: WebSocket, agentId: string): void {
    if (!this.currentData) return;
    
    const agent = this.currentData.agents.find(a => a.agentId === agentId);
    if (!agent) return;

    // Get historical data for this agent
    const agentHistory = this.historicalData.map(d => 
      d.agents.find(a => a.agentId === agentId)
    ).filter(Boolean);

    this.sendToClient(ws, {
      type: 'agent_details',
      agentId: agentId,
      current: agent,
      history: agentHistory.slice(-100) // Last 100 data points
    });
  }

  /**
   * Send detailed alert information
   */
  private sendAlertDetails(ws: WebSocket, alertId: string): void {
    if (!this.currentData) return;
    
    const alert = this.currentData.alerts.find(a => a.id === alertId);
    if (!alert) return;

    this.sendToClient(ws, {
      type: 'alert_details',
      alert: alert
    });
  }

  /**
   * Update dashboard configuration
   */
  private updateDashboardConfig(ws: WebSocket, config: any): void {
    // Store dashboard preferences per client
    console.log('📊 Dashboard config updated:', config);
    
    this.sendToClient(ws, {
      type: 'config_updated',
      config: config
    });
  }

  /**
   * Get current dashboard data
   */
  async getCurrentData(): Promise<DashboardData | null> {
    return this.currentData;
  }

  /**
   * Get historical dashboard data
   */
  getHistoricalData(timeRange?: string): DashboardData[] {
    if (!timeRange) return this.historicalData;
    
    switch (timeRange) {
      case '1h':
        return this.historicalData.slice(-720);
      case '6h':
        return this.historicalData.slice(-4320);
      case '24h':
        return this.historicalData;
      default:
        return this.historicalData;
    }
  }

  /**
   * Cleanup dashboard manager
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up dashboard manager...');
    
    // Close all client connections
    for (const ws of this.dashboardConnections) {
      try {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      } catch (error) {
        console.error('Error closing dashboard connection:', error);
      }
    }
    
    this.dashboardConnections.clear();
    
    // Close server
    if (this.server) {
      this.server.close();
    }
    
    console.log('✅ Dashboard manager cleanup complete');
  }
}