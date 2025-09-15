/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Core Supabase (Required)
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  
  // Error Monitoring (Required for production)
  readonly VITE_SENTRY_DSN?: string
  
  // External API Keys (Optional)
  readonly VITE_GOOGLE_MAPS_API_KEY?: string
  readonly VITE_MAPBOX_TOKEN?: string
  
  // Analytics (Optional)
  readonly VITE_GA_MEASUREMENT_ID?: string
  
  // Payments (Required for subscriptions)
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string
  
  // External Data Sources (Optional)
  readonly VITE_EVENTBRITE_API_KEY?: string
  readonly VITE_TICKETMASTER_API_KEY?: string
  
  // App Configuration
  readonly VITE_APP_URL?: string
  readonly VITE_APP_ENV?: 'development' | 'production' | 'staging' | 'test'
  
  // Vite built-ins
  readonly MODE: 'development' | 'production' | 'test'
  readonly PROD: boolean
  readonly DEV: boolean
  readonly SSR: boolean
  readonly BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}