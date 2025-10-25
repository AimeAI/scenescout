'use client';

import { useEffect, useState } from 'react';
import { getSavedEvents, unsaveEvent } from '@/lib/saved/store';
import { PriceBadge } from '@/components/events/PriceBadge';
import { trackEvent } from '@/lib/tracking/client';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { EmptyState, EMPTY_STATE_VARIANTS } from '@/components/empty-states';
import { generateBulkICS } from '@/lib/calendar/export';
import { Calendar, Download } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SavedPage() {
  const router = useRouter();
  const [savedEvents, setSavedEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSavedEvents = async () => {
    setLoading(true);
    setError(null);
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
    } catch (err) {
      console.error('Failed to load saved events:', err);
      setError('Failed to load saved events');
      // Fallback to localStorage on error
      const localEvents = getSavedEvents();
      setSavedEvents(localEvents);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  const handleExportAll = () => {
    if (savedEvents.length === 0) {
      toast.error('No events to export');
      return;
    }

    const result = generateBulkICS(savedEvents);

    if (result.success) {
      const message = result.errors
        ? `Exported ${result.count} events (${result.errors.length} skipped)`
        : `Exported ${result.count} events to calendar`;

      toast.success(message, {
        duration: 4000,
        icon: '📅',
      });

      // Track bulk export
      trackEvent('calendar_export_bulk', {
        count: result.count,
        hasErrors: !!result.errors,
      });
    } else {
      toast.error(`Failed to export events: ${result.error}`, {
        duration: 4000,
      });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 text-center py-12">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading saved events...</p>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="p-6">
          <EmptyState
            {...EMPTY_STATE_VARIANTS.loadingError}
            title="Error Loading Saved Events"
            description={error}
            action={{
              label: 'Try Again',
              onClick: loadSavedEvents
            }}
          />
        </div>
      </AppLayout>
    );
  }

  if (savedEvents.length === 0) {
    return (
      <AppLayout>
        <div className="p-6">
          <EmptyState
            {...EMPTY_STATE_VARIANTS.noSavedEvents}
            action={{
              label: 'Browse Events',
              onClick: () => router.push('/')
            }}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">Saved Events ({savedEvents.length})</h1>

          {savedEvents.length > 0 && (
            <button
              onClick={handleExportAll}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-medium transition-all duration-200 hover:scale-105 shadow-lg"
            >
              <Download className="w-4 h-4" />
              Export All to Calendar
              <Calendar className="w-4 h-4" />
            </button>
          )}
        </div>

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
