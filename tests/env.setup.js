// Test environment setup for Jest
// This file runs before tests and sets up environment variables

// Set Node environment to test
process.env.NODE_ENV = 'test'

// Mock Supabase configuration for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-service'

// Mock API keys for external services (using test/fake keys)
process.env.EVENTBRITE_API_KEY = 'TEST_EVENTBRITE_KEY'
process.env.EVENTBRITE_TOKEN = 'TEST_EVENTBRITE_TOKEN'
process.env.TICKETMASTER_API_KEY = 'TEST_TICKETMASTER_KEY'
process.env.GOOGLE_PLACES_API_KEY = 'TEST_GOOGLE_PLACES_KEY'
process.env.YELP_API_KEY = 'TEST_YELP_KEY'
process.env.MEETUP_API_KEY = 'TEST_MEETUP_KEY'
process.env.SONGKICK_API_KEY = 'TEST_SONGKICK_KEY'

// Mock Stripe keys for payment testing
process.env.STRIPE_SECRET_KEY = 'sk_test_test'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_test'

// Mock web push keys
process.env.VAPID_PUBLIC_KEY = 'TEST_VAPID_PUBLIC'
process.env.VAPID_PRIVATE_KEY = 'TEST_VAPID_PRIVATE'

// Mock other configuration
process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'
process.env.RESEND_API_KEY = 'TEST_RESEND_KEY'
process.env.OPENAI_API_KEY = 'TEST_OPENAI_KEY'

// Disable debugging in tests
process.env.DEBUG_MOCK_DATA = 'false'
process.env.NEXT_PUBLIC_DEBUG_MOCK_DATA = 'false'