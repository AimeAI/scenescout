const KEY = 'scenes_scout_saved_v1';
const EVENTS_KEY = 'scenescout_saved_events';

// Legacy: Get saved IDs only
export function getSavedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try { return new Set<string>(JSON.parse(localStorage.getItem(KEY) || '[]')); }
  catch { return new Set(); }
}

// Legacy: Set saved IDs
export function setSavedIds(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(Array.from(ids)));
}

// New: Get saved events with full data
export function getSavedEvents(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(EVENTS_KEY) || '[]');
  } catch {
    return [];
  }
}

// New: Save event with full data
export function saveEvent(event: any): void {
  if (typeof window === 'undefined') return;
  const events = getSavedEvents();
  // Check if already saved
  if (events.some(e => e.id === event.id)) return;
  events.push(event);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));

  // Also update legacy IDs
  const ids = getSavedIds();
  ids.add(event.id);
  setSavedIds(ids);

  // Emit custom event for real-time updates
  window.dispatchEvent(new Event('savedEventsChanged'));
}

// New: Unsave event
export function unsaveEvent(eventId: string): void {
  if (typeof window === 'undefined') return;
  const events = getSavedEvents();
  const filtered = events.filter(e => e.id !== eventId);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(filtered));

  // Also update legacy IDs
  const ids = getSavedIds();
  ids.delete(eventId);
  setSavedIds(ids);

  // Emit custom event for real-time updates
  window.dispatchEvent(new Event('savedEventsChanged'));
}

// Updated: Toggle with full event data
export function toggleSaved(id: string, event?: any): boolean {
  const ids = getSavedIds();
  let saved: boolean;

  if (ids.has(id)) {
    // Unsave - this handles both storage keys and emits event
    unsaveEvent(id);
    saved = false;
  } else {
    // Save - this handles both storage keys and emits event
    if (event) {
      saveEvent(event);
    } else {
      // Fallback if no event data provided (just save ID)
      ids.add(id);
      setSavedIds(ids);
      window.dispatchEvent(new Event('savedEventsChanged'));
    }
    saved = true;
  }
  return saved;
}

export function isSaved(id: string): boolean {
  return getSavedIds().has(id);
}
