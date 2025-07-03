// A basic service worker for PWA caching

const CACHE_NAME = 'pdf-book-reader-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/index.tsx',
  '/App.tsx',
  '/manifest.json',
  // Note: Add paths to your JS/CSS bundles if you have a build step
  'https://www.transparenttextures.com/patterns/wood-pattern.png',
  'https://cdn.tailwindcss.com',
  'https://mozilla.github.io/pdf.js/build/pdf.mjs',
  'https://mozilla.github.io/pdf.js/build/pdf.worker.mjs'
];

// Install event: open a cache and add the URLs to it
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

// Fetch event: serve assets from cache if available, otherwise fetch from network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request because it's a stream and can only be consumed once
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              if (event.request.url.startsWith('https://esm.sh/')) {
                  // Don't cache esm.sh responses that might be errors
                  return response;
              }
            }

            // Clone the response because it's also a stream
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // Don't cache chrome-extension URLs
                if (!event.request.url.startsWith('chrome-extension://')) {
                    cache.put(event.request, responseToCache);
                }
              });

            return response;
          }
        );
      })
    );
});

// Activate event: clean up old caches
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
    })
  );
});
