'use client';

import { trackEvent } from '@/lib/tracking/client';

export type Chip = 'tonight' | 'near' | 'free' | 'now';

interface QuickChipsProps {
  value: Chip | null;
  onChange: (chip: Chip | null) => void;
}

export function QuickChips({ value, onChange }: QuickChipsProps) {
  const chips: { id: Chip; label: string }[] = [
    { id: 'tonight', label: '🌙 Tonight' },
    { id: 'now', label: '⚡ Happening Now' },
    { id: 'near', label: '📍 Near Me' },
    { id: 'free', label: '🆓 Free' },
  ];

  const handleClick = (chipId: Chip) => {
    const newChip = value === chipId ? null : chipId;
    onChange(newChip);
    trackEvent('filteredBy', { filter: chipId });
  };

  return (
    <div className="flex gap-2 flex-wrap my-3">
      {chips.map(c => (
        <button
          key={c.id}
          onClick={() => handleClick(c.id)}
          className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
            value === c.id
              ? 'bg-white text-black border-white'
              : 'border-white/15 text-gray-200 hover:bg-white/10'
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
