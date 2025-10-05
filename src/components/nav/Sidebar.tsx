'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Sidebar() {
  if (process.env.NEXT_PUBLIC_FEATURE_SIDEBAR_V1 !== 'true') return null;

  const pathname = usePathname();

  const Item = ({ href, label }: { href: string; label: string }) => {
    const active = pathname === href || (href !== '/' && pathname?.startsWith(href));
    return (
      <Link href={href} className={`block px-3 py-2 rounded-lg ${active ? 'bg-white/15' : 'hover:bg-white/10'}`}>
        {label}
      </Link>
    );
  };

  return (
    <aside className="hidden md:block w-64 shrink-0 p-3 border-r border-white/10">
      <div className="text-sm font-semibold mb-2 opacity-80">Navigation</div>
      <Item href="/" label="🏠 Home" />
      <Item href="/search" label="🔍 Search" />
      <Item href="/saved" label="❤️ Saved" />

      <div className="text-sm font-semibold mb-2 mt-6 opacity-80">Quick Filters</div>
      <Item href="/?filter=near" label="📍 Near Me Now" />
      <Item href="/?filter=tonight" label="🌙 Tonight" />
      <Item href="/?filter=free" label="🆓 Free Events" />
    </aside>
  );
}
