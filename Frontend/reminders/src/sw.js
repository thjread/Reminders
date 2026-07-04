import { get, set } from "idb-keyval";
import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst, StaleWhileRevalidate } from "workbox-strategies";

// must match PENDING_DONE_KEY in models/sw-manager.ts
const PENDING_DONE_KEY = "pending-done-actions";

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

self.addEventListener("notificationclick", (event) => {
    const notification = event.notification;
    const action = event.action;

    notification.close();
    if (action === "close") {
        return;
    }
    event.waitUntil((async () => {
        const clientList = await self.clients.matchAll({ type: "window" });
        const client =
            clientList.find((c) => c.focused) ||
            clientList.find((c) => c.visibilityState === "visible") ||
            clientList[0];

        if (action === "done") {
            if (client) {
                client.postMessage({
                    type: "DONE",
                    userid: notification.data.userid,
                    id: notification.data.id,
                });
            } else {
                // no window to receive the message; queue it in IndexedDB
                // for the app to apply when it next loads
                const pending = (await get(PENDING_DONE_KEY)) || [];
                pending.push({
                    userid: notification.data.userid,
                    id: notification.data.id,
                });
                await set(PENDING_DONE_KEY, pending);
            }
        }

        if (client) {
            await client.focus();
        } else if (self.clients.openWindow) {
            await self.clients.openWindow("https://reminders.thjread.com");
        }
    })());
});
