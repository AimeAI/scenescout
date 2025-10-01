'use client';

import { useEffect, useMemo, useState } from 'react';
import { isSaved, getSavedIds, toggleSaved } from '@/lib/saved/store';
import { PriceBadge } from '@/components/events/PriceBadge';
import { trackEvent } from '@/lib/tracking/client';

export default function SavedPage() {
  if (process.env.NEXT_PUBLIC_FEATURE_SAVED_V1 !== 'true') {
    return <div className="p-6 text-sm opacity-60">Saved is disabled.</div>;
  }

  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const res = await fetch('/api/search-events?limit=500');
        const data = await res.json();
        setAllEvents(data?.events || []);
      } catch (err) {
        console.error('Failed to load events:', err);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

  const savedEvents = useMemo(() => {
    const savedIds = getSavedIds();
    return allEvents.filter(e => savedIds.has(e.id));
  }, [allEvents]);

  const handleUnsave = (eventId: string) => {
    toggleSaved(eventId);
    trackEvent('unsave', { eventId });
    setAllEvents([...allEvents]); // Force re-render
  };

  if (loading) {
    return <div className="p-6 text-sm opacity-60">Loading saved events...</div>;
  }

  if (savedEvents.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="text-4xl mb-3">💾</div>
        <div className="text-sm opacity-60">No saved events yet. Save some events to see them here!</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Saved Events ({savedEvents.length})</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {savedEvents.map(event => (
          <div key={event.id} className="bg-gray-900 rounded-lg overflow-hidden">
            <div className="relative h-40 bg-gray-800">
              {event.image_url ? (
                <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">
                  {event.emoji || '🎉'}
                </div>
              )}
              <div className="absolute top-2 right-2">
                <PriceBadge event={event} size="sm" showTooltip={false} />
              </div>
            </div>
            <div className="p-3 space-y-2">
              <h4 className="font-semibold text-sm line-clamp-2">{event.title}</h4>
              {event.venue_name && (
                <p className="text-xs text-gray-400 line-clamp-1">📍 {event.venue_name}</p>
              )}
              {event.date && (
                <p className="text-xs text-gray-500">📅 {new Date(event.date).toLocaleDateString()}</p>
              )}
              <button
                onClick={() => handleUnsave(event.id)}
                className="w-full px-3 py-1.5 text-xs rounded bg-red-600/80 hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
