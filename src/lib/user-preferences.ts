/**
 * User Preferences System for Customizable Event Discovery
 * Allows users to define their own search categories and queries
 */

export interface SearchCategory {
  id: string
  name: string
  query: string
  enabled: boolean
  eventsPerCategory?: number
}

export interface UserPreferences {
  searchCategories: SearchCategory[]
  eventsPerCategory: number
  totalEventsLimit: number
}

const STORAGE_KEY = 'sceneScout_preferences'

// Default categories - user can customize these
const DEFAULT_CATEGORIES: SearchCategory[] = [
  { id: 'concerts', name: '🎵 Concerts', query: 'concerts', enabled: true, eventsPerCategory: 5 },
  { id: 'halloween', name: '🎃 Halloween', query: 'halloween', enabled: true, eventsPerCategory: 5 },
  { id: 'food', name: '🍽️ Food & Drink', query: 'food', enabled: true, eventsPerCategory: 5 },
  { id: 'tech', name: '💻 Tech Events', query: 'technology', enabled: true, eventsPerCategory: 5 },
  { id: 'art', name: '🎨 Art', query: 'art', enabled: true, eventsPerCategory: 5 },
  { id: 'music', name: '🎸 Live Music', query: 'music', enabled: true, eventsPerCategory: 5 },
  { id: 'comedy', name: '😂 Comedy', query: 'comedy', enabled: true, eventsPerCategory: 5 },
  { id: 'sports', name: '⚽ Sports', query: 'sports', enabled: true, eventsPerCategory: 5 },
  { id: 'theatre', name: '🎭 Theatre', query: 'theatre', enabled: true, eventsPerCategory: 10 },
  { id: 'dance', name: '💃 Dance', query: 'dance', enabled: true, eventsPerCategory: 10 },
  { id: 'indie', name: '🎪 Indie Shows', query: 'indie', enabled: true, eventsPerCategory: 5 },
  { id: 'jazz', name: '🎺 Jazz', query: 'jazz', enabled: true, eventsPerCategory: 5 },
  { id: 'electronic', name: '🎧 Electronic', query: 'electronic', enabled: true, eventsPerCategory: 5 },
  { id: 'festivals', name: '🎉 Festivals', query: 'festival', enabled: true, eventsPerCategory: 5 },
  { id: 'nightlife', name: '🌃 Nightlife', query: 'club', enabled: true, eventsPerCategory: 5 },
]

const DEFAULT_PREFERENCES: UserPreferences = {
  searchCategories: DEFAULT_CATEGORIES,
  eventsPerCategory: 5,
  totalEventsLimit: 40
}

/**
 * Get user preferences from localStorage
 */
export function getUserPreferences(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_PREFERENCES

    const prefs = JSON.parse(stored)

    // Merge with defaults to ensure new fields are added
    return {
      ...DEFAULT_PREFERENCES,
      ...prefs,
      searchCategories: prefs.searchCategories || DEFAULT_CATEGORIES
    }
  } catch (error) {
    console.warn('Failed to load user preferences:', error)
    return DEFAULT_PREFERENCES
  }
}

/**
 * Save user preferences to localStorage
 */
export function saveUserPreferences(preferences: UserPreferences): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))

    // Emit event so other components can react
    window.dispatchEvent(new CustomEvent('preferencesUpdated', { detail: preferences }))

    console.log('✅ Preferences saved:', preferences)
  } catch (error) {
    console.error('Failed to save preferences:', error)
  }
}

/**
 * Get enabled search categories for feed discovery
 */
export function getEnabledSearchCategories(): SearchCategory[] {
  const prefs = getUserPreferences()
  return prefs.searchCategories.filter(cat => cat.enabled)
}

/**
 * Add a new custom category
 */
export function addCustomCategory(name: string, query: string, eventsPerCategory: number = 5): void {
  const prefs = getUserPreferences()

  const newCategory: SearchCategory = {
    id: `custom_${Date.now()}`,
    name,
    query,
    enabled: true,
    eventsPerCategory
  }

  prefs.searchCategories.push(newCategory)
  saveUserPreferences(prefs)
}

/**
 * Update a category
 */
export function updateCategory(id: string, updates: Partial<SearchCategory>): void {
  const prefs = getUserPreferences()

  const index = prefs.searchCategories.findIndex(cat => cat.id === id)
  if (index !== -1) {
    prefs.searchCategories[index] = {
      ...prefs.searchCategories[index],
      ...updates
    }
    saveUserPreferences(prefs)
  }
}

/**
 * Delete a custom category
 */
export function deleteCategory(id: string): void {
  const prefs = getUserPreferences()
  prefs.searchCategories = prefs.searchCategories.filter(cat => cat.id !== id)
  saveUserPreferences(prefs)
}

/**
 * Reset to default categories
 */
export function resetToDefaults(): void {
  saveUserPreferences(DEFAULT_PREFERENCES)
}

/**
 * Toggle category enabled/disabled
 */
export function toggleCategory(id: string): void {
  const prefs = getUserPreferences()

  const category = prefs.searchCategories.find(cat => cat.id === id)
  if (category) {
    category.enabled = !category.enabled
    saveUserPreferences(prefs)
  }
}
