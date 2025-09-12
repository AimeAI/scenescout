import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/supabase'

export type Plan = Tables<'plans'>
export type PlanEvent = Tables<'plan_events'>

interface CreatePlanData {
  title: string
  description: string
  cityId: string
  coverImageUrl?: string
  isPublic?: boolean
  tags?: string[]
  notes?: string
}

interface UpdatePlanData extends Partial<CreatePlanData> {
  status?: 'draft' | 'active' | 'completed'
}

export const plansService = {
  // Get user's plans
  async getUserPlans(userId?: string) {
    const { data: { user } } = await supabase.auth.getUser()
    const targetUserId = userId || user?.id
    
    if (!targetUserId) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('plans')
      .select(`
        *,
        city:cities(name, slug),
        plan_events(
          id,
          order_index,
          event:events(
            id,
            title,
            date,
            time,
            image_url,
            venue:venues(name)
          )
        )
      `)
      .eq('created_by', targetUserId)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data
  },

  // Get plan details
  async getPlan(planId: string) {
    const { data, error } = await supabase
      .rpc('get_plan_details', { plan_id: planId })
    
    if (error) throw error
    return data
  },

  // Create new plan
  async createPlan(planData: CreatePlanData) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('plans')
      .insert({
        title: planData.title,
        description: planData.description,
        city_id: planData.cityId,
        cover_image_url: planData.coverImageUrl,
        is_public: planData.isPublic || false,
        tags: planData.tags,
        notes: planData.notes,
        created_by: user.id,
        status: 'draft'
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Update plan
  async updatePlan(planId: string, updates: UpdatePlanData) {
    const { data, error } = await supabase
      .from('plans')
      .update({
        ...updates,
        city_id: updates.cityId,
        cover_image_url: updates.coverImageUrl,
        is_public: updates.isPublic,
        updated_at: new Date().toISOString()
      })
      .eq('id', planId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Delete plan
  async deletePlan(planId: string) {
    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', planId)

    if (error) throw error
  },

  // Add event to plan
  async addEventToPlan(planId: string, eventId: string, orderIndex?: number) {
    // Get current max order index if not provided
    if (orderIndex === undefined) {
      const { data: maxOrder } = await supabase
        .from('plan_events')
        .select('order_index')
        .eq('plan_id', planId)
        .order('order_index', { ascending: false })
        .limit(1)
        .single()
      
      orderIndex = (maxOrder?.order_index || 0) + 1
    }

    const { error } = await supabase
      .from('plan_events')
      .insert({
        plan_id: planId,
        event_id: eventId,
        order_index: orderIndex
      })

    if (error && error.code !== '23505') throw error // Ignore duplicate
  },

  // Remove event from plan
  async removeEventFromPlan(planId: string, eventId: string) {
    const { error } = await supabase
      .from('plan_events')
      .delete()
      .eq('plan_id', planId)
      .eq('event_id', eventId)

    if (error) throw error
  },

  // Reorder events in plan
  async reorderPlanEvents(planId: string, eventOrders: { eventId: string; orderIndex: number }[]) {
    const updates = eventOrders.map(({ eventId, orderIndex }) => ({
      plan_id: planId,
      event_id: eventId,
      order_index: orderIndex
    }))

    const { error } = await supabase
      .from('plan_events')
      .upsert(updates)

    if (error) throw error
  },

  // Get public plans
  async getPublicPlans(citySlug?: string, limit = 20) {
    let query = supabase
      .from('plans')
      .select(`
        *,
        city:cities(name, slug),
        creator:profiles!created_by(name, username, avatar_url),
        plan_events(
          event:events(
            id,
            title,
            image_url
          )
        )
      `)
      .eq('is_public', true)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(limit)

    if (citySlug) {
      query = query.eq('cities.slug', citySlug)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }
}