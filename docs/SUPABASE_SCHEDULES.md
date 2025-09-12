# Supabase Edge Function Schedules

This document outlines the recommended cron schedules for all SceneScout v14 Edge Functions.

## 📅 Schedule Overview

### Data Ingestion Functions
These functions pull fresh event and venue data from external APIs. Scheduled during low-traffic hours to minimize impact.

### Notification Functions  
User-facing notifications scheduled at optimal engagement times.

### AI/ML Functions
Resource-intensive processing scheduled during off-peak hours.

## ⏰ Detailed Schedules

### 🔄 Data Ingestion (Daily - Early Morning UTC)

**6:00 AM UTC - Ticketmaster Ingestion**
```
Cron: 0 6 * * *
Function: ingest_ticketmaster
Description: Pull professional events and concerts
Rate Limit: 5000/day
Duration: ~15 minutes
```

**6:05 AM UTC - Eventbrite Ingestion**  
```
Cron: 5 6 * * *
Function: ingest_eventbrite
Description: Community events and workshops
Rate Limit: 1000/hour
Duration: ~10 minutes
```

**6:10 AM UTC - Songkick Ingestion**
```
Cron: 10 6 * * *
Function: ingest_songkick  
Description: Concerts and music events
Rate Limit: 60/minute
Duration: ~20 minutes
```

**6:15 AM UTC - Meetup Ingestion**
```
Cron: 15 6 * * *
Function: ingest_meetup
Description: Community meetups and groups
Rate Limit: 200/hour  
Duration: ~15 minutes
```

**6:20 AM UTC - Google Places Ingestion**
```
Cron: 20 6 * * *
Function: ingest_places_google
Description: Venue details and photos
Rate Limit: 50/second
Duration: ~10 minutes
```

**6:25 AM UTC - Yelp Places Ingestion**
```
Cron: 25 6 * * *
Function: ingest_places_yelp
Description: Business info and reviews
Rate Limit: 5000/day
Duration: ~10 minutes
```

### 🤖 AI/ML Processing (Post-Ingestion)

**7:00 AM UTC - Hotness ML Scoring**
```
Cron: 0 7 * * *
Function: hotness_ml
Description: Calculate event popularity scores
Dependencies: Requires fresh event data
Duration: ~30 minutes
```

**7:30 AM UTC - Image Enhancement**
```
Cron: 30 7 * * *
Function: enrich_images
Description: AI analysis of event images
Dependencies: Requires fresh event data
Duration: ~45 minutes
```

### 📧 User Notifications

**9:00 AM UTC - Daily Digest**
```
Cron: 0 9 * * *
Function: daily_digest
Description: Personalized email digests
Target: Active users by timezone
Duration: ~20 minutes
```

**6:00 PM UTC - Event Reminders**
```
Cron: 0 18 * * *
Function: reminders
Description: Push/email reminders for saved events
Target: Events happening in next 24-48 hours
Duration: ~10 minutes
```

## 🛠 Setup Instructions

### Via Supabase Dashboard

1. **Navigate to Edge Functions**
   - Go to your Supabase project dashboard
   - Click "Edge Functions" in the sidebar

2. **Set Function Schedules**
   - Click on each function
   - Go to "Settings" tab
   - Add cron expression in "Cron Schedule" field
   - Enable the schedule

3. **Monitor Execution**
   - Check "Logs" tab for execution history
   - Monitor for errors or timeouts
   - Adjust schedules if needed

### Via Supabase CLI

```bash
# Enable cron for a function
supabase functions schedule set ingest_ticketmaster "0 6 * * *"

# List all schedules
supabase functions schedule list

# Remove a schedule
supabase functions schedule unset ingest_ticketmaster
```

## 📊 Monitoring Guidelines

### Health Checks
- **Success Rate**: Should be >95% for each function
- **Execution Time**: Monitor for increasing duration
- **Error Patterns**: Check logs for recurring failures

### Key Metrics to Track
- **Data Freshness**: Events should be <24 hours old
- **API Rate Limits**: Monitor remaining quotas
- **User Engagement**: Open rates for digests/reminders
- **System Performance**: Database query times

### Alert Thresholds
- **Function Failure**: >2 consecutive failures
- **Execution Timeout**: >expected duration + 50%
- **Data Gaps**: Missing data for >2 hours
- **High Error Rate**: >5% errors in 24h period

## 🚨 Troubleshooting

### Common Issues

**Functions Not Triggering**
- Verify cron expressions are correct
- Check function is deployed and active  
- Ensure environment variables are set

**Rate Limit Exceeded**
- Stagger function execution times
- Implement exponential backoff
- Consider reducing data volume per run

**Long Execution Times**
- Optimize database queries
- Implement batch processing
- Consider breaking into smaller functions

**Missing Dependencies**
- Ensure ingestion functions complete before ML functions
- Add delays between dependent functions
- Implement retry logic for failed dependencies

### Manual Execution

```bash
# Test a function manually
curl -X POST 'https://your-project.supabase.co/functions/v1/ingest_ticketmaster' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'

# Check function logs
supabase functions logs ingest_ticketmaster
```

## 📈 Optimization Tips

### Peak Hours Avoidance
- **2-4 PM UTC**: High user activity (US afternoon)
- **7-9 PM UTC**: Peak engagement (US evening)
- **11 PM - 5 AM UTC**: Lowest API costs

### Timezone Considerations
- **Daily Digest**: Send based on user's local timezone
- **Reminders**: Schedule for optimal engagement (evening)
- **Data Ingestion**: Use UTC for consistency

### Resource Management
- **Memory Usage**: Monitor for functions using >512MB
- **Cold Starts**: Keep frequently used functions warm
- **Database Connections**: Implement connection pooling

## 🔮 Future Enhancements

### Real-time Processing
- **Webhook Ingestion**: Real-time event updates
- **Stream Processing**: Handle high-volume data streams
- **Event-driven Architecture**: React to data changes

### Advanced Scheduling  
- **Dynamic Schedules**: Adjust based on data volume
- **Conditional Execution**: Skip if no new data
- **Priority Queuing**: Handle urgent updates first

---

**Last Updated**: January 2024
**Review Schedule**: Monthly
**Owner**: DevOps Team