'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Music, Filter, TrendingUp, Calendar, MapPin } from 'lucide-react';
import { 
  getMusicConcertCategories, 
  getEventTypeCategories, 
  getCategoryDisplayInfo,
  isMusicCategory 
} from '@/lib/api/category-mappings';
import { useTicketmasterEventsByLocation } from '@/hooks/useTicketmaster';

interface ConcertCategoryGridProps {
  userLocation?: {
    city: string;
    stateCode: string;
  };
  onCategorySelect?: (categoryId: string) => void;
  selectedCategories?: string[];
  showEventCounts?: boolean;
}

export function ConcertCategoryGrid({
  userLocation,
  onCategorySelect,
  selectedCategories = [],
  showEventCounts = true
}: ConcertCategoryGridProps) {
  const [activeTab, setActiveTab] = useState<'genres' | 'types'>('genres');
  
  const musicGenres = getMusicConcertCategories();
  const eventTypes = getEventTypeCategories();

  // Get event counts for each category (sample data for demonstration)
  const categoryEventCounts = {
    'rock-concerts': 45,
    'pop-concerts': 38,
    'hip-hop-concerts': 29,
    'electronic-concerts': 52,
    'country-concerts': 22,
    'rb-soul-concerts': 18,
    'jazz-concerts': 15,
    'classical-concerts': 12,
    'latin-concerts': 26,
    'alternative-concerts': 31,
    'music-festivals': 8,
    'arena-concerts': 67,
    'theater-concerts': 23,
    'outdoor-concerts': 19,
    'club-concerts': 41
  };

  const handleCategoryClick = (categoryId: string) => {
    if (onCategorySelect) {
      onCategorySelect(categoryId);
    }
  };

  const isSelected = (categoryId: string) => selectedCategories.includes(categoryId);

  const CategoryCard = ({ categoryId }: { categoryId: string }) => {
    const category = getCategoryDisplayInfo(categoryId);
    const eventCount = categoryEventCounts[categoryId as keyof typeof categoryEventCounts] || 0;
    const selected = isSelected(categoryId);

    return (
      <Card 
        className={`cursor-pointer transition-all hover:shadow-lg hover:scale-105 ${
          selected ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950' : ''
        }`}
        onClick={() => handleCategoryClick(categoryId)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2 rounded-lg ${category.color} bg-opacity-20`}>
              <Music className="w-6 h-6 text-current" />
            </div>
            {showEventCounts && eventCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {eventCount} events
              </Badge>
            )}
          </div>
          
          <h3 className="font-semibold text-sm mb-2 line-clamp-2">
            {category.name}
          </h3>
          
          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
            {category.description}
          </p>
          
          {userLocation && (
            <div className="flex items-center mt-2 text-xs text-gray-500">
              <MapPin className="w-3 h-3 mr-1" />
              <span>{userLocation.city}, {userLocation.stateCode}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Music className="w-7 h-7" />
            Concert Categories
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Discover concerts by genre and event type
          </p>
        </div>
        
        {selectedCategories.length > 0 && (
          <Badge variant="outline" className="flex items-center gap-1">
            <Filter className="w-3 h-3" />
            {selectedCategories.length} selected
          </Badge>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        <Button
          variant={activeTab === 'genres' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('genres')}
          className="text-xs"
        >
          <Music className="w-4 h-4 mr-1" />
          Music Genres ({musicGenres.length})
        </Button>
        <Button
          variant={activeTab === 'types' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('types')}
          className="text-xs"
        >
          <Calendar className="w-4 h-4 mr-1" />
          Event Types ({eventTypes.length})
        </Button>
      </div>

      {/* Genre Categories Grid */}
      {activeTab === 'genres' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold">Music Genres</h3>
            <Badge variant="outline" className="text-xs">
              {musicGenres.length} genres
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {musicGenres.map((categoryId) => (
              <CategoryCard key={categoryId} categoryId={categoryId} />
            ))}
          </div>
        </div>
      )}

      {/* Event Type Categories Grid */}
      {activeTab === 'types' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold">Event Types</h3>
            <Badge variant="outline" className="text-xs">
              {eventTypes.length} types
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {eventTypes.map((categoryId) => (
              <CategoryCard key={categoryId} categoryId={categoryId} />
            ))}
          </div>
        </div>
      )}

      {/* Popular Combinations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Popular in {userLocation?.city || 'Your Area'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {['rock-concerts', 'electronic-concerts', 'pop-concerts', 'arena-concerts', 'music-festivals']
              .map(categoryId => {
                const category = getCategoryDisplayInfo(categoryId);
                const eventCount = categoryEventCounts[categoryId as keyof typeof categoryEventCounts];
                return (
                  <Button
                    key={categoryId}
                    variant={isSelected(categoryId) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleCategoryClick(categoryId)}
                    className="text-xs"
                  >
                    {category.name}
                    {showEventCounts && eventCount && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {eventCount}
                      </Badge>
                    )}
                  </Button>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Location Info */}
      {userLocation && (
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <MapPin className="w-4 h-4 inline mr-1" />
          Showing concerts for {userLocation.city}, {userLocation.stateCode}
        </div>
      )}
    </div>
  );
}