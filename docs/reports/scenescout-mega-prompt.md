MEGA PROMPT: Build SceneScout - The Ultimate City Event Discovery Platform
🎯 MISSION
Build a real-time event discovery platform that shows EVERYTHING happening in any city - concerts, restaurants trending tonight, popup shops, tech meetups, underground parties, comedy shows, free events - all in one place. Think "Netflix for real-world experiences" where users can filter by category, price, time, and vibe to never miss anything cool happening around them.
🏗️ TECHNICAL REQUIREMENTS
Core Stack (Non-negotiable)
- Frontend: Next.js 14 with App Router + TypeScript
- Styling: Tailwind CSS + shadcn/ui components
- Database: Supabase (PostgreSQL with PostGIS for location)
- Auth: Supabase Auth
- Deployment: Vercel
- Real-time: Supabase Realtime subscriptions
Free API Integrations (All Available)
javascriptconst DATA_SOURCES = {
  // TIER 1: Direct APIs (have keys)
  google_places: 'AIzaSyCrsauxxAb2nqLsfhr4UqSeJIFkssLHjNE',
  yelp: 'tpNEPYv1OdDlphvD--672xPJKCr3KGFNLsJ5Q1Hbq12xA0suztjs8dYxFr_sUGD8a5Pp2fPej32Xeh0uvxh6wYvF2tgAoedhXJ2fNqnrpq4Rme_m6bTptrxuJajHaHYx',
  eventbrite: 'X2O44MNDA2V5OAZILC7C',
  
  // TIER 2: Free APIs (no key needed)
  bandsintown: 'https://rest.bandsintown.com/events/search',
  facebook_events: 'Graph API with event.search', // User adds token
  
  // TIER 3: Web Scraping
  meetup: 'scrape public events',
  luma: 'scrape lu.ma/[city]',
  resident_advisor: 'scrape ra.co/events',
  instagram_hashtags: '#[city]events, #[city]tonight'
}
📱 USER EXPERIENCE FLOW
Homepage
┌─────────────────────────────────────┐
│ 🔍 "What's happening in [Toronto]?" │ <- Auto-detect location
├─────────────────────────────────────┤
│ TONIGHT | THIS WEEKEND | NEXT 30 DAYS│ <- Time filters
├─────────────────────────────────────┤
│ 🔥 TRENDING NOW (horizontal scroll) │ <- High social engagement
│ [Concert] [Restaurant] [Club] [Event]│
├─────────────────────────────────────┤
│ 🎵 MUSIC & CONCERTS                 │
│ [Drake Tonight] [Jazz Bar] [DJ Set] │
├─────────────────────────────────────┤
│ 🍽️ FOOD & DRINK                    │
│ [New Resto] [Wine Tasting] [Popup]  │
├─────────────────────────────────────┤
│ 🎭 ARTS & CULTURE                   │
│ [Gallery] [Theater] [Museum]        │
├─────────────────────────────────────┤
│ 💻 TECH & STARTUPS                  │
│ [AI Meetup] [Hackathon] [Demo Day]  │
├─────────────────────────────────────┤
│ 🆓 FREE EVENTS                      │
│ [Yoga] [Market] [Festival] [Talk]   │
└─────────────────────────────────────┘
Discovery Page Filters
typescriptinterface Filters {
  categories: ['music', 'food', 'arts', 'tech', 'sports', 'social', 'nightlife', 'free'];
  priceRange: {
    free: '$0',
    budget: '$1-25',
    moderate: '$26-75',
    premium: '$76-150',
    luxury: '$150+'
  };
  time: ['tonight', 'tomorrow', 'this_weekend', 'next_7_days', 'next_30_days'];
  vibe: ['chill', 'energetic', 'romantic', 'professional', 'casual', 'fancy'];
  features: ['outdoor', 'indoor', '21+', 'all_ages', 'food_available', 'parking'];
}
🗄️ DATABASE SCHEMA
sql-- Core tables with EVERYTHING needed
CREATE TABLE cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  coordinates GEOGRAPHY(Point, 4326),
  timezone TEXT,
  country TEXT
);

