'use client';

import { useEffect, useRef, useState } from 'react';
import { cacheKey, readCache, writeCache } from './cache';
import { shuffleDeterministic } from '@/lib/util/seed-random';
import { daySeed } from '@/lib/personalization/daily-shuffle';
import { filterUnseen } from '@/lib/tracking/seen-store';

// Wrapper to match spec naming
function getUnseen(category: string, events: any[]) {
  return filterUnseen(events);
}

function dedupe(events: any[]) {
  const seen = new Set<string>();
  return events.filter(e => {
    const id = String(e?.id ?? '');
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function useCachedEvents(params: {
  category: string;
  lat?: number;
  lng?: number;
  limit?: number;
  cityName?: string;
  applySeen?: boolean;
}) {
  const { category, lat, lng, limit = 50, cityName, applySeen = true } = params;
  const enabled = process.env.NEXT_PUBLIC_FEATURE_CACHED_EVENTS === 'true';
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const refreshingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const key = cacheKey(category, lat, lng);
    const seed = daySeed(cityName);

    const load = async () => {
      const cached = enabled ? readCache(key) : null;
      if (cached?.events?.length) {
        let ev = dedupe(cached.events);
        if (applySeen) ev = getUnseen(category, ev);
        ev = shuffleDeterministic(ev, seed);
        setEvents(ev.slice(0, limit));
        setLoading(false);
      }
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      try {
        const res = await fetch(`/api/search-events?q=${encodeURIComponent(category)}&limit=${limit * 2}`);
        const data = await res.json();
        let fresh = dedupe(data?.events || []);
        if (applySeen) fresh = getUnseen(category, fresh);
        const mergedMap = new Map<string, any>();
        for (const e of fresh) mergedMap.set(String(e.id), e);
        if (cached?.events?.length) {
          for (const e of cached.events) {
            const id = String(e?.id ?? '');
            if (!mergedMap.has(id)) mergedMap.set(id, e);
          }
        }
        let merged = Array.from(mergedMap.values());
        merged = shuffleDeterministic(merged, seed);
        if (!cancelled) {
          setEvents(merged.slice(0, limit));
          setLoading(false);
        }
        if (enabled) {
          const ttl = Number(process.env.CACHE_TTL_MINUTES) || 30;
          const cap = Number(process.env.CACHE_MAX_ITEMS) || 2000;
          writeCache({ key, ts: Date.now(), events: merged }, ttl, cap);
        }
      } catch {
        if (!cached && !cancelled) setLoading(false);
      } finally {
        refreshingRef.current = false;
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [category, lat, lng, limit, cityName, applySeen, enabled]);

  return { events, loading };
}
