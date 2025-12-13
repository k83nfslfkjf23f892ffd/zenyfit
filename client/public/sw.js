const CACHE_NAME = 'zenyfit-v2';
const QUEUE_NAME = 'workout-queue';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png'
];

// IndexedDB helper for queueing failed requests
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ZenyFitDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(QUEUE_NAME)) {
        db.createObjectStore(QUEUE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

const addToQueue = async (url, method, headers, body) => {
  const db = await openDB();
  const transaction = db.transaction([QUEUE_NAME], 'readwrite');
  const store = transaction.objectStore(QUEUE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.add({
      url,
      method,
      headers,
      body,
      timestamp: Date.now()
    });

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const getAllQueuedRequests = async () => {
  const db = await openDB();
  const transaction = db.transaction([QUEUE_NAME], 'readonly');
  const store = transaction.objectStore(QUEUE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const deleteQueuedRequest = async (id) => {
  const db = await openDB();
  const transaction = db.transaction([QUEUE_NAME], 'readwrite');
  const store = transaction.objectStore(QUEUE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Special handling for workout logging API
  if (event.request.url.includes('/api/workouts') && event.request.method === 'POST') {
    event.respondWith(
      fetch(event.request.clone())
        .then((response) => {
          return response;
        })
        .catch(async () => {
          // Queue the request for later
          try {
            const body = await event.request.clone().text();
            const headers = {};
            for (const [key, value] of event.request.headers.entries()) {
              headers[key] = value;
            }

            await addToQueue(
              event.request.url,
              event.request.method,
              headers,
              body
            );

            // Register sync event
            if ('sync' in self.registration) {
              await self.registration.sync.register('sync-workouts');
            }

            return new Response(
              JSON.stringify({
                success: true,
                queued: true,
                message: 'Workout saved offline and will sync when online'
              }),
              {
                status: 202,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          } catch (error) {
            console.error('Failed to queue workout:', error);
            return new Response(
              JSON.stringify({ success: false, error: 'Failed to save workout offline' }),
              {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
              }
            );
          }
        })
    );
    return;
  }

  // Handle other API requests
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ success: false, error: 'Offline' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // Handle static assets
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// Background sync event to retry queued requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-workouts') {
    event.waitUntil(syncQueuedWorkouts());
  }
});

async function syncQueuedWorkouts() {
  const queuedRequests = await getAllQueuedRequests();

  for (const queuedRequest of queuedRequests) {
    try {
      const response = await fetch(queuedRequest.url, {
        method: queuedRequest.method,
        headers: queuedRequest.headers,
        body: queuedRequest.body
      });

      if (response.ok) {
        await deleteQueuedRequest(queuedRequest.id);
        console.log('Successfully synced queued workout');

        // Notify the client that sync succeeded
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
          client.postMessage({
            type: 'WORKOUT_SYNCED',
            success: true
          });
        });
      }
    } catch (error) {
      console.error('Failed to sync workout:', error);
      // Keep in queue for next sync attempt
    }
  }
}
