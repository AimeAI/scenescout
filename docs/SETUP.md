# SceneScout v14 Setup Guide

This guide will walk you through setting up SceneScout v14 for local development and production deployment.

## 📋 Prerequisites

### Required Software
- **Node.js 18.0+** - [Download here](https://nodejs.org/)
- **npm 9.0+** - Comes with Node.js
- **Git** - [Download here](https://git-scm.com/)
- **Supabase CLI** - Install with `npm install -g supabase`

### Required Accounts
- **Supabase Account** - [Sign up here](https://supabase.com/)
- **Stripe Account** - [Sign up here](https://stripe.com/)
- **GitHub Account** - For OAuth and deployment
- **Vercel Account** - For deployment (optional)

### External API Keys (Optional)
- **Ticketmaster API Key** - For event data ingestion
- **Eventbrite Token** - For event data ingestion
- **Songkick API Key** - For music events
- **Meetup Access Token** - For meetup events
- **Google Places API Key** - For venue data
- **Yelp API Key** - For venue reviews
- **OpenAI API Key** - For AI features
- **Resend API Key** - For email notifications
- **Cloudinary Account** - For image processing

## 🚀 Local Development Setup

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/scenescout.git
cd scenescout

# Install dependencies
npm install
```

### 2. Environment Configuration

Create environment files:

```bash
# Copy example environment file
cp .env.example .env.local

# For Supabase local development
cp .env.example .env
```

### 3. Configure Environment Variables

Edit `.env.local` with your configuration:

```env
# ================================
# Supabase Configuration
# ================================
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# ================================
# Stripe Configuration
# ================================
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ================================
# Authentication Configuration
# ================================
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key

# OAuth Providers (optional)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# ================================
# External APIs (optional)
# ================================
TICKETMASTER_API_KEY=your_ticketmaster_key
EVENTBRITE_TOKEN=your_eventbrite_token
SONGKICK_API_KEY=your_songkick_key
MEETUP_ACCESS_TOKEN=your_meetup_token
GOOGLE_PLACES_API_KEY=your_google_places_key
YELP_API_KEY=your_yelp_key
OPENAI_API_KEY=your_openai_key
RESEND_API_KEY=your_resend_key
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret

# ================================
# Development Configuration
# ================================
NODE_ENV=development
```

### 4. Supabase Setup

#### Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Click "New Project"
3. Choose organization and region
4. Set database password
5. Wait for project creation

#### Configure Authentication

1. Navigate to Authentication → Settings
2. Configure Site URL: `http://localhost:3000`
3. Add redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://yourdomain.com/auth/callback`

#### Setup OAuth Providers

**GitHub OAuth:**
1. Go to GitHub → Settings → Developer settings → OAuth Apps
2. Create new OAuth App:
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `https://your-project.supabase.co/auth/v1/callback`
3. Copy Client ID and Secret to Supabase Auth settings

**Google OAuth:**
1. Go to Google Cloud Console
2. Create OAuth 2.0 client ID
3. Add authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
4. Copy Client ID and Secret to Supabase Auth settings

#### Apply Database Schema

```bash
# Initialize Supabase locally (optional for local development)
supabase init

# Link to your project
supabase link --project-ref your_project_id

# Apply database schema
npm run db:apply
```

### 5. Database Configuration

The database schema includes the following main tables:

#### Core Tables
- `users` - User authentication data
- `profiles` - Extended user profiles
- `cities` - Supported cities
- `venues` - Event venues
- `events` - Event listings
- `plans` - User-created event plans

#### Supporting Tables
- `user_events` - User saved/favorite events
- `plan_events` - Events within plans
- `submissions` - User-submitted content
- `promotions` - Marketing promotions
- `push_subscriptions` - Push notification subscriptions

#### Analytics Tables
- `event_views` - Event view tracking
- `metrics` - General metrics
- `user_activities` - User activity log

### 6. Stripe Configuration

#### Create Stripe Account
1. Sign up at [Stripe](https://stripe.com/)
2. Complete account verification
3. Get API keys from Dashboard → Developers → API keys

#### Configure Products
Create subscription products in Stripe Dashboard:

```javascript
// Example products to create
const products = [
  {
    name: "SceneScout Free",
    price: 0,
    interval: "month",
    features: ["Basic event discovery", "Save up to 10 events", "Email support"]
  },
  {
    name: "SceneScout Pro",
    price: 999, // $9.99
    interval: "month",
    features: ["Unlimited saves", "Advanced filters", "Priority support", "Early access"]
  },
  {
    name: "SceneScout Premium",
    price: 1999, // $19.99
    interval: "month",
    features: ["All Pro features", "AI recommendations", "Event planning tools", "API access"]
  }
];
```

#### Setup Webhooks
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `http://localhost:3000/api/stripe/webhook` (or your domain)
3. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `checkout.session.completed`

### 7. Edge Functions Setup

Deploy Supabase Edge Functions:

```bash
# Deploy all functions
npm run edge:deploy

# Deploy specific function
supabase functions deploy daily_digest --no-verify-jwt

# Deploy with environment variables
supabase secrets set RESEND_API_KEY=your_key
supabase secrets set OPENAI_API_KEY=your_key
```

### 8. Start Development Server

```bash
# Start Next.js development server
npm run dev

# In another terminal, start Supabase locally (optional)
supabase start

# Access application
open http://localhost:3000
```

## 🏗️ Local Development Workflow

### Daily Development
```bash
# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Start development server
npm run dev

# Run type checking
npm run typecheck

# Run linting
npm run lint
```

### Database Changes
```bash
# Create new migration
supabase db diff --file migration_name

# Apply migrations
supabase db push

# Reset database (careful!)
supabase db reset
```

### Testing Edge Functions
```bash
# Start functions locally
supabase functions serve

# Test function
curl -X POST 'http://localhost:54321/functions/v1/daily_digest' \
  -H 'Authorization: Bearer your_anon_key' \
  -H 'Content-Type: application/json' \
  -d '{"test": true}'
```

## 🔧 Configuration Details

### Next.js Configuration

Key configurations in `next.config.js`:

```javascript
const nextConfig = {
  // Enable image optimization for all domains
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' }
    ]
  },
  
  // API routes rewrite to Supabase functions
  async rewrites() {
    return [
      {
        source: '/api/img',
        destination: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/img-proxy`
      }
    ]
  },
  
  // Enable server actions
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    }
  }
}
```

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Tailwind Configuration

```javascript
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // Custom theme configurations
    }
  },
  plugins: [require("tailwindcss-animate")]
}
```

## 🔍 Troubleshooting Common Setup Issues

### Node.js Version Issues
```bash
# Check Node.js version
node --version

