/**
 * Sentry Integration Examples
 *
 * This file demonstrates how to use Sentry monitoring throughout the application.
 * DO NOT import this file - it's for reference only.
 */

// ============================================================================
// Example 1: API Route with Sentry Monitoring
// ============================================================================

/*
// src/app/api/events/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withSentryApi } from '@/lib/sentry-api-wrapper';

export const GET = withSentryApi(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');

  const events = await fetch(`https://api.example.com/events?category=${category}`);
  const data = await events.json();

  return NextResponse.json(data);
}, 'events/list');
*/

// ============================================================================
// Example 2: Database Operations with Monitoring
// ============================================================================

/*
// src/lib/database/events.ts
import { withDatabaseMonitoring } from '@/lib/sentry-api-wrapper';
import { createClient } from '@/lib/supabase/server';

export async function getEvents(category?: string) {
  return withDatabaseMonitoring('fetch_events', async () => {
    const supabase = createClient();

    let query = supabase.from('events').select('*');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  });
}

export async function getUserFavorites(userId: string) {
  return withDatabaseMonitoring('fetch_user_favorites', async () => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('favorites')
      .select('*, events(*)')
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  });
}
*/

// ============================================================================
// Example 3: External API Calls with Monitoring
// ============================================================================

/*
// src/lib/ticketmaster.ts
import { withExternalApiMonitoring } from '@/lib/sentry-api-wrapper';

export async function searchTicketmasterEvents(query: string) {
  return withExternalApiMonitoring('ticketmaster', async () => {
    const response = await fetch(
      `https://app.ticketmaster.com/discovery/v2/events.json?keyword=${query}&apikey=${process.env.TICKETMASTER_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Ticketmaster API error: ${response.status}`);
    }

    return response.json();
  });
}
*/

// ============================================================================
// Example 4: Component Error Tracking
// ============================================================================

/*
// src/components/event-card.tsx
'use client';

import { useEffect } from 'react';
import { captureException, addBreadcrumb } from '@/lib/sentry';

export function EventCard({ event }) {
  useEffect(() => {
    // Add breadcrumb when component mounts
    addBreadcrumb(
      `EventCard mounted for event: ${event.id}`,
      'component',
      'info',
      { eventId: event.id, eventName: event.name }
    );
  }, [event.id]);

  const handleFavorite = async () => {
    try {
      await addToFavorites(event.id);
      addBreadcrumb('Event added to favorites', 'user-action', 'info', {
        eventId: event.id,
      });
    } catch (error) {
      captureException(error, {
        component: 'EventCard',
        action: 'add_favorite',
        page: 'events',
      });
    }
  };

  return (
    <div onClick={handleFavorite}>
      {event.name}
    </div>
  );
}
*/

// ============================================================================
// Example 5: User Context Setting
// ============================================================================

/*
// src/components/auth-provider.tsx
'use client';

import { useEffect } from 'react';
import { setUserContext } from '@/lib/sentry';
import { useUser } from '@/hooks/use-user';

export function AuthProvider({ children }) {
  const user = useUser();

  useEffect(() => {
    // Set user context when user changes
    setUserContext(user);
  }, [user]);

  return <>{children}</>;
}
*/

// ============================================================================
// Example 6: Web Vitals Tracking
// ============================================================================

/*
// src/app/layout.tsx
import { reportWebVitals } from '@/lib/web-vitals';

export { reportWebVitals };

export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
*/

// ============================================================================
// Example 7: Page Performance Tracking
// ============================================================================

/*
// src/app/events/page.tsx
'use client';

import { useEffect } from 'react';
import { trackPageLoad } from '@/lib/sentry';

export default function EventsPage() {
  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const loadTime = performance.now() - startTime;
      trackPageLoad('events', loadTime);
    };
  }, []);

  return <div>Events</div>;
}
*/

// ============================================================================
// Example 8: Custom Tags and Context
// ============================================================================

/*
// src/app/search/page.tsx
'use client';

import { useEffect } from 'react';
import { setTags, setContext } from '@/lib/sentry';

export default function SearchPage({ searchParams }) {
  useEffect(() => {
    // Set custom tags for filtering in Sentry
    setTags({
      page: 'search',
      feature: 'event-search',
    });

    // Set context data
    setContext('search', {
      query: searchParams.q,
      filters: searchParams.category,
      resultsCount: 0, // Update after fetching
    });
  }, [searchParams]);

  return <div>Search Results</div>;
}
*/

// ============================================================================
// Example 9: Error Recovery with Sentry
// ============================================================================

/*
// src/hooks/use-events.ts
import { useState, useEffect } from 'react';
import { captureException, addBreadcrumb } from '@/lib/sentry';

export function useEvents() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const response = await fetch('/api/events');

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        setEvents(data);
        setError(null);

        addBreadcrumb('Events fetched successfully', 'data', 'info', {
          count: data.length,
        });
      } catch (err) {
        setError(err);

        captureException(err, {
          component: 'useEvents',
          action: 'fetch',
          retryCount,
        });

        // Auto-retry once
        if (retryCount === 0) {
          setRetryCount(1);
        }
      }
    }

    fetchEvents();
  }, [retryCount]);

  return { events, error, retry: () => setRetryCount(c => c + 1) };
}
*/

// ============================================================================
// Example 10: Performance Monitoring for Heavy Operations
// ============================================================================

/*
// src/lib/data-processing.ts
import { startTransaction } from '@/lib/sentry';

export async function processEventData(rawEvents: any[]) {
  const transaction = startTransaction(
    'process_event_data',
    'function',
    { eventCount: String(rawEvents.length) }
  );

  try {
    // Step 1: Filter
    const filterSpan = transaction?.startChild({
      op: 'filter',
      description: 'Filter invalid events',
    });
    const validEvents = rawEvents.filter(e => e.name && e.date);
    filterSpan?.finish();

    // Step 2: Transform
    const transformSpan = transaction?.startChild({
      op: 'transform',
      description: 'Transform event data',
    });
    const transformed = validEvents.map(transformEvent);
    transformSpan?.finish();

    // Step 3: Sort
    const sortSpan = transaction?.startChild({
      op: 'sort',
      description: 'Sort events by date',
    });
    const sorted = transformed.sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    sortSpan?.finish();

    return sorted;
  } finally {
    transaction?.finish();
  }
}
*/

export {};
