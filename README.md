# SceneScout v14

> Discover, plan, and share amazing events in your city.

SceneScout is a comprehensive event discovery and planning platform built with Next.js 14, Supabase, and modern web technologies.

## 🌟 Features

### Event Discovery
- **Multi-source ingestion** from Ticketmaster, Eventbrite, Songkick, Meetup
- **AI-powered recommendations** based on user preferences
- **Geographic filtering** with interactive maps
- **Advanced search** with filters and categories

### Event Planning
- **Personal event plans** with collaboration features
- **Smart recommendations** for complementary events
- **Social sharing** and community features
- **Calendar integration** with ICS export

### Venue Management
- **Comprehensive venue database** from Google Places and Yelp
- **User submissions** with moderation workflow
- **Rich venue profiles** with photos, reviews, and amenities

### User Experience
- **Real-time notifications** via web push and email
- **Responsive design** optimized for mobile
- **Progressive Web App** capabilities
- **Subscription management** with Stripe integration

## 🚀 Quick Start

1. **Clone and install**
   ```bash
   git clone <repository>
   cd scenescout
   npm install
   ```

2. **Setup environment**
   ```bash
   cp config/.env.example .env
   # Edit .env with your API keys (see SETUP.md)
   ```

3. **Initialize database**
   ```bash
   npm run db:apply
   npm run edge:deploy
   ```

4. **Start development**
   ```bash
   npm run dev
   ```

Visit [http://localhost:3000](http://localhost:3000)

## 🔐 API Key Security

### Important: Never commit API keys to the repository!

SceneScout uses multiple external APIs. All API keys should be stored securely:

1. **For local development**: Store keys in `.env` files (already in .gitignore)
2. **For production**: Use Supabase Secrets for edge functions
3. **For Vercel deployment**: Use Vercel environment variables

### Google Maps API Security

The application uses Google Places API **only server-side** in Supabase edge functions:
- Frontend uses Leaflet/OpenStreetMap (no Google Maps API key needed)
- Google Places API key should be set as a Supabase secret:
  ```bash
  supabase secrets set GOOGLE_PLACES_API_KEY=YOUR_API_KEY
  ```

### Setting up API Keys

1. **Supabase Edge Functions** (for Google Places, Yelp):
   ```bash
   cd vite-app
   supabase secrets set GOOGLE_PLACES_API_KEY=YOUR_GOOGLE_PLACES_API_KEY
   supabase secrets set YELP_API_KEY=YOUR_YELP_API_KEY
   ```

2. **Local Development** (.env file):
   ```env
   # Copy from .env.example and fill in your keys
   GOOGLE_PLACES_API_KEY=YOUR_API_KEY
   YELP_API_KEY=YOUR_API_KEY
   ```

### API Key Best Practices

- **Restrict API keys** in Google Cloud Console to specific APIs and domains
- **Rotate keys regularly** if exposed
- **Monitor usage** through cloud provider dashboards
- **Never expose keys** in client-side code or public repositories

## 🏗 Architecture

### Frontend
- **Next.js 14** with App Router
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React Query** for data fetching

### Backend
- **Supabase** for database and authentication
- **Edge Functions** for data processing and external API integration
- **PostgreSQL** with PostGIS for geospatial queries
- **Row Level Security** for data privacy

### External Integrations
- **Ticketmaster, Eventbrite, Songkick, Meetup** for event data
- **Google Places, Yelp** for venue information
- **Stripe** for payment processing
- **Resend** for transactional emails
- **OpenAI** for AI features

## 📚 Documentation

- [Setup Guide](docs/SETUP.md) - Detailed setup instructions
- [API Documentation](docs/API.md) - Edge Functions and database schema
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment
- [Feature Guide](docs/FEATURES.md) - User experience flows
- [Contributing](docs/CONTRIBUTING.md) - Development guidelines

## 🚢 Deployment

### Production Deployment
```bash
# Set up environment variables
# Deploy to Vercel + Supabase
bash scripts/deploy_one_shot.sh
```

### Local Development
```bash
# Apply database schema
npm run bootstrap:local

# Start development server
npm run dev
```

## 🔧 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run bootstrap:local` - Set up local development
- `npm run db:apply` - Apply database schema
- `npm run edge:deploy` - Deploy edge functions
- `npm run typecheck` - TypeScript checking
- `npm run lint` - Code linting

## 📊 Key Technologies

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Supabase** - Backend-as-a-Service
- **PostgreSQL** - Primary database
- **Tailwind CSS** - Utility-first CSS
- **Stripe** - Payment processing
- **Web Push** - Real-time notifications

## 🤝 Contributing

Please read our [Contributing Guide](docs/CONTRIBUTING.md) for development workflow, coding standards, and pull request process.

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
- [API Documentation](docs/API.md)
- [Setup Guide](docs/SETUP.md)

---

Built with ❤️ for event discovery and community building.