CREATE TABLE master_events (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT,
  source TEXT NOT NULL, -- 'eventbrite', 'yelp', 'facebook', etc
  
  -- Core Info
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT, -- 'event', 'venue', 'activity'
  
  -- When
  event_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT,
  
  -- Where  
  venue_name TEXT,
  address TEXT,
  city_id UUID REFERENCES cities(id),
  coordinates GEOGRAPHY(Point, 4326),
  
  -- Categorization
  categories TEXT[], -- ['music', 'outdoor']
  tags TEXT[], -- ['hip-hop', 'rooftop', 'craft-beer']
  vibe TEXT, -- 'energetic', 'chill', 'professional'
  
  -- Pricing
  price_min DECIMAL,
  price_max DECIMAL,
  price_tier TEXT, -- 'free', 'budget', 'moderate', 'premium', 'luxury'
  currency TEXT DEFAULT 'USD',
  
  -- Engagement
  attending_count INT DEFAULT 0,
  interested_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  quality_score FLOAT, -- ML-calculated relevance
  trending_score FLOAT, -- Velocity of engagement
  
  -- Media
  image_url TEXT,
  images TEXT[],
  
  -- Links
  ticket_url TEXT,
  website_url TEXT,
  
  -- Meta
  is_featured BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Deduplication
  dedup_hash TEXT UNIQUE
);

-- Indexes for SPEED
CREATE INDEX idx_events_date ON master_events(event_date);
CREATE INDEX idx_events_city ON master_events(city_id);
CREATE INDEX idx_events_coordinates ON master_events USING GIST(coordinates);
CREATE INDEX idx_events_categories ON master_events USING GIN(categories);
CREATE INDEX idx_events_price ON master_events(price_tier);
CREATE INDEX idx_events_trending ON master_events(trending_score DESC);
🔄 EVENT INGESTION SYSTEM
Master Ingestion Function
javascript// /api/cron/ingest-everything
export async function ingestAllEvents(city: string) {
  const events = [];
  
  // PARALLEL FETCH FROM ALL SOURCES
  const [
    googlePlaces,
    yelpVenues,
    eventbrite,
    facebook,
    meetup,
    bandsintown,
    luma,
    instagram
  ] = await Promise.allSettled([
    fetchGooglePlaces(city),
    fetchYelp(city),
    fetchEventbrite(city),
    fetchFacebook(city),
    scrapeMeetup(city),
    fetchBandsintown(city),
    scrapeLuma(city),
    scrapeInstagram(city)
  ]);
  
  // SMART DEDUPLICATION
  const uniqueEvents = deduplicateEvents([
    ...googlePlaces,
    ...yelpVenues,
    ...eventbrite,
    // ... all sources
  ]);
  
  // QUALITY SCORING
  const scoredEvents = uniqueEvents.map(event => ({
    ...event,
    quality_score: calculateQuality(event),
    trending_score: calculateTrending(event)
  }));
  
  // SAVE TO DATABASE
  await supabase.from('master_events').upsert(scoredEvents);
  
  return scoredEvents.length;
}

