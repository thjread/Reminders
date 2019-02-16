workbox.precaching.precacheAndRoute(self.__precacheManifest);

workbox.routing.registerRoute(/https:\/\/fonts.googleapis.com\//, new workbox.strategies.StaleWhileRevalidate(), 'GET');
workbox.routing.registerRoute(/https:\/\/fonts.gstatic.com\//, new workbox.strategies.CacheFirst(), 'GET');

self.addEventListener('push', (event) => {
    const title = 'Get Started With Workbox';
    const options = {
        body: event.data.text()
    };
    event.waitUntil(self.registration.showNotification(title, options));
});
