self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open('v1').then(function(cache) {
            return cache.addAll([
                '/index.html',
                '/main.css',
                '/dist/bundle.js',
            ]);
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', function(event) {
    event.respondWith(caches.match(event.request).then(function(response) {
        // caches.match() always resolves
        // but in case of success response will have value
        if (response !== undefined) {
            return response;
        } else {
            console.log("Uncached resource " + event.request.url + " requested");
            return fetch(event.request);
        }
    }));
});
