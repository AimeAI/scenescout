# Performance Monitoring System

Comprehensive real-time performance monitoring, alerting, and optimization for distributed swarm systems.

## Features

### 🔍 Real-time Metrics Collection
- **Agent Performance**: CPU, memory, response times, error rates, task completion
- **Swarm Coordination**: Communication latency, load distribution, coordination efficiency
- **System Resources**: Database performance, API metrics, network statistics
- **WebSocket Connections**: Real-time agent communication monitoring

### 📊 Live Dashboard
- **Real-time Updates**: WebSocket-based live dashboard on port 8080
- **Performance Trends**: Historical analysis and trend detection
- **Agent Details**: Individual agent performance and health status
- **Alert Visualization**: Active alerts and resolution status

### 🚨 Intelligent Alerting
- **Multi-channel Notifications**: Console, Webhook, Slack, Email
- **Smart Thresholds**: Configurable performance thresholds
- **Cooldown Management**: Prevents alert spam with intelligent cooldowns
- **Severity Levels**: Low, Medium, High, Critical with appropriate escalation

### 🔧 Auto-optimization Engine
- **Performance Analysis**: Automated bottleneck detection
- **Smart Recommendations**: AI-driven optimization suggestions
- **Auto-scaling**: Intelligent agent scaling based on load
- **Load Balancing**: Dynamic load redistribution
- **Resource Optimization**: Memory, CPU, and throughput optimization

### 📋 Comprehensive Reporting
- **Multiple Formats**: Hourly, Daily, Weekly, Monthly, Final reports
- **Executive Summaries**: High-level performance overviews
- **Detailed Analytics**: Agent-level performance breakdowns
- **Trend Analysis**: Performance trend identification
- **Optimization Opportunities**: Actionable improvement recommendations
- **Attachments**: CSV data exports, JSON metadata

## Quick Start

### Option 1: Direct Integration
```typescript
import { startPerformanceMonitoring } from './src/monitoring';

// Start with default configuration
const monitor = await startPerformanceMonitoring({
  intervalMs: 5000,
  enableDashboard: true,
  enableAlerts: true,
  enableOptimization: true,
  enableReports: true
});
```

### Option 2: Service Integration
```typescript
import { monitoringService } from './src/monitoring/MonitoringService';

// Initialize monitoring service
await monitoringService.initialize();

// Get current performance data
const dashboard = await monitoringService.getDashboardData();
const alerts = await monitoringService.getActiveAlerts();
const recommendations = await monitoringService.getOptimizationRecommendations();
```

### Option 3: Standalone Script
```bash
# Start monitoring as standalone service
node scripts/start-monitoring.js
```

### Option 4: Claude Flow Hooks Integration
```typescript
import { initializeMonitoringHooks } from './src/monitoring/hooks/SwarmHooks';

// Initialize hooks for automatic swarm integration
await initializeMonitoringHooks();

// Hooks automatically execute during swarm operations:
// - Pre-task: Before agent starts work
// - Post-task: After agent completes work  
// - Post-edit: After file modifications
// - Notifications: Agent communication tracking
// - Session management: Context preservation
```

## Configuration

### Performance Thresholds
```typescript
const thresholds = {
  cpu: { warning: 70, critical: 90 },
  memory: { warning: 80, critical: 95 },
  responseTime: { warning: 1000, critical: 5000 },
  errorRate: { warning: 0.05, critical: 0.1 },
  communicationLatency: { warning: 200, critical: 500 }
};
```

### Notification Channels
```typescript
// Environment variables for notifications
ALERT_WEBHOOK_URL=https://your-webhook-url
SLACK_WEBHOOK_URL=https://hooks.slack.com/your-webhook
SLACK_ALERT_CHANNEL=#alerts
SMTP_HOST=smtp.your-provider.com
SMTP_USER=your-email@domain.com
SMTP_PASS=your-password
ALERT_FROM_EMAIL=alerts@yourdomain.com
ALERT_TO_EMAIL=admin@yourdomain.com,devops@yourdomain.com
```

## Architecture

### Core Components

1. **PerformanceMonitor**: Central orchestration and lifecycle management
2. **MetricsCollector**: Real-time data collection from agents and system
3. **DashboardManager**: WebSocket-based real-time dashboard
4. **AlertManager**: Multi-channel alerting with intelligent thresholds
5. **OptimizationEngine**: AI-driven performance optimization
6. **ReportGenerator**: Comprehensive reporting and analytics

### Data Flow
```
Agents → MetricsCollector → PerformanceMonitor → {
  ├── DashboardManager → WebSocket Clients
  ├── AlertManager → Notification Channels
  ├── OptimizationEngine → Auto-recommendations
  └── ReportGenerator → Performance Reports
}
```

## Agent Integration

### WebSocket Metrics Endpoint
Agents should implement WebSocket metrics endpoint:
```javascript
// Agent WebSocket server
const ws = new WebSocket.Server({ port: 300X });

ws.on('connection', (socket) => {
  socket.on('message', (data) => {
    const request = JSON.parse(data);
    
    if (request.type === 'metrics_request') {
      socket.send(JSON.stringify({
        type: 'metrics_response',
        agentType: 'researcher', // or coder, tester, etc.
        cpu: getCurrentCpuUsage(),
        memory: getCurrentMemoryUsage(),
        responseTime: getAverageResponseTime(),
        errorRate: getCurrentErrorRate(),
        activeConnections: getActiveConnections(),
        lastHeartbeat: new Date().toISOString(),
        status: 'active' // active, idle, busy, error, offline
      }));
    }
  });
});
```

