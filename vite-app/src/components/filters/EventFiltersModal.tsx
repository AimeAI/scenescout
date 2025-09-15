import { useState, useEffect } from 'react'
import { X, Calendar, DollarSign, MapPin, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EventCategory, EventFilters } from '@/services/events.service'

interface EventFiltersModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (filters: EventFilters) => void
  currentFilters: EventFilters
}

const CATEGORIES: { value: EventCategory; label: string; color: string }[] = [
  { value: 'music', label: 'Music', color: 'bg-purple-600' },
  { value: 'sports', label: 'Sports', color: 'bg-green-600' },
  { value: 'arts', label: 'Arts', color: 'bg-pink-600' },
  { value: 'food', label: 'Food', color: 'bg-orange-600' },
  { value: 'tech', label: 'Technology', color: 'bg-blue-600' },
  { value: 'social', label: 'Social', color: 'bg-yellow-600' },
  { value: 'business', label: 'Business', color: 'bg-indigo-600' },
  { value: 'education', label: 'Education', color: 'bg-teal-600' },
  { value: 'family', label: 'Family', color: 'bg-green-500' },
  { value: 'other', label: 'Other', color: 'bg-gray-600' }
]

const SOURCES = [
  { value: 'eventbrite', label: 'Eventbrite' },
  { value: 'ticketmaster', label: 'Ticketmaster' },
  { value: 'meetup', label: 'Meetup' },
  { value: 'google_places', label: 'Google' },
  { value: 'yelp', label: 'Yelp' }
]

export function EventFiltersModal({ isOpen, onClose, onApply, currentFilters }: EventFiltersModalProps) {
  const [filters, setFilters] = useState<EventFilters>(currentFilters)
  const [selectedCategories, setSelectedCategories] = useState<EventCategory[]>(currentFilters.categories || [])
  const [selectedSources, setSelectedSources] = useState<string[]>([])

  useEffect(() => {
    setFilters(currentFilters)
    setSelectedCategories(currentFilters.categories || [])
  }, [currentFilters])

  if (!isOpen) return null

  const handleCategoryToggle = (category: EventCategory) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const handleSourceToggle = (source: string) => {
    setSelectedSources(prev => 
      prev.includes(source) 
        ? prev.filter(s => s !== source)
        : [...prev, source]
    )
  }

  const handleApply = () => {
    onApply({
      ...filters,
      categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      // Add source filter when backend supports it
    })
    onClose()
  }

  const handleReset = () => {
    setFilters({})
    setSelectedCategories([])
    setSelectedSources([])
  }

  const activeFilterCount = 
    selectedCategories.length + 
    (filters.dateFrom ? 1 : 0) + 
    (filters.dateTo ? 1 : 0) + 
    (filters.isFree !== undefined ? 1 : 0) +
    (filters.priceMin !== undefined ? 1 : 0) +
    (filters.priceMax !== undefined ? 1 : 0)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h2 className="text-2xl font-bold text-white">Filters</h2>
            {activeFilterCount > 0 && (
              <p className="text-sm text-gray-400 mt-1">{activeFilterCount} active filters</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white/60 hover:text-white"
          >
            <X size={24} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Categories */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Tag size={20} className="mr-2" />
              Categories
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CATEGORIES.map(category => (
                <button
                  key={category.value}
                  onClick={() => handleCategoryToggle(category.value)}
                  className={`p-3 rounded-lg border transition-all ${
                    selectedCategories.includes(category.value)
                      ? `${category.color} border-transparent text-white`
                      : 'border-gray-700 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Calendar size={20} className="mr-2" />
              Date Range
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">From</label>
                <Input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">To</label>
                <Input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>
          </div>

          {/* Price Range */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <DollarSign size={20} className="mr-2" />
              Price Range
            </h3>
            <div className="space-y-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={filters.isFree === true}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    isFree: e.target.checked ? true : undefined,
                    priceMin: e.target.checked ? undefined : prev.priceMin,
                    priceMax: e.target.checked ? undefined : prev.priceMax
                  }))}
                  className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-white">Free events only</span>
              </label>
              
              {!filters.isFree && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Min Price</label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="$0"
                      value={filters.priceMin || ''}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        priceMin: e.target.value ? Number(e.target.value) : undefined 
                      }))}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Max Price</label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="$500"
                      value={filters.priceMax || ''}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        priceMax: e.target.value ? Number(e.target.value) : undefined 
                      }))}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Data Sources */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <MapPin size={20} className="mr-2" />
              Data Sources
            </h3>
            <div className="flex flex-wrap gap-2">
              {SOURCES.map(source => (
                <Badge
                  key={source.value}
                  variant={selectedSources.includes(source.value) ? 'default' : 'secondary'}
                  className={`cursor-pointer transition-all ${
                    selectedSources.includes(source.value)
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  onClick={() => handleSourceToggle(source.value)}
                >
                  {source.label}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Filter by event source (coming soon)
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-800">
          <Button
            variant="ghost"
            onClick={handleReset}
            className="text-gray-400 hover:text-white"
          >
            Reset All
          </Button>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-700 text-white hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}