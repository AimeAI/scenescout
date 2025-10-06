'use client';

import { useState } from 'react';
import { trackEvent } from '@/lib/tracking/client';

export type Chip = 'tonight' | 'near' | 'free' | 'now';

export function QuickChips({ onApply }: { onApply: (chip: Chip) => void }) {
  const [activeChip, setActiveChip] = useState<Chip | null>(null);

  const chips: { id: Chip; label: string }[] = [
    { id: 'tonight', label: '🌙 Tonight' },
    { id: 'now', label: '⚡ Happening Now' },
    { id: 'near', label: '📍 Near Me' },
    { id: 'free', label: '🆓 Free' },
  ];

  const handleClick = (chipId: Chip) => {
    const newChip = activeChip === chipId ? null : chipId;
    setActiveChip(newChip);
    onApply(chipId);
    trackEvent('filteredBy', { filter: chipId });
  };

  return (
    <div className="flex gap-2 flex-wrap my-3">
      {chips.map(c => (
        <button
          key={c.id}
          onClick={() => handleClick(c.id)}
          className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
            activeChip === c.id
              ? 'bg-purple-600 border-purple-500 text-white'
              : 'bg-white/8 hover:bg-white/14 border-white/12'
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
