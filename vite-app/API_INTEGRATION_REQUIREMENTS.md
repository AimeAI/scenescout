# SceneScout API Integration Requirements

This document outlines every API endpoint, webhook, and external service integration that needs real-world data to make SceneScout fully functional.

## 1. 🗄️ **Supabase Database Integration**

**File Location**: `/src/lib/supabase.ts` (lines 1-21)  
**Current Status**: ✅ Configured with environment variables  
**Required Environment Variables**: 
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key  
**Real-World Service**: Supabase (Backend-as-a-Service)  
**Authentication**: API key-based authentication
**Priority**: 🔴 **CRITICAL** - Core database functionality

---

## 2. 📊 **Events Service API Calls**

**File Location**: `/src/services/events.service.ts`

### **Supabase RPC Functions** (Need Database Implementation):
- **`get_featured_events`** (line 83) - Gets featured events with limit
- **`get_events_by_city`** (line 92) - Gets events filtered by city slug  
- **`get_nearby_events`** (line 101) - Gets events within radius of lat/lng coordinates
- **`search_events`** (line 126) - Full-text search across events
- **`increment_event_views`** (line 135) - Increments view count for event analytics

**Priority**: 🔴 **CRITICAL** - Core event functionality

### **Direct Database Queries** (Need Real Data):
- **`getEvents()`** (lines 25-77) - Main events query with filtering
- **`getEvent()`** (lines 109-121) - Single event with venue/city details
- **Required Tables**: `events`, `venues`, `cities` with proper relationships

**Priority**: 🔴 **CRITICAL** - Main application functionality

---

## 3. 📋 **Plans Service API Calls**

**File Location**: `/src/services/plans.service.ts`

### **Supabase RPC Function** (Need Database Implementation):
- **`get_plan_details`** (line 57) - Gets detailed plan with events

### **Direct Database Operations** (Need Real Data):
- **`getUserPlans()`** (lines 29-45) - User's personal plans with events
- **`createPlan()`** (lines 64-89) - Create new event plan
- **`updatePlan()`** (lines 91-112) - Update existing plan
- **`deletePlan()`** (lines 114-125) - Delete plan
- **`addEventToPlan()` / `removeEventFromPlan()`** (lines 127-156) - Manage plan contents
- **`getPublicPlans()`** (lines 180-197) - Browse public community plans

**Priority**: 🟡 **HIGH** - User itinerary management

---

## 4. 💖 **User Events Service API Calls**

**File Location**: `/src/services/user-events.service.ts`

### **Supabase RPC Function** (Need Database Implementation):
- **`get_user_saved_events`** (line 11) - User's saved events with details

### **Direct Database Operations** (Need Real Data):
- **`saveEvent()` / `unsaveEvent()`** (lines 18-44) - Bookmark events
- **`isEventSaved()`** (lines 46-54) - Check bookmark status  
- **`markAttended()`** (lines 69-88) - Mark event as attended with rating/notes
- **`getUserEventHistory()`** (lines 90-104) - User's event interaction history

**Priority**: 🟡 **HIGH** - User personalization features

---

## 5. 🌐 **External Event Data Ingestion APIs**

**File Location**: `/supabase/functions/`

### **🎫 Eventbrite API Integration** (`/ingest_eventbrite/index.ts`):
- **Endpoint**: `https://www.eventbriteapi.com/v3/events/search/`
- **Authentication**: Bearer token (`EVENTBRITE_TOKEN` env var)
- **Data Fields**: Events, venues, organizers, ticket classes, pricing
- **Parameters**: location, date range, categories, search query
- **Rate Limits**: 1000 requests/hour (free), higher for paid plans
- **Priority**: 🔴 **CRITICAL** - Primary event source

### **🎭 Ticketmaster API Integration** (`/ingest_ticketmaster/index.ts`):
- **Endpoint**: `https://app.ticketmaster.com/discovery/v2/events.json`
- **Authentication**: API key (`TICKETMASTER_API_KEY` env var)  
- **Data Fields**: Events, venues, attractions, classifications, pricing
- **Parameters**: city, state, date range, keywords, size limit
- **Rate Limits**: 5000 requests/day (free)
- **Priority**: 🔴 **CRITICAL** - Major event source

