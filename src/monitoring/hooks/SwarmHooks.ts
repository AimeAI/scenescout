/**
 * Swarm Integration Hooks - Connect monitoring with Claude Flow swarm coordination
 */

import { monitoringService } from '../MonitoringService';

/**
 * Pre-task hook - called before agent starts work
 */
export async function preTaskHook(taskDescription: string, agentId?: string): Promise<void> {
  try {
    const monitor = monitoringService.getMonitor();
    if (!monitor) {
      console.log('📊 Monitoring not available for pre-task hook');
      return;
    }

    // Log task start
    console.log(`📋 Task starting: ${taskDescription}`);
    if (agentId) {
      console.log(`🤖 Agent: ${agentId}`);
    }

    // Store task start time in memory for later analysis
    const taskData = {
      description: taskDescription,
      agentId: agentId || 'unknown',
      startTime: Date.now(),
      status: 'started'
    };

    // Emit task start event
    monitor.emit('task:started', taskData);

  } catch (error) {
    console.error('Error in pre-task hook:', error);
  }
}

/**
 * Post-task hook - called after agent completes work
 */
export async function postTaskHook(taskId: string, result?: any): Promise<void> {
  try {
    const monitor = monitoringService.getMonitor();
    if (!monitor) {
      console.log('📊 Monitoring not available for post-task hook');
      return;
    }

    // Log task completion
    console.log(`✅ Task completed: ${taskId}`);

    // Calculate task duration and update metrics
    const taskData = {
      taskId,
      endTime: Date.now(),
      status: result?.success ? 'completed' : 'failed',
      result: result
    };

    // Emit task completion event
    monitor.emit('task:completed', taskData);

  } catch (error) {
    console.error('Error in post-task hook:', error);
  }
}

/**
 * Post-edit hook - called after file editing
 */
export async function postEditHook(filePath: string, memoryKey?: string): Promise<void> {
  try {
    const monitor = monitoringService.getMonitor();
    if (!monitor) {
      console.log('📊 Monitoring not available for post-edit hook');
      return;
    }

    // Log file edit
    console.log(`📝 File edited: ${filePath}`);
    if (memoryKey) {
      console.log(`💾 Memory key: ${memoryKey}`);
    }

    // Track file modifications for performance analysis
    const editData = {
      filePath,
      memoryKey,
      timestamp: Date.now(),
      action: 'edit'
    };

    // Emit file edit event
    monitor.emit('file:edited', editData);

  } catch (error) {
    console.error('Error in post-edit hook:', error);
  }
}

/**
 * Notification hook - for agent communication
 */
export async function notifyHook(message: string, agentId?: string): Promise<void> {
  try {
    const monitor = monitoringService.getMonitor();
    if (!monitor) {
      console.log('📊 Monitoring not available for notify hook');
      return;
    }

    // Log notification
    console.log(`📢 Notification: ${message}`);
    if (agentId) {
      console.log(`🤖 From agent: ${agentId}`);
    }

    // Track inter-agent communication for coordination analysis
    const notificationData = {
      message,
      agentId: agentId || 'system',
      timestamp: Date.now(),
      type: 'notification'
    };

    // Emit notification event
    monitor.emit('agent:notification', notificationData);

  } catch (error) {
    console.error('Error in notify hook:', error);
  }
}

/**
 * Session restore hook - restore monitoring context
 */
export async function sessionRestoreHook(sessionId: string): Promise<void> {
  try {
    const monitor = monitoringService.getMonitor();
    if (!monitor) {
      console.log('📊 Monitoring not available for session restore hook');
      return;
    }

    // Log session restore
    console.log(`🔄 Session restored: ${sessionId}`);

    // Restore monitoring context and historical data
    const sessionData = {
      sessionId,
      timestamp: Date.now(),
      action: 'restore'
    };

    // Emit session restore event
    monitor.emit('session:restored', sessionData);

  } catch (error) {
    console.error('Error in session restore hook:', error);
  }
}

/**
 * Session end hook - finalize monitoring for session
 */
export async function sessionEndHook(exportMetrics: boolean = true): Promise<void> {
  try {
    const monitor = monitoringService.getMonitor();
    if (!monitor) {
      console.log('📊 Monitoring not available for session end hook');
      return;
    }

    // Log session end
    console.log('🏁 Session ending');

    if (exportMetrics) {
      // Generate final performance report
      try {
        const finalReport = await monitor.generatePerformanceReport('final');
        console.log('📊 Final performance report generated');
        
        // Optionally save to file
        const fs = require('fs').promises;
        const reportPath = `/Users/allthishappiness/Documents/scenescout/memory/final_report_${Date.now()}.txt`;
        await fs.writeFile(reportPath, finalReport);
        console.log(`📁 Final report saved to: ${reportPath}`);
        
      } catch (error) {
        console.error('Failed to generate final report:', error);
      }
    }

    // Emit session end event
    monitor.emit('session:ended', { exportMetrics, timestamp: Date.now() });

  } catch (error) {
    console.error('Error in session end hook:', error);
  }
}

/**
 * Error hook - handle monitoring errors
 */
export async function errorHook(error: Error, context?: any): Promise<void> {
  try {
    const monitor = monitoringService.getMonitor();
    if (!monitor) {
      console.log('📊 Monitoring not available for error hook');
      return;
    }

    // Log error
    console.error(`❌ Error occurred: ${error.message}`);
    if (context) {
      console.error(`📋 Context:`, context);
    }

    // Track errors for monitoring and alerting
    const errorData = {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      context,
      timestamp: Date.now()
    };

    // Emit error event
    monitor.emit('error:occurred', errorData);

  } catch (hookError) {
    console.error('Error in error hook:', hookError);
  }
}

/**
 * Initialize all hooks for automatic monitoring integration
 */
export async function initializeMonitoringHooks(): Promise<void> {
  try {
    console.log('🔗 Initializing monitoring hooks...');
    
    // Ensure monitoring service is initialized
    if (!monitoringService.isMonitoring()) {
      console.log('🚀 Starting monitoring service for hooks...');
      await monitoringService.initialize();
    }

    console.log('✅ Monitoring hooks initialized successfully');
    
  } catch (error) {
    console.error('❌ Failed to initialize monitoring hooks:', error);
    throw error;
  }
}

/**
 * Execute Claude Flow hooks with monitoring integration
 */
export async function executeHookWithMonitoring(hookType: string, ...args: any[]): Promise<void> {
  try {
    switch (hookType) {
      case 'pre-task':
        await preTaskHook(args[0], args[1]);
        break;
      case 'post-task':
        await postTaskHook(args[0], args[1]);
        break;
      case 'post-edit':
        await postEditHook(args[0], args[1]);
        break;
      case 'notify':
        await notifyHook(args[0], args[1]);
        break;
      case 'session-restore':
        await sessionRestoreHook(args[0]);
        break;
      case 'session-end':
        await sessionEndHook(args[0]);
        break;
      case 'error':
        await errorHook(args[0], args[1]);
        break;
      default:
        console.warn(`Unknown hook type: ${hookType}`);
    }
  } catch (error) {
    console.error(`Error executing ${hookType} hook:`, error);
  }
}