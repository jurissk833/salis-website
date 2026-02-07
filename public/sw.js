const CACHE_NAME = 'salis-static-v3';
const ASSETS = [
    '/',
    '/css/style.css',
    '/manifest.json',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
    'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
];

// Install Event
self.addEventListener('install', (evt) => {
    evt.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Caching shell assets');
            return cache.addAll(ASSETS);
        })
    );
});

// Activate Event
self.addEventListener('activate', (evt) => {
    evt.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(keys
                .filter(key => key !== CACHE_NAME)
                .map(key => caches.delete(key))
            );
        })
    );
});

// Fetch Event
self.addEventListener('fetch', (evt) => {
    // Skip non-GET requests
    if (evt.request.method !== 'GET') return;

    // Strategy: Network-First for HTML pages (to handle language changes/updates)
    if (evt.request.mode === 'navigate') {
        evt.respondWith(
            fetch(evt.request)
                .then(fetchRes => {
                    return caches.open(CACHE_NAME).then(cache => {
                        cache.put(evt.request, fetchRes.clone());
                        return fetchRes;
                    });
                })
                .catch(() => {
                    // Fallback to cache if offline
                    return caches.match(evt.request).then(cacheRes => {
                        if (cacheRes) return cacheRes;
                        // Optional: Return a generic offline.html here
                    });
                })
        );
        return;
    }

    // Strategy: Cache-First for static assets (CSS, JS, Images)
    evt.respondWith(
        caches.match(evt.request).then((cacheRes) => {
            return cacheRes || fetch(evt.request).then(fetchRes => {
                return caches.open(CACHE_NAME).then(cache => {
                    // Don't cache admin pages or API calls if any
                    if (!evt.request.url.includes('/admin')) {
                        cache.put(evt.request, fetchRes.clone());
                    }
                    return fetchRes;
                });
            });
        })
    );
});
