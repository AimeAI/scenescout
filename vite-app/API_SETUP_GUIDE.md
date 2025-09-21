# 🔑 SceneScout API Setup Guide

This guide will help you configure real event data sources to populate your SceneScout application with detailed, current events instead of mock data.

## 🎯 Why You Need Real APIs

Currently, your events are demo/sample data with limited details. With proper API configuration, you'll get:

- ✅ **Real event details** (full descriptions, images, pricing)
- ✅ **Live ticket links** that actually work
- ✅ **Current events** (not outdated samples)  
- ✅ **Rich metadata** (venue info, organizer details, social links)
- ✅ **Automatic updates** (fresh events daily)

## 📋 Required API Keys

### 1. Ticketmaster Discovery API (ESSENTIAL)
**Best source for major events (concerts, sports, theater)**

#### Setup Steps:
1. Visit [Ticketmaster Developer Portal](https://developer.ticketmaster.com/)
2. Click "Get Started" → Create Account
3. Go to "My Apps" → "Create App"
4. Fill out application:
   - **App Name**: SceneScout Event Discovery
   - **Description**: Event discovery application for local events
   - **URL**: Your app URL or localhost
5. Copy your **Consumer Key** (this is your API key)

#### Add to Environment:
```bash
# Add to your .env file
TICKETMASTER_API_KEY=your_consumer_key_here
```

#### Rate Limits:
- ✅ **5,000 requests/day** (free tier)
- ✅ **Rate limit: 5 requests/second**

---

### 2. Eventbrite API (RECOMMENDED)  
**Great for local community events, workshops, networking**

#### Setup Steps:
1. Visit [Eventbrite API Documentation](https://www.eventbrite.com/platform/api)
2. Sign in to your Eventbrite account
3. Go to [Account Settings → Developer Links](https://www.eventbrite.com/account-settings/apps)
4. Click "Create Private Token"
5. Name: "SceneScout Integration"
6. Copy your **Private Token**

#### Add to Environment:
```bash
# Add to your .env file  
EVENTBRITE_PRIVATE_TOKEN=your_private_token_here
```

#### Rate Limits:
- ✅ **1,000 requests/hour** (free tier)
- ⚠️ **Note**: Only returns events from organizations you have access to

---

### 3. Google Places API (OPTIONAL)
**For venue enrichment and local business events**

#### Setup Steps:
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable **Places API**
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Restrict key to "Places API" for security

#### Add to Environment:
```bash
# Add to your .env file
GOOGLE_PLACES_API_KEY=your_api_key_here
```

#### Rate Limits:
- ✅ **$200 free credit monthly**
- ✅ **Reasonable usage typically stays within free tier**

---

## 🚀 Quick Setup Script

After adding your API keys to `.env`, run:

```bash
cd vite-app
node setup-real-events.js
```

This script will:
1. ✅ Check your API configurations
2. ✅ Add rich sample events (while you get APIs)
3. ✅ Test live event ingestion
4. ✅ Enrich existing events with missing details

## 📊 Event Quality Comparison

### Before (Demo Events):
```
❌ Static sample data
❌ Broken/fake ticket links  
❌ Limited descriptions
❌ Generic stock images
❌ No real venue info
❌ Outdated dates
```

### After (Real APIs):
```
✅ Live, current events
✅ Working ticket purchase links
✅ Rich descriptions & details
✅ Official event images
✅ Real venue information
✅ Fresh events added daily
```

## 🔄 Automated Ingestion

### Set up daily event refresh:

```bash
# Create a cron job to run daily at 6 AM
0 6 * * * cd /path/to/scenescout/vite-app && node scripts/daily-ingestion.js
```

### Manual ingestion commands:

```bash
# Ticketmaster events for Toronto
supabase functions invoke ingest_ticketmaster --data '{"city":"Toronto","stateCode":"ON","size":100}'

# Eventbrite events  
supabase functions invoke ingest_eventbrite --data '{"cities":["Toronto","Vancouver","Montreal"]}'
```

## 🔧 Troubleshooting

### "No events found" after setup:

1. **Check API keys** in `.env`:
   ```bash
   echo $TICKETMASTER_API_KEY
   echo $EVENTBRITE_PRIVATE_TOKEN
   ```

2. **Test API calls manually**:
   ```bash
   # Test Ticketmaster
   curl "https://app.ticketmaster.com/discovery/v2/events.json?apikey=YOUR_KEY&city=Toronto"
   
   # Test Eventbrite  
   curl -H "Authorization: Bearer YOUR_TOKEN" "https://www.eventbriteapi.com/v3/users/me/"
   ```

3. **Check Supabase logs**:
   ```bash
   supabase functions logs ingest_ticketmaster
   ```

### API Rate Limits Hit:

- **Ticketmaster**: Wait 24 hours or upgrade plan
- **Eventbrite**: Wait 1 hour or contact support for higher limits
- **Google Places**: Check billing account for overages

### Events Showing as "Mock":

- Run the enrichment script: `node setup-real-events.js`
- Check that ingestion functions are being called
- Verify database permissions for the service role key

## 📈 Event Coverage by Source

| Source | Event Types | Coverage | Quality |
|--------|-------------|----------|---------|
| **Ticketmaster** | Concerts, Sports, Theater | 🟢 Excellent | 🟢 High |
| **Eventbrite** | Local, Community, Business | 🟡 Good | 🟡 Medium |
| **Google Places** | Venue Info, Local Business | 🟡 Supplementary | 🟢 High |

## 🎯 Expected Results

After proper setup, you should see:

- **500+ current events** in Toronto area
- **Working ticket links** to official sources
- **Rich event descriptions** with full details
- **High-quality images** from official sources
- **Accurate venue information** with maps
- **Real pricing data** in local currency
- **Social media links** for events/organizers

## 💡 Pro Tips

1. **Start with Ticketmaster** - easiest setup, best event coverage
2. **Monitor rate limits** - set up alerts for API usage
3. **Cache aggressively** - events don't change minute-to-minute
4. **Geographic focus** - start with 1-2 cities for better coverage
5. **Category balance** - ensure good mix of music, sports, food, arts
6. **Regular cleanup** - remove outdated events monthly

## 🆘 Need Help?

If you're still seeing mock events after setup:

1. Check this guide step-by-step ✅
2. Run `node setup-real-events.js` ✅  
3. Verify API keys in Supabase dashboard ✅
4. Test edge functions individually ✅
5. Check database permissions ✅

The goal is to have **real, detailed, clickable events** that users can actually attend and purchase tickets for!