import { shuffleDeterministic } from '@/lib/util/seed-random';

export function daySeed(city?: string) {
  const d = new Date();
  const base = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  if (process.env.DAILY_SHUFFLE_SEED_SCOPE === 'city' && city) return `${base}:${city.toLowerCase()}`;
  return base;
}

export function applyDailyShuffle<T>(events: T[], city?: string) {
  if (process.env.NEXT_PUBLIC_FEATURE_DAILY_SHUFFLE !== 'true') return events;
  return shuffleDeterministic(events, daySeed(city));
}
