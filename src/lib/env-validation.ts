/**
 * Runtime Environment Variable Validation
 * Validates all required environment variables with clear, actionable error messages
 */

export interface EnvValidationError {
  variable: string
  message: string
  suggestion?: string
}

export interface EnvValidationResult {
  valid: boolean
  errors: EnvValidationError[]
  warnings: EnvValidationError[]
}

/**
 * Environment variable categories for better error reporting
 */
export const ENV_CATEGORIES = {
  CORE: 'Core Application',
  SUPABASE: 'Supabase Database',
  EXTERNAL_API: 'External API Services',
  PAYMENTS: 'Payment Processing',
  NOTIFICATIONS: 'Push Notifications',
  MONITORING: 'Monitoring & Logging',
  FEATURE_FLAGS: 'Feature Flags',
  SECURITY: 'Security & Authentication',
} as const

/**
 * Required environment variables with metadata
 */
export const REQUIRED_ENV_VARS = {
  // Core Application
  NODE_ENV: {
    category: ENV_CATEGORIES.CORE,
    description: 'Application environment (development, production, test)',
    example: 'development',
    validation: (val: string) => ['development', 'production', 'test'].includes(val),
  },
  NEXT_PUBLIC_SUPABASE_URL: {
    category: ENV_CATEGORIES.SUPABASE,
    description: 'Supabase project URL',
    example: 'https://your-project.supabase.co',
    validation: (val: string) => val.startsWith('https://') && val.includes('.supabase.co'),
  },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: {
    category: ENV_CATEGORIES.SUPABASE,
    description: 'Supabase anonymous (public) key',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    validation: (val: string) => val.startsWith('eyJ') && val.length > 100,
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    category: ENV_CATEGORIES.SUPABASE,
    description: 'Supabase service role key (server-side only)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    validation: (val: string) => val.startsWith('eyJ') && val.length > 100,
    serverOnly: true,
  },
} as const

/**
 * Optional environment variables with defaults
 */
export const OPTIONAL_ENV_VARS = {
  // External APIs (gracefully degrade if missing)
  TICKETMASTER_API_KEY: {
    category: ENV_CATEGORIES.EXTERNAL_API,
    description: 'Ticketmaster API key for enhanced event data',
    example: 'your-ticketmaster-api-key',
    default: undefined,
  },
  EVENTBRITE_OAUTH_TOKEN: {
    category: ENV_CATEGORIES.EXTERNAL_API,
    description: 'Eventbrite OAuth token for event ingestion',
    example: 'your-eventbrite-token',
    default: undefined,
  },
  OPENAI_API_KEY: {
    category: ENV_CATEGORIES.EXTERNAL_API,
    description: 'OpenAI API key for AI-powered categorization',
    example: 'sk-...',
    default: undefined,
  },

  // Push Notifications (optional feature)
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: {
    category: ENV_CATEGORIES.NOTIFICATIONS,
    description: 'VAPID public key for push notifications',
    example: 'BMl8...',
    default: undefined,
  },
  VAPID_PRIVATE_KEY: {
    category: ENV_CATEGORIES.NOTIFICATIONS,
    description: 'VAPID private key for push notifications',
    example: 'abc123...',
    serverOnly: true,
    default: undefined,
  },
  VAPID_SUBJECT: {
    category: ENV_CATEGORIES.NOTIFICATIONS,
    description: 'VAPID subject (mailto: or https:// URL)',
    example: 'mailto:support@scenescout.com',
    default: 'mailto:noreply@scenescout.com',
  },

  // Payments (optional feature)
  STRIPE_SECRET_KEY: {
    category: ENV_CATEGORIES.PAYMENTS,
    description: 'Stripe secret key for payment processing',
    example: 'sk_test_...',
    serverOnly: true,
    default: undefined,
  },
  STRIPE_WEBHOOK_SECRET: {
    category: ENV_CATEGORIES.PAYMENTS,
    description: 'Stripe webhook signing secret',
    example: 'whsec_...',
    serverOnly: true,
    default: undefined,
  },

  // Monitoring
  SLACK_WEBHOOK_URL: {
    category: ENV_CATEGORIES.MONITORING,
    description: 'Slack webhook URL for alerts',
    example: 'https://hooks.slack.com/services/...',
    default: undefined,
  },
  LOG_ENDPOINT: {
    category: ENV_CATEGORIES.MONITORING,
    description: 'External logging endpoint',
    example: 'https://logs.example.com/ingest',
    default: undefined,
  },

  // Feature Flags
  NEXT_PUBLIC_FEATURE_CACHED_EVENTS: {
    category: ENV_CATEGORIES.FEATURE_FLAGS,
    description: 'Enable event caching feature',
    example: 'true',
    default: 'true',
  },
  NEXT_PUBLIC_FEATURE_DAILY_SHUFFLE: {
    category: ENV_CATEGORIES.FEATURE_FLAGS,
    description: 'Enable daily personalized shuffle',
    example: 'true',
    default: 'true',
  },
  NEXT_PUBLIC_FEATURE_SAVED_EVENTS: {
    category: ENV_CATEGORIES.FEATURE_FLAGS,
    description: 'Enable saved events functionality',
    example: 'true',
    default: 'true',
  },
  NEXT_PUBLIC_FEATURE_THUMBS: {
    category: ENV_CATEGORIES.FEATURE_FLAGS,
    description: 'Enable thumbs up/down feedback',
    example: 'true',
    default: 'true',
  },

  // Security
  CRON_SECRET: {
    category: ENV_CATEGORIES.SECURITY,
    description: 'Secret for authenticating cron job requests',
    example: 'your-random-secret-here',
    serverOnly: true,
    default: undefined,
  },

  // Cache Configuration
  CACHE_TTL_MINUTES: {
    category: ENV_CATEGORIES.CORE,
    description: 'Cache time-to-live in minutes',
    example: '60',
    default: '30',
  },
  CACHE_MAX_ITEMS: {
    category: ENV_CATEGORIES.CORE,
    description: 'Maximum number of cached items',
    example: '1000',
    default: '500',
  },
} as const

