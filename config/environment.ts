/**
 * Environment Configuration Management
 * Centralizes all environment variable handling with validation and type safety
 */

export interface EnvironmentConfig {
  // Application
  nodeEnv: 'development' | 'test' | 'production'
  baseUrl: string
  
  // Supabase
  supabase: {
    url: string
    anonKey: string
    serviceRoleKey: string
    accessToken?: string
  }
  
  // External API Keys
  apis: {
    eventbrite: {
      apiKey: string
      token: string
      clientSecret: string
      privateToken: string
      publicToken: string
    }
    ticketmaster: {
      apiKey: string
      secret: string
    }
    google: {
      placesApiKey: string
      clientId?: string
      clientSecret?: string
    }
    yelp: {
      apiKey: string
      clientId?: string
    }
    meetup: {
      apiKey?: string
    }
    songkick: {
      apiKey?: string
    }
    openai: {
      apiKey?: string
    }
  }
  
  // Payment Processing
  stripe: {
    secretKey: string
    publishableKey: string
    webhookSecret: string
    priceId: string
  }
  
  // Notifications
  webPush: {
    vapidPublicKey: string
    vapidPrivateKey: string
  }
  
  // Email
  resend: {
    apiKey: string
  }
  
  // OAuth
  oauth?: {
    github?: {
      clientId: string
      clientSecret: string
    }
    google?: {
      clientId: string
      clientSecret: string
    }
  }
  
  // Feature Flags
  features: {
    debugMockData: boolean
    enableAnalytics: boolean
    enablePushNotifications: boolean
  }
}

/**
 * Validates that a required environment variable exists and is not a placeholder
 */
