workbox.precaching.precacheAndRoute(self.__precacheManifest);

workbox.routing.registerRoute(/https:\/\/fonts.googleapis.com\//, new workbox.strategies.StaleWhileRevalidate(), 'GET');
workbox.routing.registerRoute(/https:\/\/fonts.gstatic.com\//, new workbox.strategies.CacheFirst(), 'GET');

self.addEventListener('push', (event) => {
    const payload_json = event.data.text();
    const payload = JSON.parse(payload_json);
    const title = payload.title;
    const d = new Date(payload.deadline);
    const options = {
        body: d.toLocaleTimeString() + " " + d.toLocaleDateString(),
        icon: 'images/logo192.png',
        badge: 'images/badge128.png',
        timestamp: d.getTime()
        /*actions: [
            {
                action: "done",
                title: "Done"
            }
        ]*/
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
    var notification = event.notification;
    var action = event.action;
    console.log("hi");

    notification.close();
    // TODO action === done
    if (action !== 'close') {
        event.waitUntil(clients.matchAll({
            type: "window"
        }).then(function(clientList) {
            console.log(clientList.length);
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if ('focus' in client) {
                    console.log("focus");
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                console.log("open");
                return clients.openWindow('https://reminders.thjread.com');
            }
        }));
    }
});
