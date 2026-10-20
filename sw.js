const CACHE_NAME = 'heat-study-ja-v3';
const APP_SHELL = [
  './', './index.html', './styles.css', './app.js', './manifest.json',
  './data/book.json', './data/questions.json', './data/glossary.json', './data/content-manifest.json',
  './data/sections/1-1-ja.json', './data/sections/1-1-en.json', './data/sections/1-2-ja.json', './data/sections/1-2-en.json',
  './data/figures/fig1-1-021.png', './data/figures/fig1-2-023.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
    return response;
  }).catch(() => caches.match('./index.html'))));
});
