'use client';

import { trackEvent } from '@/lib/tracking/client';
import { voteEvent, getEventVote } from '@/lib/thumbs';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

// Import categories for toast messages
const CATEGORIES = [
  { id: 'music-concerts', title: 'Music & Concerts' },
  { id: 'nightlife-dj', title: 'Nightlife & DJ Sets' },
  { id: 'comedy-improv', title: 'Comedy & Improv' },
  { id: 'theatre-dance', title: 'Theatre & Dance' },
  { id: 'food-drink', title: 'Food & Drink' },
  { id: 'arts-exhibits', title: 'Arts & Exhibits' },
  { id: 'film-screenings', title: 'Film & Screenings' },
  { id: 'markets-popups', title: 'Markets & Pop-ups' },
  { id: 'sports-fitness', title: 'Sports & Fitness' },
  { id: 'outdoors-nature', title: 'Outdoors & Nature' },
  { id: 'wellness-mindfulness', title: 'Wellness & Mindfulness' },
  { id: 'workshops-classes', title: 'Workshops & Classes' },
  { id: 'tech-startups', title: 'Tech & Startups' },
  { id: 'family-kids', title: 'Family & Kids' },
  { id: 'date-night', title: 'Date Night Ideas' },
  { id: 'late-night', title: 'Late Night' },
  { id: 'neighborhood', title: 'Neighborhood Hotspots' },
  { id: 'halloween', title: 'Halloween Events' },
];

export function Thumbs({ event }: { event: any }) {
  const [currentVote, setCurrentVote] = useState<'up' | 'down' | null>(null);

  // Load existing vote on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCurrentVote(getEventVote(event.id));
    }
  }, [event.id]);

  const onUp = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    // Vote up in thumbs system
    voteEvent(event.id, 'up', event);
    setCurrentVote('up');

    // Track for personalization
    trackEvent('vote_up', { eventId: event.id, category: event.category, price: event.price_min, venue: event.venue_name });

    const categoryName = CATEGORIES.find(c => c.id === event.category)?.title || 'these';
    toast.success(`👍 More ${categoryName} events coming your way!`, {
      duration: 2000,
    });
  };

  const onDown = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click

    // Vote down in thumbs system (permanently hides event)
    voteEvent(event.id, 'down', event);
    setCurrentVote('down');

    // Track for personalization
    trackEvent('vote_down', { eventId: event.id, category: event.category, price: event.price_min, venue: event.venue_name });

    // Emit custom event so parent components can react
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('eventHidden', { detail: { eventId: event.id } }));
    }

    const categoryName = CATEGORIES.find(c => c.id === event.category)?.title || 'these';
    toast(`👎 Event hidden. We'll show you fewer ${categoryName} events`, {
      duration: 3000,
      style: {
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: 'white',
      },
    });

    console.log('👎 Event hidden:', event.id, event.title);
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={onUp}
        className={`px-2 py-1 text-xs rounded transition-all ${
          currentVote === 'up'
            ? 'bg-green-600 ring-2 ring-green-400'
            : 'bg-green-600/80 hover:bg-green-600'
        }`}
      >
        👍
      </button>
      <button
        onClick={onDown}
        className={`px-2 py-1 text-xs rounded transition-all ${
          currentVote === 'down'
            ? 'bg-red-600 ring-2 ring-red-400'
            : 'bg-red-600/80 hover:bg-red-600'
        }`}
      >
        👎
      </button>
    </div>
  );
}
