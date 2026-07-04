import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, StaleWhileRevalidate } from "workbox-strategies";

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(/https:\/\/fonts.googleapis.com\//, new StaleWhileRevalidate(), "GET");
registerRoute(/https:\/\/fonts.gstatic.com\//, new CacheFirst(), "GET");

self.addEventListener("push", (event) => {
    const payload_json = event.data.text();
    const payload = JSON.parse(payload_json);
    const title = payload.title;
    const d = new Date(payload.deadline);
    const options = {
        icon: "images/logo192.png",
        badge: "images/badge128.png",
        timestamp: d.getTime(),
        actions: [
            {
                action: "done",
                title: "Done",
            },
        ],
        data: payload,
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function(event) {
    const notification = event.notification;
    const action = event.action;

    notification.close();
    if (action === "close") {
        return;
    } else {
        event.waitUntil(
            self.clients.claim()
                .then(function() {
                    return self.clients.matchAll({type: "window"});
                })
                .then(function(clientList) {
                    for (let i = 0; i < clientList.length; i++) {
                        const client = clientList[i];
                        return client.focus();
                    }
                    if (self.clients.openWindow) {
                        return self.clients.openWindow("https://reminders.thjread.com");
                    }
                }).then(function(client) {
                    if (action === "done") {
                        return client.postMessage({
                            type: "DONE",
                            userid: notification.data.userid,
                            id: notification.data.id,
                        });
                    }
                    return null;
                }),
        );
    }
});
