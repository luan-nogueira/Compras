const CACHE_NAME = 'compras-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './logo.jpg',
  './manifest.json'
];

// Arquivos do "app shell": sempre busca a versão mais nova na rede primeiro,
// caindo para o cache apenas se estiver offline. Evita ficar preso em versão antiga.
const APP_SHELL_FILES = ['index.html', 'style.css', 'script.js'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isAppShell = url.pathname === '/' || APP_SHELL_FILES.some((file) => url.pathname.endsWith(file));

  if (isAppShell) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => response || fetch(event.request))
  );
});
