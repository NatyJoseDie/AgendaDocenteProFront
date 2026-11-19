const CACHE_NAME = 'agenda-docente-public-v2';
const PUBLIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo_agenda_3d_final.png',
  '/logo_3d_final.png',
];
const PUBLIC_ASSET_PATHS = new Set(PUBLIC_ASSETS);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PUBLIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => Promise.all(
        cacheNames
          .filter(name => name.startsWith('agenda-docente-') && name !== CACHE_NAME)
          .map(name => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.mode === 'navigate' || request.headers.has('authorization')) {
    return;
  }

  const url = new URL(request.url);
  if (
    url.origin !== self.location.origin
    || url.pathname.startsWith('/api/')
    || url.pathname.startsWith('/auth/')
    || url.pathname.includes('/notificaciones')
  ) {
    return;
  }

  const isPublicAsset = PUBLIC_ASSET_PATHS.has(url.pathname)
    || /^\/assets\/[^/]+\.(?:css|js|png|jpe?g|svg|webp|woff2?)$/i.test(url.pathname);
  if (!isPublicAsset) return;

  event.respondWith(
    caches.match(request)
      .then(cachedResponse => cachedResponse || fetch(request))
  );
});

self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data?.json() || {};
  } catch {
    payload = {};
  }

  const title = typeof payload.title === 'string'
    ? payload.title
    : 'Tenés una novedad en Agenda Docente';
  const body = typeof payload.body === 'string'
    ? payload.body
    : 'Abrí Agenda Docente para consultar la notificación.';

  const options = {
    body,
    icon: '/logo_agenda_3d_final.png',
    badge: '/logo_agenda_3d_final.png',
    vibrate: [200, 100, 200],
    data: { requestedUrl: payload.data?.url || '/dashboard?notificaciones=1' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  const fallbackUrl = new URL('/dashboard?notificaciones=1', self.location.origin);
  let requestedUrl = fallbackUrl;
  try {
    const candidate = new URL(event.notification.data?.requestedUrl || '/dashboard?notificaciones=1', self.location.origin);
    if (candidate.origin === self.location.origin) requestedUrl = candidate;
  } catch {
    requestedUrl = fallbackUrl;
  }

  const targetUrl = requestedUrl.origin === self.location.origin ? requestedUrl : fallbackUrl;

  if (targetUrl.pathname === '/calendario' || targetUrl.pathname === '/dashboard') {
    targetUrl.searchParams.set('notificaciones', '1');
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(async windowClients => {
        const sameOriginClient = windowClients.find(client => {
          try {
            return new URL(client.url).origin === self.location.origin;
          } catch {
            return false;
          }
        });

        if (sameOriginClient) {
          const navigatedClient = await sameOriginClient.navigate(targetUrl.href);
          return (navigatedClient || sameOriginClient).focus();
        }

        return self.clients.openWindow(targetUrl.href);
      })
  );
});
