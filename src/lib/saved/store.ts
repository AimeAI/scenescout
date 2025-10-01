const KEY = 'scenes_scout_saved_v1';

export function getSavedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try { return new Set<string>(JSON.parse(localStorage.getItem(KEY) || '[]')); }
  catch { return new Set(); }
}

export function setSavedIds(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(Array.from(ids)));
}

export function toggleSaved(id: string): boolean {
  const ids = getSavedIds();
  let saved: boolean;
  if (ids.has(id)) { ids.delete(id); saved = false; }
  else { ids.add(id); saved = true; }
  setSavedIds(ids);
  return saved;
}

export function isSaved(id: string): boolean {
  return getSavedIds().has(id);
}
