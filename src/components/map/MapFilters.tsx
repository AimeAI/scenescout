'use client'

import { useState } from 'react'
import { Filter, X, Calendar, DollarSign, MapPin, Video } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MapFilter, EventCategory } from '@/types'

interface MapFiltersProps {
  filters: MapFilter
  onFiltersChange: (filters: MapFilter) => void
  eventCount: number
  className?: string
}

const categories: { id: EventCategory; label: string; color: string; icon: string }[] = [
  { id: 'music', label: 'Music', color: 'bg-purple-500', icon: '🎵' },
  { id: 'sports', label: 'Sports', color: 'bg-green-500', icon: '⚽' },
  { id: 'arts', label: 'Arts', color: 'bg-orange-500', icon: '🎨' },
  { id: 'food', label: 'Food', color: 'bg-red-500', icon: '🍽️' },
  { id: 'tech', label: 'Tech', color: 'bg-blue-500', icon: '💻' },
  { id: 'social', label: 'Social', color: 'bg-yellow-500', icon: '👥' },
  { id: 'business', label: 'Business', color: 'bg-indigo-500', icon: '💼' },
  { id: 'education', label: 'Education', color: 'bg-teal-500', icon: '📚' },
]

export function MapFilters({ filters, onFiltersChange, eventCount, className }: MapFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleCategory = (category: EventCategory) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category]
    
    onFiltersChange({
      ...filters,
      categories: newCategories
    })
  }

  const clearAllFilters = () => {
    onFiltersChange({
      categories: [],
      dateRange: { start: new Date(), end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      priceRange: { min: 0, max: 1000 },
      isFree: false,
      showVideoOnly: false,
    })
  }

  const hasActiveFilters = 
    filters.categories.length > 0 || 
    filters.isFree || 
    filters.showVideoOnly

  return (
    <div className={cn("bg-black/80 backdrop-blur-sm text-white rounded-lg border border-white/20", className)}>
      {/* Filter Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center space-x-2">
          <Filter size={16} />
          <span className="font-medium">Filters</span>
          <span className="text-sm text-white/60">({eventCount} events)</span>
        </div>
        
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-white/60 hover:text-white transition-colors"
            >
              Clear all
            </button>
          )}
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white/60 hover:text-white transition-colors"
          >
            {isExpanded ? <X size={16} /> : <Filter size={16} />}
          </button>
        </div>
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Categories */}
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center space-x-2">
              <MapPin size={14} />
              <span>Categories</span>
            </h3>
            
            <div className="grid grid-cols-2 gap-2">
              {categories.map((category) => {
                const isSelected = filters.categories.includes(category.id)
                
                return (
                  <button
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    className={cn(
                      "flex items-center space-x-2 p-2 rounded-lg text-sm transition-all duration-200",
                      isSelected
                        ? "bg-white/20 text-white border border-white/30"
                        : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-transparent"
                    )}
                  >
                    <span className="text-xs">{category.icon}</span>
                    <span>{category.label}</span>
                    {isSelected && (
                      <div className={cn("w-2 h-2 rounded-full ml-auto", category.color)} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center space-x-2">
              <Calendar size={14} />
              <span>Date Range</span>
            </h3>
            
            <div className="flex space-x-2">
              <input
                type="date"
                value={filters.dateRange.start.toISOString().split('T')[0]}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  dateRange: {
                    ...filters.dateRange,
                    start: new Date(e.target.value)
                  }
                })}
                className="bg-white/10 border border-white/20 rounded px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              
              <input
                type="date"
                value={filters.dateRange.end.toISOString().split('T')[0]}
                onChange={(e) => onFiltersChange({
                  ...filters,
                  dateRange: {
                    ...filters.dateRange,
                    end: new Date(e.target.value)
                  }
                })}
                className="bg-white/10 border border-white/20 rounded px-3 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Price Range */}
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center space-x-2">
              <DollarSign size={14} />
              <span>Price Range</span>
            </h3>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="0"
                  max="1000"
                  value={filters.priceRange.max}
                  onChange={(e) => onFiltersChange({
                    ...filters,
                    priceRange: {
                      ...filters.priceRange,
                      max: parseInt(e.target.value)
                    }
                  })}
                  className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-white/70 min-w-[60px]">
                  ${filters.priceRange.max}
                </span>
              </div>
              
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.isFree}
                  onChange={(e) => onFiltersChange({
                    ...filters,
                    isFree: e.target.checked
                  })}
                  className="w-4 h-4 rounded border border-white/20 bg-white/10 checked:bg-purple-500 focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-sm">Free events only</span>
              </label>
            </div>
          </div>

          {/* Special Filters */}
          <div>
            <h3 className="text-sm font-medium mb-2">Special Filters</h3>
            
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showVideoOnly}
                  onChange={(e) => onFiltersChange({
                    ...filters,
                    showVideoOnly: e.target.checked
                  })}
                  className="w-4 h-4 rounded border border-white/20 bg-white/10 checked:bg-purple-500 focus:ring-2 focus:ring-purple-500"
                />
                <Video size={14} />
                <span className="text-sm">Events with video previews</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Summary (when collapsed) */}
      {!isExpanded && hasActiveFilters && (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-1">
            {filters.categories.map(categoryId => {
              const category = categories.find(c => c.id === categoryId)
              return category ? (
                <span
                  key={categoryId}
                  className="inline-flex items-center space-x-1 bg-white/20 text-xs px-2 py-1 rounded-full"
                >
                  <span>{category.icon}</span>
                  <span>{category.label}</span>
                  <button
                    onClick={() => toggleCategory(categoryId)}
                    className="ml-1 hover:text-red-400"
                  >
                    <X size={10} />
                  </button>
                </span>
              ) : null
            })}
            
            {filters.isFree && (
              <span className="inline-flex items-center bg-green-500/20 text-xs px-2 py-1 rounded-full">
                Free only
                <button
                  onClick={() => onFiltersChange({ ...filters, isFree: false })}
                  className="ml-1 hover:text-red-400"
                >
                  <X size={10} />
                </button>
              </span>
            )}
            
            {filters.showVideoOnly && (
              <span className="inline-flex items-center bg-purple-500/20 text-xs px-2 py-1 rounded-full">
                <Video size={10} />
                Video only
                <button
                  onClick={() => onFiltersChange({ ...filters, showVideoOnly: false })}
                  className="ml-1 hover:text-red-400"
                >
                  <X size={10} />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}