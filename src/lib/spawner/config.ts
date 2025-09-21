/**
 * Configuration for the spawner system
 */

export const SPAWNER_CONFIG = {
  // Default spawner settings
  DEFAULT: {
    maxWorkers: 5,
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
  },

  // Event processing specific settings
  EVENT_PROCESSING: {
    maxWorkers: 8,
    timeout: 45000, // 45 seconds for data enrichment
    retryAttempts: 2,
    retryDelay: 2000, // 2 seconds
    batchSize: 50,
    deduplicationEnabled: true,
    enrichmentEnabled: true,
    validateLocation: true
  },

  // API ingestion settings
  API_INGESTION: {
    maxWorkers: 3,
    timeout: 60000, // 1 minute for external API calls
    retryAttempts: 5,
    retryDelay: 5000, // 5 seconds
    batchSize: 25
  },

  // Manual submission settings
  MANUAL_SUBMISSION: {
    maxWorkers: 2,
    timeout: 20000, // 20 seconds
    retryAttempts: 1,
    retryDelay: 1000,
    enrichmentEnabled: true,
    validateLocation: true
  },

  // Image processing settings
  IMAGE_PROCESSING: {
    maxWorkers: 3,
    timeout: 120000, // 2 minutes for image operations
    retryAttempts: 2,
    retryDelay: 3000
  }
} as const;

// Environment-specific overrides
export function getSpawnerConfig(environment: string = process.env.NODE_ENV || 'development') {
  const base = SPAWNER_CONFIG.DEFAULT;

  switch (environment) {
    case 'production':
      return {
        ...base,
        maxWorkers: 10,
        timeout: 60000,
        retryAttempts: 5
      };

    case 'staging':
      return {
        ...base,
        maxWorkers: 6,
        timeout: 45000,
        retryAttempts: 3
      };

    case 'development':
    default:
      return {
        ...base,
        maxWorkers: 3,
        timeout: 30000,
        retryAttempts: 2
      };
  }
}

// Get configuration by use case
export function getConfigByUseCase(useCase: keyof typeof SPAWNER_CONFIG) {
  return SPAWNER_CONFIG[useCase];
}

// Rate limiting configurations
export const RATE_LIMITS = {
  EVENTBRITE_API: {
    requestsPerMinute: 100,
    burstLimit: 20
  },
  YELP_API: {
    requestsPerMinute: 500,
    burstLimit: 100
  },
  GEOCODING_API: {
    requestsPerMinute: 50,
    burstLimit: 10
  }
} as const;

// Memory and resource limits
export const RESOURCE_LIMITS = {
  MAX_MEMORY_PER_WORKER: 100 * 1024 * 1024, // 100MB
  MAX_CONCURRENT_CONNECTIONS: 50,
  MAX_QUEUE_SIZE: 1000,
  MAX_RETRY_BACKOFF: 30000 // 30 seconds
} as const;