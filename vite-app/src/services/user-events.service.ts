import { supabase } from '@/lib/supabase'
import type { Tables, Enums } from '@/lib/supabase'

export type UserEvent = Tables<'user_events'>
export type UserEventType = Enums<'user_event_type'>

export const userEventsService = {
  // Get user's saved events
  async getSavedEvents(userId: string) {
    const { data, error } = await supabase
      .rpc('get_user_saved_events', { user_id: userId })
    
    if (error) throw error
    return data
  },

  // Save an event
  async saveEvent(eventId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('user_events')
      .insert({
        user_id: user.id,
        event_id: eventId,
        type: 'saved'
      })

    if (error && error.code !== '23505') throw error // Ignore duplicate key error
  },

  // Remove saved event
  async unsaveEvent(eventId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('user_events')
      .delete()
      .eq('user_id', user.id)
      .eq('event_id', eventId)
      .eq('type', 'saved')

    if (error) throw error
  },

  // Check if event is saved
  async isEventSaved(eventId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data, error } = await supabase
      .from('user_events')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_id', eventId)
      .eq('type', 'saved')
      .single()

    return !error && !!data
  },

  // Mark event as attended
  async markAttended(eventId: string, rating?: number, notes?: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { error } = await supabase
      .from('user_events')
      .upsert({
        user_id: user.id,
        event_id: eventId,
        type: 'attended',
        rating,
        notes
      })

    if (error) throw error
  },

  // Get user's event history
  async getUserEventHistory(userId: string, type?: UserEventType) {
    let query = supabase
      .from('user_events')
      .select(`
        *,
        event:events(
          *,
          venue:venues(name, address),
          city:cities(name, slug)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }
}