# Critical Fixes Implementation Guide

## 🚨 Pre-Deployment Critical Fixes

### TypeScript Configuration Issues

#### Fix 1: Resolve Import Path Issues
```typescript
// tsconfig.json - Update path mapping
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"]
    }
  }
}
```

#### Fix 2: Component Type Issues
```typescript
// src/types/index.ts - Ensure all types are properly exported
export interface Event {
  id: string;
  title: string;
  description?: string;
  date_start: string;
  date_end?: string;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  price?: {
    min: number;
    max: number;
    currency: string;
  };
  image_url?: string;
  category: string;
  source: 'ticketmaster' | 'eventbrite' | 'songkick' | 'meetup';
}

// Fix React component prop types
export interface EventCardProps {
  event: Event;
  onClick?: (event: Event) => void;
  className?: string;
}
```

### Missing Dependencies Resolution

#### Install Critical Dependencies
```bash
# Install missing peer dependencies
npm install --save-dev @types/leaflet @types/react-leaflet
npm install --save @types/node-fetch

# Fix React 18 compatibility
npm install react@^18.3.1 react-dom@^18.3.1 @types/react@^18.3.3

# Install missing UI dependencies
npm install @radix-ui/react-navigation-menu @radix-ui/react-dropdown-menu
```

#### Package.json Fixes
```json
{
  "peerDependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "overrides": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
```

### Build Configuration Issues

#### Fix Vite Configuration
```typescript
// vite.config.ts - Production optimizations
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild',
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-avatar', '@radix-ui/react-button'],
          maps: ['leaflet', 'react-leaflet']
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts'
  }
})
```

## 🗄️ Database Schema Fixes

### Critical Index Creation
```sql
-- Performance indexes for production
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_location_gist 
  ON events USING gist(location);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_date_start_btree 
  ON events(date_start) WHERE date_start >= NOW();

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_category_active 
  ON events(category) WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_search_text 
  ON events USING gin(to_tsvector('english', title || ' ' || description));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_source_created 
  ON events(source, created_at);

-- User-related indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_events_user_id 
  ON user_events(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_events_event_id 
  ON user_events(event_id);

-- Venues indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_venues_location_gist 
  ON venues USING gist(location);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_venues_category 
  ON venues(category);
```

### RLS Policy Fixes
```sql
-- Fix Row Level Security policies
DROP POLICY IF EXISTS "Users can view public events" ON events;
CREATE POLICY "Users can view public events" 
  ON events FOR SELECT 
  USING (is_active = true AND (is_private = false OR is_private IS NULL));

DROP POLICY IF EXISTS "Users can manage their own user_events" ON user_events;
CREATE POLICY "Users can manage their own user_events" 
  ON user_events 
  USING (auth.uid() = user_id);

-- Fix profiles access
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" 
  ON profiles FOR ALL 
  USING (auth.uid() = id);
```

### Function & RPC Fixes
```sql
-- Fix search_events function
CREATE OR REPLACE FUNCTION search_events(
  search_query text DEFAULT '',
  event_category text DEFAULT 'all',
  location_lat float DEFAULT NULL,
  location_lng float DEFAULT NULL,
  radius_km float DEFAULT 50,
  date_from timestamptz DEFAULT NOW(),
  date_to timestamptz DEFAULT NOW() + interval '30 days',
  limit_count int DEFAULT 50,
  offset_count int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  date_start timestamptz,
  date_end timestamptz,
  location jsonb,
  price jsonb,
  image_url text,
  category text,
  source text,
  venue_id uuid,
  is_featured boolean,
  distance_km float
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.description,
    e.date_start,
    e.date_end,
    e.location,
    e.price,
    e.image_url,
    e.category,
    e.source,
    e.venue_id,
    e.is_featured,
    CASE 
      WHEN location_lat IS NOT NULL AND location_lng IS NOT NULL 
      THEN ST_Distance(
        e.location::geometry,
        ST_Point(location_lng, location_lat)::geography
      ) / 1000
      ELSE NULL 
    END as distance_km
  FROM events e
  WHERE 
    e.is_active = true
    AND (e.is_private = false OR e.is_private IS NULL)
    AND e.date_start >= date_from
    AND e.date_start <= date_to
    AND (
      event_category = 'all' 
      OR e.category = event_category
    )
    AND (
      search_query = '' 
      OR e.title ILIKE '%' || search_query || '%'
      OR e.description ILIKE '%' || search_query || '%'
    )
    AND (
      location_lat IS NULL 
      OR location_lng IS NULL
      OR ST_DWithin(
        e.location::geography,
        ST_Point(location_lng, location_lat)::geography,
        radius_km * 1000
      )
    )
  ORDER BY 
    e.is_featured DESC,
    e.date_start ASC,
    distance_km ASC NULLS LAST
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;
```

