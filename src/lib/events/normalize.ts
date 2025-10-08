// Central place that maps source payloads into our internal Event type with canonical times
import { toEventTimes } from '@/lib/datetime';

export type EventSource = 'TM' | 'EB';

export type NormalizedEvent = {
  id: string;
  title: string;
  image: string | null;
  venue: string | null;
  source: EventSource;
  url: string;
  // canonical times
  startUtc: string;
  tz: string;
};

export function normalizeTicketmaster(raw: any, cityTz?: string): NormalizedEvent {
  const times = toEventTimes({
    tmDateTime: raw?.dates?.start?.dateTime || null,
    tmTz: raw?._embedded?.venues?.[0]?.timezone || raw?.timezone || null,
    fallbackTz: cityTz || null,
  });

  return {
    id: raw?.id,
    title: raw?.name,
    image: raw?.images?.[0]?.url || null,
    venue: raw?._embedded?.venues?.[0]?.name || null,
    source: 'TM',
    url: raw?.url,
    startUtc: times.isoUtc,
    tz: times.tz,
  };
}

export function normalizeEventbrite(raw: any, cityTz?: string): NormalizedEvent {
  const times = toEventTimes({
    ebUtc: raw?.start?.utc || null,
    ebTz: raw?.start?.timezone || null,
    fallbackTz: cityTz || null,
  });

  return {
    id: raw?.id,
    title: raw?.name?.text,
    image: raw?.logo?.url || null,
    venue: raw?.venue?.name || null,
    source: 'EB',
    url: raw?.url,
    startUtc: times.isoUtc,
    tz: times.tz,
  };
}
