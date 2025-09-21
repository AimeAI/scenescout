'use client'

import React, { useState } from 'react'
import { MapPin, DollarSign, Calendar, Filter, Target, Ticket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { EventCategory } from '@/types'
import { useUserLocation } from '@/hooks/useUserLocation'

export interface AdvancedFilters {
  // Location
  radius: number // in kilometers
  useUserLocation: boolean
  
  // Event Type
  categories: EventCategory[]
  oneOffEvents: boolean
  recurringEvents: boolean
  
  // Pricing
  isFree: boolean
  hasTickets: boolean
  priceRange: [number, number]
  
  // Time
  dateRange: {
    start: Date
    end: Date
  }
  
  // Features
  featuredOnly: boolean
  hasVideo: boolean
}

interface AdvancedEventFiltersProps {
  filters: AdvancedFilters
  onFiltersChange: (filters: AdvancedFilters) => void
  className?: string
  compact?: boolean
}

const CATEGORIES: EventCategory[] = [
  'music', 'sports', 'arts', 'food', 'tech', 'social', 
  'business', 'education', 'health', 'family'
]

const RADIUS_OPTIONS = [
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
  { value: 100, label: '100 km' },
  { value: 200, label: '200 km' },
]

export function AdvancedEventFilters({ 
  filters, 
  onFiltersChange, 
  className,
  compact = false 
}: AdvancedEventFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { location, loading: locationLoading, requestLocation, permission } = useUserLocation()

  const updateFilters = (updates: Partial<AdvancedFilters>) => {
    onFiltersChange({ ...filters, ...updates })
  }

  const toggleCategory = (category: EventCategory) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category]
    updateFilters({ categories: newCategories })
  }

  const clearFilters = () => {
    onFiltersChange({
      radius: 50,
      useUserLocation: true,
      categories: [],
      oneOffEvents: false,
      recurringEvents: false,
      isFree: false,
      hasTickets: false,
      priceRange: [0, 500],
      dateRange: {
        start: new Date(),
        end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      },
      featuredOnly: false,
      hasVideo: false
    })
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.categories.length > 0) count++
    if (filters.isFree || filters.hasTickets) count++
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 500) count++
    if (filters.oneOffEvents || filters.recurringEvents) count++
    if (filters.featuredOnly || filters.hasVideo) count++
    if (filters.radius !== 50) count++
    return count
  }

  if (compact) {
    return (
      <div className={cn("bg-gray-900 rounded-lg p-4 border border-white/10", className)}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filters</span>
            {getActiveFiltersCount() > 0 && (
              <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                {getActiveFiltersCount()}
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Less' : 'More'}
          </Button>
        </div>

        {!isExpanded && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Quick filters */}
            <div className="flex items-center space-x-2">
              <Switch
                checked={filters.isFree}
                onCheckedChange={(checked) => updateFilters({ isFree: checked })}
              />
              <Label className="text-sm">Free</Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                checked={filters.hasTickets}
                onCheckedChange={(checked) => updateFilters({ hasTickets: checked })}
              />
              <Label className="text-sm">Ticketed</Label>
            </div>
            
            <Select
              value={filters.radius.toString()}
              onValueChange={(value) => updateFilters({ radius: parseInt(value) })}
            >
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RADIUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="text-xs"
            >
              Clear
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("bg-gray-900 rounded-lg p-6 border border-white/10 space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Advanced Filters</h3>
          {getActiveFiltersCount() > 0 && (
            <span className="bg-purple-500 text-white text-sm px-2 py-1 rounded-full">
              {getActiveFiltersCount()} active
            </span>
          )}
        </div>
        <Button variant="outline" onClick={clearFilters}>
          Clear All
        </Button>
      </div>

      {/* Location */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4" />
          <Label className="font-medium">Location & Radius</Label>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={filters.useUserLocation}
              onCheckedChange={(checked) => updateFilters({ useUserLocation: checked })}
            />
            <Label>Use my location</Label>
          </div>
          
          {filters.useUserLocation && !location && permission !== 'denied' && (
            <Button
              variant="outline"
              size="sm"
              onClick={requestLocation}
              disabled={locationLoading}
            >
              {locationLoading ? 'Getting location...' : 'Enable Location'}
            </Button>
          )}
        </div>

        {location && (
          <div className="text-sm text-white/60">
            📍 {location.city}, {location.region}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Search radius: {filters.radius} km</Label>
          </div>
          <Slider
            value={[filters.radius]}
            onValueChange={([value]) => updateFilters({ radius: value })}
            max={200}
            min={5}
            step={5}
            className="w-full"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Target className="w-4 h-4" />
          <Label className="font-medium">Categories</Label>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {CATEGORIES.map((category) => (
            <div key={category} className="flex items-center space-x-2">
              <Checkbox
                checked={filters.categories.includes(category)}
                onCheckedChange={() => toggleCategory(category)}
              />
              <Label className="text-sm capitalize cursor-pointer">
                {category}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Event Type */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4" />
          <Label className="font-medium">Event Type</Label>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={filters.oneOffEvents}
              onCheckedChange={(checked) => updateFilters({ oneOffEvents: checked })}
            />
            <Label>One-off events</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              checked={filters.recurringEvents}
              onCheckedChange={(checked) => updateFilters({ recurringEvents: checked })}
            />
            <Label>Recurring events</Label>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <DollarSign className="w-4 h-4" />
          <Label className="font-medium">Pricing</Label>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={filters.isFree}
              onCheckedChange={(checked) => updateFilters({ isFree: checked })}
            />
            <Label>Free events only</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              checked={filters.hasTickets}
              onCheckedChange={(checked) => updateFilters({ hasTickets: checked })}
            />
            <div className="flex items-center space-x-1">
              <Ticket className="w-3 h-3" />
              <Label>Ticketed events</Label>
            </div>
          </div>
        </div>

        {!filters.isFree && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Price range: ${filters.priceRange[0]} - ${filters.priceRange[1]}</Label>
            </div>
            <Slider
              value={filters.priceRange}
              onValueChange={(value) => updateFilters({ priceRange: value as [number, number] })}
              max={500}
              min={0}
              step={10}
              className="w-full"
            />
          </div>
        )}
      </div>

      {/* Features */}
      <div className="space-y-3">
        <Label className="font-medium">Special Features</Label>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={filters.featuredOnly}
              onCheckedChange={(checked) => updateFilters({ featuredOnly: checked })}
            />
            <Label>Featured events</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              checked={filters.hasVideo}
              onCheckedChange={(checked) => updateFilters({ hasVideo: checked })}
            />
            <Label>Has video preview</Label>
          </div>
        </div>
      </div>
    </div>
  )
}