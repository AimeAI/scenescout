'use client';

import { useState } from 'react';
import { trackEvent } from '@/lib/tracking/client';
import { useRouter } from 'next/navigation';

export type Chip = 'tonight' | 'near' | 'free' | 'now';
export type ChipState = { tonight?: boolean; now?: boolean; near?: boolean; free?: boolean };

export function QuickChips({ onChange }: { onChange: (state: ChipState) => void }) {
  const router = useRouter();
  const [state, setState] = useState<ChipState>({});

  const chips: { id: Chip; label: string }[] = [
    { id: 'tonight', label: '🌙 Tonight' },
    { id: 'now', label: '⚡ Happening Now' },
    { id: 'near', label: '📍 Near Me' },
    { id: 'free', label: '🆓 Free' },
  ];

  const handleClick = (chipId: Chip) => {
    trackEvent('filteredBy', { filter: chipId });

    if (chipId === 'near') {
      // Navigate to /near-me instead of toggling
      router.push('/near-me');
      return;
    }

    const newState = { ...state, [chipId]: !state[chipId] };
    setState(newState);
    onChange(newState);
  };

  return (
    <div className="flex gap-2 flex-wrap my-3">
      {chips.map(c => (
        <button
          key={c.id}
          onClick={() => handleClick(c.id)}
          className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
            state[c.id]
              ? 'bg-white text-black border-white'
              : 'bg-white/8 hover:bg-white/14 border-white/12 text-white'
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
