# Environment Configuration Guide

## 🔧 Environment Setup for SceneScout

### Development Environment (.env.local)
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# API Keys for Development
TICKETMASTER_API_KEY=your_dev_ticketmaster_key
EVENTBRITE_TOKEN=your_dev_eventbrite_token
GOOGLE_PLACES_API_KEY=your_dev_google_places_key
YELP_API_KEY=your_dev_yelp_key

# OAuth Development
GITHUB_CLIENT_ID=your_dev_github_client_id
GITHUB_CLIENT_SECRET=your_dev_github_client_secret
GOOGLE_CLIENT_ID=your_dev_google_client_id
GOOGLE_CLIENT_SECRET=your_dev_google_client_secret

# Optional Development Services
OPENAI_API_KEY=your_openai_key
RESEND_API_KEY=your_resend_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
```

### Staging Environment (.env.staging)
```bash
# Supabase Staging
NEXT_PUBLIC_SUPABASE_URL=https://staging-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=staging_anon_key
SUPABASE_SERVICE_ROLE_KEY=staging_service_role_key

# Staging API Keys (separate from production)
TICKETMASTER_API_KEY=staging_ticketmaster_key
EVENTBRITE_TOKEN=staging_eventbrite_token
GOOGLE_PLACES_API_KEY=staging_google_places_key
YELP_API_KEY=staging_yelp_key

# OAuth Staging
GITHUB_CLIENT_ID=staging_github_client_id
GITHUB_CLIENT_SECRET=staging_github_client_secret
GOOGLE_CLIENT_ID=staging_google_client_id
GOOGLE_CLIENT_SECRET=staging_google_client_secret
```

### Production Environment (.env.production)
```bash
# Supabase Production
NEXT_PUBLIC_SUPABASE_URL=https://prod-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=prod_anon_key
SUPABASE_SERVICE_ROLE_KEY=prod_service_role_key

# Production API Keys
TICKETMASTER_API_KEY=prod_ticketmaster_key
EVENTBRITE_TOKEN=prod_eventbrite_token
GOOGLE_PLACES_API_KEY=prod_google_places_key
YELP_API_KEY=prod_yelp_key

# OAuth Production
GITHUB_CLIENT_ID=prod_github_client_id
GITHUB_CLIENT_SECRET=prod_github_client_secret
GOOGLE_CLIENT_ID=prod_google_client_id
GOOGLE_CLIENT_SECRET=prod_google_client_secret

# Production Services
OPENAI_API_KEY=prod_openai_key
RESEND_API_KEY=prod_resend_key
CLOUDINARY_CLOUD_NAME=prod_cloudinary_name

# Security & Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
NODE_ENV=production
```

## 🔐 Environment Security Best Practices

### Variable Naming Convention
- `NEXT_PUBLIC_*`: Client-side variables (public)
- `*_API_KEY`: Server-side only API keys
- `*_SECRET`: Sensitive server-side secrets
- `*_URL`: Service endpoints

### Security Checklist
- [ ] No secrets in `NEXT_PUBLIC_` variables
- [ ] All API keys restricted by domain/IP
- [ ] Separate keys for each environment
- [ ] Regular key rotation schedule
- [ ] API keys stored in secure vault

## 🚀 Platform-Specific Configurations

### Vercel Deployment
```bash
# Set environment variables in Vercel dashboard
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add TICKETMASTER_API_KEY production
# ... add all required variables
```

### Netlify Deployment
```bash
# Set in Netlify dashboard or netlify.toml
[build.environment]
  NEXT_PUBLIC_SUPABASE_URL = "https://prod-project-ref.supabase.co"
  # Add all production variables
```

### Docker Deployment
```dockerfile
# Dockerfile environment setup
ENV NODE_ENV=production
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
# Load from docker-compose.yml or kubernetes secrets
```

## 📊 API Configuration Details

### Ticketmaster API Setup
```javascript
// Rate limits and configuration
const ticketmasterConfig = {
  baseURL: 'https://app.ticketmaster.com/discovery/v2',
  rateLimit: 5000, // requests per day
  timeout: 10000,
  retries: 3
}
```

### Eventbrite API Setup
```javascript
// Eventbrite configuration
const eventbriteConfig = {
  baseURL: 'https://www.eventbriteapi.com/v3',
  rateLimit: 1000, // requests per hour
  timeout: 8000,
  retries: 2
}
```

### Google Places API Setup
```javascript
// Google Places configuration
const googlePlacesConfig = {
  baseURL: 'https://maps.googleapis.com/maps/api/place',
  rateLimit: 100000, // requests per day
  timeout: 5000,
  retries: 3
}
```

## 🗄️ Database Environment Configuration

### Supabase Production Setup
```sql
-- Production database optimizations
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements,auto_explain';
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
```

### Connection Pooling
```javascript
// Supabase client configuration
const supabaseConfig = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: { 'x-my-custom-header': 'scenescout-v14' }
  }
}
```

## 🔄 CI/CD Environment Variables

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
env:
  NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
  TICKETMASTER_API_KEY: ${{ secrets.TICKETMASTER_API_KEY }}
  EVENTBRITE_TOKEN: ${{ secrets.EVENTBRITE_TOKEN }}
```

### Required GitHub Secrets
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `TICKETMASTER_API_KEY`
- `EVENTBRITE_TOKEN`
- `GOOGLE_PLACES_API_KEY`
- `YELP_API_KEY`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

## 🧪 Testing Environment Variables

### Test Configuration (.env.test)
```bash
# Test database (use separate Supabase project)
NEXT_PUBLIC_SUPABASE_URL=https://test-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=test_anon_key
SUPABASE_SERVICE_ROLE_KEY=test_service_role_key

# Mock API keys for testing
TICKETMASTER_API_KEY=test_mock_key
EVENTBRITE_TOKEN=test_mock_token
GOOGLE_PLACES_API_KEY=test_mock_key
YELP_API_KEY=test_mock_key

# Test-specific variables
NODE_ENV=test
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🔍 Environment Validation Scripts

### Validation Script
```javascript
// scripts/validate-env.js
const requiredVars = {
  production: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'TICKETMASTER_API_KEY',
    'EVENTBRITE_TOKEN',
    'GOOGLE_PLACES_API_KEY',
    'YELP_API_KEY'
  ],
  development: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]
}

function validateEnvironment(env = 'development') {
  const missing = requiredVars[env].filter(
    varName => !process.env[varName]
  )
  
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`)
    process.exit(1)
  }
  
  console.log(`✅ All required ${env} environment variables are set`)
}
```

## 📝 Environment Setup Checklist

### Pre-Deployment
- [ ] All required variables set for target environment
- [ ] API keys tested and functional
- [ ] OAuth providers configured for domain
- [ ] Database connection verified
- [ ] CORS settings updated for domain

### Post-Deployment
- [ ] Environment variables loaded correctly
- [ ] API integrations working
- [ ] Authentication flows functional
- [ ] Database queries executing
- [ ] Real-time features operational

## 🚨 Troubleshooting Common Issues

### API Key Issues
```bash
# Test API connectivity
curl -H "Authorization: Bearer $EVENTBRITE_TOKEN" \
  "https://www.eventbriteapi.com/v3/users/me/"

# Test Supabase connection
curl -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/events?select=*&limit=1"
```

### Environment Loading Issues
```javascript
// Debug environment loading
console.log('Environment variables loaded:', {
  supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  hasTicketmaster: !!process.env.TICKETMASTER_API_KEY
})
```

---

**Last Updated**: September 17, 2025  
**Version**: 1.0  
**Prepared By**: Deployment Checklist Generator Agent