### Agent Discovery
Agents are discovered via:
- WebSocket endpoints: `ws://localhost:300X/metrics`
- Service discovery mechanisms
- Configuration files
- Environment variables

## Dashboard Features

### Real-time Metrics
- Live performance charts and graphs
- Agent status indicators
- System resource utilization
- Alert notifications

### Historical Analysis
- Performance trends over time
- Bottleneck identification
- Capacity planning insights
- Optimization tracking

### Interactive Features
- Agent detail drill-down
- Alert acknowledgment
- Configuration updates
- Report generation

## Alert Types

### Performance Alerts
- High CPU usage (>80% warning, >90% critical)
- High memory usage (>85% warning, >95% critical)
- Slow response times (>1s warning, >5s critical)
- High error rates (>5% warning, >10% critical)

### Availability Alerts
- Agent offline detection
- Communication failures
- System unavailability

### Resource Alerts
- Memory leaks
- Disk space issues
- Network connectivity problems

### Custom Alerts
- Configurable thresholds
- Business logic alerts
- SLA violations

## Optimization Features

### Automatic Recommendations
- Agent scaling suggestions
- Load redistribution
- Resource optimization
- Performance tuning

### Auto-application
- Safe automatic optimizations
- Configurable automation rules
- Risk assessment
- Rollback capabilities

### Optimization Types
- **Scale Agents**: Horizontal scaling based on load
- **Redistribute Load**: Balance work across agents
- **Restart Agent**: Recovery from errors or memory issues
- **Adjust Thresholds**: Dynamic threshold optimization
- **Resource Allocation**: CPU and memory optimization
- **Topology Changes**: Communication pattern optimization

## Reports

### Report Types
- **Hourly**: Last hour performance summary
- **Daily**: 24-hour comprehensive analysis
- **Weekly**: 7-day trend analysis
- **Monthly**: 30-day performance review
- **Final**: Session completion summary

### Report Sections
- Executive summary
- Key performance indicators
- Agent performance analysis
- System resource utilization
- Alert summary
- Performance trends
- Optimization opportunities

### Export Formats
- Formatted text reports
- CSV data exports
- JSON metadata
- Charts and visualizations (planned)

## Integration with Claude Flow

### Automatic Hook Execution
The monitoring system integrates seamlessly with Claude Flow swarm coordination:

```bash
# These hooks are automatically called by Claude Flow
npx claude-flow@alpha hooks pre-task --description "task description"
npx claude-flow@alpha hooks post-task --task-id "task-id"
npx claude-flow@alpha hooks post-edit --file "file.js" --memory-key "key"
npx claude-flow@alpha hooks notify --message "notification"
npx claude-flow@alpha hooks session-restore --session-id "session"
npx claude-flow@alpha hooks session-end --export-metrics true
```

### Memory Integration
- Task tracking and timing
- File modification history
- Agent communication logs
- Performance context preservation

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failures**
   - Check agent endpoints are accessible
   - Verify port availability
   - Check firewall settings

2. **High Memory Usage**
   - Monitor metrics history size
   - Adjust data retention policies
   - Check for memory leaks

3. **Alert Spam**
   - Review threshold settings
   - Adjust cooldown periods
   - Check notification channel limits

4. **Dashboard Not Loading**
   - Verify WebSocket server is running on port 8080
   - Check browser WebSocket support
   - Review server logs for errors

### Debugging

Enable detailed logging:
```typescript
// Set environment variable
DEBUG=performance-monitor:*

// Or enable programmatically
const monitor = new PerformanceMonitor();
monitor.setDebugLevel('verbose');
```

## Performance Impact

### Resource Usage
- **CPU**: <5% overhead during normal operation
- **Memory**: ~50-100MB for historical data
- **Network**: Minimal WebSocket traffic
- **Storage**: Report files in memory/ directory

### Optimization
- Efficient WebSocket connections
- Configurable data retention
- Optimized metrics collection
- Smart alert throttling

## Security

### Best Practices
- Secure WebSocket connections (WSS in production)
- Environment variable configuration
- No sensitive data in logs
- Configurable notification channels

### Production Considerations
- HTTPS/WSS for dashboard
- Authentication for dashboard access
- Rate limiting for API endpoints
- Monitoring data encryption

## Roadmap

### Planned Features
- [ ] Machine learning-based anomaly detection
- [ ] Advanced visualization charts
- [ ] Mobile dashboard support
- [ ] Integration with external monitoring tools
- [ ] Custom metric definitions
- [ ] Advanced alerting rules engine
- [ ] Performance prediction models
- [ ] Multi-cluster monitoring

### Version History
- **v1.0.0**: Initial implementation with core monitoring
- **v1.1.0**: Real-time dashboard and alerting
- **v1.2.0**: Optimization engine and recommendations
- **v1.3.0**: Comprehensive reporting system
- **v2.0.0**: Current version with full swarm integration

## License

This monitoring system is part of the SceneScout project and follows the same license terms.