/**
 * Check if running on server side
 */
function isServerSide(): boolean {
  return typeof window === 'undefined'
}

/**
 * Validate a single environment variable
 */
function validateEnvVar(
  name: string,
  value: string | undefined,
  config: any,
  isRequired: boolean
): EnvValidationError | null {
  // Skip server-only vars on client
  if (config.serverOnly && !isServerSide()) {
    return null
  }

  // Check if value exists
  if (!value) {
    if (isRequired) {
      return {
        variable: name,
        message: `Missing required environment variable: ${name}`,
        suggestion: `Add ${name}=${config.example} to your .env file\nDescription: ${config.description}`,
      }
    }
    return null // Optional var, not set - OK
  }

  // Check if it's a placeholder
  if (value.startsWith('your-') || value.startsWith('TODO_') || value.startsWith('your_')) {
    return {
      variable: name,
      message: `Environment variable ${name} is still using placeholder value`,
      suggestion: `Update ${name} with a real value\nExample: ${config.example}\nDescription: ${config.description}`,
    }
  }

  // Run custom validation if provided
  if (config.validation && !config.validation(value)) {
    return {
      variable: name,
      message: `Invalid value for ${name}`,
      suggestion: `Expected format: ${config.example}\nDescription: ${config.description}`,
    }
  }

  return null
}

/**
 * Validate all environment variables
 */
