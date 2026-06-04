const CACHE_NAME = 'agenda-docente-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo_agenda_3d_final.png',
  '/logo_3d_final.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  // Ignorar peticiones que no sean GET (como POST de OCR)
  if (event.request.method !== 'GET') {
    return;
  }

  // EXCEPCIÓN: Si es una llamada a la API o al Backend, ignorar el Service Worker
  if (event.request.url.includes('/api') || event.request.url.includes('localhost:3000')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retornar la respuesta de caché si existe
        if (response) return response;

        // Si no está en caché, intentar fetch
        return fetch(event.request).catch(error => {
          console.log('🌐 Error de red o recurso no disponible:', event.request.url);
          // Opcional: retornar una respuesta vacía o error controlado si es necesario
          // Por ahora dejamos que el error se propague correctamente al navegador
          throw error; 
        });
      })
  );
});
