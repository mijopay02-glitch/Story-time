/**
 * MIJO Story — service worker minimal.
 * Rôle : mettre en cache l'app shell (HTML/CSS/JS/icônes) pour un
 * démarrage instantané et un mode hors-ligne basique. Les données
 * Supabase ne sont JAMAIS mises en cache ici — le repli hors-ligne des
 * histoires/catégories est déjà géré côté app.js via localStorage
 * (voir cacheOfflineSnapshot / loadOfflineSnapshot), qui reste la
 * source de vérité pour le contenu.
 */

const CACHE_NAME = 'mijo-story-shell-v1';

const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './config.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((err) => console.warn('[MIJO Story SW] Échec de mise en cache initiale :', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ne jamais intercepter les appels Supabase (données toujours fraîches
  // depuis le réseau ; le repli hors-ligne applicatif prend le relai).
  if (url.hostname.endsWith('supabase.co')) return;

  // Uniquement notre propre origine : on laisse passer les CDN
  // (Tailwind, Google Fonts, Supabase JS) directement au réseau.
  if (url.origin !== self.location.origin) return;

  // Stale-while-revalidate : sert le cache immédiatement si présent,
  // et le rafraîchit en arrière-plan dès que le réseau répond.
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
