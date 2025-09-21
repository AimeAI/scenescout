/**
 * Error handling utilities for the spawner system
 */

export class SpawnerError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;
  public readonly metadata?: Record<string, any>;

  constructor(
    message: string,
    code: string = 'SPAWNER_ERROR',
    retryable: boolean = false,
    metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'SpawnerError';
    this.code = code;
    this.retryable = retryable;
    this.metadata = metadata;
  }
}

export class TaskTimeoutError extends SpawnerError {
  constructor(taskName: string, timeout: number) {
    super(
      `Task "${taskName}" timed out after ${timeout}ms`,
      'TASK_TIMEOUT',
      true,
      { taskName, timeout }
    );
  }
}

export class WorkerLimitError extends SpawnerError {
  constructor(limit: number) {
    super(
      `Worker limit reached: ${limit}`,
      'WORKER_LIMIT',
      true,
      { limit }
    );
  }
}

export class ValidationError extends SpawnerError {
  constructor(field: string, value: any) {
    super(
      `Validation failed for field "${field}": ${value}`,
      'VALIDATION_ERROR',
      false,
      { field, value }
    );
  }
}

export class ExternalAPIError extends SpawnerError {
  constructor(service: string, statusCode?: number, message?: string) {
    super(
      `External API error from ${service}: ${message || 'Unknown error'}`,
      'EXTERNAL_API_ERROR',
      statusCode ? statusCode >= 500 : true,
      { service, statusCode, originalMessage: message }
    );
  }
}

export class DatabaseError extends SpawnerError {
  constructor(operation: string, details?: string) {
    super(
      `Database error during ${operation}: ${details || 'Unknown error'}`,
      'DATABASE_ERROR',
      true,
      { operation, details }
    );
  }
}

// Error classification function
export function classifyError(error: unknown): {
  type: string;
  retryable: boolean;
  delay: number;
  metadata?: Record<string, any>;
} {
  if (error instanceof SpawnerError) {
    return {
      type: error.code,
      retryable: error.retryable,
      delay: calculateRetryDelay(error),
      metadata: error.metadata
    };
  }

  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        type: 'NETWORK_ERROR',
        retryable: true,
        delay: 5000
      };
    }

    // Timeout errors
    if (error.message.includes('timeout')) {
      return {
        type: 'TIMEOUT_ERROR',
        retryable: true,
        delay: 10000
      };
    }

    // Rate limit errors
    if (error.message.includes('rate limit') || error.message.includes('429')) {
      return {
        type: 'RATE_LIMIT_ERROR',
        retryable: true,
        delay: 60000 // 1 minute
      };
    }

    // Generic error
    return {
      type: 'UNKNOWN_ERROR',
      retryable: false,
      delay: 0
    };
  }

  return {
    type: 'UNKNOWN_ERROR',
    retryable: false,
    delay: 0
  };
}

// Calculate retry delay based on error type and attempt number
export function calculateRetryDelay(error: SpawnerError, attempt: number = 1): number {
  const baseDelay = 1000; // 1 second
  const maxDelay = 30000; // 30 seconds

  let delay = baseDelay;

  switch (error.code) {
    case 'EXTERNAL_API_ERROR':
      delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      break;
    
    case 'RATE_LIMIT_ERROR':
      delay = 60000; // Fixed 1 minute for rate limits
      break;
    
    case 'TASK_TIMEOUT':
      delay = baseDelay * 2; // Double the base delay
      break;
    
    case 'DATABASE_ERROR':
      delay = Math.min(baseDelay * attempt * 2, maxDelay);
      break;
    
    default:
      delay = Math.min(baseDelay * attempt, maxDelay);
  }

  return delay;
}

// Error reporting and logging
export function logError(error: unknown, context?: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  const classified = classifyError(error);
  
  const logEntry = {
    timestamp,
    error: {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: classified.type,
      retryable: classified.retryable
    },
    context: context || {},
    metadata: classified.metadata
  };

  // In production, send to logging service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to external logging service
    console.error('SPAWNER_ERROR:', JSON.stringify(logEntry, null, 2));
  } else {
    console.error('SPAWNER_ERROR:', logEntry);
  }
}

// Error recovery strategies
export interface RecoveryStrategy {
  canRecover: (error: unknown) => boolean;
  recover: (error: unknown, context: any) => Promise<any>;
}

export const RECOVERY_STRATEGIES: Record<string, RecoveryStrategy> = {
  EXTERNAL_API_ERROR: {
    canRecover: (error) => {
      const classified = classifyError(error);
      return classified.retryable;
    },
    recover: async (error, context) => {
      // Implement fallback API or cached data
      console.log('Attempting recovery for external API error');
      throw error; // For now, just re-throw
    }
  },

  DATABASE_ERROR: {
    canRecover: (error) => {
      return error instanceof DatabaseError && error.retryable;
    },
    recover: async (error, context) => {
      // Implement database reconnection or fallback
      console.log('Attempting database recovery');
      throw error; // For now, just re-throw
    }
  },

  VALIDATION_ERROR: {
    canRecover: (error) => false, // Validation errors are not recoverable
    recover: async (error, context) => {
      throw error;
    }
  }
};

// Attempt error recovery
export async function attemptRecovery(error: unknown, context?: any): Promise<any> {
  const classified = classifyError(error);
  const strategy = RECOVERY_STRATEGIES[classified.type];

  if (strategy && strategy.canRecover(error)) {
    return strategy.recover(error, context);
  }

  throw error;
}