// Smart deduplication using multiple signals
function deduplicateEvents(events) {
  const seen = new Map();
  
  return events.filter(event => {
    // Multiple hash strategies
    const hashes = [
      // Exact match
      hash(`${event.title}|${event.venue}|${event.date}`),
      // Same venue, same time
      hash(`${event.venue}|${event.date}|${event.time}`),
      // Fuzzy title match
      hash(`${fuzzyTitle(event.title)}|${event.date}`)
    ];
    
    for (const h of hashes) {
      if (seen.has(h)) {
        // Merge data from multiple sources
        const existing = seen.get(h);
        existing.sources.push(event.source);
        existing.confidence++;
        return false;
      }
    }
    
    hashes.forEach(h => seen.set(h, event));
    return true;
  });
}
🎨 FRONTEND COMPONENTS
Event Card Component
tsxfunction EventCard({ event }: { event: Event }) {
  return (
    <div className="group relative overflow-hidden rounded-xl bg-white shadow-lg hover:shadow-2xl transition-all">
      {/* Image with gradient overlay */}
      <div className="relative h-48 overflow-hidden">
        <img 
          src={event.image_url || `/api/og?title=${event.title}`} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Price badge */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full">
          <span className="font-bold">
            {event.price_tier === 'free' ? 'FREE' : `$${event.price_min}-${event.price_max}`}
          </span>
        </div>
        
        {/* Trending indicator */}
        {event.trending_score > 80 && (
          <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full">
            🔥 Trending
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <span>{formatDate(event.event_date)}</span>
          <span>•</span>
          <span>{event.start_time}</span>
        </div>
        
        <h3 className="font-bold text-lg mb-1 line-clamp-2">
          {event.title}
        </h3>
        
        <p className="text-gray-600 text-sm mb-3">
          📍 {event.venue_name}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {event.categories.map(cat => (
              <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                {cat}
              </span>
            ))}
          </div>
          
          <div className="flex items-center gap-3 text-sm text-gray-500">
            {event.attending_count > 0 && (
              <span>👥 {event.attending_count}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
🔥 SPECIAL FEATURES
1. "Happening Now" Real-time Feed
javascript// Shows events starting in next 2 hours
const happeningNow = await supabase
  .from('master_events')
  .select('*')
  .gte('start_time', new Date())
  .lte('start_time', new Date(Date.now() + 2 * 60 * 60 * 1000))
  .order('trending_score', { ascending: false });
2. Smart Recommendations
javascript// Based on user behavior
function getRecommendations(userId: string) {
  // Get user preferences from their history
  const userHistory = await getUserEventHistory(userId);
  const preferences = analyzePreferences(userHistory);
  
  // Find similar events
  return supabase
    .from('master_events')
    .select('*')
    .contains('categories', preferences.favoriteCategories)
    .gte('quality_score', 70)
    .order('quality_score', { ascending: false });
}
3. Multi-source Confidence
javascript// Events found on multiple platforms are more reliable
const verifiedEvents = events.filter(e => 
  e.metadata?.sources?.length > 1
);
4. Price Intelligence
javascript// Show "Worth it?" score based on similar events
function calculateValue(event) {
  const similarEvents = await findSimilar(event);
  const avgPrice = average(similarEvents.map(e => e.price_min));
  return {
    value: event.price_min < avgPrice ? 'great' : 'fair',
    savings: avgPrice - event.price_min
  };
}
🚀 DEPLOYMENT INSTRUCTIONS
bash# 1. Clone and setup
git clone [repo]
cd scenescout
npm install

# 2. Environment variables (.env.local)
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
GOOGLE_PLACES_API_KEY=provided_key
YELP_API_KEY=provided_key
EVENTBRITE_PRIVATE_TOKEN=provided_key

# 3. Database setup
npm run supabase:init
npm run supabase:migrate

# 4. Deploy edge functions
supabase functions deploy ingest-events
supabase functions deploy calculate-trending

# 5. Set up cron jobs (in Supabase dashboard)
-- Every 2 hours: Ingest events
SELECT cron.schedule('ingest-events', '0 */2 * * *', $$
  SELECT net.http_post(
    'https://[project].supabase.co/functions/v1/ingest-events',
    '{"city": "all"}'
  );
$$);

# 6. Deploy to Vercel
vercel --prod
🎯 SUCCESS CRITERIA
The app is successful when:

Shows 200+ REAL events per city (not mock data)
Updates automatically every 2 hours without manual intervention
Filters work instantly across category, price, time
"Tonight" shows what's actually happening tonight
Free events are prominently featured
Underground/popup events appear (not just Ticketmaster)
Trending calculation reflects social buzz
Works for ANY city user searches for
Mobile responsive and fast (<3s load time)
Zero mock/fake events in production

💎 UNIQUE VALUE PROPOSITION
SceneScout is the ONLY app that:

Shows EVERYTHING happening (not just ticketed events)
Finds hidden gems and popup events
Tells you what's trending RIGHT NOW
Works for restaurants, clubs, events, and activities
Aggregates 20+ sources in one interface
Is completely FREE to use

Build this exactly as specified. No mock data. No placeholders. Real events only.
The user should be able to:

Open the app
See what's happening in their city TODAY
Filter by their interests
Never miss anything cool again

This is the Netflix of real-world experiences. Build it.