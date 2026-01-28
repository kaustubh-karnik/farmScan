// Service Worker for FarmScan PWA
// Handles offline caching of app assets and ML model files

const CACHE_NAME = 'farmscan-v1';
const MODEL_CACHE = 'farmscan-models-v1';

// Core app files to cache
const CORE_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Model files to cache for offline use
const MODEL_FILES = [
  '/models/image-classifier/model.json',
  '/models/image-classifier/labels.json',
  '/models/image-classifier/group1-shard1of3.bin',
  '/models/image-classifier/group1-shard2of3.bin',
  '/models/image-classifier/group1-shard3of3.bin',
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    (async () => {
      try {
        // Cache core assets
        const coreCache = await caches.open(CACHE_NAME);
        console.log('[Service Worker] Caching core assets');
        await coreCache.addAll(CORE_ASSETS);

        // Cache model files
        const modelCache = await caches.open(MODEL_CACHE);
        console.log('[Service Worker] Caching ML model files');
        await modelCache.addAll(MODEL_FILES);

        console.log('[Service Worker] Install complete');
        
        // Force the waiting service worker to become the active service worker
        self.skipWaiting();
      } catch (error) {
        console.error('[Service Worker] Install failed:', error);
      }
    })()
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== MODEL_CACHE)
          .map((name) => {
            console.log('[Service Worker] Deleting old cache:', name);
            return caches.delete(name);
          })
      );

      // Take control of all clients
      await self.clients.claim();
      console.log('[Service Worker] Activation complete');
    })()
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Handle model files with cache-first strategy
  if (url.pathname.startsWith('/models/')) {
    event.respondWith(
      (async () => {
        try {
          // Try cache first
          const cached = await caches.match(request);
          if (cached) {
            console.log('[Service Worker] Serving model from cache:', url.pathname);
            return cached;
          }

          // Fallback to network
          console.log('[Service Worker] Fetching model from network:', url.pathname);
          const response = await fetch(request);
          
          // Cache the response
          if (response.ok) {
            const cache = await caches.open(MODEL_CACHE);
            cache.put(request, response.clone());
          }
          
          return response;
        } catch (error) {
          console.error('[Service Worker] Model fetch failed:', error);
          throw error;
        }
      })()
    );
    return;
  }

  // Handle app files with network-first strategy
  event.respondWith(
    (async () => {
      try {
        // Try network first
        const response = await fetch(request);
        
        // Cache successful responses
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }
        
        return response;
      } catch (error) {
        // Fallback to cache
        const cached = await caches.match(request);
        if (cached) {
          console.log('[Service Worker] Serving from cache:', url.pathname);
          return cached;
        }

        // If it's a navigation request and we have no cache, show offline page
        if (request.mode === 'navigate') {
          const offlineResponse = await caches.match('/');
          if (offlineResponse) {
            return offlineResponse;
          }
        }

        throw error;
      }
    })()
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_MODEL') {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(MODEL_CACHE);
        await cache.addAll(MODEL_FILES);
        event.ports[0].postMessage({ success: true });
      })()
    );
  }

  if (event.data && event.data.type === 'GET_CACHE_STATUS') {
    event.waitUntil(
      (async () => {
        const modelCache = await caches.open(MODEL_CACHE);
        const cachedFiles = await Promise.all(
          MODEL_FILES.map(async (file) => {
            const response = await modelCache.match(file);
            return { file, cached: !!response };
          })
        );
        event.ports[0].postMessage({ cachedFiles });
      })()
    );
  }
});

// Background sync for offline actions (future enhancement)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(
      (async () => {
        // Implement offline data sync logic here
        console.log('[Service Worker] Syncing offline data...');
      })()
    );
  }
});
