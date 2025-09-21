/**
 * Report Generator - Creates comprehensive performance reports
 */

import { EventEmitter } from 'events';
import { AgentMetrics, SwarmMetrics, PerformanceAlert } from '../PerformanceMonitor';

export interface PerformanceReport {
  id: string;
  type: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'custom';
  title: string;
  generatedAt: Date;
  period: {
    start: Date;
    end: Date;
    duration: string;
  };
  summary: ReportSummary;
  sections: ReportSection[];
  recommendations: string[];
  attachments: ReportAttachment[];
}

export interface ReportSummary {
  overallStatus: 'excellent' | 'good' | 'warning' | 'critical';
  keyMetrics: {
    averageResponseTime: number;
    totalTasks: number;
    successRate: number;
    uptimePercentage: number;
    averageLoad: number;
  };
  trends: {
    performance: 'improving' | 'stable' | 'degrading';
    efficiency: 'improving' | 'stable' | 'degrading';
    reliability: 'improving' | 'stable' | 'degrading';
  };
  highlights: string[];
  concerns: string[];
}

export interface ReportSection {
  title: string;
  type: 'metrics' | 'analysis' | 'chart' | 'table' | 'text';
  content: any;
  priority: 'high' | 'medium' | 'low';
}

export interface ReportAttachment {
  name: string;
  type: 'csv' | 'json' | 'png' | 'pdf';
  content: string | Buffer;
  description: string;
}

export class ReportGenerator extends EventEmitter {
  private metricsHistory: any[] = [];
  private alertHistory: PerformanceAlert[] = [];
  private reportHistory: PerformanceReport[] = [];

  async initialize(): Promise<void> {
    console.log('📊 Initializing Report Generator...');
    console.log('✅ Report Generator initialized');
  }