### **👥 Meetup API Integration** (`/ingest_meetup/index.ts`):
- **Endpoint**: Meetup Events API
- **Authentication**: Meetup API credentials required
- **Data Fields**: Events, venues, groups, categories
- **Priority**: 🟡 **HIGH** - Social events source

### **🎵 Songkick API Integration** (`/ingest_songkick/index.ts`):
- **Purpose**: Music events and concert data
- **Authentication**: Songkick API key required
- **Priority**: 🟡 **HIGH** - Music events specialization

### **📍 Google Places API Integration** (`/ingest_places_google/index.ts`):
- **Endpoint**: Google Places API for venue data enrichment
- **Authentication**: Google Maps API key (`VITE_GOOGLE_MAPS_API_KEY`)
- **Data Fields**: Place details, ratings, photos, business hours
- **Usage**: Venue information enhancement
- **Priority**: 🟡 **HIGH** - Venue data enrichment

### **🍕 Yelp Places API Integration** (`/ingest_places_yelp/index.ts`):
- **Purpose**: Restaurant and business venue data
- **Authentication**: Yelp Business API key required
- **Priority**: 🟢 **MEDIUM** - Additional venue data

---

## 6. 🗺️ **Map Services Integration**

**File Location**: `/src/pages/MapPage.tsx` (lines 87-89)

### **OpenStreetMap Tiles** (Currently Used):
- **Endpoint**: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- **Cost**: Free
- **Attribution**: Required
- **Priority**: ✅ **IMPLEMENTED**

### **Alternative Map Services** (Available but not active):
- **Google Maps**: `VITE_GOOGLE_MAPS_API_KEY` configured in `.env.example`
  - **Cost**: $7 per 1000 map loads after free tier
  - **Priority**: 🟢 **OPTIONAL** - Better user experience
  
- **Mapbox**: `VITE_MAPBOX_TOKEN` configured in `.env.example` 
  - **Cost**: Free up to 50,000 map loads/month
  - **Priority**: 🟢 **OPTIONAL** - Premium maps

---

## 7. 🛠️ **Utility Edge Functions**

### **Image Proxy Service** (`/img-proxy/index.ts`):
- **Purpose**: Proxy external images to avoid CORS issues
- **Implementation**: Fetches and returns external images with caching
- **Priority**: 🟡 **HIGH** - Image display functionality

### **ICS Calendar Export** (`/ics/index.ts`):
- **Purpose**: Generate iCalendar files for event export
- **Implementation**: Creates ICS format calendar entries
- **Priority**: 🟢 **MEDIUM** - User convenience feature

### **Push Notifications** (`/push-send/index.ts`, `/push-subscribe/index.ts`):
- **Current Status**: ❌ Placeholder implementation
- **Real-World Need**: Web Push API integration
- **Priority**: 🟢 **LOW** - Nice-to-have feature

---

## 8. 📈 **Analytics and Tracking**

**File Location**: `.env.example` (line 10)
- **Google Analytics**: `VITE_GA_MEASUREMENT_ID` for user behavior tracking
- **Implementation Status**: Environment variable configured, needs integration
- **Priority**: 🟢 **MEDIUM** - Business intelligence

---

## 9. 🤖 **Machine Learning Integration**

### **Event Hotness Scoring** (`/supabase/functions/hotness_ml/index.ts`):
- **Purpose**: Event popularity scoring algorithm
- **Implementation**: ML-based hotness calculation for event ranking
- **Priority**: 🟢 **MEDIUM** - Recommendation engine

### **Daily Digest Service** (`/daily_digest/index.ts`):
- **Purpose**: Automated email/notification system for event recommendations
- **Priority**: 🟢 **LOW** - User engagement

