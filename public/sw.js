// Service Worker for Growth Companion PWA
// Bump CACHE_NAME on deploy so activate clears old caches and fresh content loads
const CACHE_NAME = 'growth-companion-v2'

const urlsToCache = [
  '/',
  '/icon-light-32x32.png',
  '/icon-dark-32x32.png',
  '/apple-icon.png',
  '/icon.svg'
]

// Install event - cache shell resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .catch((err) => console.error('Service Worker: Cache install failed', err))
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  )
  return self.clients.claim()
})

// Prefer network for HTML/JS/CSS so updates apply without hard refresh; cache for offline
function isDocumentOrScript(req) {
  const url = new URL(req.url)
  if (req.mode === 'navigate') return true
  const path = url.pathname
  return /\.(js|css|mjs)(\?|$)/.test(path) || path.startsWith('/_next/')
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('supabase.co') ||
    event.request.url.includes('openai.com')
  ) {
    return
  }

  // Network-first for documents and scripts so new deploys are seen on next load
  if (isDocumentOrScript(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
        .catch(() => caches.match(event.request).then((r) => r || caches.match('/')))
    )
    return
  }

  // Cache-first for images and other assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
    }).catch(() => caches.match('/'))
  )
})

// Allow client to request skipWaiting (e.g. when user taps "Refresh")
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

// --- Web Push -------------------------------------------------------------
self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch (e) { data = {} }
  const title = data.title || 'Companion'
  const options = {
    body: data.body || '',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: data.tag || 'companion-push',
    data: { url: data.url || '/' },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