  /**
   * Generate comprehensive performance report
   */
  async generateReport(type: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'final' = 'hourly'): Promise<string> {
    try {
      const reportId = `report-${Date.now()}-${type}`;
      
      console.log(`📊 Generating ${type} performance report...`);

      // Determine report period
      const period = this.getReportPeriod(type);
      
      // Collect data for the period
      const data = await this.collectReportData(period);
      
      // Generate report sections
      const sections = await this.generateReportSections(data, type);
      
      // Generate summary
      const summary = this.generateReportSummary(data);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(data, summary);
      
      // Create report object
      const report: PerformanceReport = {
        id: reportId,
        type,
        title: `Performance Report - ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        generatedAt: new Date(),
        period,
        summary,
        sections,
        recommendations,
        attachments: []
      };

      // Generate attachments
      report.attachments = await this.generateAttachments(data);
      
      // Convert to formatted string
      const reportString = this.formatReportAsString(report);
      
      // Store in history
      this.reportHistory.push(report);
      
      // Keep history manageable
      if (this.reportHistory.length > 100) {
        this.reportHistory.splice(0, this.reportHistory.length - 100);
      }

      console.log(`✅ ${type} report generated successfully`);
      this.emit('report:generated', { report, type, size: reportString.length });
      
      return reportString;

    } catch (error) {
      console.error(`Failed to generate ${type} report:`, error);
      this.emit('report:error', { type, error });
      throw error;
    }
  }

  /**
   * Get report period based on type
   */
  private getReportPeriod(type: string): { start: Date; end: Date; duration: string } {
    const now = new Date();
    const end = new Date(now);
    let start: Date;
    let duration: string;

    switch (type) {
      case 'hourly':
        start = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
        duration = '1 hour';
        break;
      case 'daily':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
        duration = '24 hours';
        break;
      case 'weekly':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
        duration = '7 days';
        break;
      case 'monthly':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        duration = '30 days';
        break;
      case 'final':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours for final report
        duration = 'session';
        break;
      default:
        start = new Date(now.getTime() - 60 * 60 * 1000);
        duration = '1 hour';
    }

    return { start, end, duration };
  }

  /**
   * Collect data for report period
   */
  private async collectReportData(period: { start: Date; end: Date; duration: string }): Promise<any> {
    // In a real implementation, this would query actual metrics from storage
    // For now, we'll simulate the data
    
    const data = {
      period,
      agents: this.generateSimulatedAgentData(period),
      swarm: this.generateSimulatedSwarmData(period),
      system: this.generateSimulatedSystemData(period),
      alerts: this.generateSimulatedAlertData(period),
      tasks: this.generateSimulatedTaskData(period),
      performance: this.generateSimulatedPerformanceData(period)
    };

    return data;
  }

  /**
   * Generate report sections
   */
  private async generateReportSections(data: any, type: string): Promise<ReportSection[]> {
    const sections: ReportSection[] = [];

    // Executive Summary
    sections.push({
      title: 'Executive Summary',
      type: 'text',
      priority: 'high',
      content: this.generateExecutiveSummary(data)
    });

    // Key Performance Indicators
    sections.push({
      title: 'Key Performance Indicators',
      type: 'metrics',
      priority: 'high',
      content: {
        responseTime: {
          current: data.performance.avgResponseTime,
          target: 500,
          trend: data.performance.responseTimeTrend,
          status: data.performance.avgResponseTime <= 500 ? 'good' : 'warning'
        },
        throughput: {
          current: data.performance.throughput,
          target: 100,
          trend: data.performance.throughputTrend,
          status: data.performance.throughput >= 100 ? 'good' : 'warning'
        },
        errorRate: {
          current: data.performance.errorRate,
          target: 0.01,
          trend: data.performance.errorRateTrend,
          status: data.performance.errorRate <= 0.01 ? 'good' : 'warning'
        },
        uptime: {
          current: data.performance.uptime,
          target: 0.99,
          trend: 'stable',
          status: data.performance.uptime >= 0.99 ? 'good' : 'critical'
        }
      }
    });

    // Agent Performance Analysis
    sections.push({
      title: 'Agent Performance Analysis',
      type: 'analysis',
      priority: 'high',
      content: this.generateAgentAnalysis(data.agents)
    });

    // System Resource Utilization
    sections.push({
      title: 'System Resource Utilization',
      type: 'metrics',
      priority: 'medium',
      content: {
        cpu: data.system.cpu,
        memory: data.system.memory,
        disk: data.system.disk,
        network: data.system.network
      }
    });

    // Alert Summary
    if (data.alerts.length > 0) {
      sections.push({
        title: 'Alert Summary',
        type: 'table',
        priority: 'high',
        content: {
          alerts: data.alerts,
          summary: {
            total: data.alerts.length,
            critical: data.alerts.filter(a => a.severity === 'critical').length,
            high: data.alerts.filter(a => a.severity === 'high').length,
            resolved: data.alerts.filter(a => a.resolved).length
          }
        }
      });
    }

    // Task Processing Statistics
    sections.push({
      title: 'Task Processing Statistics',
      type: 'metrics',
      priority: 'medium',
      content: data.tasks
    });

    // Performance Trends
    if (type !== 'hourly') {
      sections.push({
        title: 'Performance Trends',
        type: 'chart',
        priority: 'medium',
        content: this.generateTrendAnalysis(data)
      });
    }

    // Optimization Opportunities
    sections.push({
      title: 'Optimization Opportunities',
      type: 'analysis',
      priority: 'medium',
      content: this.generateOptimizationAnalysis(data)
    });

    return sections;
  }

  /**
   * Generate report summary
   */
  private generateReportSummary(data: any): ReportSummary {
    const avgResponseTime = data.performance.avgResponseTime;
    const successRate = data.tasks.successRate;
    const uptime = data.performance.uptime;
    const avgLoad = data.system.cpu / 100;

    // Determine overall status
    let overallStatus: 'excellent' | 'good' | 'warning' | 'critical' = 'excellent';
    
    if (avgResponseTime > 2000 || successRate < 0.9 || uptime < 0.95) {
      overallStatus = 'critical';
    } else if (avgResponseTime > 1000 || successRate < 0.95 || uptime < 0.99) {
      overallStatus = 'warning';
    } else if (avgResponseTime > 500 || successRate < 0.98) {
      overallStatus = 'good';
    }

    return {
      overallStatus,
      keyMetrics: {
        averageResponseTime: avgResponseTime,
        totalTasks: data.tasks.total,
        successRate: successRate,
        uptimePercentage: uptime * 100,
        averageLoad: avgLoad
      },
      trends: {
        performance: data.performance.responseTimeTrend > 0 ? 'degrading' : 
                    data.performance.responseTimeTrend < -0.1 ? 'improving' : 'stable',
        efficiency: data.performance.throughputTrend > 0.1 ? 'improving' : 
                   data.performance.throughputTrend < -0.1 ? 'degrading' : 'stable',
        reliability: data.performance.errorRateTrend < 0 ? 'improving' : 
                    data.performance.errorRateTrend > 0.1 ? 'degrading' : 'stable'
      },
      highlights: this.generateHighlights(data),
      concerns: this.generateConcerns(data)
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(data: any, summary: ReportSummary): string[] {
    const recommendations: string[] = [];

    // Performance recommendations
    if (summary.keyMetrics.averageResponseTime > 1000) {
      recommendations.push('Consider implementing caching or optimizing database queries to improve response times');
    }

    if (summary.keyMetrics.successRate < 0.95) {
      recommendations.push('Investigate and address high error rates - consider implementing better error handling and retry mechanisms');
    }

    if (summary.keyMetrics.averageLoad > 0.8) {
      recommendations.push('System load is high - consider scaling horizontally or optimizing resource-intensive processes');
    }

    // Trend-based recommendations
    if (summary.trends.performance === 'degrading') {
      recommendations.push('Performance is trending downward - schedule performance optimization review');
    }

    if (summary.trends.reliability === 'degrading') {
      recommendations.push('Reliability metrics are declining - investigate root causes and implement preventive measures');
    }

    // Agent-specific recommendations
    const highCpuAgents = data.agents.filter(a => a.avgCpu > 80).length;
    if (highCpuAgents > 0) {
      recommendations.push(`${highCpuAgents} agents have high CPU usage - consider load redistribution or scaling`);
    }

    // System recommendations
    if (data.system.memory.percentage > 85) {
      recommendations.push('System memory usage is high - consider memory optimization or hardware upgrade');
    }

    if (data.alerts.filter(a => !a.resolved).length > 5) {
      recommendations.push('Multiple unresolved alerts - prioritize alert resolution and consider alert threshold adjustments');
    }

    // Default recommendation if none specific
    if (recommendations.length === 0) {
      recommendations.push('System is performing well - continue monitoring and maintain current optimization practices');
    }

    return recommendations;
  }

  /**
   * Generate attachments (CSV data, charts, etc.)
   */
  private async generateAttachments(data: any): Promise<ReportAttachment[]> {
    const attachments: ReportAttachment[] = [];

    // Agent metrics CSV
    const agentCsv = this.generateAgentMetricsCsv(data.agents);
    attachments.push({
      name: 'agent_metrics.csv',
      type: 'csv',
      content: agentCsv,
      description: 'Detailed agent performance metrics'
    });

    // Alert data JSON
    if (data.alerts.length > 0) {
      attachments.push({
        name: 'alerts.json',
        type: 'json',
        content: JSON.stringify(data.alerts, null, 2),
        description: 'Alert details and history'
      });
    }

    // Task processing data CSV
    const taskCsv = this.generateTaskDataCsv(data.tasks);
    attachments.push({
      name: 'task_processing.csv',
      type: 'csv',
      content: taskCsv,
      description: 'Task processing statistics'
    });

    return attachments;
  }

  /**
   * Format report as readable string
   */
  private formatReportAsString(report: PerformanceReport): string {
    let output = '';

    // Header
    output += `${'='.repeat(80)}\n`;
    output += `${report.title}\n`;
    output += `Generated: ${report.generatedAt.toISOString()}\n`;
    output += `Period: ${report.period.start.toISOString()} to ${report.period.end.toISOString()}\n`;
    output += `Duration: ${report.period.duration}\n`;
    output += `${'='.repeat(80)}\n\n`;

    // Summary
    output += `EXECUTIVE SUMMARY\n`;
    output += `${'-'.repeat(40)}\n`;
    output += `Overall Status: ${report.summary.overallStatus.toUpperCase()}\n`;
    output += `Average Response Time: ${report.summary.keyMetrics.averageResponseTime.toFixed(2)}ms\n`;
    output += `Total Tasks: ${report.summary.keyMetrics.totalTasks.toLocaleString()}\n`;
    output += `Success Rate: ${(report.summary.keyMetrics.successRate * 100).toFixed(2)}%\n`;
    output += `Uptime: ${report.summary.keyMetrics.uptimePercentage.toFixed(2)}%\n`;
    output += `Average Load: ${(report.summary.keyMetrics.averageLoad * 100).toFixed(1)}%\n\n`;

    // Trends
    output += `PERFORMANCE TRENDS\n`;
    output += `${'-'.repeat(40)}\n`;
    output += `Performance: ${report.summary.trends.performance}\n`;
    output += `Efficiency: ${report.summary.trends.efficiency}\n`;
    output += `Reliability: ${report.summary.trends.reliability}\n\n`;

    // Highlights
    if (report.summary.highlights.length > 0) {
      output += `KEY HIGHLIGHTS\n`;
      output += `${'-'.repeat(40)}\n`;
      for (const highlight of report.summary.highlights) {
        output += `• ${highlight}\n`;
      }
      output += '\n';
    }

    // Concerns
    if (report.summary.concerns.length > 0) {
      output += `AREAS OF CONCERN\n`;
      output += `${'-'.repeat(40)}\n`;
      for (const concern of report.summary.concerns) {
        output += `• ${concern}\n`;
      }
      output += '\n';
    }

    // Sections
    for (const section of report.sections) {
      output += `${section.title.toUpperCase()}\n`;
      output += `${'-'.repeat(40)}\n`;
      
      switch (section.type) {
        case 'text':
          output += `${section.content}\n\n`;
          break;
        case 'metrics':
          output += this.formatMetricsContent(section.content);
          break;
        case 'analysis':
          output += this.formatAnalysisContent(section.content);
          break;
        case 'table':
          output += this.formatTableContent(section.content);
          break;
        default:
          output += `${JSON.stringify(section.content, null, 2)}\n\n`;
      }
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      output += `RECOMMENDATIONS\n`;
      output += `${'-'.repeat(40)}\n`;
      for (let i = 0; i < report.recommendations.length; i++) {
        output += `${i + 1}. ${report.recommendations[i]}\n`;
      }
      output += '\n';
    }

    // Attachments
    if (report.attachments.length > 0) {
      output += `ATTACHMENTS\n`;
      output += `${'-'.repeat(40)}\n`;
      for (const attachment of report.attachments) {
        output += `• ${attachment.name} (${attachment.type.toUpperCase()}) - ${attachment.description}\n`;
      }
      output += '\n';
    }

    // Footer
    output += `${'='.repeat(80)}\n`;
    output += `Report ID: ${report.id}\n`;
    output += `Generated by Performance Monitor v2.0\n`;
    output += `${'='.repeat(80)}\n`;

    return output;
  }

  // Helper methods for simulated data generation

  private generateSimulatedAgentData(period: any): any[] {
    const agentCount = Math.floor(Math.random() * 5) + 3; // 3-8 agents
    const agents = [];

    for (let i = 0; i < agentCount; i++) {
      agents.push({
        id: `agent-${i + 1}`,
        name: `Agent ${i + 1}`,
        type: ['researcher', 'coder', 'tester', 'reviewer', 'analyst'][i % 5],
        avgCpu: Math.floor(Math.random() * 60) + 20,
        avgMemory: Math.floor(Math.random() * 50) + 30,
        avgResponseTime: Math.floor(Math.random() * 1500) + 200,
        errorRate: Math.random() * 0.05,
        tasksCompleted: Math.floor(Math.random() * 1000) + 100,
        uptime: 0.95 + Math.random() * 0.05
      });
    }

    return agents;
  }

  private generateSimulatedSwarmData(period: any): any {
    return {
      totalAgents: Math.floor(Math.random() * 5) + 3,
      activeAgents: Math.floor(Math.random() * 5) + 3,
      coordinationEfficiency: 0.85 + Math.random() * 0.1,
      communicationLatency: Math.floor(Math.random() * 100) + 50
    };
  }

  private generateSimulatedSystemData(period: any): any {
    return {
      cpu: Math.floor(Math.random() * 40) + 40,
      memory: {
        used: Math.floor(Math.random() * 4000) + 2000,
        total: 8192,
        percentage: Math.floor(Math.random() * 40) + 40
      },
      disk: {
        used: Math.floor(Math.random() * 200) + 100,
        total: 500,
        percentage: Math.floor(Math.random() * 30) + 20
      },
      network: {
        bytesIn: Math.floor(Math.random() * 1000000),
        bytesOut: Math.floor(Math.random() * 1000000)
      }
    };
  }

  private generateSimulatedAlertData(period: any): PerformanceAlert[] {
    const alertCount = Math.floor(Math.random() * 5);
    const alerts: PerformanceAlert[] = [];

    for (let i = 0; i < alertCount; i++) {
      alerts.push({
        id: `alert-${i + 1}`,
        severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
        type: ['performance', 'availability', 'error', 'resource'][Math.floor(Math.random() * 4)] as any,
        message: `Simulated alert ${i + 1}`,
        metrics: { value: Math.random() * 100 },
        timestamp: new Date(Date.now() - Math.random() * 3600000),
        resolved: Math.random() > 0.3
      });
    }

    return alerts;
  }

  private generateSimulatedTaskData(period: any): any {
    const total = Math.floor(Math.random() * 5000) + 1000;
    const completed = Math.floor(total * (0.8 + Math.random() * 0.15));
    const failed = Math.floor(total * Math.random() * 0.1);

    return {
      total,
      completed,
      failed,
      pending: total - completed - failed,
      successRate: completed / total,
      averageProcessingTime: Math.floor(Math.random() * 5000) + 1000
    };
  }

  private generateSimulatedPerformanceData(period: any): any {
    return {
      avgResponseTime: Math.floor(Math.random() * 1500) + 300,
      throughput: Math.floor(Math.random() * 150) + 50,
      errorRate: Math.random() * 0.08,
      uptime: 0.95 + Math.random() * 0.05,
      responseTimeTrend: (Math.random() - 0.5) * 0.4,
      throughputTrend: (Math.random() - 0.5) * 0.3,
      errorRateTrend: (Math.random() - 0.5) * 0.02
    };
  }

  // Helper methods for content formatting

  private generateExecutiveSummary(data: any): string {
    const summary = `
This performance report covers the period from ${data.period.start.toISOString()} to ${data.period.end.toISOString()}.

During this ${data.period.duration}, the system processed ${data.tasks.total.toLocaleString()} tasks with a ${(data.tasks.successRate * 100).toFixed(1)}% success rate. The average response time was ${data.performance.avgResponseTime.toFixed(0)}ms with an overall system uptime of ${(data.performance.uptime * 100).toFixed(2)}%.

The swarm maintained ${data.swarm.activeAgents} active agents out of ${data.swarm.totalAgents} total agents, demonstrating ${data.swarm.coordinationEfficiency > 0.9 ? 'excellent' : data.swarm.coordinationEfficiency > 0.8 ? 'good' : 'adequate'} coordination efficiency.

${data.alerts.length > 0 ? `${data.alerts.length} alerts were generated during this period, with ${data.alerts.filter(a => a.severity === 'critical').length} classified as critical.` : 'No significant alerts were generated during this period.'}
    `.trim();

    return summary;
  }

  private generateAgentAnalysis(agents: any[]): string {
    let analysis = `Agent Performance Summary:\n\n`;
    
    for (const agent of agents) {
      const status = agent.avgCpu > 80 ? 'HIGH LOAD' : 
                    agent.avgCpu > 60 ? 'MODERATE LOAD' : 'NORMAL';
      
      analysis += `${agent.name} (${agent.type}):\n`;
      analysis += `  - CPU: ${agent.avgCpu.toFixed(1)}% (${status})\n`;
      analysis += `  - Memory: ${agent.avgMemory.toFixed(1)}%\n`;
      analysis += `  - Response Time: ${agent.avgResponseTime.toFixed(0)}ms\n`;
      analysis += `  - Tasks Completed: ${agent.tasksCompleted.toLocaleString()}\n`;
      analysis += `  - Uptime: ${(agent.uptime * 100).toFixed(2)}%\n\n`;
    }

    return analysis;
  }

  private generateOptimizationAnalysis(data: any): string {
    let analysis = 'Based on the current performance metrics, the following optimization opportunities have been identified:\n\n';

    if (data.performance.avgResponseTime > 1000) {
      analysis += '• Response time optimization needed - consider caching improvements\n';
    }

    if (data.system.cpu > 80) {
      analysis += '• High system CPU usage - consider load balancing or scaling\n';
    }

    if (data.tasks.successRate < 0.95) {
      analysis += '• Error rate reduction needed - investigate failure patterns\n';
    }

    const highCpuAgents = data.agents.filter(a => a.avgCpu > 80).length;
    if (highCpuAgents > 0) {
      analysis += `• ${highCpuAgents} agents have high CPU usage - consider workload redistribution\n`;
    }

    if (analysis.includes('•')) {
      return analysis;
    } else {
      return 'System is performing optimally. Continue current monitoring and maintenance practices.';
    }
  }

  private generateHighlights(data: any): string[] {
    const highlights: string[] = [];

    if (data.performance.uptime > 0.99) {
      highlights.push(`Excellent uptime of ${(data.performance.uptime * 100).toFixed(2)}%`);
    }

    if (data.tasks.successRate > 0.95) {
      highlights.push(`High task success rate of ${(data.tasks.successRate * 100).toFixed(1)}%`);
    }

    if (data.performance.avgResponseTime < 500) {
      highlights.push(`Fast average response time of ${data.performance.avgResponseTime.toFixed(0)}ms`);
    }

    if (data.swarm.coordinationEfficiency > 0.9) {
      highlights.push('Excellent agent coordination efficiency');
    }

    const lowErrorAgents = data.agents.filter(a => a.errorRate < 0.01).length;
    if (lowErrorAgents === data.agents.length) {
      highlights.push('All agents maintaining low error rates');
    }

    return highlights;
  }

  private generateConcerns(data: any): string[] {
    const concerns: string[] = [];

    if (data.performance.avgResponseTime > 2000) {
      concerns.push(`High average response time of ${data.performance.avgResponseTime.toFixed(0)}ms`);
    }

    if (data.tasks.successRate < 0.9) {
      concerns.push(`Low task success rate of ${(data.tasks.successRate * 100).toFixed(1)}%`);
    }

    if (data.system.cpu > 90) {
      concerns.push(`Critical system CPU usage of ${data.system.cpu}%`);
    }

    const highErrorAgents = data.agents.filter(a => a.errorRate > 0.05).length;
    if (highErrorAgents > 0) {
      concerns.push(`${highErrorAgents} agents with high error rates`);
    }

    const criticalAlerts = data.alerts.filter(a => a.severity === 'critical' && !a.resolved).length;
    if (criticalAlerts > 0) {
      concerns.push(`${criticalAlerts} unresolved critical alerts`);
    }

    return concerns;
  }

  private generateTrendAnalysis(data: any): any {
    return {
      responseTime: {
        trend: data.performance.responseTimeTrend > 0 ? 'increasing' : 'decreasing',
        change: (data.performance.responseTimeTrend * 100).toFixed(1) + '%'
      },
      throughput: {
        trend: data.performance.throughputTrend > 0 ? 'increasing' : 'decreasing',
        change: (data.performance.throughputTrend * 100).toFixed(1) + '%'
      },
      errorRate: {
        trend: data.performance.errorRateTrend > 0 ? 'increasing' : 'decreasing',
        change: (data.performance.errorRateTrend * 100).toFixed(1) + '%'
      }
    };
  }

  private formatMetricsContent(content: any): string {
    let output = '';
    for (const [key, value] of Object.entries(content)) {
      if (typeof value === 'object' && value !== null) {
        output += `${key.charAt(0).toUpperCase() + key.slice(1)}:\n`;
        for (const [subKey, subValue] of Object.entries(value as any)) {
          output += `  ${subKey}: ${subValue}\n`;
        }
      } else {
        output += `${key}: ${value}\n`;
      }
    }
    return output + '\n';
  }

  private formatAnalysisContent(content: any): string {
    if (typeof content === 'string') {
      return content + '\n\n';
    }
    return JSON.stringify(content, null, 2) + '\n\n';
  }

  private formatTableContent(content: any): string {
    let output = '';
    if (content.alerts) {
      output += 'Recent Alerts:\n';
      for (const alert of content.alerts) {
        output += `  ${alert.severity.toUpperCase()}: ${alert.message} (${alert.resolved ? 'RESOLVED' : 'ACTIVE'})\n`;
      }
    }
    if (content.summary) {
      output += `\nAlert Summary: ${content.summary.total} total, ${content.summary.critical} critical, ${content.summary.resolved} resolved\n`;
    }
    return output + '\n';
  }

  private generateAgentMetricsCsv(agents: any[]): string {
    let csv = 'Agent ID,Name,Type,Avg CPU,Avg Memory,Avg Response Time,Error Rate,Tasks Completed,Uptime\n';
    
    for (const agent of agents) {
      csv += `${agent.id},${agent.name},${agent.type},${agent.avgCpu},${agent.avgMemory},${agent.avgResponseTime},${agent.errorRate},${agent.tasksCompleted},${agent.uptime}\n`;
    }
    
    return csv;
  }

  private generateTaskDataCsv(tasks: any): string {
    let csv = 'Metric,Value\n';
    csv += `Total Tasks,${tasks.total}\n`;
    csv += `Completed Tasks,${tasks.completed}\n`;
    csv += `Failed Tasks,${tasks.failed}\n`;
    csv += `Pending Tasks,${tasks.pending}\n`;
    csv += `Success Rate,${tasks.successRate}\n`;
    csv += `Average Processing Time,${tasks.averageProcessingTime}\n`;
    
    return csv;
  }

  /**
   * Get report history
   */
  getReportHistory(limit: number = 10): PerformanceReport[] {
    return this.reportHistory.slice(-limit);
  }

  /**
   * Cleanup report generator
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up report generator...');
    
    // Clear histories
    this.metricsHistory = [];
    this.alertHistory = [];
    
    console.log('✅ Report generator cleanup complete');
  }
}