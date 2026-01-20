const CACHE = 'magic-cache-v1';
const ASSETS = ['./', './index.html', './style.css', './script.js', './manifest.json', './homescreen.jpg', './homepage1.jpg', './homepage2.jpg', './homepage3.jpg', './unlock.mp3'];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));

