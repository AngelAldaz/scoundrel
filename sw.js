// Service worker: funciona offline. Sube VERSION en cada deploy para invalidar la caché.
const VERSION = 'v7';
const CACHE = `scoundrel-${VERSION}`;
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/main.js',
  './js/config.js',
  './js/storage.js',
  './js/settings.js',
  './js/stats.js',
  './js/leaderboard.js',
  './js/engine/rules.js',
  './js/engine/rng.js',
  './js/audio/audio.js',
  './js/ui/background.js',
  './js/ui/board.js',
  './js/ui/fx.js',
  './js/ui/game.js',
  './js/decks/index.js',
  './js/decks/pixel.js',
  './js/decks/classic/deck.js',
  './js/decks/dungeon/deck.js',
  './js/decks/neon/deck.js',
  './js/decks/arcane/deck.js',
  './js/decks/ocean/deck.js',
  './js/decks/lcd/deck.js',
  './js/decks/clean/deck.js',
  './icons/icon-192.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('scoundrel-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // El ranking siempre va a la red.
  if (url.hostname.endsWith('supabase.co')) return;

  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !isFont) return;

  // Mismo origen: red primero (para recibir actualizaciones), caché si no hay conexión.
  // Fuentes: caché primero.
  if (isFont) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return res;
      })),
    );
    return;
  }
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html'))),
  );
});
