import React, { useState, useEffect } from 'react';
import { Filter, X, DollarSign, Calendar, MapPin } from 'lucide-react';
import { Button } from '../ui/button';
import type { EventCategory, EventFilters as EventFiltersType } from '@/services/events.service';

interface EventFiltersProps {
  filters: EventFiltersType;
  onFiltersChange: (filters: EventFiltersType) => void;
  onClear: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

const CATEGORIES: { value: EventCategory; label: string; icon: string }[] = [
  { value: 'music', label: 'Music & Nightlife', icon: '🎵' },
  { value: 'food', label: 'Food & Dining', icon: '🍽️' },
  { value: 'sports', label: 'Sports & Fitness', icon: '⚽' },
  { value: 'arts', label: 'Arts & Culture', icon: '🎨' },
  { value: 'tech', label: 'Tech & Innovation', icon: '💻' },
  { value: 'business', label: 'Business & Professional', icon: '💼' },
  { value: 'social', label: 'Social & Community', icon: '👥' }
];

const PRICE_RANGES = [
  { value: 'free', label: 'Free', min: 0, max: 0 },
  { value: 'budget', label: '$1 - $25', min: 1, max: 25 },
  { value: 'moderate', label: '$26 - $75', min: 26, max: 75 },
  { value: 'premium', label: '$76 - $150', min: 76, max: 150 },
  { value: 'luxury', label: '$150+', min: 150, max: 9999 }
];

export function EventFilters({ 
  filters, 
  onFiltersChange, 
  onClear, 
  isOpen, 
  onToggle 
}: EventFiltersProps) {
  const [localFilters, setLocalFilters] = useState<EventFiltersType>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleCategoryToggle = (category: EventCategory) => {
    const currentCategories = localFilters.categories || [];
    const newCategories = currentCategories.includes(category)
      ? currentCategories.filter(c => c !== category)
      : [...currentCategories, category];
    
    const newFilters = { ...localFilters, categories: newCategories };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handlePriceRangeSelect = (range: typeof PRICE_RANGES[0]) => {
    const newFilters = {
      ...localFilters,
      priceMin: range.min,
      priceMax: range.max === 0 ? undefined : range.max,
      isFree: range.value === 'free'
    };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleDateFilter = (period: string) => {
    const today = new Date();
    let dateFrom: string | undefined;
    let dateTo: string | undefined;

    switch (period) {
      case 'today':
        dateFrom = today.toISOString().split('T')[0];
        dateTo = dateFrom;
        break;
      case 'tomorrow':
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateFrom = tomorrow.toISOString().split('T')[0];
        dateTo = dateFrom;
        break;
      case 'week':
        dateFrom = today.toISOString().split('T')[0];
        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        dateTo = nextWeek.toISOString().split('T')[0];
        break;
      case 'month':
        dateFrom = today.toISOString().split('T')[0];
        const nextMonth = new Date(today);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        dateTo = nextMonth.toISOString().split('T')[0];
        break;
      default:
        dateFrom = undefined;
        dateTo = undefined;
    }

    const newFilters = { ...localFilters, dateFrom, dateTo };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.categories?.length) count += filters.categories.length;
    if (filters.isFree !== undefined) count += 1;
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) count += 1;
    if (filters.dateFrom || filters.dateTo) count += 1;
    return count;
  };

  const activeCount = getActiveFiltersCount();

  if (!isOpen) {
    return (
      <Button
        onClick={onToggle}
        variant="outline"
        className="relative bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
      >
        <Filter className="h-4 w-4 mr-2" />
        Filters
        {activeCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </Button>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Filters</h3>
          {activeCount > 0 && (
            <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
              {activeCount} active
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={onClear}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            Clear All
          </Button>
          <Button
            onClick={onToggle}
            variant="ghost"
            size="sm"
            className="text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Categories */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <span>🏷️</span>
          Categories
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {CATEGORIES.map((category) => {
            const isSelected = localFilters.categories?.includes(category.value);
            return (
              <button
                key={category.value}
                onClick={() => handleCategoryToggle(category.value)}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                  isSelected
                    ? 'bg-purple-600 border-purple-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <span className="text-lg">{category.icon}</span>
                <span className="text-sm font-medium">{category.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Price Range
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {PRICE_RANGES.map((range) => {
            const isSelected = filters.isFree && range.value === 'free' ||
              (!filters.isFree && filters.priceMin === range.min && 
               (filters.priceMax === range.max || (range.max === 9999 && !filters.priceMax)));
            
            return (
              <button
                key={range.value}
                onClick={() => handlePriceRangeSelect(range)}
                className={`p-3 rounded-lg border transition-colors text-sm font-medium ${
                  isSelected
                    ? 'bg-green-600 border-green-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {range.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Range */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          When
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { value: 'today', label: 'Today' },
            { value: 'tomorrow', label: 'Tomorrow' },
            { value: 'week', label: 'This Week' },
            { value: 'month', label: 'This Month' },
          ].map((period) => {
            const isSelected = 
              (period.value === 'today' && filters.dateFrom === new Date().toISOString().split('T')[0]) ||
              (period.value === 'week' && filters.dateFrom && filters.dateTo) ||
              (period.value === 'month' && filters.dateFrom && filters.dateTo);

            return (
              <button
                key={period.value}
                onClick={() => handleDateFilter(period.value)}
                className={`p-3 rounded-lg border transition-colors text-sm font-medium ${
                  isSelected
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {period.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Date Range */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3">Custom Date Range</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">From</label>
            <input
              type="date"
              value={localFilters.dateFrom || ''}
              onChange={(e) => {
                const newFilters = { ...localFilters, dateFrom: e.target.value || undefined };
                setLocalFilters(newFilters);
                onFiltersChange(newFilters);
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">To</label>
            <input
              type="date"
              value={localFilters.dateTo || ''}
              onChange={(e) => {
                const newFilters = { ...localFilters, dateTo: e.target.value || undefined };
                setLocalFilters(newFilters);
                onFiltersChange(newFilters);
              }}
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}