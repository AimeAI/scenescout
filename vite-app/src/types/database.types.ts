export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string
          title: string
          description: string
          venue_id: string
          city_id: string
          category: string
          date: string
          time: string | null
          end_time: string | null
          price_min: number | null
          price_max: number | null
          currency: string
          image_url: string | null
          video_url: string | null
          website_url: string | null
          ticket_url: string | null
          tags: string[] | null
          is_featured: boolean
          is_free: boolean
          is_approved: boolean
          status: 'active' | 'cancelled' | 'postponed'
          view_count: number
          created_at: string
          updated_at: string
          submitted_by: string
        }
        Insert: Omit<Database['public']['Tables']['events']['Row'], 'id' | 'created_at' | 'updated_at' | 'view_count'>
        Update: Partial<Database['public']['Tables']['events']['Insert']>
      }
      venues: {
        Row: {
          id: string
          name: string
          description: string | null
          type: string
          address: string
          city_id: string
          neighborhood: string | null
          latitude: number | null
          longitude: number | null
          phone: string | null
          email: string | null
          website_url: string | null
          capacity: string | null
          amenities: string[] | null
          operating_hours: Json | null
          social_links: Json | null
          images: string[] | null
          is_verified: boolean
          rating: number | null
          created_at: string
          updated_at: string
          submitted_by: string
        }
        Insert: Omit<Database['public']['Tables']['venues']['Row'], 'id' | 'created_at' | 'updated_at' | 'rating'>
        Update: Partial<Database['public']['Tables']['venues']['Insert']>
      }
      cities: {
        Row: {
          id: string
          name: string
          slug: string
          country: string
          description: string | null
          image_url: string | null
          timezone: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['cities']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['cities']['Insert']>
      }
      profiles: {
        Row: {
          id: string
          email: string
          name: string
          username: string | null
          avatar_url: string | null
          bio: string | null
          location: string | null
          subscription_tier: 'free' | 'pro' | 'premium'
          subscription_status: 'active' | 'cancelled' | 'past_due'
          preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      plans: {
        Row: {
          id: string
          title: string
          description: string
          city_id: string
          cover_image_url: string | null
          is_public: boolean
          is_template: boolean
          status: 'draft' | 'active' | 'completed'
          tags: string[] | null
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['plans']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['plans']['Insert']>
      }
      plan_events: {
        Row: {
          id: string
          plan_id: string
          event_id: string
          order_index: number
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['plan_events']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['plan_events']['Insert']>
      }
      user_events: {
        Row: {
          id: string
          user_id: string
          event_id: string
          type: 'saved' | 'attended' | 'interested'
          rating: number | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['user_events']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['user_events']['Insert']>
      }
      submissions: {
        Row: {
          id: string
          type: 'event' | 'venue'
          data: Json
          status: 'pending' | 'approved' | 'rejected'
          reviewer_notes: string | null
          submitted_by: string
          reviewed_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['submissions']['Row'], 'id' | 'created_at' | 'updated_at' | 'reviewed_by'>
        Update: Partial<Database['public']['Tables']['submissions']['Insert']>
      }
    }
    Views: {
      event_details: {
        Row: {
          id: string
          title: string
          description: string
          category: string
          date: string
          time: string | null
          venue_name: string
          venue_address: string
          venue_latitude: number | null
          venue_longitude: number | null
          city_name: string
          city_slug: string
          price_min: number | null
          price_max: number | null
          image_url: string | null
          is_featured: boolean
          is_free: boolean
        }
      }
    }
    Functions: {
      get_events_by_city: {
        Args: { city_slug: string; limit_count?: number }
        Returns: Database['public']['Views']['event_details']['Row'][]
      }
      get_featured_events: {
        Args: { limit_count?: number }
        Returns: Database['public']['Views']['event_details']['Row'][]
      }
      get_nearby_events: {
        Args: { lat: number; lng: number; radius_km?: number }
        Returns: Database['public']['Views']['event_details']['Row'][]
      }
      increment_event_views: {
        Args: { event_id: string }
        Returns: void
      }
      search_events: {
        Args: { search_query: string }
        Returns: Database['public']['Views']['event_details']['Row'][]
      }
      get_user_saved_events: {
        Args: { user_id: string }
        Returns: Database['public']['Views']['event_details']['Row'][]
      }
      get_plan_details: {
        Args: { plan_id: string }
        Returns: {
          plan: Database['public']['Tables']['plans']['Row']
          events: Database['public']['Views']['event_details']['Row'][]
        }
      }
    }
    Enums: {
      event_category: 'music' | 'sports' | 'arts' | 'food' | 'tech' | 'social' | 'business' | 'education' | 'family' | 'other'
      event_status: 'active' | 'cancelled' | 'postponed'
      submission_status: 'pending' | 'approved' | 'rejected'
      subscription_tier: 'free' | 'pro' | 'premium'
      user_event_type: 'saved' | 'attended' | 'interested'
    }
  }
}