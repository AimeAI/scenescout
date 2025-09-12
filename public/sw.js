self.addEventListener('push', function(event) {
  let data = {}
  try { data = event.data.json() } catch { data = { title: 'SceneScout', body: 'New update' } }
  const title = data.title || 'SceneScout'
  const options = { body: data.body || '', icon: '/icon.png', data: data.url ? { url: data.url } : {} }
  event.waitUntil(self.registration.showNotification(title, options))
})
self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  const url = event.notification.data && event.notification.data.url
  if (url) event.waitUntil(clients.openWindow(url))
})
