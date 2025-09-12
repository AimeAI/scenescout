# SceneScout v14

**A comprehensive Next.js 14 application for discovering urban culture and events**

SceneScout is a modern platform that connects people with the best events, venues, and cultural experiences in their city. Built with cutting-edge technologies and designed for scale, it provides a seamless experience for event discovery, planning, and community engagement.

## 🌟 Features

### Core Features
- **Event Discovery**: Browse and search thousands of events across multiple cities
- **City Exploration**: Dedicated pages for each city with interactive maps and venue listings
- **Event Planning**: Create and share curated event plans with friends and collaborators
- **Venue Database**: Comprehensive database of venues with detailed information and reviews
- **User Accounts**: Multi-tier subscription system with personalized recommendations
- **Real-time Updates**: Live updates for events, plans, and community interactions

### User Features
- **Personalized Feed**: AI-powered event recommendations based on user preferences
- **Event Reminders**: Push notifications and email alerts for saved events
- **Social Planning**: Collaborative event planning with friends and groups
- **Community Walls**: City-specific community boards for event discussions
- **Mobile App**: Progressive Web App (PWA) support for mobile devices

### Admin Features
- **Content Management**: Comprehensive admin dashboard for moderation and management
- **Analytics Dashboard**: Real-time insights into user behavior and event performance
- **Promotion Management**: Tools for creating and managing event promotions
- **User Management**: Admin tools for managing users, subscriptions, and permissions
- **Data Analytics**: Advanced metrics and reporting for business intelligence

### Technical Features
- **Edge Functions**: Serverless functions for data ingestion and processing
- **Real-time Sync**: Supabase real-time subscriptions for live updates
- **Image Processing**: Automated image enhancement and optimization
- **Search & Filtering**: Advanced search with multiple filter options
- **API Integration**: Multiple event data sources (Ticketmaster, Eventbrite, etc.)
- **Machine Learning**: Hotness scoring algorithm for event ranking

## 🏗️ Architecture Overview

SceneScout follows a modern full-stack architecture with clear separation of concerns:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Next.js 14    │    │    Supabase      │    │  Edge Functions │
│   Frontend      │◄──►│   Database       │◄──►│   Backend       │
│   (App Router)  │    │   + Auth + RT    │    │   Processing    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         ▲                        ▲                        ▲
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│    Vercel       │    │     Stripe       │    │  External APIs  │
│   Deployment    │    │    Payments      │    │   (Events)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Key Components

**Frontend (Next.js 14)**
- Server-side rendering for optimal SEO and performance
- App Router for file-based routing and layouts
- React Server Components for efficient data fetching
- TypeScript for type safety
- Tailwind CSS + shadcn/ui for consistent styling

**Backend (Supabase)**
- PostgreSQL database with PostGIS for geospatial queries
- Row Level Security (RLS) for data protection
- Real-time subscriptions for live updates
- Built-in authentication with multiple providers
- Edge Functions for serverless computing

