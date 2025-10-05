'use client';

import { useEffect, useState } from 'react';
import { getSavedEvents, unsaveEvent } from '@/lib/saved/store';
import { PriceBadge } from '@/components/events/PriceBadge';
import { trackEvent } from '@/lib/tracking/client';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';

export default function SavedPage() {
  if (process.env.NEXT_PUBLIC_FEATURE_SAVED_V1 !== 'true') {
    return (
      <AppLayout>
        <div className="p-6 text-sm opacity-60">Saved is disabled.</div>
      </AppLayout>
    );
  }

  const router = useRouter();
  const [savedEvents, setSavedEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load saved events from database first, then merge with localStorage
    const loadSavedEvents = async () => {
      try {
        const userId = localStorage.getItem('user_id') || 'anonymous';

        // Fetch from database
        const response = await fetch(`/api/saved-events?userId=${userId}`);
        const data = await response.json();

        if (data.success && data.events?.length > 0) {
          // Extract event_data from database records
          const dbEvents = data.events.map((record: any) => record.event_data);
          setSavedEvents(dbEvents);
        } else {
          // Fallback to localStorage if database is empty
          const localEvents = getSavedEvents();
          setSavedEvents(localEvents);
        }
      } catch (error) {
        console.error('Failed to load saved events:', error);
        // Fallback to localStorage on error
        const localEvents = getSavedEvents();
        setSavedEvents(localEvents);
      } finally {
        setLoading(false);
      }
    };

    loadSavedEvents();
  }, []);

  const handleUnsave = (eventId: string) => {
    unsaveEvent(eventId);
    trackEvent('unsave', { eventId });
    // Update local state
    setSavedEvents(savedEvents.filter(e => e.id !== eventId));
  };

  const handleEventClick = (event: any) => {
    // Store in sessionStorage for detail page
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`event_${event.id}`, JSON.stringify(event));
    }
    router.push(`/events/${event.id}`);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 text-sm opacity-60">Loading saved events...</div>
      </AppLayout>
    );
  }

  if (savedEvents.length === 0) {
    return (
      <AppLayout>
        <div className="p-6 text-center">
          <div className="text-4xl mb-3">💾</div>
          <div className="text-sm opacity-60">No saved events yet. Save some events to see them here!</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Saved Events ({savedEvents.length})</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {savedEvents.map(event => (
          <div key={event.id} className="bg-gray-900 rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all cursor-pointer">
            <div className="relative h-40 bg-gray-800" onClick={() => handleEventClick(event)}>
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
              <h4
                className="font-semibold text-sm line-clamp-2 hover:text-purple-400 transition-colors"
                onClick={() => handleEventClick(event)}
              >
                {event.title}
              </h4>
              {event.venue_name && (
                <p className="text-xs text-gray-400 line-clamp-1">📍 {event.venue_name}</p>
              )}
              {event.date && (
                <p className="text-xs text-gray-500">📅 {new Date(event.date).toLocaleDateString()}</p>
              )}
              <button
                onClick={() => handleUnsave(event.id)}
                className="w-full px-3 py-1.5 text-xs rounded bg-red-600/80 hover:bg-red-600 transition-colors"
              >
                ❤️ Remove from Saved
              </button>
            </div>
          </div>
        ))}
        </div>
      </div>
    </AppLayout>
  );
}
