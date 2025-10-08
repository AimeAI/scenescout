'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getSavedIds } from '@/lib/saved/store';

export function Sidebar() {
  const pathname = usePathname();
  const [savedCount, setSavedCount] = useState(0);

  // Update saved count on mount and when storage changes
  useEffect(() => {
    const updateCount = () => {
      const count = getSavedIds().size;
      setSavedCount(count);
    };

    updateCount();

    // Listen for storage changes
    window.addEventListener('savedEventsChanged', updateCount);
    return () => window.removeEventListener('savedEventsChanged', updateCount);
  }, []);

  const Item = ({ href, label, badge }: { href: string; label: string; badge?: number }) => {
    const active = pathname === href || (href !== '/' && pathname?.startsWith(href));
    return (
      <Link href={href} className={`block px-3 py-2 rounded-lg ${active ? 'bg-white/15' : 'hover:bg-white/10'} relative`}>
        {label}
        {badge !== undefined && badge > 0 && (
          <span className="absolute top-2 right-2 bg-purple-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside className="hidden lg:block fixed left-0 top-0 w-64 p-3 border-r border-white/10 flex flex-col h-screen bg-black z-40">
      <div className="flex-1">
        <div className="text-sm font-semibold mb-2 opacity-80">Navigation</div>
        <Item href="/" label="🏠 Discover" />
        <Item href="/surprise" label="⚡ Surprise Me" />
        <Item href="/now" label="🔥 Happening Now" />
        <Item href="/near-me" label="📍 Near Me" />
        <Item href="/saved" label="❤️ My Events" badge={savedCount} />
        <Item href="/taste" label="✨ My Taste" />
      </div>

      {/* Account section at bottom */}
      <div className="border-t border-white/10 pt-3 mt-3">
        <Item href="/account" label="👤 Account" />
      </div>
    </aside>
  );
}