**Data Processing**
- Automated event ingestion from multiple sources
- Image processing and enhancement
- Machine learning for event scoring
- Email notifications and reminders
- Analytics and metrics collection

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18.0 or later
- npm or yarn package manager
- Git version control
- Supabase account
- Stripe account (for payments)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/scenescout.git
   cd scenescout
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env.local
   ```

4. **Configure environment variables**
   See [SETUP.md](./SETUP.md) for detailed configuration instructions.

5. **Initialize database**
   ```bash
   npm run db:apply
   ```

6. **Deploy edge functions**
   ```bash
   npm run edge:deploy
   ```

7. **Start development server**
   ```bash
   npm run dev
   ```

8. **Open application**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📋 Project Structure

```
scenescout/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Authentication pages
│   │   ├── admin/             # Admin dashboard
│   │   ├── api/               # API routes
│   │   ├── city/[slug]/       # Dynamic city pages
│   │   ├── feed/              # Event feed
│   │   ├── plan/              # Event planning
│   │   └── submit/            # Content submission
│   ├── components/            # Reusable React components
│   │   ├── ui/                # Base UI components
│   │   └── ...                # Feature components
│   ├── lib/                   # Utility libraries
│   │   ├── supabase.ts        # Database client
│   │   ├── auth.ts            # Authentication
│   │   └── utils.ts           # Helper functions
│   └── types/                 # TypeScript definitions
├── supabase/
│   ├── functions/             # Edge Functions
│   └── config.toml           # Supabase configuration
├── db/                        # Database schemas and migrations
├── docs/                      # Documentation files
├── public/                    # Static assets
└── scripts/                   # Build and deployment scripts
```

## 🎯 Key Workflows

### Event Discovery
1. User visits city page or main feed
2. AI algorithm recommends personalized events
3. User can filter by category, date, price, etc.
4. Events displayed with venue info, images, and details
5. User can save events, set reminders, or add to plans

### Event Submission
1. User navigates to submission form
2. Fills out event details with validation
3. Admin reviews submission for approval
4. Approved events appear in search results
5. Automated notifications sent to interested users

### Plan Creation
1. User creates new plan with basic information
2. Searches and adds events to the plan
3. Can invite collaborators to edit plan
4. Plan can be made public or kept private
5. Real-time updates when collaborators make changes

## 🔧 Development Workflow

### Local Development
```bash
# Start development server
npm run dev

# Run type checking
npm run typecheck

# Run linting
npm run lint

# Apply database changes
npm run db:apply

# Deploy edge functions locally
supabase functions serve
```

### Testing
```bash
# Run tests
npm test

# Run tests in watch mode
npm test:watch

# Generate coverage report
npm test:coverage
```

### Building for Production
```bash
# Build application
npm run build

# Start production server
npm start
```

## 🌍 Deployment

SceneScout is designed for deployment on Vercel with Supabase as the backend. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy
1. Push code to GitHub
2. Connect repository to Vercel
3. Configure environment variables
4. Deploy automatically on push

### Manual Deploy
```bash
# Build and deploy to Vercel
npm run build
vercel --prod

# Deploy Supabase functions
supabase functions deploy
```

## 📊 Analytics & Monitoring

SceneScout includes comprehensive analytics for monitoring application performance and user engagement:

- **User Analytics**: User acquisition, retention, and behavior tracking
- **Event Analytics**: Event views, saves, and attendance tracking
- **Performance Monitoring**: Page load times, API response times, and error rates
- **Business Metrics**: Subscription conversions, revenue tracking, and churn analysis

## 🔐 Security & Privacy

- **Authentication**: Secure user authentication with Supabase Auth
- **Authorization**: Role-based access control with Row Level Security
- **Data Protection**: GDPR-compliant data handling and user privacy controls
- **API Security**: Rate limiting, CORS configuration, and input validation
- **Infrastructure Security**: HTTPS everywhere, secure environment variables

## 🤝 Contributing

We welcome contributions to SceneScout! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on:

- Code style and conventions
- Git workflow and branching strategy
- Pull request process
- Testing requirements
- Documentation standards

## 📚 Documentation

- **[Setup Guide](./SETUP.md)** - Detailed installation and configuration
- **[API Reference](./API.md)** - Complete API documentation
- **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment instructions
- **[Feature Guide](./FEATURES.md)** - Detailed feature documentation
- **[Troubleshooting](./TROUBLESHOOTING.md)** - Common issues and solutions
- **[Cron Schedules](./SUPABASE_SCHEDULES.md)** - Edge function schedules

## 🆘 Support

- **Documentation**: Comprehensive guides in the `/docs` folder
- **Issues**: Report bugs and request features on GitHub Issues
- **Discussions**: Community discussions on GitHub Discussions
- **Email**: Contact support at support@scenescout.app

## 📄 License

SceneScout is released under the MIT License. See [LICENSE](../LICENSE) for details.

---

**Built with ❤️ using Next.js 14, Supabase, and modern web technologies.**