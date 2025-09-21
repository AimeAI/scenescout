# SceneScout API Reference

## Overview

The SceneScout API provides comprehensive access to event discovery, processing, and management functionality. Built on Next.js API routes with TypeScript, the API offers RESTful endpoints with real-time capabilities through WebSocket connections.

## Base Information

- **Base URL**: `https://your-domain.com/api`
- **Authentication**: Bearer token (Supabase JWT)
- **Content Type**: `application/json`
- **Rate Limiting**: 1000 requests per hour per user
- **API Version**: 14.0.0

## Authentication

### JWT Token Authentication

All authenticated endpoints require a valid JWT token in the Authorization header:

```http
Authorization: Bearer <jwt_token>
```

### Getting a Token

```javascript
// Using Supabase client
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, key)

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

// Token is available in data.session.access_token
```

## Core Endpoints

### Events API

#### GET /api/events

Retrieve events with filtering and pagination.

**Parameters**:
- `city` (string): Filter by city
- `category` (string): Filter by event category
- `date_from` (string): Start date (ISO 8601)
- `date_to` (string): End date (ISO 8601)
- `limit` (number): Max results (default: 20, max: 100)
- `offset` (number): Pagination offset
- `search` (string): Search query

**Response**:
```json
{
  "data": [
    {
      "id": "evt_123",
      "title": "Concert in the Park",
      "description": "Amazing outdoor concert...",
      "venue": {
        "id": "venue_456",
        "name": "Central Park",
        "location": {
          "lat": 40.7829,
          "lng": -73.9654
        }
      },
      "start_time": "2025-09-20T19:00:00Z",
      "end_time": "2025-09-20T22:00:00Z",
      "category": "music",
      "price_range": {
        "min": 25.00,
        "max": 75.00,
        "currency": "USD"
      },
      "source": "eventbrite",
      "external_id": "eb_789",
      "created_at": "2025-09-17T10:00:00Z",
      "updated_at": "2025-09-17T10:00:00Z"
    }
  ],
  "meta": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

#### GET /api/events/{id}

Get a specific event by ID.

**Response**:
```json
{
  "data": {
    "id": "evt_123",
    "title": "Concert in the Park",
    "description": "Amazing outdoor concert with live music...",
    "venue": {
      "id": "venue_456",
      "name": "Central Park",
      "address": "Central Park, New York, NY 10024",
      "location": {
        "lat": 40.7829,
        "lng": -73.9654
      }
    },
    "organizer": {
      "name": "Music Events Inc",
      "email": "contact@musicevents.com"
    },
    "start_time": "2025-09-20T19:00:00Z",
    "end_time": "2025-09-20T22:00:00Z",
    "category": "music",
    "tags": ["outdoor", "live-music", "family-friendly"],
    "price_range": {
      "min": 25.00,
      "max": 75.00,
      "currency": "USD"
    },
    "tickets_url": "https://example.com/tickets",
    "images": [
      {
        "url": "https://example.com/image1.jpg",
        "alt": "Concert stage setup"
      }
    ],
    "source": "eventbrite",
    "external_id": "eb_789",
    "created_at": "2025-09-17T10:00:00Z",
    "updated_at": "2025-09-17T10:00:00Z"
  }
}
```

### Event Processing API

#### POST /api/events/process

Process and normalize event data from external sources.

**Authentication**: Required  
**Permissions**: Admin or service account

**Request Body**:
```json
{
  "source": "eventbrite",
  "events": [
    {
      "external_id": "eb_123",
      "title": "Sample Event",
      "description": "Event description",
      "start_time": "2025-09-20T19:00:00Z",
      "venue": {
        "name": "Sample Venue",
        "address": "123 Main St, City, State"
      }
    }
  ],
  "options": {
    "validate": true,
    "deduplicate": true,
    "enrich": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "processed": 1,
  "results": [
    {
      "external_id": "eb_123",
      "internal_id": "evt_456",
      "status": "created",
      "warnings": []
    }
  ],
  "errors": [],
  "processing_time_ms": 250
}
```

### Event Ingestion API

#### POST /api/ingest

Ingest events from external APIs with automatic processing.

**Authentication**: Required  
**Permissions**: Admin or service account

**Request Body**:
```json
{
  "source": "eventbrite",
  "query": {
    "location": "New York, NY",
    "category": "music",
    "date_range": {
      "start": "2025-09-20",
      "end": "2025-09-30"
    }
  },
  "options": {
    "max_results": 100,
    "auto_process": true,
    "notify": true
  }
}
```

**Response**:
```json
{
  "success": true,
  "ingestion_id": "ing_789",
  "status": "processing",
  "estimated_completion": "2025-09-17T10:05:00Z",
  "events_found": 45,
  "webhook_url": "/api/webhooks/ingestion/ing_789"
}
```

### Pipeline Management API

#### GET /api/pipeline

Get current pipeline status and metrics.

**Response**:
```json
{
  "status": "healthy",
  "active_jobs": 3,
  "queue_length": 12,
  "processing_rate": 150.5,
  "error_rate": 0.02,
  "uptime_seconds": 86400,
  "last_update": "2025-09-17T10:00:00Z",
  "workers": [
    {
      "id": "worker_1",
      "status": "processing",
      "current_task": "eventbrite_ingestion",
      "start_time": "2025-09-17T09:55:00Z"
    }
  ]
}
```

#### POST /api/pipeline/webhook

Handle real-time pipeline events via WebSocket.

**WebSocket URL**: `wss://your-domain.com/api/pipeline/websocket`

**Message Format**:
```json
{
  "type": "pipeline_event",
  "event": "job_completed",
  "data": {
    "job_id": "job_123",
    "status": "success",
    "duration_ms": 1500,
    "events_processed": 25
  },
  "timestamp": "2025-09-17T10:00:00Z"
}
```

### User Management API

#### GET /api/user/profile

Get current user profile.

**Authentication**: Required

**Response**:
```json
{
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "display_name": "John Doe",
    "avatar_url": "https://example.com/avatar.jpg",
    "plan": "pro",
    "preferences": {
      "default_city": "New York, NY",
      "categories": ["music", "arts", "food"],
      "notifications": true
    },
    "created_at": "2025-01-01T00:00:00Z",
    "last_login": "2025-09-17T09:00:00Z"
  }
}
```

#### PUT /api/user/profile

Update user profile.

**Authentication**: Required

**Request Body**:
```json
{
  "display_name": "John Smith",
  "preferences": {
    "default_city": "San Francisco, CA",
    "categories": ["music", "tech"],
    "notifications": false
  }
}
```

### Venue API

#### GET /api/venues

Get venues with filtering.

**Parameters**:
- `city` (string): Filter by city
- `name` (string): Search by venue name
- `limit` (number): Max results
- `offset` (number): Pagination offset

**Response**:
```json
{
  "data": [
    {
      "id": "venue_123",
      "name": "Madison Square Garden",
      "address": "4 Pennsylvania Plaza, New York, NY 10001",
      "location": {
        "lat": 40.7505,
        "lng": -73.9934
      },
      "capacity": 20000,
      "type": "arena",
      "amenities": ["parking", "accessible", "food"],
      "upcoming_events": 15,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "total": 50,
    "limit": 20,
    "offset": 0
  }
}
```

## Real-Time Features

### WebSocket Connections

Connect to real-time updates:

```javascript
const ws = new WebSocket('wss://your-domain.com/api/pipeline/websocket');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch (data.type) {
    case 'new_event':
      // Handle new event
      break;
    case 'event_updated':
      // Handle event update
      break;
    case 'pipeline_status':
      // Handle pipeline status update
      break;
  }
};
```

### Event Types

- `new_event`: New event discovered and processed
- `event_updated`: Existing event information updated
- `event_deleted`: Event removed or cancelled
- `pipeline_status`: Processing pipeline status change
- `error`: Error occurred during processing
- `system_alert`: System-wide alerts or notifications

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "date_from",
      "issue": "Invalid date format"
    },
    "request_id": "req_123",
    "timestamp": "2025-09-17T10:00:00Z"
  }
}
```

### HTTP Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable

### Common Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `AUTHENTICATION_REQUIRED` | Valid authentication required |
| `INSUFFICIENT_PERMISSIONS` | User lacks required permissions |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `RATE_LIMIT_EXCEEDED` | API rate limit exceeded |
| `PROCESSING_ERROR` | Error during data processing |
| `EXTERNAL_API_ERROR` | External API request failed |
| `DATABASE_ERROR` | Database operation failed |

## SDK and Libraries

### JavaScript/TypeScript SDK

```bash
npm install @scenescout/sdk
```

```javascript
import { SceneScout } from '@scenescout/sdk';

