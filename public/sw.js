// Simple Service Worker just to satisfy PWA installability requirements
self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    // Apenas pass-through básico - delega o controlo total de fetch à app / browser standard, 
    // previne que o SW encrave com os pedidos dinâmicos da Supabase.
    if (e.request.method === 'GET' && e.request.url.startsWith(self.location.origin)) {
        e.respondWith(fetch(e.request).catch(() => new Response('Tourozero Offline')));
    }
});
