workbox.precaching.precacheAndRoute(self.__precacheManifest);

workbox.routing.registerRoute(/https:\/\/fonts.googleapis.com\//, new workbox.strategies.StaleWhileRevalidate(), 'GET');
workbox.routing.registerRoute(/https:\/\/fonts.gstatic.com\//, new workbox.strategies.CacheFirst(), 'GET');

self.addEventListener('push', (event) => {
    const payload_json = event.data.text();
    const payload = JSON.parse(payload_json);
    const title = payload.title;
    const d = new Date(payload.deadline);
    const options = {
        body: d.toLocaleTimeString() + " " + d.toLocaleDateString()
    };
    event.waitUntil(self.registration.showNotification(title, options));
});