export function validateEnvironment(options: {
  strictMode?: boolean
  serverSide?: boolean
} = {}): EnvValidationResult {
  const errors: EnvValidationError[] = []
  const warnings: EnvValidationError[] = []

  // Validate required variables
  for (const [name, config] of Object.entries(REQUIRED_ENV_VARS)) {
    const error = validateEnvVar(name, process.env[name], config, true)
    if (error) {
      errors.push(error)
    }
  }

  // Validate optional variables (warnings only)
  for (const [name, config] of Object.entries(OPTIONAL_ENV_VARS)) {
    const error = validateEnvVar(name, process.env[name], config, false)
    if (error && options.strictMode) {
      warnings.push(error)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Format validation errors into a readable report
 */
export function formatValidationReport(result: EnvValidationResult): string {
  const lines: string[] = []

  lines.push('═'.repeat(60))
  lines.push('Environment Variable Validation Report')
  lines.push('═'.repeat(60))
  lines.push('')

  if (result.valid) {
    lines.push('✅ All required environment variables are properly configured')

    if (result.warnings.length > 0) {
      lines.push('')
      lines.push('⚠️  Warnings (optional variables):')
      lines.push('')
      for (const warning of result.warnings) {
        lines.push(`  • ${warning.variable}`)
        lines.push(`    ${warning.message}`)
        if (warning.suggestion) {
          lines.push(`    💡 ${warning.suggestion.split('\n').join('\n    ')}`)
        }
        lines.push('')
      }
    }
  } else {
    lines.push('❌ Environment validation failed')
    lines.push('')
    lines.push(`Found ${result.errors.length} error(s):`)
    lines.push('')

    // Group errors by category
    const errorsByCategory = new Map<string, EnvValidationError[]>()
    for (const error of result.errors) {
      const varConfig = REQUIRED_ENV_VARS[error.variable as keyof typeof REQUIRED_ENV_VARS]
      const category = varConfig?.category || 'Other'
      if (!errorsByCategory.has(category)) {
        errorsByCategory.set(category, [])
      }
      errorsByCategory.get(category)!.push(error)
    }

    for (const [category, categoryErrors] of errorsByCategory) {
      lines.push(`━ ${category} ━`)
      lines.push('')
      for (const error of categoryErrors) {
        lines.push(`  ❌ ${error.variable}`)
        lines.push(`     ${error.message}`)
        if (error.suggestion) {
          lines.push('')
          lines.push(`     💡 Suggestion:`)
          for (const suggestionLine of error.suggestion.split('\n')) {
            lines.push(`        ${suggestionLine}`)
          }
        }
        lines.push('')
      }
    }

    lines.push('═'.repeat(60))
    lines.push('Quick Fix Guide:')
    lines.push('═'.repeat(60))
    lines.push('')
    lines.push('1. Copy .env.example to .env.local:')
    lines.push('   cp .env.example .env.local')
    lines.push('')
    lines.push('2. Update the placeholder values in .env.local')
    lines.push('')
    lines.push('3. For Supabase credentials:')
    lines.push('   - Visit: https://supabase.com/dashboard/project/YOUR_PROJECT')
    lines.push('   - Go to: Settings > API')
    lines.push('   - Copy: URL, anon key, and service_role key')
    lines.push('')
    lines.push('4. Restart your development server')
    lines.push('')
  }

  lines.push('═'.repeat(60))

  return lines.join('\n')
}

/**
 * Assert that environment is valid, throwing detailed error if not
 */
export function assertValidEnvironment(options: {
  strictMode?: boolean
} = {}): void {
  const result = validateEnvironment(options)

  if (!result.valid) {
    const report = formatValidationReport(result)
    console.error(report)
    throw new Error(
      `Environment validation failed with ${result.errors.length} error(s). See details above.`
    )
  }

  // Log warnings if in strict mode
  if (options.strictMode && result.warnings.length > 0) {
    console.warn(formatValidationReport(result))
  }
}

/**
 * Get environment variable with runtime validation
 */
export function getEnvVar(
  name: string,
  options: {
    required?: boolean
    defaultValue?: string
    validate?: (value: string) => boolean
  } = {}
): string | undefined {
  const value = process.env[name]

  if (!value) {
    if (options.required && !options.defaultValue) {
      throw new Error(
        `Missing required environment variable: ${name}\n` +
        `Please add ${name} to your .env file`
      )
    }
    return options.defaultValue
  }

  if (options.validate && !options.validate(value)) {
    throw new Error(
      `Invalid value for environment variable: ${name}\n` +
      `Please check the value in your .env file`
    )
  }

  return value
}

/**
 * Get required environment variable (throws if missing)
 */
export function requireEnvVar(name: string): string {
  return getEnvVar(name, { required: true })!
}

/**
 * Check if feature flag is enabled
 */
export function isFeatureEnabled(feature: string): boolean {
  const value = process.env[`NEXT_PUBLIC_FEATURE_${feature.toUpperCase()}`]
  return value === 'true' || value === '1'
}

/**
 * Validate environment on module load (server-side only)
 */
if (isServerSide() && process.env.NODE_ENV !== 'test') {
  // Run validation but don't throw on startup
  // This allows the app to start and show friendly error pages
  const result = validateEnvironment()

  if (!result.valid) {
    console.error('\n⚠️  Environment validation failed!\n')
    console.error(formatValidationReport(result))
    console.error('\n⚠️  The application may not function correctly.\n')
  }
}