# Use nvm to manage Node versions
nvm install 18
nvm use 18
```

### Environment Variables Not Loading
```bash
# Verify .env.local exists and has correct permissions
ls -la .env.local

# Restart development server after changes
npm run dev
```

### Supabase Connection Issues
```bash
# Test connection
supabase status

# Check project linking
supabase projects list
```

### Database Schema Issues
```bash
# Check current schema
supabase db diff

# Reset and reapply schema
supabase db reset
npm run db:apply
```

### Stripe Webhook Issues
```bash
# Test webhook locally with Stripe CLI
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for TypeScript errors
npm run typecheck
```

## 📱 PWA Configuration

SceneScout includes Progressive Web App (PWA) support:

### Service Worker
Located at `public/sw.js`:
- Caches static assets
- Provides offline functionality
- Handles push notifications

### Manifest
Configure in `public/manifest.json`:
```json
{
  "name": "SceneScout",
  "short_name": "SceneScout",
  "description": "Discover urban culture and events",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#ffffff"
}
```

## 🚀 Performance Optimization

### Image Optimization
- Next.js Image component for automatic optimization
- Cloudinary integration for advanced image processing
- WebP format conversion for modern browsers

### Caching Strategy
- Static assets cached at CDN level
- API responses cached with appropriate headers
- Database queries optimized with indexes

### Bundle Optimization
- Dynamic imports for code splitting
- Tree shaking to remove unused code
- Compression enabled in production

## 🔒 Security Considerations

### Environment Security
- Never commit `.env` files to version control
- Use strong, unique secrets for production
- Regularly rotate API keys and secrets

### Database Security
- Row Level Security (RLS) enabled on all tables
- Proper user permissions and roles
- Input validation on all user inputs

### API Security
- Rate limiting on API endpoints
- CORS configuration for allowed origins
- Authentication required for sensitive operations

---

**Next Steps:** Once you have completed the local setup, see [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment instructions.