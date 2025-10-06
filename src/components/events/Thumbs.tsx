'use client';

import { trackEvent } from '@/lib/tracking/client';

export function Thumbs({ event }: { event: any }) {

  const onUp = () => trackEvent('vote_up', { eventId: event.id, category: event.category, price: event.price_min, venue: event.venue_name });
  const onDown = () => trackEvent('vote_down', { eventId: event.id, category: event.category, price: event.price_min, venue: event.venue_name });

  return (
    <div className="flex gap-2">
      <button onClick={onUp} className="px-2 py-1 text-xs rounded bg-green-600/80 hover:bg-green-600">👍</button>
      <button onClick={onDown} className="px-2 py-1 text-xs rounded bg-red-600/80 hover:bg-red-600">👎</button>
    </div>
  );
}
