type CacheKey = string;

const CACHE_NS = 'scenes_scout_cache_v1';

export interface CacheEntry {
  key: CacheKey;
  ts: number;
  events: any[];
}

function k(category: string, lat?: number, lng?: number) {
  return [category || 'all', lat ?? 'x', lng ?? 'x'].join('|');
}

export function readCache(key: CacheKey): CacheEntry | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${CACHE_NS}:${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeCache(entry: CacheEntry, ttlMinutes = 30, cap = 2000) {
  if (typeof window === 'undefined') return;
  try {
    const events = entry.events.slice(0, cap);
    localStorage.setItem(`${CACHE_NS}:${entry.key}`, JSON.stringify({ ...entry, events }));
  } catch {}
}

export function isFresh(ts: number, ttlMinutes = 30) {
  return Date.now() - ts < ttlMinutes * 60 * 1000;
}

export function cacheKey(category: string, lat?: number, lng?: number) {
  return k(category, lat, lng);
}
