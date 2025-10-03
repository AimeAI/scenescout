/**
 * Clear all cached events
 * Run this when you want to force refresh all event data
 */
export function clearAllEventCache() {
  if (typeof window === 'undefined') return;

  const CACHE_NS = 'scenes_scout_cache_v1';
  const keysToRemove: string[] = [];

  // Find all cache keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_NS)) {
      keysToRemove.push(key);
    }
  }

  // Remove them
  keysToRemove.forEach(key => localStorage.removeItem(key));

  console.log(`🗑️ Cleared ${keysToRemove.length} cached event entries`);

  // Also clear seen store if you want fresh events
  localStorage.removeItem('scenes_scout_seen_v1');
  console.log('👀 Cleared seen events store');

  return keysToRemove.length;
}

// Export for browser console access
if (typeof window !== 'undefined') {
  (window as any).clearEventCache = clearAllEventCache;
}
