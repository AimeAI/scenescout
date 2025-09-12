import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Check if Supabase is properly configured
function isSupabaseConfigured(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  return !!(
    supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('TODO') &&
    !supabaseAnonKey.includes('TODO') &&
    supabaseUrl.startsWith('http')
  )
}

// Safe Supabase client creation
let supabase: any = null

if (isSupabaseConfigured()) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  supabase = createClient(supabaseUrl, supabaseAnonKey)
} else {
  console.warn('Supabase is not properly configured. Using mock data fallback.')
}

export { supabase }

// Safe client component client creation
export function createSafeSupabaseClient() {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase is not properly configured. Using mock data fallback.')
    return null
  }

  try {
    return createClientComponentClient()
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    return null
  }
}

export function getSupabaseStatus() {
  return {
    configured: isSupabaseConfigured(),
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  }
}

// Database types
export interface Event {
  id: string
  title: string
  description: string
  venue_id: string
  venue_name?: string
  city_id: string
  city_name?: string
  category: string
  date: string
  time?: string
  end_time?: string
  price?: number
  currency?: string
  image_url?: string
  website_url?: string
  ticket_url?: string
  tags?: string[]
  is_featured: boolean
  is_approved: boolean
  created_at: string
  updated_at: string
  submitted_by: string
}

export interface Venue {
  id: string
  name: string
  description?: string
  type: string
  address: string
  city_id: string
  city_name?: string
  neighborhood?: string
  latitude?: number
  longitude?: number
  phone?: string
  email?: string
  website_url?: string
  capacity?: string
  amenities?: string[]
  operating_hours?: Record<string, { open: string; close: string; closed: boolean }>
  social_links?: Record<string, string>
  images?: string[]
  is_verified: boolean
  created_at: string
  updated_at: string
  submitted_by: string
}

export interface City {
  id: string
  name: string
  slug: string
  country: string
  description?: string
  image_url?: string
  timezone: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserProfile {
  id: string
  email: string
  name: string
  username?: string
  avatar_url?: string
  bio?: string
  location?: string
  subscription_tier: 'free' | 'pro' | 'premium'
  subscription_status: 'active' | 'cancelled' | 'past_due'
  preferences: {
    email_notifications: boolean
    push_notifications: boolean
    public_profile: boolean
    show_activity: boolean
  }
  created_at: string
  updated_at: string
}

export interface Plan {
  id: string
  title: string
  description: string
  city_id: string
  city_name?: string
  cover_image_url?: string
  is_public: boolean
  is_template: boolean
  status: 'draft' | 'active' | 'completed'
  events: string[] // Event IDs
  collaborators: string[] // User IDs
  tags?: string[]
  notes?: string
  created_by: string
  created_at: string
  updated_at: string
}

// Helper functions for common queries
export const eventQueries = {
  // Get events with filters
  getEvents: async (filters: {
    city?: string
    category?: string
    date_from?: string
    date_to?: string
    is_free?: boolean
    limit?: number
    offset?: number
  } = {}) => {
    let query = supabase
      .from('events')
      .select(`
        *,
        venues (
          name,
          address,
          city:cities(name, slug)
        )
      `)
      .eq('is_approved', true)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (filters.city) {
      query = query.eq('cities.slug', filters.city)
    }
    
    if (filters.category) {
      query = query.eq('category', filters.category)
    }
    
    if (filters.date_from) {
      query = query.gte('date', filters.date_from)
    }
    
    if (filters.date_to) {
      query = query.lte('date', filters.date_to)
    }
    
    if (filters.is_free) {
      query = query.eq('price', 0)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
    }

    return query
  },

  // Get single event by ID
  getEventById: async (id: string) => {
    return supabase
      .from('events')
      .select(`
        *,
        venues (*),
        cities (*)
      `)
      .eq('id', id)
      .single()
  },

  // Get featured events
  getFeaturedEvents: async (limit = 6) => {
    return supabase
      .from('events')
      .select(`
        *,
        venues (name, address),
        cities (name, slug)
      `)
      .eq('is_featured', true)
      .eq('is_approved', true)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(limit)
  }
}

export const venueQueries = {
  // Get venues by city
  getVenuesByCity: async (citySlug: string) => {
    return supabase
      .from('venues')
      .select(`
        *,
        cities!inner (name, slug)
      `)
      .eq('cities.slug', citySlug)
      .eq('is_verified', true)
      .order('name')
  },

  // Get single venue
  getVenueById: async (id: string) => {
    return supabase
      .from('venues')
      .select(`
        *,
        cities (*),
        events!venue_id (
          id, title, date, time, price, image_url
        )
      `)
      .eq('id', id)
      .single()
  }
}

export const cityQueries = {
  // Get all active cities
  getCities: async () => {
    return supabase
      .from('cities')
      .select('*')
      .eq('is_active', true)
      .order('name')
  },

  // Get city by slug with stats
  getCityBySlug: async (slug: string) => {
    return supabase
      .from('cities')
      .select(`
        *,
        events!city_id (count),
        venues!city_id (count)
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .single()
  }
}

export const planQueries = {
  // Get user's plans
  getUserPlans: async (userId: string) => {
    return supabase
      .from('plans')
      .select(`
        *,
        cities (name, slug),
        events:event_plans (
          events (id, title, date, venue_name, image_url)
        )
      `)
      .or(`created_by.eq.${userId},collaborators.cs.{${userId}}`)
      .order('updated_at', { ascending: false })
  },

  // Get single plan
  getPlanById: async (id: string) => {
    return supabase
      .from('plans')
      .select(`
        *,
        cities (*),
        events:event_plans (
          events (*)
        ),
        created_by_user:profiles!created_by (name, username, avatar_url)
      `)
      .eq('id', id)
      .single()
  }
}

// Authentication helpers
export const auth = {
  // Get current user
  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  // Get current user profile
  getCurrentUserProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return data
  },

  // Sign in with email
  signIn: async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password })
  },

  // Sign up with email
  signUp: async (email: string, password: string, metadata?: Record<string, any>) => {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
  },

  // Sign out
  signOut: async () => {
    return supabase.auth.signOut()
  }
}