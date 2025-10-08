'use client';

import { trackEvent } from '@/lib/tracking/client';
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

  const onUp = () => {
    trackEvent('vote_up', { eventId: event.id, category: event.category, price: event.price_min, venue: event.venue_name });

    const categoryName = CATEGORIES.find(c => c.id === event.category)?.title || 'these';
    toast.success(`👍 More ${categoryName} events coming your way!`, {
      duration: 2000,
    });
  };

  const onDown = () => {
    trackEvent('vote_down', { eventId: event.id, category: event.category, price: event.price_min, venue: event.venue_name });

    const categoryName = CATEGORIES.find(c => c.id === event.category)?.title || 'these';
    toast(`👎 Got it, fewer ${categoryName} events`, {
      duration: 2000,
      style: {
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      },
    });
  };

  return (
    <div className="flex gap-2">
      <button onClick={onUp} className="px-2 py-1 text-xs rounded bg-green-600/80 hover:bg-green-600">👍</button>
      <button onClick={onDown} className="px-2 py-1 text-xs rounded bg-red-600/80 hover:bg-red-600">👎</button>
    </div>
  );
}
