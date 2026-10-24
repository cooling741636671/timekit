const CACHE = 'timekit-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/tokens.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/clock.css',
  './css/themes.css',
  './js/dom.js',
  './js/store.js',
  './js/router.js',
  './js/app.js',
  './js/lib/qrcode.js',
  './js/modules/clock.js',
  './js/modules/countdown.js',
  './js/modules/worldclock.js',
  './js/modules/stopwatch.js',
  './js/modules/pomodoro.js',
  './js/modules/datecalc.js',
  './js/modules/lunar.js',
  './js/modules/holiday.js',
  './js/modules/unit.js',
  './js/modules/color.js',
  './js/modules/password.js',
  './js/modules/text.js',
  './js/modules/qrcode.js',
  './js/modules/json.js',
  './js/modules/regex.js',
  './js/modules/hash.js',
  './js/modules/markdown.js',
  './data/lunar.js',
  './data/holidays.js',
  './assets/favicon.svg',
  './assets/icons.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then((hit) => hit || fetch(event.request)));
});
