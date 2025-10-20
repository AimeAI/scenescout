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
export async function saveEvent(event: any): Promise<void> {
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

  // Request notification permission on first save
  await requestNotificationPermissionOnSave();

  // Save to database
  await saveToDatabase(event);

  // Emit custom event for real-time updates
  window.dispatchEvent(new Event('savedEventsChanged'));
}

// Save event to database (Supabase)
async function saveToDatabase(event: any): Promise<void> {
  try {
    const userId = localStorage.getItem('user_id') || 'anonymous';

    // 1. Save to saved_events table
    const saveResponse = await fetch('/api/saved-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        eventId: event.id,
        eventData: event
      })
    });

    if (!saveResponse.ok) {
      const error = await saveResponse.json();
      console.error('❌ Failed to save event to database:', error);
      return;
    }

    console.log('✅ Event saved to database:', event.id);

    // 2. Get user's push subscription ID if available
    const subscriptionEndpoint = localStorage.getItem('push_subscription_endpoint');
    let subscriptionId = null;

    if (subscriptionEndpoint) {
      // Fetch subscription ID from endpoint
      const subResponse = await fetch(`/api/notifications/test`);
      if (subResponse.ok) {
        const subData = await subResponse.json();
        const userSub = subData.subscriptions?.find((s: any) =>
          s.endpoint === subscriptionEndpoint
        );
        subscriptionId = userSub?.id;
      }
    }

    // 3. Create reminders (24h and 3h before event)
    const reminderResponse = await fetch('/api/reminders/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        eventId: event.id,
        eventData: event,
        subscriptionId
      })
    });

    if (!reminderResponse.ok) {
      const error = await reminderResponse.json();
      console.error('❌ Failed to create reminders:', error);
      return;
    }

    const reminderData = await reminderResponse.json();
    console.log(`✅ Created ${reminderData.created} reminder(s) for event ${event.id}`);

  } catch (error) {
    // Don't block UI on database errors - user's save still works locally
    console.warn('⚠️ Database save failed (non-blocking):', error instanceof Error ? error.message : String(error));
  }
}

// Request notification permission when user saves an event
async function requestNotificationPermissionOnSave(): Promise<void> {
  if (typeof window === 'undefined') return;

  // Check if push is supported
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('ℹ️ Push notifications not supported');
    return;
  }

  // Don't ask again if already decided
  const permission = Notification.permission;
  if (permission !== 'default') {
    return;
  }

  // Check if user has been asked before
  const askedBefore = localStorage.getItem('push_permission_asked');
  if (askedBefore) {
    return;
  }

  try {
    // Dynamically import push library to avoid SSR issues
    const { subscribeToPush, requestNotificationPermission } = await import('../notifications/push');

    // Request permission
    const result = await requestNotificationPermission();

    // Mark as asked
    localStorage.setItem('push_permission_asked', 'true');

    if (result === 'granted') {
      console.log('✅ Notification permission granted, subscribing...');
      // Subscribe to push
      await subscribeToPush();
    } else {
      console.log('ℹ️ Notification permission denied or dismissed');
    }
  } catch (error) {
    console.error('❌ Failed to request notification permission:', error);
  }
}

// New: Unsave event
export async function unsaveEvent(eventId: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const events = getSavedEvents();
  const filtered = events.filter(e => e.id !== eventId);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(filtered));

  // Also update legacy IDs
  const ids = getSavedIds();
  ids.delete(eventId);
  setSavedIds(ids);

  // Delete from database
  await deleteFromDatabase(eventId);

  // Emit custom event for real-time updates
  window.dispatchEvent(new Event('savedEventsChanged'));
}

// Delete event from database
async function deleteFromDatabase(eventId: string): Promise<void> {
  try {
    const userId = localStorage.getItem('user_id') || 'anonymous';

    // 1. Delete from saved_events table
    const saveResponse = await fetch('/api/saved-events', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        eventId
      })
    });

    if (!saveResponse.ok) {
      const error = await saveResponse.json();
      console.error('❌ Failed to delete event from database:', error);
      return;
    }

    console.log('✅ Event deleted from database:', eventId);

    // 2. Delete reminders
    const reminderResponse = await fetch('/api/reminders/create', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        eventId
      })
    });

    if (!reminderResponse.ok) {
      const error = await reminderResponse.json();
      console.error('❌ Failed to delete reminders:', error);
      return;
    }

    console.log('✅ Reminders deleted for event:', eventId);

  } catch (error) {
    console.error('❌ Database delete error:', error);
  }
}

// Updated: Toggle with full event data
export async function toggleSaved(id: string, event?: any): Promise<boolean> {
  const ids = getSavedIds();
  let saved: boolean;

  if (ids.has(id)) {
    // Unsave - this handles both storage keys and emits event
    unsaveEvent(id);
    saved = false;
  } else {
    // Save - this handles both storage keys and emits event
    if (event) {
      await saveEvent(event);
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
