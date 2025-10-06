'use client';

import { trackEvent } from '@/lib/tracking/client';

export type Chip = 'tonight' | 'near' | 'free' | 'now';

export function QuickChips({ onApply }: { onApply: (chip: Chip) => void }) {

  const chips: { id: Chip; label: string }[] = [
    { id: 'tonight', label: '🌙 Tonight' },
    { id: 'now', label: '⚡ Happening Now' },
    { id: 'near', label: '📍 Near Me' },
    { id: 'free', label: '🆓 Free' },
  ];

  return (
    <div className="flex gap-2 flex-wrap my-3">
      {chips.map(c => (
        <button
          key={c.id}
          onClick={() => { onApply(c.id); trackEvent('filteredBy', { filter: c.id }); }}
          className="px-3 py-1.5 text-sm rounded-full bg-white/8 hover:bg-white/14 border border-white/12"
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
