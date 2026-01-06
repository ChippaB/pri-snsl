const CACHE_NAME = 'seescan-v8.6.2-offline';
const urlsToCache = [
    './',
    './index.html',
    './app.js',
    './manifest.json'
];

self.addEventListener('install', event => {
    self.skipWaiting();  // Force immediate activation - no waiting for tabs to close
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // IMPORTANT: Never cache API requests (Supabase, external APIs)
    // Only cache static assets for offline functionality
    if (url.hostname.includes('supabase.co') ||
        url.hostname.includes('api.') ||
        event.request.method !== 'GET') {
        // Network only for API calls - bypass cache entirely
        event.respondWith(fetch(event.request));
        return;
    }

    // For static assets: Cache First strategy (app.js, index.html, etc.)
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response;
                }
                // If not in cache, fetch from network and cache it
                return fetch(event.request).then(fetchResponse => {
                    // Don't cache if request failed
                    if (!fetchResponse || fetchResponse.status !== 200) {
                        return fetchResponse;
                    }

                    // Clone response (can only be consumed once)
                    const responseToCache = fetchResponse.clone();

                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });

                    return fetchResponse;
                }).catch(() => {
                    // Network failed, try to return cached version as fallback
                    return caches.match('./index.html');
                });
            })
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Take control of all clients immediately
            return self.clients.claim();
        })
    );
});
