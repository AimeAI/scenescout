'use client'

import { useState, useEffect } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import {
  getUserPreferences,
  saveUserPreferences,
  addCustomCategory,
  deleteCategory,
  toggleCategory,
  resetToDefaults,
  type SearchCategory,
  type UserPreferences
} from '@/lib/user-preferences'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryQuery, setNewCategoryQuery] = useState('')
  const [newCategoryLimit, setNewCategoryLimit] = useState(5)

  useEffect(() => {
    setPreferences(getUserPreferences())
  }, [])

  const handleToggleCategory = (id: string) => {
    toggleCategory(id)
    setPreferences(getUserPreferences())
    toast.success('Category updated!')
  }

  const handleAddCategory = () => {
    if (!newCategoryName.trim() || !newCategoryQuery.trim()) {
      toast.error('Please fill in all fields')
      return
    }

    console.log('➕ Adding category:', { name: newCategoryName, query: newCategoryQuery, limit: newCategoryLimit })
    addCustomCategory(newCategoryName, newCategoryQuery, newCategoryLimit)
    const updatedPrefs = getUserPreferences()
    setPreferences(updatedPrefs)
    console.log('✅ Updated preferences:', updatedPrefs)
    setShowAddCategory(false)
    setNewCategoryName('')
    setNewCategoryQuery('')
    setNewCategoryLimit(5)
    toast.success('✅ Category added! Navigate to Discover to see events.')
  }

  const handleDeleteCategory = (id: string) => {
    if (confirm('Delete this category?')) {
      deleteCategory(id)
      setPreferences(getUserPreferences())
      toast.success('Category deleted')
    }
  }

  const handleUpdateEventsPerCategory = (id: string, value: number) => {
    if (!preferences) return

    const updated = { ...preferences }
    const category = updated.searchCategories.find(cat => cat.id === id)
    if (category) {
      category.eventsPerCategory = value
      saveUserPreferences(updated)
      setPreferences(updated)
    }
  }

  const handleUpdateTotalLimit = (value: number) => {
    if (!preferences) return

    const updated = { ...preferences, totalEventsLimit: value }
    saveUserPreferences(updated)
    setPreferences(updated)
    toast.success('Total limit updated!')
  }

  const handleReset = () => {
    if (confirm('Reset all categories to defaults? This will delete your custom categories.')) {
      resetToDefaults()
      setPreferences(getUserPreferences())
      toast.success('Reset to defaults')
    }
  }

  if (!preferences) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-black text-white p-8 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500"></div>
        </div>
      </AppLayout>
    )
  }

  const enabledCount = preferences.searchCategories.filter(cat => cat.enabled).length

  return (
    <AppLayout>
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">⚙️ Discovery Settings</h1>
            <p className="text-gray-400">
              Customize what events appear on your feed. Add your own categories and search queries.
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-500">{enabledCount}</div>
              <div className="text-sm text-gray-400">Active Categories</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-500">{preferences.totalEventsLimit}</div>
              <div className="text-sm text-gray-400">Max Events</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-500">
                {preferences.searchCategories.filter(cat => cat.id.startsWith('custom_')).length}
              </div>
              <div className="text-sm text-gray-400">Custom Categories</div>
            </div>
          </div>

          {/* Global Settings */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Global Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Total Events Limit (max events shown on feed)
                </label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={preferences.totalEventsLimit}
                  onChange={(e) => handleUpdateTotalLimit(parseInt(e.target.value))}
                  className="bg-gray-700 text-white px-4 py-2 rounded w-32"
                />
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Search Categories</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddCategory(!showAddCategory)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium"
                >
                  ➕ Add Category
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-medium"
                >
                  🔄 Reset
                </button>
              </div>
            </div>

            {/* Add Category Form */}
            {showAddCategory && (
              <div className="bg-gray-700 rounded-lg p-4 mb-4">
                <h3 className="font-semibold mb-3">Add Custom Category</h3>

                {/* Help Banner */}
                <div className="bg-blue-900/30 border border-blue-500/30 rounded p-3 mb-4 text-sm">
                  <div className="font-semibold mb-1">💡 Tips for best results:</div>
                  <ul className="text-xs text-gray-300 space-y-1">
                    <li>• <strong>Keep queries simple:</strong> Use 1-2 words (e.g., "jazz", "punk rock", "comedy")</li>
                    <li>• <strong>Avoid time words:</strong> Don't use "tonight", "today", "this weekend" - they rarely match</li>
                    <li>• <strong>Test your query:</strong> Try searching it on the main page first to see if it returns events</li>
                    <li>• <strong>Use genre names:</strong> "metal", "hip hop", "salsa", "techno" work better than descriptions</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Category Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 🎸 Punk Rock or 🎺 Latin Jazz"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-purple-500 focus:outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">Tip: Start with an emoji for visual appeal!</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      Search Query <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., punk rock or latin jazz (keep it simple!)"
                      value={newCategoryQuery}
                      onChange={(e) => setNewCategoryQuery(e.target.value)}
                      className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-600 focus:border-purple-500 focus:outline-none"
                    />
                    <div className="mt-2 space-y-1">
                      <p className="text-xs font-semibold text-green-400">✅ Good examples:</p>
                      <p className="text-xs text-gray-400 pl-4">
                        "rock", "jazz", "comedy", "festival", "art", "food", "club", "electronic"
                      </p>
                      <p className="text-xs font-semibold text-red-400 mt-2">❌ Avoid:</p>
                      <p className="text-xs text-gray-400 pl-4">
                        "concerts tonight", "events this week", "best parties" (too specific/vague)
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Events Per Category</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={newCategoryLimit}
                      onChange={(e) => setNewCategoryLimit(parseInt(e.target.value))}
                      className="w-32 bg-gray-800 text-white px-3 py-2 rounded border border-gray-600"
                    />
                    <p className="text-xs text-gray-500 mt-1">How many events to show (1-20)</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddCategory}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-medium transition"
                    >
                      ✅ Add Category
                    </button>
                    <button
                      onClick={() => setShowAddCategory(false)}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-sm font-medium transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Categories List */}
            <div className="space-y-2">
              {preferences.searchCategories.map((category) => (
                <div
                  key={category.id}
                  className={`flex items-center justify-between p-4 rounded-lg transition ${
                    category.enabled ? 'bg-gray-700' : 'bg-gray-700/50 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <button
                      onClick={() => handleToggleCategory(category.id)}
                      className={`w-12 h-6 rounded-full transition ${
                        category.enabled ? 'bg-purple-600' : 'bg-gray-600'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          category.enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>

                    <div className="flex-1">
                      <div className="font-semibold">{category.name}</div>
                      <div className="text-sm text-gray-400">Query: "{category.query}"</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-400">Events:</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={category.eventsPerCategory || 5}
                        onChange={(e) => handleUpdateEventsPerCategory(category.id, parseInt(e.target.value))}
                        className="w-16 bg-gray-800 text-white px-2 py-1 rounded text-center"
                      />
                    </div>

                    {category.id.startsWith('custom_') && (
                      <button
                        onClick={() => handleDeleteCategory(category.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Help */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <h3 className="font-semibold mb-2">💡 Tips</h3>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Use specific queries like "jazz clubs tonight" for better results</li>
              <li>• Increase "Events Per Category" for categories you want to see more of</li>
              <li>• Toggle categories off temporarily without deleting them</li>
              <li>• Changes take effect immediately on your feed</li>
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
