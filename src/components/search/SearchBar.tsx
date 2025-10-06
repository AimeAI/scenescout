'use client';

import { useEffect, useState } from 'react';
import { trackEvent } from '@/lib/tracking/client';

export function SearchBar({ onResults }: { onResults: (events: any[]) => void }) {
  if (process.env.NEXT_PUBLIC_FEATURE_SEARCH_V1 !== 'true') return null;

  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

  const run = async (term: string) => {
    if (!term.trim()) { onResults([]); return; }
    setLoading(true);
    try {
      const r = await fetch(`/api/search-events?search=${encodeURIComponent(term)}&limit=100`);
      const data = await r.json();
      onResults(data?.events || []);
      trackEvent('search', { query: term });
    } finally { setLoading(false); }
  };

  useEffect(() => { const t = setTimeout(() => run(q), 300); return () => clearTimeout(t); }, [q]);

  return (
    <div className="relative">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            run(q)
          }
        }}
        placeholder="Search events..."
        className="w-full px-4 py-2 rounded-lg bg-white/8 border border-white/12 focus:border-purple-500 focus:outline-none"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-60">
          Searching...
        </div>
      )}
    </div>
  );
}