function validateRequired(key: string, value: string | undefined): string {
  if (!value || value.startsWith('TODO_') || value.startsWith('your_')) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

/**
 * Gets an optional environment variable, returning undefined if not set or is a placeholder
 */
function getOptional(value: string | undefined): string | undefined {
  if (!value || value.startsWith('TODO_') || value.startsWith('your_')) {
    return undefined
  }
  return value
}

/**
 * Loads and validates environment configuration
 */
export function loadEnvironmentConfig(): EnvironmentConfig {
  // Check if we're in a test environment and use test defaults
  const isTest = process.env.NODE_ENV === 'test'
  
  if (isTest) {
    return getTestEnvironmentConfig()
  }
  
  try {
    return {
      nodeEnv: (process.env.NODE_ENV as any) || 'development',
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
      
      supabase: {
        url: validateRequired('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
        anonKey: validateRequired('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        serviceRoleKey: validateRequired('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY),
        accessToken: getOptional(process.env.SUPABASE_ACCESS_TOKEN),
      },
      
      apis: {
        eventbrite: {
          apiKey: validateRequired('EVENTBRITE_API_KEY', process.env.EVENTBRITE_API_KEY),
          token: validateRequired('EVENTBRITE_TOKEN', process.env.EVENTBRITE_TOKEN),
          clientSecret: validateRequired('EVENTBRITE_CLIENT_SECRET', process.env.EVENTBRITE_CLIENT_SECRET),
          privateToken: validateRequired('EVENTBRITE_PRIVATE_TOKEN', process.env.EVENTBRITE_PRIVATE_TOKEN),
          publicToken: validateRequired('EVENTBRITE_PUBLIC_TOKEN', process.env.EVENTBRITE_PUBLIC_TOKEN),
        },
        ticketmaster: {
          apiKey: validateRequired('TICKETMASTER_API_KEY', process.env.TICKETMASTER_API_KEY),
          secret: validateRequired('TICKETMASTER_API_SECRET', process.env.TICKETMASTER_API_SECRET),
        },
        google: {
          placesApiKey: getOptional(process.env.GOOGLE_PLACES_API_KEY) || '',
          clientId: getOptional(process.env.GOOGLE_CLIENT_ID),
          clientSecret: getOptional(process.env.GOOGLE_CLIENT_SECRET),
        },
        yelp: {
          apiKey: validateRequired('YELP_API_KEY', process.env.YELP_API_KEY),
          clientId: getOptional(process.env.YELP_CLIENT_ID),
        },
        meetup: {
          apiKey: getOptional(process.env.MEETUP_API_KEY),
        },
        songkick: {
          apiKey: getOptional(process.env.SONGKICK_API_KEY),
        },
        openai: {
          apiKey: getOptional(process.env.OPENAI_API_KEY),
        },
      },
      
      stripe: {
        secretKey: validateRequired('STRIPE_SECRET_KEY', process.env.STRIPE_SECRET_KEY),
        publishableKey: validateRequired('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
        webhookSecret: validateRequired('STRIPE_WEBHOOK_SECRET', process.env.STRIPE_WEBHOOK_SECRET),
        priceId: validateRequired('NEXT_PUBLIC_STRIPE_PRICE_ID', process.env.NEXT_PUBLIC_STRIPE_PRICE_ID),
      },
      
      webPush: {
        vapidPublicKey: validateRequired('VAPID_PUBLIC_KEY', process.env.VAPID_PUBLIC_KEY),
        vapidPrivateKey: validateRequired('VAPID_PRIVATE_KEY', process.env.VAPID_PRIVATE_KEY),
      },
      
      resend: {
        apiKey: validateRequired('RESEND_API_KEY', process.env.RESEND_API_KEY),
      },
      
      oauth: {
        github: process.env.GITHUB_CLIENT_ID ? {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: validateRequired('GITHUB_CLIENT_SECRET', process.env.GITHUB_CLIENT_SECRET),
        } : undefined,
        google: process.env.GOOGLE_CLIENT_ID ? {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: validateRequired('GOOGLE_CLIENT_SECRET', process.env.GOOGLE_CLIENT_SECRET),
        } : undefined,
      },
      
      features: {
        debugMockData: process.env.DEBUG_MOCK_DATA === 'true' || process.env.NEXT_PUBLIC_DEBUG_MOCK_DATA === 'true',
        enableAnalytics: process.env.NODE_ENV === 'production',
        enablePushNotifications: !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
      },
    }
  } catch (error) {
    console.error('Environment configuration error:', error)
    throw new Error(`Failed to load environment configuration: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Test environment configuration with safe defaults
 */
function getTestEnvironmentConfig(): EnvironmentConfig {
  return {
    nodeEnv: 'test',
    baseUrl: 'http://localhost:3000',
    
    supabase: {
      url: 'https://test.supabase.co',
      anonKey: 'test-anon-key',
      serviceRoleKey: 'test-service-key',
    },
    
    apis: {
      eventbrite: {
        apiKey: 'TEST_EVENTBRITE_KEY',
        token: 'TEST_EVENTBRITE_TOKEN',
        clientSecret: 'TEST_EVENTBRITE_SECRET',
        privateToken: 'TEST_EVENTBRITE_PRIVATE',
        publicToken: 'TEST_EVENTBRITE_PUBLIC',
      },
      ticketmaster: {
        apiKey: 'TEST_TICKETMASTER_KEY',
        secret: 'TEST_TICKETMASTER_SECRET',
      },
      google: {
        placesApiKey: 'TEST_GOOGLE_PLACES_KEY',
      },
      yelp: {
        apiKey: 'TEST_YELP_KEY',
      },
      meetup: {},
      songkick: {},
      openai: {},
    },
    
    stripe: {
      secretKey: 'sk_test_test',
      publishableKey: 'pk_test_test',
      webhookSecret: 'whsec_test',
      priceId: 'price_test',
    },
    
    webPush: {
      vapidPublicKey: 'TEST_VAPID_PUBLIC',
      vapidPrivateKey: 'TEST_VAPID_PRIVATE',
    },
    
    resend: {
      apiKey: 'TEST_RESEND_KEY',
    },
    
    features: {
      debugMockData: false,
      enableAnalytics: false,
      enablePushNotifications: false,
    },
  }
}

/**
 * Validates that all required environment variables are configured for production
 */
export function validateProductionEnvironment(): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return true // Skip validation in non-production environments
  }
  
  try {
    loadEnvironmentConfig()
    return true
  } catch (error) {
    console.error('Production environment validation failed:', error)
    return false
  }
}

/**
 * Gets configuration for a specific service with error handling
 */
export function getServiceConfig<K extends keyof EnvironmentConfig>(
  service: K
): EnvironmentConfig[K] | null {
  try {
    const config = loadEnvironmentConfig()
    return config[service]
  } catch (error) {
    console.error(`Failed to get configuration for service ${service}:`, error)
    return null
  }
}

// Singleton instance for the current environment
let environmentConfig: EnvironmentConfig | null = null

/**
 * Gets the current environment configuration (cached)
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  if (!environmentConfig) {
    environmentConfig = loadEnvironmentConfig()
  }
  return environmentConfig
}

/**
 * Resets the cached environment configuration (useful for testing)
 */
export function resetEnvironmentConfig(): void {
  environmentConfig = null
}