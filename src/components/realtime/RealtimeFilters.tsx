'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRealtimeFilters, useRealtimeCategoryCounts } from '@/hooks/useRealtimeFilters'
import { EventCategory, EventFilters, MapBounds } from '@/types'
import { cn } from '@/lib/utils'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Badge } from '../ui/badge'

interface RealtimeFiltersProps {
  initialFilters?: EventFilters
  bounds?: MapBounds
  onFiltersChange?: (filters: EventFilters) => void
  onEventsChange?: (events: any[]) => void
  className?: string
  compact?: boolean
}

export function RealtimeFilters({
  initialFilters,
  bounds,
  onFiltersChange,
  onEventsChange,
  className,
  compact = false
}: RealtimeFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(!compact)
  
  const {
    filters,
    searchQuery,
    filteredEvents,
    isFiltering,
    isConnected,
    activeFilterCount,
    updateFilters,
    updateSearchQuery,
    toggleCategory,
    clearFilters,
    clearSearch,
    applyPreset,
    recentUpdates
  } = useRealtimeFilters({
    initialFilters,
    bounds,
    debounceMs: 200,
    maxResults: 100
  })

  const categoryCounts = useRealtimeCategoryCounts()

  // Notify parent components of changes
  React.useEffect(() => {
    onFiltersChange?.(filters)
  }, [filters, onFiltersChange])

  React.useEffect(() => {
    onEventsChange?.(filteredEvents)
  }, [filteredEvents, onEventsChange])

  const categories: EventCategory[] = [
    'music', 'sports', 'arts', 'food', 'tech', 
    'social', 'business', 'education', 'health', 'family'
  ]

  const categoryEmojis: Record<EventCategory, string> = {
    music: '🎵',
    sports: '⚽',
    arts: '🎨',
    food: '🍽️',
    tech: '💻',
    social: '👥',
    business: '💼',
    education: '📚',
    health: '🏥',
    family: '👨‍👩‍👧‍👦',
    other: '📍'
  }

  const presets = [
    { id: 'free', label: 'Free Events', emoji: '🆓' },
    { id: 'today', label: 'Today', emoji: '📅' },
    { id: 'this-weekend', label: 'This Weekend', emoji: '🎉' },
    { id: 'featured', label: 'Featured', emoji: '⭐' },
    { id: 'video', label: 'Video Events', emoji: '📹' }
  ]

  if (compact && !isExpanded) {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        {/* Connection Status */}
        <div className="flex items-center space-x-1">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500" : "bg-red-500"
          )} />
          <span className="text-xs text-gray-400">
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => updateSearchQuery(e.target.value)}
            className="h-8 text-sm pr-8"
          />
          {isFiltering && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Filter Count Badge */}
        {activeFilterCount > 0 && (
          <Badge variant="secondary">
            {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
          </Badge>
        )}

        {/* Expand Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsExpanded(true)}
          className="h-8"
        >
          Filters
        </Button>
      </div>
    )
  }

  return (
    <motion.div
      initial={compact ? { opacity: 0, height: 0 } : undefined}
      animate={compact ? { opacity: 1, height: 'auto' } : undefined}
      exit={compact ? { opacity: 0, height: 0 } : undefined}
      className={cn("bg-gray-900 border border-white/20 rounded-lg p-4 space-y-4", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-semibold text-white">Live Filters</h3>
          <div className="flex items-center space-x-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-500" : "bg-red-500"
            )} />
            <span className="text-sm text-gray-400">
              {isConnected ? 'Live Updates' : 'Offline'}
            </span>
          </div>
          {isFiltering && (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        <div className="flex items-center space-x-2">
          {compact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="h-8"
            >
              Collapse
            </Button>
          )}
          
          {activeFilterCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="h-8"
            >
              Clear All ({activeFilterCount})
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Input
          type="text"
          placeholder="Search events in real-time..."
          value={searchQuery}
          onChange={(e) => updateSearchQuery(e.target.value)}
          className="pr-10"
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          )}
          {isFiltering && (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </div>

      {/* Quick Presets */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-300">Quick Filters</h4>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Button
              key={preset.id}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(preset.id)}
              className="h-8 text-xs"
            >
              <span className="mr-1">{preset.emoji}</span>
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-300">Categories</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {categories.map((category) => {
            const isSelected = filters.categories?.includes(category) || false
            const count = categoryCounts[category] || 0
            
            return (
              <motion.button
                key={category}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleCategory(category)}
                className={cn(
                  "flex items-center justify-between p-2 rounded-lg border transition-all duration-200",
                  isSelected 
                    ? "bg-blue-500/20 border-blue-500/50 text-blue-400" 
                    : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                )}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{categoryEmojis[category]}</span>
                  <span className="text-sm capitalize">{category}</span>
                </div>
                
                <AnimatePresence>
                  {count > 0 && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      className={cn(
                        "text-xs px-1.5 py-0.5 rounded-full",
                        isSelected ? "bg-blue-500 text-white" : "bg-gray-700 text-gray-300"
                      )}
                    >
                      {count}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Additional Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Free Only */}
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.showFreeOnly || false}
            onChange={(e) => updateFilters({ showFreeOnly: e.target.checked })}
            className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-300">Free events only</span>
        </label>

        {/* Featured Only */}
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.showFeaturedOnly || false}
            onChange={(e) => updateFilters({ showFeaturedOnly: e.target.checked })}
            className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-300">Featured events</span>
        </label>

        {/* Video Only */}
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filters.showVideoOnly || false}
            onChange={(e) => updateFilters({ showVideoOnly: e.target.checked })}
            className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-300">Video events</span>
        </label>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between pt-2 border-t border-white/10">
        <div className="text-sm text-gray-400">
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
          {bounds && ' in current area'}
        </div>
        
        {recentUpdates.length > 0 && (
          <div className="text-xs text-blue-400">
            {recentUpdates.length} live update{recentUpdates.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </motion.div>
  )
}