export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      cities: {
        Row: {
          id: string
          slug: string
          name: string
          state: string | null
          country: string
          latitude: number
          longitude: number
          timezone: string | null
          population: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          state?: string | null
          country?: string
          latitude: number
          longitude: number
          timezone?: string | null
          population?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          state?: string | null
          country?: string
          latitude?: number
          longitude?: number
          timezone?: string | null
          population?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          title: string
          description: string | null
          date: string
          time: string | null
          end_date: string | null
          end_time: string | null
          timezone: string | null
          venue_id: string | null
          venue_name: string | null
          address: string | null
          city_id: string | null
          category: Database["public"]["Enums"]["event_category"]
          subcategory: string | null
          tags: string[] | null
          is_free: boolean
          price_min: number | null
          price_max: number | null
          currency: string
          capacity: number | null
          attendance_estimate: number | null
          image_url: string | null
          video_url: string | null
          external_url: string | null
          external_id: string | null
          source: string | null
          latitude: number | null
          longitude: number | null
          is_featured: boolean
          popularity_score: number | null
          hotness_score: number | null
          rating: number | null
          reviews_count: number | null
          view_count: number
          provider: string | null
          url: string | null
          starts_at: string | null
          ends_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          date: string
          time?: string | null
          end_date?: string | null
          end_time?: string | null
          timezone?: string | null
          venue_id?: string | null
          venue_name?: string | null
          address?: string | null
          city_id?: string | null
          category?: Database["public"]["Enums"]["event_category"]
          subcategory?: string | null
          tags?: string[] | null
          is_free?: boolean
          price_min?: number | null
          price_max?: number | null
          currency?: string
          capacity?: number | null
          attendance_estimate?: number | null
          image_url?: string | null
          video_url?: string | null
          external_url?: string | null
          external_id?: string | null
          source?: string | null
          latitude?: number | null
          longitude?: number | null
          is_featured?: boolean
          popularity_score?: number | null
          hotness_score?: number | null
          rating?: number | null
          reviews_count?: number | null
          view_count?: number
          provider?: string | null
          url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          date?: string
          time?: string | null
          end_date?: string | null
          end_time?: string | null
          timezone?: string | null
          venue_id?: string | null
          venue_name?: string | null
          address?: string | null
          city_id?: string | null
          category?: Database["public"]["Enums"]["event_category"]
          subcategory?: string | null
          tags?: string[] | null
          is_free?: boolean
          price_min?: number | null
          price_max?: number | null
          currency?: string
          capacity?: number | null
          attendance_estimate?: number | null
          image_url?: string | null
          video_url?: string | null
          external_url?: string | null
          external_id?: string | null
          source?: string | null
          latitude?: number | null
          longitude?: number | null
          is_featured?: boolean
          popularity_score?: number | null
          hotness_score?: number | null
          rating?: number | null
          reviews_count?: number | null
          view_count?: number
          provider?: string | null
          url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          }
        ]
      }
      plan_events: {
        Row: {
          plan_id: string
          event_id: string
          position: number | null
          order_index: number | null
          created_at: string
        }
        Insert: {
          plan_id: string
          event_id: string
          position?: number | null
          order_index?: number | null
          created_at?: string
        }
        Update: {
          plan_id?: string
          event_id?: string
          position?: number | null
          order_index?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_events_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          }
        ]
      }
      plans: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          date: string | null
          status: Database["public"]["Enums"]["plan_status"]
          is_public: boolean
          city_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          date?: string | null
          status?: Database["public"]["Enums"]["plan_status"]
          is_public?: boolean
          city_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          date?: string | null
          status?: Database["public"]["Enums"]["plan_status"]
          is_public?: boolean
          city_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          id: string
          user_id: string
          email: string | null
          display_name: string | null
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          location: string | null
          website: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          subscription_status: Database["public"]["Enums"]["subscription_status"] | null
          subscription_expires_at: string | null
          preferences: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email?: string | null
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          location?: string | null
          website?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          subscription_status?: Database["public"]["Enums"]["subscription_status"] | null
          subscription_expires_at?: string | null
          preferences?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email?: string | null
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          location?: string | null
          website?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          subscription_status?: Database["public"]["Enums"]["subscription_status"] | null
          subscription_expires_at?: string | null
          preferences?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      signals: {
        Row: {
          id: number
          user_id: string | null
          event_id: string | null
          kind: string
          weight: number
          created_at: string
        }
        Insert: {
          id?: number
          user_id?: string | null
          event_id?: string | null
          kind: string
          weight?: number
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string | null
          event_id?: string | null
          kind?: string
          weight?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "signals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          }
        ]
      }
      user_event_saves: {
        Row: {
          user_id: string
          event_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          event_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          event_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_event_saves_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          }
        ]
      }
      user_events: {
        Row: {
          id: string
          user_id: string
          event_id: string
          created_at: string
          type: Database["public"]["Enums"]["user_event_type"]
          rating: number | null
          notes: string | null
        }
        Insert: {
          id?: string
          user_id: string
          event_id: string
          created_at?: string
          type?: Database["public"]["Enums"]["user_event_type"]
          rating?: number | null
          notes?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          event_id?: string
          created_at?: string
          type?: Database["public"]["Enums"]["user_event_type"]
          rating?: number | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          }
        ]
      }
      venues: {
        Row: {
          id: string
          name: string
          description: string | null
          address: string | null
          city_id: string | null
          latitude: number | null
          longitude: number | null
          capacity: number | null
          venue_type: string | null
          phone: string | null
          website: string | null
          amenities: string[] | null
          images: string[] | null
          operating_hours: Json | null
          is_verified: boolean
          is_active: boolean
          external_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          address?: string | null
          city_id?: string | null
          latitude?: number | null
          longitude?: number | null
          capacity?: number | null
          venue_type?: string | null
          phone?: string | null
          website?: string | null
          amenities?: string[] | null
          images?: string[] | null
          operating_hours?: Json | null
          is_verified?: boolean
          is_active?: boolean
          external_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          address?: string | null
          city_id?: string | null
          latitude?: number | null
          longitude?: number | null
          capacity?: number | null
          venue_type?: string | null
          phone?: string | null
          website?: string | null
          amenities?: string[] | null
          images?: string[] | null
          operating_hours?: Json | null
          is_verified?: boolean
          is_active?: boolean
          external_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "venues_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_events_by_category: {
        Args: {
          category_filter?: string
          city_filter?: string
          limit_per_category?: number
        }
        Returns: {
          id: string
          title: string
          description: string
          date: string
          time: string
          venue_name: string
          address: string
          category: string
          image_url: string
          is_free: boolean
          price_min: number
          price_max: number
          starts_at: string
        }[]
      }
      get_events_by_city: {
        Args: {
          city_slug: string
          limit_count?: number
        }
        Returns: {
          id: string
          title: string
          description: string
          date: string
          time: string
          venue_name: string
          address: string
          category: string
          image_url: string
          is_free: boolean
          price_min: number
          price_max: number
          starts_at: string
        }[]
      }
      get_featured_events: {
        Args: {
          limit_count?: number
        }
        Returns: {
          id: string
          title: string
          description: string
          date: string
          time: string
          venue_name: string
          address: string
          category: string
          image_url: string
          is_free: boolean
          price_min: number
          price_max: number
          starts_at: string
        }[]
      }
      get_nearby_events: {
        Args: {
          user_lat: number
          user_lng: number
          radius_miles?: number
          limit_count?: number
        }
        Returns: {
          id: string
          title: string
          description: string
          date: string
          time: string
          venue_name: string
          address: string
          category: string
          image_url: string
          is_free: boolean
          price_min: number
          price_max: number
          latitude: number
          longitude: number
          distance_miles: number
          starts_at: string
        }[]
      }
      get_user_saved_events: {
        Args: {
          p_user_id: string
        }
        Returns: {
          id: string
          title: string
          description: string
          date: string
          time: string
          venue_name: string
          address: string
          category: string
          image_url: string
          is_free: boolean
          price_min: number
          price_max: number
          starts_at: string
          saved_at: string
        }[]
      }
      record_signal: {
        Args: {
          p_user_id?: string
          p_event_id: string
          p_kind: string
          p_weight?: number
        }
        Returns: undefined
      }
      search_events: {
        Args: {
          search_query?: string
          category_filter?: string
          city_filter?: string
          date_from?: string
          date_to?: string
          is_free_filter?: boolean
          limit_count?: number
          offset_count?: number
        }
        Returns: {
          id: string
          title: string
          description: string
          date: string
          time: string
          venue_name: string
          address: string
          category: string
          image_url: string
          is_free: boolean
          price_min: number
          price_max: number
          starts_at: string
        }[]
      }
    }
    Enums: {
      event_category: "music" | "sports" | "arts" | "food" | "tech" | "social" | "business" | "education" | "family" | "other"
      plan_status: "draft" | "active" | "completed"
      subscription_status: "active" | "cancelled" | "past_due"
      subscription_tier: "free" | "pro" | "premium"
      user_event_type: "saved" | "attended" | "interested"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Type exports for easier usage
export type Event = Database['public']['Tables']['events']['Row'] & {
  venue?: Database['public']['Tables']['venues']['Row'] | null
  city?: Database['public']['Tables']['cities']['Row'] | null
}

export type EventInsert = Database['public']['Tables']['events']['Insert']
export type EventUpdate = Database['public']['Tables']['events']['Update']
export type EventCategory = Database['public']['Enums']['event_category']

export type Plan = Database['public']['Tables']['plans']['Row']
export type PlanInsert = Database['public']['Tables']['plans']['Insert']
export type PlanUpdate = Database['public']['Tables']['plans']['Update']

export type PlanEvent = Database['public']['Tables']['plan_events']['Row']
export type PlanEventInsert = Database['public']['Tables']['plan_events']['Insert']

export type UserEvent = Database['public']['Tables']['user_events']['Row']
export type UserEventInsert = Database['public']['Tables']['user_events']['Insert']
export type UserEventType = Database['public']['Enums']['user_event_type']

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type City = Database['public']['Tables']['cities']['Row']
export type Venue = Database['public']['Tables']['venues']['Row']