### **Reminder Service** (`/reminders/index.ts`):
- **Purpose**: Send event reminders to users
- **Priority**: 🟢 **LOW** - User retention

---

## 10. 🎨 **Content Enhancement Services**

### **Image Enrichment** (`/enrich_images/index.ts`):
- **Purpose**: Enhance event images using AI/ML services
- **Priority**: 🟢 **LOW** - Visual improvement

### **OG Event Cards** (`/og-event/index.ts`):
- **Purpose**: Generate Open Graph social sharing cards
- **Priority**: 🟢 **MEDIUM** - Social media sharing

---

## 🔐 **Authentication Requirements by Service**

| Service | Authentication Type | Required Credentials |
|---------|-------------------|---------------------|
| Supabase | Service/Anon Keys | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| Eventbrite | Bearer Token | `EVENTBRITE_TOKEN` |
| Ticketmaster | API Key | `TICKETMASTER_API_KEY` |
| Meetup | API Key + OAuth | Meetup API credentials |
| Songkick | API Key | `SONGKICK_API_KEY` |
| Google Places | API Key | `VITE_GOOGLE_MAPS_API_KEY` |
| Yelp | API Key | `YELP_API_KEY` |
| Google Analytics | Measurement ID | `VITE_GA_MEASUREMENT_ID` |

---

## 📋 **Required Database Schema**

### **Core Tables Needed**:
- **`events`** - Core event data (39 fields: title, description, dates, pricing, etc.)
- **`venues`** - Venue information with location data, amenities, capacity
- **`cities`** - Geographic organization with timezone support  
- **`profiles`** - User account and subscription management
- **`plans`** - User-created event itineraries
- **`user_events`** - User interactions (saved, attended, ratings)
- **`submissions`** - Content moderation workflow

### **Required RPC Functions**:
1. `get_featured_events(limit_count integer)`
2. `get_events_by_city(city_slug text)`
3. `get_nearby_events(lat numeric, lng numeric, radius_km integer)`
4. `search_events(query text)`
5. `increment_event_views(event_id text)`
6. `get_plan_details(plan_id text)`
7. `get_user_saved_events(user_id uuid)`

---

## 🚦 **Implementation Priority Matrix**

### 🔴 **CRITICAL (Must Have for MVP)**:
1. Supabase database with core tables and RPC functions
2. Eventbrite API integration for event data
3. Ticketmaster API integration for major events
4. Basic event display and search functionality

### 🟡 **HIGH (Important for Full Functionality)**:
1. User authentication and saved events
2. Plans/itinerary management
3. Google Places API for venue data
4. Map functionality with OpenStreetMap

### 🟢 **MEDIUM/LOW (Nice to Have)**:
1. Additional event sources (Meetup, Songkick)
2. Analytics and tracking
3. Push notifications
4. ML-based recommendations
5. Social sharing features

---

## 💰 **Estimated Costs (Monthly)**

| Service | Free Tier | Paid Plans Start | Usage for 10K Users |
|---------|-----------|------------------|-------------------|
| Supabase | 500MB DB, 2GB bandwidth | $25/month | ~$25-100/month |
| Eventbrite API | 1000 requests/hour | $49/month | ~$49/month |
| Ticketmaster API | 5000/day | Contact sales | ~$0-200/month |
| Google Maps API | $200 credit | Pay per use | ~$50-200/month |
| Google Places API | $200 credit | Pay per use | ~$100-300/month |
| **Total Estimated** | **~$0-50/month** | **~$424-849/month** | **For 10K users** |

---

## ⚡ **Next Steps for Implementation**

1. **Set up Supabase project** with database schema
2. **Obtain API keys** for Eventbrite and Ticketmaster
3. **Create Supabase RPC functions** for core queries
4. **Implement event data ingestion** from external APIs
5. **Set up cron jobs** for regular data updates
6. **Configure environment variables** for all services
7. **Test API rate limits** and implement proper error handling
8. **Add monitoring and logging** for all integrations

This document provides a complete roadmap for transforming SceneScout from a demo into a production-ready event discovery platform.