## 🔧 API Integration Fixes

### Supabase Client Configuration
```typescript
// src/lib/supabase.ts - Fix configuration
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-application-name': 'scenescout-v14'
    }
  }
})

// Server-side client with service role
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabaseAdmin = createClient<Database>(
  supabaseUrl, 
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

### Event API Service Fixes
```typescript
// src/services/events.service.ts - Fix API calls
import { supabase } from '@/lib/supabase'
import type { Event } from '@/types'

export class EventsService {
  static async getEvents(params: {
    category?: string;
    location?: { lat: number; lng: number };
    radius?: number;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    try {
      const { data, error } = await supabase.rpc('search_events', {
        search_query: params.search || '',
        event_category: params.category || 'all',
        location_lat: params.location?.lat || null,
        location_lng: params.location?.lng || null,
        radius_km: params.radius || 50,
        limit_count: params.limit || 50,
        offset_count: params.offset || 0
      })

      if (error) {
        console.error('Error fetching events:', error)
        throw error
      }

      return data as Event[]
    } catch (error) {
      console.error('EventsService.getEvents error:', error)
      throw error
    }
  }

  static async getEventById(id: string) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data as Event
    } catch (error) {
      console.error('EventsService.getEventById error:', error)
      throw error
    }
  }
}
```

## 🎨 UI Component Fixes

### Fix Leaflet Map Integration
```typescript
// src/components/map/EventMap.tsx - Fix map rendering
import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import type { Event } from '@/types'

// Fix marker icon issues
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
})

interface EventMapProps {
  events: Event[]
  center: [number, number]
  zoom?: number
  onEventClick?: (event: Event) => void
}

export function EventMap({ 
  events, 
  center, 
  zoom = 13, 
  onEventClick 
}: EventMapProps) {
  const mapRef = useRef<L.Map>(null)

  useEffect(() => {
    // Fix map resize issues
    const timer = setTimeout(() => {
      mapRef.current?.invalidateSize()
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  return (
    <MapContainer
      ref={mapRef}
      center={center}
      zoom={zoom}
      className="h-full w-full"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MarkerClusterGroup chunkedLoading>
        {events.map((event) => {
          if (!event.location?.lat || !event.location?.lng) return null
          
          return (
            <Marker
              key={event.id}
              position={[event.location.lat, event.location.lng]}
              eventHandlers={{
                click: () => onEventClick?.(event)
              }}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-semibold">{event.title}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(event.date_start).toLocaleDateString()}
                  </p>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MarkerClusterGroup>
    </MapContainer>
  )
}
```

### Fix React Query Integration
```typescript
// src/hooks/useEvents.ts - Fix data fetching
import { useQuery } from '@tanstack/react-query'
import { EventsService } from '@/services/events.service'
import type { Event } from '@/types'

interface UseEventsParams {
  category?: string;
  location?: { lat: number; lng: number };
  radius?: number;
  search?: string;
  enabled?: boolean;
}

export function useEvents(params: UseEventsParams = {}) {
  return useQuery({
    queryKey: ['events', params],
    queryFn: () => EventsService.getEvents(params),
    enabled: params.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false
  })
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ['event', id],
    queryFn: () => EventsService.getEventById(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2
  })
}
```

## 🔍 Authentication Fixes

### Fix OAuth Configuration
```typescript
// src/lib/auth.ts - Fix authentication
import { supabase } from './supabase'

export async function signInWithProvider(provider: 'github' | 'google') {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error(`Error signing in with ${provider}:`, error)
    throw error
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  } catch (error) {
    console.error('Error signing out:', error)
    throw error
  }
}

export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}
```

## 🚀 Performance Optimizations

### Bundle Size Optimization
```typescript
// next.config.js - Production optimizations
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  generateEtags: false,
  compress: true,
  
  // Image optimization
  images: {
    domains: [
      'images.unsplash.com',
      'www.eventbrite.com',
      's1.ticketm.net'
    ],
    formats: ['image/webp', 'image/avif']
  },

  // Bundle analysis
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false
      }
    }
    return config
  },

  // Experimental features
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@radix-ui/react-icons']
  }
}

module.exports = nextConfig
```

## 🧪 Testing Fixes

### Fix Test Configuration
```typescript
// vitest.config.ts - Fix test setup
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  }
})
```

### Mock Service Setup
```typescript
// src/test/setup.ts - Test environment setup
import { beforeAll, afterEach, afterAll } from 'vitest'
import { server } from './mocks/server'

// Establish API mocking before all tests
beforeAll(() => server.listen())

// Reset any request handlers after each test
afterEach(() => server.resetHandlers())

// Clean up after all tests are done
afterAll(() => server.close())

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
```

---

**Last Updated**: September 17, 2025  
**Version**: 1.0  
**Prepared By**: Deployment Checklist Generator Agent