const client = new SceneScout({
  apiKey: 'your-api-key',
  baseUrl: 'https://your-domain.com/api'
});

// Get events
const events = await client.events.list({
  city: 'New York, NY',
  category: 'music',
  limit: 10
});

// Real-time updates
client.realtime.subscribe('events', (event) => {
  console.log('New event:', event);
});
```

### Python SDK

```bash
pip install scenescout-python
```

```python
from scenescout import SceneScout

client = SceneScout(
    api_key='your-api-key',
    base_url='https://your-domain.com/api'
)

# Get events
events = client.events.list(
    city='New York, NY',
    category='music',
    limit=10
)

# Process events
result = client.events.process(
    source='eventbrite',
    events=event_data
)
```

## Rate Limiting

### Limits

- **Free Plan**: 100 requests per hour
- **Pro Plan**: 1,000 requests per hour
- **Enterprise**: Custom limits

### Headers

Rate limit information is included in response headers:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1631234567
```

### Handling Rate Limits

```javascript
const response = await fetch('/api/events');

if (response.status === 429) {
  const resetTime = response.headers.get('X-RateLimit-Reset');
  const waitTime = (resetTime * 1000) - Date.now();
  
  // Wait until rate limit resets
  await new Promise(resolve => setTimeout(resolve, waitTime));
  
  // Retry request
  return fetch('/api/events');
}
```

## Testing

### Test Environment

Base URL: `https://test.your-domain.com/api`

### Sample Data

Test endpoints with sample data available:

- `/api/test/events` - Sample events
- `/api/test/venues` - Sample venues
- `/api/test/users` - Test user accounts

### API Testing Tools

Recommended tools for API testing:

- **Postman**: GUI-based API testing
- **curl**: Command-line testing
- **Insomnia**: REST client
- **Jest**: Automated testing

### Example Test

```javascript
// Jest test example
describe('Events API', () => {
  test('should return events', async () => {
    const response = await fetch('/api/events?city=New York');
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.data).toBeInstanceOf(Array);
    expect(data.meta.total).toBeGreaterThan(0);
  });
});
```

---

*This API documentation is maintained by the Documentation Architect agent and updated with each API change.*